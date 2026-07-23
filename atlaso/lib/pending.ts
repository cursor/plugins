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

/** Content-free receipt for the most recently completed turn in a conversation.
 *  It lets sessionEnd retry a stop deposit with the same attribution/idempotency key
 *  without retaining user text or keeping the pending-turn file across turns. */
export interface CompletedTurn {
  user_hash: string;
  client_id: string;
  scope: string;
  project: string | null;
  ts: number;
}

function pendingDir(): string {
  return join(atlasoDir(), "cursor-pending");
}

function completedDir(): string {
  return join(atlasoDir(), "cursor-completed");
}

/** A filesystem-safe file name for a conversation id (ids are UUIDs, but never trust). */
function safeConversationId(convId: string): string {
  return convId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "default";
}

function pendingPath(convId: string): string {
  const safe = safeConversationId(convId);
  return join(pendingDir(), `${safe}.json`);
}

function completedPath(convId: string): string {
  const safe = safeConversationId(convId);
  return join(completedDir(), `${safe}.json`);
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

/** Read + DELETE the current turn's stash. Read before pruning: an end hook proves
 *  this conversation is active even when a long-running turn exceeded STALE_MS. */
export function takePending(convId: string): Pending | null {
  const p = readPending(convId);
  try {
    unlinkSync(pendingPath(convId));
  } catch {
    /* already gone */
  }
  prune(pendingDir());
  return p;
}

/** Save a content-free completion receipt. A later stop overwrites the prior receipt,
 *  while a new prompt remains isolated in cursor-pending. */
export function stashCompleted(convId: string, turn: CompletedTurn): void {
  try {
    const dir = completedDir();
    mkdirSync(dir, { recursive: true });
    const target = completedPath(convId);
    const tmp = join(dir, `.${randomUUID()}.tmp`);
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeFileSync(fd, JSON.stringify(turn));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, target);
  } catch {
    /* best-effort — sessionEnd may fall back without a stable receipt */
  }
}

/** Read + DELETE the latest completed-turn receipt for this conversation. */
export function takeCompleted(convId: string): CompletedTurn | null {
  let turn: CompletedTurn | null = null;
  try {
    const o = JSON.parse(readFileSync(completedPath(convId), "utf-8"));
    if (o && typeof o === "object") {
      turn = {
        user_hash: String(o.user_hash || ""),
        client_id: String(o.client_id || ""),
        scope: String(o.scope || ""),
        project: typeof o.project === "string" ? o.project : null,
        ts: Number(o.ts || 0),
      };
    }
  } catch {
    /* missing / unreadable */
  }
  try {
    unlinkSync(completedPath(convId));
  } catch {
    /* already gone */
  }
  prune(completedDir());
  if (!turn || Date.now() - turn.ts > STALE_MS) return null;
  if (!turn.user_hash || !turn.client_id || !turn.scope) return null;
  return turn;
}

/** Remove JSON entries older than STALE_MS (abandoned turns / receipts). */
function prune(dir: string): void {
  try {
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const full = join(dir, name);
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
