/** Content-free capture-attempt counters — the TS port of the Python client's
 *  capture_stats (atlaso_client/cache.py), one estimator across all hook tools
 *  (lab ruling 85a5c41b: semantic parity required, reason labels MAP onto the
 *  closed Python vocabulary — the server whitelist never grows).
 *
 *  Semantics (byte-identical to Python, non-negotiable):
 *    attempts  = gate-passed evaluations (reasons `signal` | `substantive`)
 *    accepted  = server-confirmed "added" ONLY (a "duplicate" result goes to
 *                drops.duplicate — replaying one memory must read ~0%, not 100%)
 *    per-UTC-day cumulative ints + hours_active/max_hour_attempts (hour spread)
 *    accepted <= attempts clamped AT EMIT (a corrupt snapshot fails the tile
 *                closed server-side — a well-behaved client never trips it)
 *    payload   = last <=35 days, additive `capture_stats` field on the batch body
 *
 *  Counts only — no content and no content-derived hashes ever enter this file
 *  or the payload (enforced by the vocabulary-whitelist test).
 *
 *  Cursor-specific hazard handled here: stop + sessionEnd can BOTH fire for one
 *  turn (two processes). Gate evaluations dedupe on the turn's idempotency key,
 *  and a "duplicate" result for a key we already counted is our own double-fire
 *  echo, not a real replay — it is skipped.
 *
 *  Cross-process safety: read-modify-write under the shared flock helper; when
 *  the lock is unavailable (held:false — e.g. Windows) we still write, and the
 *  server's max-merge means a lost race can only UNDER-count, never inflate.
 */
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { atlasoDir } from "./atlaso";
import { withToolLock } from "./lock";

// ── the closed vocabulary (lab ruling 85a5c41b) ─────────────────────────────
// Every gate reason a TS connector can produce MUST map to exactly one of the
// Python labels below. An unmappable reason is a build bug, never a reason to
// extend the vocabulary (map-completeness test enforces totality).
export const ATTEMPT_REASONS = ["signal", "substantive"] as const;
export const REASON_MAP: Record<string, string> = {
  empty: "empty",
  chatter: "chatter",
  too_short: "too_short",
  too_long: "too_long",
  system_turn: "system_turn",
  // Cursor's meta_recall = "the user turn is our own injected recall block" —
  // semantically a system-authored turn, so it maps there.
  meta_recall: "system_turn",
};

const MAX_DAYS = 35;
// Cursor fires stop AND sessionEnd for one turn seconds apart (two processes).
// A same-key event inside this window is that echo and must not double-count;
// beyond it, a repeated key is a REAL replay and counts — exactly like the
// Python client, which has no double-fire and counts every replay.
export const DOUBLE_FIRE_WINDOW_S = 120;

type DayRow = {
  attempts: number;
  accepted: number;
  drops: Record<string, number>;
  hours: Record<string, number>; // "00".."23" → attempts that hour
};
// Result stamps carry the counted VERDICT and the day it landed on, so a
// same-key echo can be reconciled order-independently (CodeRedTeam: the
// server may answer the losing hook's "duplicate" BEFORE the winning hook's
// "added" — the turn was captured, and the counters must say so whichever
// response is processed first).
type ResultStamp = { t: number; s: "added" | "duplicate"; d: string };
type Store = {
  version: 1;
  days: Record<string, DayRow>;
  // content-free turn-key hashes → unix seconds of the last COUNTED event
  gate_seen: Record<string, number>;
  result_seen: Record<string, ResultStamp>;
  last_sent_hash: string | null;
};

export type CaptureStatsDay = {
  day: string;
  attempts: number;
  accepted: number;
  hours_active: number;
  max_hour_attempts: number;
  drops: Record<string, number>;
};

function statsPath(): string {
  return join(atlasoDir(), "capture_stats.json");
}
function lockPath(): string {
  return join(atlasoDir(), "capture_stats.lock");
}

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function utcHour(d = new Date()): string {
  return d.toISOString().slice(11, 13);
}

