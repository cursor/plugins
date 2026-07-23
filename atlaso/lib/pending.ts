/** Per-turn capture stash — assembles one user/assistant exchange across Cursor's
 *  hook events, because no single event carries the whole turn.
 *
 *  Cursor's hook payloads (verified against the docs + real captured payloads):
 *    • beforeSubmitPrompt → `prompt` (the USER text)   ← confirmed, two-source
 *    • afterAgentResponse → `text`   (the ASSISTANT text) ← docs-only, best-effort
 *    • stop / sessionEnd  → NO message content at all     ← confirmed
 *  So `stop` alone can't see the exchange. We stash the user prompt when it's
 *  submitted, merge the assistant reply when it lands, and the stop/sessionEnd hook
 *  reads + clears the stash to deposit. Keyed by the stable `conversation_id`.
 *
 *  Robust by construction: the loop works on the CONFIRMED fields alone
 *  (beforeSubmitPrompt + stop) — the assistant text is enrichment, so a Cursor build
 *  that never fires afterAgentResponse still captures the (gated) user turn.
 *
 *  Files live under <atlaso_dir>/cursor-pending/<conversation_id>.json, written
 *  atomically (0600), pruned when stale. Never throws — capture must never break a turn.
 */
import {
  closeSync, fsyncSync, mkdirSync, readdirSync, readFileSync, renameSync,
  rmSync, statSync, unlinkSync, writeFileSync, openSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { atlasoDir } from "./atlaso";

const STALE_MS = 60 * 60 * 1000; // an unfinished turn older than an hour is abandoned

export interface Pending {
  user: string;
  asst: string;
  ws: string | null;
  ts: number;
}

function pendingDir(): string {
  return join(atlasoDir(), "cursor-pending");
}

/** A filesystem-safe file name for a conversation id (ids are UUIDs, but never trust). */
function pendingPath(convId: string): string {
  const safe = convId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "default";
  return join(pendingDir(), `${safe}.json`);
}

function readPending(convId: string): Pending | null {
  try {
    const o = JSON.parse(readFileSync(pendingPath(convId), "utf-8"));
    if (o && typeof o === "object") {
      return { user: o.user || "", asst: o.asst || "", ws: o.ws ?? null, ts: o.ts || 0 };
    }
  } catch {
    /* missing / unreadable → nothing pending */
  }
  return null;
}

function writePending(convId: string, p: Pending): void {
  try {
    const dir = pendingDir();
    mkdirSync(dir, { recursive: true });
    const target = pendingPath(convId);
    const tmp = join(dir, `.${randomUUID()}.tmp`);
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeFileSync(fd, JSON.stringify(p));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, target);
  } catch {
    /* best-effort — a lost stash just means this turn isn't captured */
  }
}

/** Record the user prompt for a turn (from beforeSubmitPrompt). Starts a fresh
 *  stash — a new prompt is a new turn, so any half-built prior stash is replaced. */
export function stashPrompt(convId: string, user: string, ws: string | null): void {
  writePending(convId, { user, asst: "", ws, ts: Date.now() });
}

/** Merge the assistant reply into the turn's stash (from afterAgentResponse).
 *  No-op if there's no stash yet (afterAgentResponse without a seen prompt). */
export function stashResponse(convId: string, asst: string): void {
  const prev = readPending(convId);
  if (!prev) return;
  writePending(convId, { ...prev, asst });
}

export interface TakePendingOptions {
  retain?: boolean;
}

/** Read the turn's stash (called by stop/sessionEnd to deposit). By default it is
 *  deleted. `retain` keeps it through stop so a later sessionEnd uses the exact same
 *  prompt-time workspace and therefore the same idempotency key. */
export function takePending(convId: string, opts: TakePendingOptions = {}): Pending | null {
  const p = readPending(convId);
  const retained = opts.retain ? pendingPath(convId) : null;
  if (!opts.retain) {
    try {
      unlinkSync(pendingPath(convId));
    } catch {
      /* already gone */
    }
  }
  // Read the active conversation first. An end hook proves it is not abandoned even
  // when a long-running turn made its mtime older than the general prune threshold.
  prune(retained);
  return p;
}

/** Remove stashes older than STALE_MS (abandoned turns / crashed sessions). */
function prune(exclude: string | null = null): void {
  try {
    const dir = pendingDir();
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const full = join(dir, name);
      if (exclude && full === exclude) continue;
      try {
        if (now - statSync(full).mtimeMs > STALE_MS) rmSync(full, { force: true });
      } catch {
        /* ignore a single bad entry */
      }
    }
  } catch {
    /* dir missing → nothing to prune */
  }
}
