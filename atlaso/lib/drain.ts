/** Outbox drain — the retry half of the durability guarantee.
 *
 *  `outbox.ts` persists memories; this decides what a push attempt MEANT and moves
 *  each item to its next state. It is deliberately the only place the failure
 *  taxonomy lives, so "when do we give up on a memory" is one readable table rather
 *  than scattered conditionals.
 *
 *  THE TAXONOMY. Getting this wrong fails in one of two directions — lose a user's
 *  memory, or wedge the queue behind an item that can never succeed:
 *
 *    per-item `invalid`        → QUARANTINE. The server rejected the SHAPE. Retrying
 *                               is guaranteed to fail identically, forever.
 *    per-item anything else    → SETTLED. added / duplicate / error are all "the
 *                               server has seen this and formed a verdict". `error`
 *                               settles because the batch endpoint returns it for a
 *                               per-item engine failure it already logged; retrying
 *                               would re-run the same deposit against the same
 *                               engine. It is recorded, not silently discarded.
 *    item absent from results  → RETRY. We cannot prove the server took it.
 *    HTTP 429                  → RETRY, and STOP the pass. The server is shedding;
 *                               hammering it is the opposite of helpful. Nothing is
 *                               lost — this is exactly the case the outbox exists
 *                               for, and the per-item budget makes 429 reachable.
 *    HTTP 401/403              → RETRY, and STOP. Either credentials are being
 *                               rotated or an edge/WAF is blocking us. Both are
 *                               transient from the memory's point of view, and the
 *                               WAF sync-brick incident is precisely why a 403 must
 *                               never cause us to discard data.
 *    HTTP 5xx / 0 (timeout)    → RETRY, and STOP. Brain down, deploying, or network.
 *    HTTP 4xx (other)          → QUARANTINE. A durable client-side defect.
 *
 *  AMBIGUOUS TIMEOUTS ARE SAFE. A request that times out after the server committed
 *  the write is retried — and cannot duplicate, because `client_id` is the server's
 *  per-item idempotency key. The retry simply comes back `duplicate` and settles.
 *
 *  A drain NEVER throws. It is called from editor hooks; a memory is worth less
 *  than the user's session.
 */
import { depositDetailed, type Auth } from "./atlaso";
import { log } from "./log";
import {
  maxDrainPerRun,
  bumpAttempt,
  enforceBounds,
  hasPending,
  pending,
  quarantine,
  settle,
  type OutboxRecord,
} from "./outbox";

export interface DrainResult {
  attempted: number;
  settled: number;
  retried: number;
  quarantined: number;
  stopped: boolean;
}

const EMPTY: DrainResult = { attempted: 0, settled: 0, retried: 0, quarantined: 0, stopped: false };

/** Statuses that mean "the server has formed a verdict on this item". Anything
 *  here leaves the queue. */
function isSettledStatus(s: string | undefined): boolean {
  return s !== undefined && s !== "invalid";
}

/** Classify a whole-request failure. `stop` halts the pass: when the brain is down
 *  or shedding, the remaining items would fail identically and we would just be
 *  burning the user's hook budget. */
function classifyRequest(status: number): { retry: boolean; stop: boolean; why: string } {
  if (status === 429) return { retry: true, stop: true, why: "rate limited" };
  if (status === 401 || status === 403) return { retry: true, stop: true, why: `auth/edge ${status}` };
  if (status === 0) return { retry: true, stop: true, why: "transport/timeout" };
  if (status >= 500) return { retry: true, stop: true, why: `server ${status}` };
  return { retry: false, stop: true, why: `client ${status}` }; // durable 4xx → quarantine
}

/**
 * Attempt one bounded pass over the queue.
 *
 * Items go up ONE at a time rather than as one large batch on purpose: a batch
 * shares a single fate, so one poisoned item would drag good memories into the
 * same verdict and we could not tell which was which. Per-item costs more
 * round-trips on a backlog, but a backlog is already the rare path, and
 * correctness there is the entire point of this file.
 */
/** The push used by a drain. Injectable so tests can drive the taxonomy directly
 *  without `mock.module`, which in Bun mutates the module registry for the WHOLE
 *  run and silently breaks any later file importing the same module. Production
 *  always uses the default. */
export type DepositFn = typeof depositDetailed;

export async function drain(
  tool: string,
  auth: Auth,
  limit = maxDrainPerRun(),
  deposit: DepositFn = depositDetailed,
): Promise<DrainResult> {
  const out: DrainResult = { ...EMPTY };
  try {
    enforceBounds(tool);
    const items = pending(tool, limit);
    if (!items.length) return out;

    for (const rec of items) {
      out.attempted++;
      let res: Awaited<ReturnType<DepositFn>>;
      try {
        res = await deposit(auth, [rec.item]);
      } catch (e) {
        // depositDetailed already swallows transport errors; this is belt-and-braces
        // so an unexpected throw can never abort the loop and strand the rest.
        if (bumpAttempt(tool, rec, String(e)) === "quarantine") out.quarantined++;
        else out.retried++;
        out.stopped = true;
        break;
      }

      if (res.ok) {
        const verdict = res.results.find((r) => r.client_id === rec.client_id);
        if (verdict && !isSettledStatus(verdict.status)) {
          quarantine(tool, rec, `server rejected: ${verdict.status}`);
          out.quarantined++;
        } else if (verdict) {
          settle(tool, rec.client_id);
          out.settled++;
        } else {
          // 2xx but our item is not in the results — do not assume it landed.
          if (bumpAttempt(tool, rec, "absent from results") === "quarantine") out.quarantined++;
          else out.retried++;
        }
        continue;
      }

      const c = classifyRequest(res.status);
      if (!c.retry) {
        quarantine(tool, rec, `${c.why}${res.error ? `: ${res.error}` : ""}`);
        out.quarantined++;
      } else if (bumpAttempt(tool, rec, c.why) === "quarantine") {
        out.quarantined++;
      } else {
        out.retried++;
      }
      if (c.stop) {
        out.stopped = true;
        break;
      }
    }

    if (out.attempted) {
      log(
        "drain",
        `attempted=${out.attempted} settled=${out.settled} retried=${out.retried} ` +
          `quarantined=${out.quarantined}${out.stopped ? " stopped" : ""}`,
      );
    }
  } catch (e) {
    // A drain must never break the editor session.
    try {
      log("drain", `error ${e}`);
    } catch {
      /* logging itself failed — nothing left to do */
    }
  }
  return out;
}

/** Cheap guard for latency-sensitive hooks: skip the whole drain (and its
 *  directory parsing) when the queue is empty, which is the overwhelmingly
 *  common case. */
export async function drainIfPending(
  tool: string,
  auth: Auth,
  limit = maxDrainPerRun(),
  deposit: DepositFn = depositDetailed,
): Promise<DrainResult> {
  try {
    if (!hasPending(tool)) return { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
  return drain(tool, auth, limit, deposit);
}

export type { OutboxRecord };
