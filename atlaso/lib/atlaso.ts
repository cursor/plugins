/**
 * Thin Atlaso brain client for the Cursor plugin — bun-native, ZERO deps.
 *
 * Reads the SAME `~/.atlaso/auth.json` every Atlaso connector shares
 * ({server, token, user_id, device_id}) and calls the brain's documented REST
 * endpoints over the global `fetch`. The engine stays on the server; this only
 * knows the URLs — the IP thin-client rule, in TypeScript.
 *
 * v1 is ONLINE-FIRST: no local cache / outbox / sync (deferred — see README).
 * Every call is FAIL-OPEN (memory must never break a Cursor turn): callers get
 * `[]` / `false` on any error — never a throw. A REACHED-but-rejected token
 * (HTTP 401/403) is the one authoritative signal: we retire auth.json so the next
 * session re-authorizes (mirrors the Python client's AuthRejected handling).
 */
import {
  closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { scrub } from "./capture";

export interface Auth {
  server: string;
  token: string;
  user_id?: string;
  device_id?: string;
  // Where this credential came from — set by resolveCredential (lib/credential.ts).
  // "own" = the tool's OWN ~/.atlaso/tools/<tool>.json; "shared" = the shared bearer.
  // undefined = a bare loadAuth() result (treated as shared for retirement). This is
  // what lets a rejected per-tool token retire ONLY that file, never the shared one.
  source?: "own" | "shared";
  tool?: string; // the tool slug, when source === "own"
}

export interface RecallResult {
  id?: string;
  content?: string;
  scope?: string;
  has_disagreement?: boolean;
  conflict_peers?: unknown[];
  tags?: string[];
}

export interface DepositItem {
  client_id: string;
  text: string;
  polarity: string;
  evidence_grade: string;
  scope_note: string | null;
  tags: string[];
}

export interface RememberOptions {
  text: string;
  tags?: string[];
}

const RECALL_TIMEOUT_MS = 8000;
const DEPOSIT_TIMEOUT_MS = 15000;

export function atlasoDir(): string {
  return (
    process.env.ATLASO_GLOBAL_PATH ||
    process.env.ATLASO_PATH ||
    join(homedir(), ".atlaso")
  );
}

export function authPath(): string {
  return join(atlasoDir(), "auth.json");
}

export function defaultServer(): string {
  return process.env.ATLASO_SERVER || "https://mcp.atlaso.ai";
}

/** {server, token, user_id, device_id} from auth.json, or null if not connected. */
export function loadAuth(): Auth | null {
  try {
    const obj = JSON.parse(readFileSync(authPath(), "utf-8"));
    if (obj && typeof obj === "object" && typeof obj.token === "string" && obj.token) {
      return {
        server: typeof obj.server === "string" && obj.server ? obj.server : defaultServer(),
        token: obj.token,
        user_id: obj.user_id,
        device_id: obj.device_id,
      };
    }
  } catch {
    /* not connected / unreadable → offline */
  }
  return null;
}

/** A reachable brain rejected our token (401/403) → retire auth.json so the next
 *  session's sessionStart hook re-runs the device-authorize flow. Non-destructive
 *  (renamed, not deleted). Transport errors (offline/5xx) never reach here. */
export function markRevoked(): void {
  try {
    renameSync(authPath(), authPath() + ".revoked");
  } catch {
    /* already gone / unwritable — best-effort */
  }
}

// ── per-tool credentials (~/.atlaso/tools/<tool>.json) ───────────────────────────
//
// Each Atlaso integration on a machine holds its OWN credential, minted from the
// shared bearer (see lib/credential.ts). That's what lets the brain tell two tools
// on one device apart, so removing one truly stops it. ONE FILE PER TOOL (not a map
// inside auth.json): two hooks can fire concurrently, and separate files + a kernel
// lock avoid a read-modify-write clobber. This module owns the file I/O; the mint
// state machine lives in lib/credential.ts.

export function toolsDir(): string {
  return join(atlasoDir(), "tools");
}

export function toolAuthPath(tool: string): string {
  return join(toolsDir(), `${tool}.json`);
}

export function toolLockPath(tool: string): string {
  return join(toolsDir(), `${tool}.lock`);
}

/** {server, token, user_id, device_id, tool} from tools/<tool>.json, or null. */
export function loadToolAuth(tool: string): Auth | null {
  try {
    const o = JSON.parse(readFileSync(toolAuthPath(tool), "utf-8"));
    if (o && typeof o === "object" && typeof o.token === "string" && o.token) {
      return {
        server: typeof o.server === "string" && o.server ? o.server : defaultServer(),
        token: o.token,
        user_id: o.user_id,
        device_id: o.device_id,
        tool,
        source: "own",
      };
    }
  } catch {
    /* missing / unreadable → no per-tool credential yet */
  }
  return null;
}

/** Atomically + durably write tools/<tool>.json at 0600 (O_EXCL temp + fsync +
 *  atomic rename) — a torn credential file would brick the integration. */
export function saveToolAuth(tool: string, cred: Record<string, unknown>): void {
  const dir = toolsDir();
  mkdirSync(dir, { recursive: true });
  const p = toolAuthPath(tool);
  const tmp = join(dir, `.${tool}.${process.pid}.${randomUUID()}.tmp`);
  const fd = openSync(tmp, "wx", 0o600); // O_CREAT|O_EXCL|O_WRONLY, owner-only
  try {
    writeFileSync(fd, JSON.stringify(cred, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, p);
}

/** Remove a per-tool credential (a rejected token, or a foreign leftover). The
 *  shared auth.json and the lock file are untouched. */
export function clearToolAuth(tool: string): void {
  try {
    unlinkSync(toolAuthPath(tool));
  } catch {
    /* already gone */
  }
}

/** Retire the credential a rejected call was made with — the ONE thing that takes a
 *  client offline, so it is source-aware and never over-reaches:
 *   - source "own"  → drop ONLY tools/<tool>.json; the shared auth.json (and any
 *     other tool riding it) is untouched. resolveCredential re-mints next run, or the
 *     server refuses (tombstoned tool) and it goes local-only.
 *   - source "shared"/undefined → retire the shared bearer, as before.
 *  Called only for a VERIFIED verdict (see call()). */
function retireForAuth(auth: Auth): void {
  if (auth.source === "own" && auth.tool) clearToolAuth(auth.tool);
  else markRevoked();
}

/** One bearer-authed JSON call, hard-bounded by a timeout. null on ANY non-2xx or
 *  transport/parse error. A 401/403 retires the token ONLY when the response is a
 *  VERIFIED verdict from our own brain — `x-atlaso-response: 1`, stamped by a global
 *  middleware on every app response including errors. An edge/WAF 403 lacks it and
 *  must NOT take us offline (never-brick; the WAF sync-brick incident). */
async function call(
  auth: Auth,
  method: string,
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(auth.server.replace(/\/+$/, "") + path, {
      method,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (res.status === 401 || res.status === 403) {
      // Only OUR server's verdict may retire a credential — an edge/WAF block is not one.
      if (res.headers?.get("x-atlaso-response") === "1") retireForAuth(auth);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // transport/timeout/parse — transient, leave credentials intact
  } finally {
    clearTimeout(timer);
  }
}

/** Smart recall from the server. `project` scopes to personal + this-project. */
export async function recall(
  auth: Auth,
  query: string,
  limit = 8,
  project?: string,
): Promise<RecallResult[]> {
  // Explicit MCP queries are user-controlled too. Scrub before URL construction so
  // a pasted token cannot escape through the read path while searching memory.
  const safeQuery = scrub(query || "")[0];
  const params = new URLSearchParams({ q: safeQuery, limit: String(limit) });
  if (project) params.set("project", project);
  const data = await call(auth, "GET", `/v1/recall?${params.toString()}`, null, RECALL_TIMEOUT_MS);
  const results = data?.results;
  return Array.isArray(results) ? results : [];
}

/** Most-recent deposits (the sessionStart fallback). NOT project-filtered by the
 *  server — callers MUST filter with project.visibleInProject before showing them. */
export async function recent(auth: Auth, limit = 8): Promise<RecallResult[]> {
  const data = await call(auth, "GET", `/v1/memories?limit=${limit}`, null, RECALL_TIMEOUT_MS);
  const deposits = data?.deposits;
  return Array.isArray(deposits) ? deposits : [];
}

/** Batch deposit (the server re-scrubs + runs the worth-keeping gate). The
 *  client_id is the server idempotency key, so a retry never duplicates. */
export async function deposit(auth: Auth, items: DepositItem[]): Promise<boolean> {
  if (!items.length) return false;
  const data = await call(auth, "POST", "/v1/memories/batch", { items }, DEPOSIT_TIMEOUT_MS);
  return !!data;
}

/** POST /v1/entitlement — this device's tool policy {active_tool, multi_tool,
 *  needs_reconnect, in_grace, grace_days_left, tools_connected, ...}. null on a
 *  transient error OR a revoked token (call() already retired auth.json on 401/403). */
export async function entitlementCall(auth: Auth): Promise<any | null> {
  return call(auth, "POST", "/v1/entitlement", null, RECALL_TIMEOUT_MS);
}

/** POST /v1/devices/claim-tool — claim the free active slot for `tool` (no-op if a
 *  tool already holds it). Returns {active_tool, multi_tool} or null. */
export async function claimToolCall(auth: Auth, tool: string): Promise<any | null> {
  return call(auth, "POST", "/v1/devices/claim-tool", { tool }, RECALL_TIMEOUT_MS);
}

// ── the MCP surface: explicit remember / forget / status ─────────────────────────
// These back the plugin's MCP tools (recall/recent already exist above). An explicit
// user "remember" is tagged `manual` — the server enricher treats manual memories as
// untouchable — plus the tool id for attribution. Mirrors the Python do_remember.

/** Deposit ONE memory the user explicitly asked to keep. Client-side scrubbing is
 *  mandatory here too: deliberate MCP saves get the same on-device secret boundary
 *  as automatic capture. Returns the server id (so a later `forget` can target it),
 *  or null on failure. */
export async function remember(auth: Auth, opts: RememberOptions): Promise<string | null> {
  const t = scrub(opts.text || "")[0].trim();
  if (!t) return null;
  const client_id = randomUUID().replace(/-/g, "");
  const tags = [...new Set(["cursor", "manual", ...(opts.tags || [])])];
  const item: DepositItem = {
    client_id, text: t, polarity: "open", evidence_grade: "anecdotal",
    scope_note: null, tags,
  };
  const data = await call(auth, "POST", "/v1/memories/batch", { items: [item] }, DEPOSIT_TIMEOUT_MS);
  if (!data) return null;
  const results = Array.isArray(data.results) ? data.results : [];
  const row = results.find((r: any) => r?.client_id === client_id) ?? results[0];
  return row?.id ?? client_id; // durable server id when settled, else the idempotency key
}

/** DELETE /v1/memories/<id>. Success = REACHED and 2xx (the body may be empty, so we
 *  don't route it through call()'s JSON parse). A verified 401/403 retires the token. */
export async function forget(auth: Auth, id: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RECALL_TIMEOUT_MS);
  try {
    const res = await fetch(auth.server.replace(/\/+$/, "") + `/v1/memories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
      signal: ctrl.signal,
    });
    if (res.status === 401 || res.status === 403) {
      if (res.headers?.get("x-atlaso-response") === "1") retireForAuth(auth);
      return false;
    }
    return res.ok;
  } catch {
    return false; // offline / transient — the memory stays; caller says "try again"
  } finally {
    clearTimeout(timer);
  }
}

/** GET /v1/health — {fmi, deposit_count} for the status tool. null on any error. */
export async function health(auth: Auth): Promise<any | null> {
  return call(auth, "GET", "/v1/health", null, RECALL_TIMEOUT_MS);
}
