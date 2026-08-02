/** Durable write-ahead outbox for cloud deposits.
 *
 *  WHY THIS EXISTS. v1 of this connector was online-first: `capture` built an item,
 *  POSTed it once, and on ANY failure — timeout, 500, 429, a wifi blip, a brain
 *  restart mid-deploy — logged `saved=false` and moved on. The memory was gone, and
 *  neither the user nor we would ever know. The four Python connectors never had
 *  this hole because they sit on `atlaso_client`'s SQLite cache + outbox. This is
 *  the same guarantee for the two TypeScript connectors, in the shape their runtime
 *  allows.
 *
 *  THE HARD CONSTRAINT. Cursor/opencode hooks are SHORT-LIVED PROCESSES — a hook
 *  event spawns a process that exits. There is no daemon and no timer, so a retry
 *  can only ever be driven by on-disk state that a LATER hook invocation picks up.
 *  Everything here is therefore synchronous file I/O with no in-memory state.
 *
 *  WRITE-AHEAD, NOT WRITE-BEHIND. The item is persisted BEFORE the network call,
 *  not after it fails. A process killed mid-request (editor quit, machine sleep,
 *  hook timeout) has already durably recorded the memory. Enqueue-then-send is the
 *  only ordering that survives the process dying inside `fetch`.
 *
 *  STORAGE: one file per item, written tmp+rename so a reader never sees a partial
 *  record and a torn write cannot corrupt the queue. Chosen over a single JSONL log
 *  because two Cursor windows are two concurrent hook processes appending to the
 *  same file — an append race on records larger than PIPE_BUF interleaves and
 *  destroys both. Per-file also makes quarantine a rename and bounds a readdir.
 *  Chosen over `node:sqlite` because these plugins run on Bun, and over `bun:sqlite`
 *  because a file-drop plugin must not depend on one runtime's builtin.
 *
 *  DEDUPE: the filename is a hash of `client_id`, which is already the server's
 *  per-item idempotency key (content-derived in capture.ts). Re-enqueueing the same
 *  turn OVERWRITES rather than duplicating, and a retry of an ambiguous timeout can
 *  never produce a double memory server-side.
 *
 *  NOTHING IS EVER SILENTLY DROPPED. An item the server will always reject, or one
 *  that exhausts its attempts, is QUARANTINED — moved aside and recorded in a
 *  ledger — never deleted. That is a product rule, not an implementation detail.
 */
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { atlasoDir, type DepositItem } from "./atlaso";

/** Bounds are read PER CALL, not at module load — the same convention lock.ts uses
 *  for its timeout ("read per-call so it stays env-overridable for tests"). Module-
 *  load constants would force tests to re-import the module under a different
 *  specifier to change them, which is neither type-safe nor honest about the
 *  runtime behaviour we actually ship. */