function emptyStore(): Store {
  return { version: 1, days: {}, gate_seen: {}, result_seen: {}, last_sent_hash: null };
}

function load(): Store {
  try {
    const raw = JSON.parse(readFileSync(statsPath(), "utf8"));
    if (raw && raw.version === 1 && typeof raw.days === "object") {
      raw.gate_seen = raw.gate_seen ?? {};
      // Tolerate pre-reconciliation stamps (bare unix seconds): keep the
      // timestamp, assume the safe verdict ("added" never triggers an
      // upgrade), and let the window expire them naturally.
      const rs: Record<string, ResultStamp> = {};
      for (const [k, v] of Object.entries(raw.result_seen ?? {})) {
        if (typeof v === "number") rs[k] = { t: v, s: "added", d: "" };
        else if (v && typeof (v as ResultStamp).t === "number") rs[k] = v as ResultStamp;
      }
      raw.result_seen = rs;
      return raw as Store;
    }
  } catch {
    /* missing / malformed → fresh */
  }
  return emptyStore();
}

function save(s: Store): void {
  // prune to the newest MAX_DAYS so the file never grows unbounded
  const days = Object.keys(s.days).sort();
  for (const d of days.slice(0, Math.max(0, days.length - MAX_DAYS))) delete s.days[d];
  // prune stale dedupe stamps relative to the NEWEST stamp (a logical clock —
  // wall-clock pruning would wrongly drop stamps after a clock jump, and breaks
  // deterministic tests that inject historical times)
  {
    const stamps = Object.values(s.gate_seen);
    if (stamps.length) {
      const cutoff = Math.max(...stamps) - 2 * DOUBLE_FIRE_WINDOW_S;
      for (const k of Object.keys(s.gate_seen)) if (s.gate_seen[k] < cutoff) delete s.gate_seen[k];
    }
  }
  {
    const stamps = Object.values(s.result_seen).map((v) => v.t);
    if (stamps.length) {
      const cutoff = Math.max(...stamps) - 2 * DOUBLE_FIRE_WINDOW_S;
      for (const k of Object.keys(s.result_seen)) {
        if (s.result_seen[k].t < cutoff) delete s.result_seen[k];
      }
    }
  }
  const target = statsPath();
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.capture_stats.${process.pid}.${randomUUID()}.tmp`);
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify(s));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, target);
}

function day(s: Store, key: string): DayRow {
  let row = s.days[key];
  if (!row) {
    row = { attempts: 0, accepted: 0, drops: {}, hours: {} };
    s.days[key] = row;
  }
  return row;
}

async function mutate(fn: (s: Store) => void): Promise<void> {
  try {
    await withToolLock(lockPath(), async () => {
      const s = load();
      fn(s);
      save(s);
    });
  } catch {
    /* counters are best-effort — never break capture */
  }
}

/** Record one gate evaluation. `turnKey` (the deposit idempotency key) dedupes
 *  the stop+sessionEnd double-fire: the same key inside DOUBLE_FIRE_WINDOW_S is
 *  an echo and is skipped; beyond the window it counts (real-replay parity with
 *  the Python client). */
export async function recordGate(
  reason: string,
  opts: { turnKey?: string | null; now?: Date } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
  const nowS = Math.floor(now.getTime() / 1000);
  const dk = utcDay(now);
  await mutate((s) => {
    if (opts.turnKey) {
      const last = s.gate_seen[opts.turnKey];
      if (last !== undefined && nowS - last < DOUBLE_FIRE_WINDOW_S) return; // echo
      s.gate_seen[opts.turnKey] = nowS;
    }
    const row = day(s, dk);
    if ((ATTEMPT_REASONS as readonly string[]).includes(reason)) {
      row.attempts += 1;
      const h = utcHour(now);
      row.hours[h] = (row.hours[h] ?? 0) + 1;
    } else {
      const mapped = REASON_MAP[reason];
      if (!mapped) return; // unmappable = build bug; never invent a label
      row.drops[mapped] = (row.drops[mapped] ?? 0) + 1;
    }
  });
}

/** Count the server's per-item verdicts: "added" → accepted; "duplicate" → the
 *  duplicate bucket — UNLESS the item's key is one we already counted (that is
 *  our own double-fire echo, not a real replay).
 *
 *  Order-independent reconciliation (CodeRedTeam gate): when stop+sessionEnd
 *  race, the server hands one hook "added" and the other "duplicate", and the
 *  LOCAL processing order of those two responses is arbitrary. Whichever lands
 *  first, one captured turn must read accepted=1, duplicate=0 — so a same-key
 *  "added" inside the window UPGRADES an earlier "duplicate" (the pair's truth
 *  is "captured"), and everything else is a skip. Only counted verdicts stamp
 *  the window: an "error"/"invalid" result must never suppress the retry's
 *  real verdict. */
export async function recordDepositResults(
  results: Array<{ client_id?: string; status?: string }>,
  opts: { now?: Date } = {},
): Promise<void> {
  if (!Array.isArray(results) || results.length === 0) return;
  const now = opts.now ?? new Date();
  const nowS = Math.floor(now.getTime() / 1000);
  const dk = utcDay(now);
  await mutate((s) => {
    for (const r of results) {
      const status =
        r?.status === "added" ? "added" : r?.status === "duplicate" ? "duplicate" : null;
      if (!status) continue; // uncounted verdicts never stamp the echo window
      const key = r?.client_id;
      if (key) {
        const prev = s.result_seen[key];
        if (prev && nowS - prev.t < DOUBLE_FIRE_WINDOW_S) {
          if (prev.s === "duplicate" && status === "added") {
            // adverse order: the echo's duplicate landed first — undo it and
            // credit the accept on the same day it was counted.
            const row0 = s.days[prev.d];
            if (row0 && (row0.drops["duplicate"] ?? 0) > 0) {
              row0.drops["duplicate"] -= 1;
              if (row0.drops["duplicate"] === 0) delete row0.drops["duplicate"];
              row0.accepted += 1;
            } else {
              day(s, dk).accepted += 1;
            }
            s.result_seen[key] = { t: prev.t, s: "added", d: prev.d };
          }
          continue; // echo — never double-counts
        }
        s.result_seen[key] = { t: nowS, s: status, d: dk };
      }
      const row = day(s, dk);
      if (status === "added") {
        row.accepted += 1;
      } else {
        row.drops["duplicate"] = (row.drops["duplicate"] ?? 0) + 1;
      }
    }
  });
}

/** The additive batch-body payload: last <=35 UTC days, cumulative, clamped. */
export function buildCaptureStats(store?: Store): CaptureStatsDay[] {
  const s = store ?? load();
  return Object.keys(s.days)
    .sort()
    .slice(-MAX_DAYS)
    .map((dk) => {
      const row = s.days[dk];
      const hours = Object.values(row.hours ?? {});
      return {
        day: dk,
        attempts: row.attempts,
        accepted: Math.min(row.accepted, row.attempts), // emit invariant
        hours_active: Math.min(24, hours.filter((n) => n > 0).length),
        max_hour_attempts: hours.length ? Math.max(...hours) : 0,
        drops: { ...row.drops },
      };
    })
    .filter((d) => d.attempts > 0 || d.accepted > 0 || Object.keys(d.drops).length > 0);
}

function payloadHash(days: CaptureStatsDay[]): string {
  // hash of COUNTS ONLY — content never enters this module
  return createHash("sha256").update(JSON.stringify(days)).digest("hex");
}

/** Returns the payload when the counters changed since the last confirmed send,
 *  else null (skip attaching). Call markStatsSent() after a successful push. */
export function pendingCaptureStats(): CaptureStatsDay[] | null {
  const s = load();
  const days = buildCaptureStats(s);
  if (days.length === 0) return null;
  return payloadHash(days) === s.last_sent_hash ? null : days;
}

export async function markStatsSent(days: CaptureStatsDay[]): Promise<void> {
  const h = payloadHash(days);
  await mutate((s) => {
    s.last_sent_hash = h;
  });
}