function num(env: string, dflt: number): number {
  const n = parseInt(process.env[env] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

/** How many items one drain pass will attempt. Bounds the wall-clock a hook can
 *  spend so a large backlog never stalls the editor; the rest go next hook. */
export const maxDrainPerRun = () => num("ATLASO_OUTBOX_DRAIN", 25);
/** Hard queue ceiling. Beyond this the OLDEST are quarantined (not dropped). */
export const maxQueue = () => num("ATLASO_OUTBOX_MAX", 5000);
/** An item older than this has almost certainly outlived its usefulness, but it is
 *  still quarantined rather than deleted so it can be recovered/inspected. */
export const maxAgeMs = () => num("ATLASO_OUTBOX_MAX_AGE_MS", 30 * 24 * 3600 * 1000);
/** Attempts before we stop retrying and quarantine. Generous: transient brain
 *  outages should not burn through this in one bad afternoon. */
export const maxAttempts = () => num("ATLASO_OUTBOX_MAX_ATTEMPTS", 25);

export interface OutboxRecord {
  client_id: string;
  item: DepositItem;
  enqueued_at: number;
  attempts: number;
  last_error?: string;
}

/** What a push attempt concluded about ONE item. Drives whether it leaves the
 *  queue, stays for a retry, or is parked forever. */
export type Disposition = "settled" | "retry" | "quarantine";

export function outboxDir(tool: string): string {
  return join(atlasoDir(), "outbox", tool);
}
export function quarantineDir(tool: string): string {
  return join(outboxDir(tool), "quarantine");
}
function ledgerPath(tool: string): string {
  return join(outboxDir(tool), "quarantine.log");
}

/** sha256 of the idempotency key — filesystem-safe, collision-free in practice, and
 *  deterministic so the same turn always maps to the same file (dedupe). */
function fileFor(clientId: string): string {
  return createHash("sha256").update(clientId).digest("hex").slice(0, 32) + ".json";
}

function ensureDir(p: string): boolean {
  try {
    mkdirSync(p, { recursive: true, mode: 0o700 });
    return true;
  } catch {
    return false;
  }
}

/** Atomic single-file write: unique temp in the SAME directory (so rename is a
 *  cheap intra-filesystem move), fsync the bytes, then rename over the target.
 *  A reader therefore sees either the old record or the new one, never a splice. */
function writeAtomic(path: string, body: string): boolean {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  let fd: number | null = null;
  try {
    writeFileSync(tmp, body, { mode: 0o600 });
    try {
      fd = openSync(tmp, "r+");
      fsyncSync(fd); // durability: survive a machine crash, not just a process exit
    } catch {
      /* fsync unavailable/unsupported — the rename below is still atomic */
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {
          /* already closed */
        }
      }
    }
    renameSync(tmp, path);
    return true;
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      /* temp already gone */
    }
    return false;
  }
}

/**
 * Persist an item BEFORE it is sent. Idempotent on `client_id`: enqueueing the
 * same turn twice (Cursor fires stop AND sessionEnd for one turn) overwrites.
 * Returns false only if the disk itself is unusable — the caller still attempts
 * the network, so a read-only home directory degrades to today's behaviour rather
 * than blocking capture.
 */
export function enqueue(tool: string, item: DepositItem): boolean {
  const dir = outboxDir(tool);
  if (!ensureDir(dir)) return false;
  const existing = readRecord(join(dir, fileFor(item.client_id)));
  const rec: OutboxRecord = {
    client_id: item.client_id,
    item,
    // Preserve the ORIGINAL enqueue time across re-enqueues so age bounds measure
    // how long the memory has been stranded, not when we last saw the turn.
    enqueued_at: existing?.enqueued_at ?? Date.now(),
    attempts: existing?.attempts ?? 0,
  };
  return writeAtomic(join(dir, fileFor(item.client_id)), JSON.stringify(rec));
}

function readRecord(path: string): OutboxRecord | null {
  try {
    const rec = JSON.parse(readFileSync(path, "utf8")) as OutboxRecord;
    if (!rec || typeof rec.client_id !== "string" || !rec.item) return null;
    if (typeof rec.attempts !== "number") rec.attempts = 0;
    if (typeof rec.enqueued_at !== "number") rec.enqueued_at = Date.now();
    return rec;
  } catch {
    return null; // missing, unparseable, or truncated — caller decides
  }
}

/** True if anything is waiting. Deliberately cheap (one readdir, no parsing) so it
 *  can be called from the latency-sensitive prompt path without cost. */
export function hasPending(tool: string): boolean {
  try {
    for (const f of readdirSync(outboxDir(tool))) if (f.endsWith(".json")) return true;
  } catch {
    /* no dir yet */
  }
  return false;
}

/**
 * Oldest-first slice of the queue, capped at `limit`.
 *
 * A file that will not parse is QUARANTINED on sight rather than skipped: left in
 * place it would be re-read and re-fail on every single drain, forever.
 */
export function pending(tool: string, limit = maxDrainPerRun()): OutboxRecord[] {
  const dir = outboxDir(tool);
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const recs: OutboxRecord[] = [];
  for (const name of names) {
    const rec = readRecord(join(dir, name));
    if (rec) recs.push(rec);
    else quarantineFile(tool, name, "unreadable");
  }
  recs.sort((a, b) => a.enqueued_at - b.enqueued_at);
  return recs.slice(0, limit);
}

/** Item accepted (or already known) by the server — remove it. */
export function settle(tool: string, clientId: string): void {
  try {
    unlinkSync(join(outboxDir(tool), fileFor(clientId)));
  } catch {
    /* already gone — settling twice is fine */
  }
}

/** Record a failed attempt. Quarantines once attempts are exhausted, so a
 *  permanently-poisoned item can never wedge the queue ahead of good ones. */
export function bumpAttempt(tool: string, rec: OutboxRecord, error: string): Disposition {
  const next: OutboxRecord = { ...rec, attempts: rec.attempts + 1, last_error: error.slice(0, 200) };
  if (next.attempts >= maxAttempts()) {
    quarantine(tool, rec, `max attempts (${next.attempts}): ${error}`);
    return "quarantine";
  }
  writeAtomic(join(outboxDir(tool), fileFor(rec.client_id)), JSON.stringify(next));
  return "retry";
}

/** Park an item permanently, with a reason, in a place a human can find it.
 *  NEVER deletes: the founder's rule is that a user's memory is never silently
 *  lost, and "we gave up" is exactly the case where that rule earns its keep. */
export function quarantine(tool: string, rec: OutboxRecord, reason: string): void {
  quarantineFile(tool, fileFor(rec.client_id), reason);
}

function quarantineFile(tool: string, name: string, reason: string): void {
  const qdir = quarantineDir(tool);
  if (!ensureDir(qdir)) return;
  const from = join(outboxDir(tool), name);
  try {
    renameSync(from, join(qdir, name));
  } catch {
    return; // vanished under us — nothing to park
  }
  try {
    appendFileSync(
      ledgerPath(tool),
      JSON.stringify({ at: new Date().toISOString(), file: name, reason: reason.slice(0, 300) }) + "\n",
      { mode: 0o600 },
    );
  } catch {
    /* the ledger is diagnostics; losing a line must not fail the quarantine */
  }
}

/** Count of parked items — surfaced by `atlaso status` so this is visible, not
 *  a silent graveyard. */
export function quarantineCount(tool: string): number {
  try {
    return readdirSync(quarantineDir(tool)).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

/**
 * Keep the queue bounded. Over-age and over-count items are QUARANTINED, oldest
 * first — never unlinked. Runs before a drain so bounds are enforced even if the
 * network has been down for a month.
 */
export function enforceBounds(tool: string, now = Date.now()): number {
  const dir = outboxDir(tool);
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return 0;
  }
  let parked = 0;
  const aged: Array<{ name: string; at: number }> = [];
  for (const name of names) {
    const rec = readRecord(join(dir, name));
    let at: number;
    if (rec) at = rec.enqueued_at;
    else {
      // Unreadable: fall back to mtime so it still participates in bounds.
      try {
        at = statSync(join(dir, name)).mtimeMs;
      } catch {
        continue;
      }
    }
    if (now - at > maxAgeMs()) {
      quarantineFile(tool, name, "max age exceeded");
      parked++;
    } else {
      aged.push({ name, at });
    }
  }
  const cap = maxQueue();
  if (aged.length > cap) {
    aged.sort((a, b) => a.at - b.at);
    for (const { name } of aged.slice(0, aged.length - cap)) {
      quarantineFile(tool, name, "queue over capacity");
      parked++;
    }
  }
  return parked;
}

/** Present only so tests can start from a known state. */
export function _resetForTests(tool: string): void {
  for (const dir of [quarantineDir(tool), outboxDir(tool)]) {
    try {
      for (const f of readdirSync(dir)) {
        try {
          unlinkSync(join(dir, f));
        } catch {
          /* a subdirectory (quarantine/) — skip */
        }
      }
    } catch {
      /* absent */
    }
  }
}

export function _ledgerPathForTests(tool: string): string {
  return ledgerPath(tool);
}

export function _existsForTests(tool: string, clientId: string): boolean {
  return existsSync(join(outboxDir(tool), fileFor(clientId)));
}

export function _quarantinedForTests(tool: string, clientId: string): boolean {
  return existsSync(join(quarantineDir(tool), fileFor(clientId)));
}
