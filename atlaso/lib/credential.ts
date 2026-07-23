/** Per-tool credential resolution — the TS port of the Python client's
 *  `_credential.py` resolve()/exchange() state machine.
 *
 *  Every Atlaso integration on a machine shares ONE bearer (~/.atlaso/auth.json), so
 *  the brain can't tell two tools on a device apart — "remove tool X" can't actually
 *  stop X. The fix: each tool trades the shared bearer for its OWN credential at
 *  ~/.atlaso/tools/<tool>.json, minted via POST /v1/device/exchange, under a kernel
 *  lock only that tool participates in. The brain then keys off the tool's own token.
 *
 *  Two invariants are load-bearing (break either and the feature is a lie):
 *   1. NEVER BRICK. Only a VERIFIED verdict from our own server (x-atlaso-response: 1)
 *      may take a tool offline. A failed exchange / edge 403 / 5xx / lock-miss is NOT
 *      a verdict — keep the shared bearer and retry next run. (On a normal device the
 *      shared bearer still works on the data plane; this is the WAF-brick lesson.)
 *   2. TOMBSTONE. A verified `tool_revoked` means the user removed this tool — go
 *      local-only and do NOT fall back to the shared bearer, or we'd resurrect it.
 *      Only an EXPLICIT reconnect (the browser flow) lifts it, never this automatic path.
 */
import {
  clearToolAuth, defaultServer, loadAuth, loadToolAuth, saveToolAuth,
  toolLockPath, toolsDir, type Auth,
} from "./atlaso";
import { withToolLock } from "./lock";
import { mkdirSync } from "node:fs";
import * as state from "./state";

const EXCHANGE_TIMEOUT_MS = 8000;

/** A credential can't be attributed unless server + user + device all match the
 *  shared bearer — a reconnect into a different account must not reuse a stale
 *  tool file. A null device id is a valid legacy identity when BOTH files agree. */
function sameIdentity(a: Auth, b: Auth): boolean {
  return (
    !!a.server && !!a.user_id &&
    a.server === b.server &&
    a.user_id === b.user_id &&
    (a.device_id ?? null) === (b.device_id ?? null)
  );
}

type ExchangeResult =
  | { kind: "minted"; token: string }
  | { kind: "revoked" } // verified 403 tool_revoked — the user removed this tool
  | { kind: "not_entitled" } // verified 409 — free plan, another tool owns the slot
  | { kind: "unverified" }; // network / edge / 5xx / 200-without-token — not a verdict

/** Trade the shared bearer for this tool's own token. Only a 200-with-token mints;
 *  every unverified outcome returns `unverified` so the caller keeps the shared
 *  bearer. Verified 403 tool_revoked / 409 are the only offline-taking verdicts. */
async function exchange(shared: Auth, tool: string): Promise<ExchangeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXCHANGE_TIMEOUT_MS);
  try {
    const res = await fetch(shared.server.replace(/\/+$/, "") + "/v1/device/exchange", {
      method: "POST",
      headers: { Authorization: `Bearer ${shared.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tool }),
      signal: ctrl.signal,
    });
    const verified = res.headers?.get("x-atlaso-response") === "1";
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.token === "string" && data.token) return { kind: "minted", token: data.token };
      return { kind: "unverified" }; // 200 but no token → treat as transient, keep shared
    }
    if (verified) {
      const err = res.headers?.get("x-atlaso-error") || "";
      if (res.status === 403 && err === "tool_revoked") return { kind: "revoked" };
      if (res.status === 409) return { kind: "not_entitled" };
      // A verified 401 means the SHARED bearer itself is dead — not this tool. Fall
      // back so the subsequent data-plane call retires the shared bearer (its job).
    }
    return { kind: "unverified" };
  } catch {
    return { kind: "unverified" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the credential to make cloud calls with for `tool`.
 *   - own credential present + same identity → use it (fast path, no network).
 *   - else mint one under the kernel lock (POST /v1/device/exchange).
 *   - unverified failure / no lock → the SHARED bearer (never-brick).
 *   - verified tombstone / not-entitled → null (go local-only, do NOT fall back).
 * Returns null only when the tool must stay offline this run (or we're not connected).
 */
export async function resolveCredential(tool: string): Promise<Auth | null> {
  const shared = loadAuth();
  if (!tool) return shared ? { ...shared, source: "shared" } : null;
  // Not connected at all → nothing to mint from.
  if (!shared || !shared.token || !shared.server) return null;

  // Fast path: our own credential, provably ours → use it, no round-trip.
  const own = loadToolAuth(tool);
  if (own && sameIdentity(own, shared)) return { ...own, source: "own", tool };

  // Mint under the lock. Ensure the dir exists so the lock file can be created.
  try {
    mkdirSync(toolsDir(), { recursive: true });
  } catch {
    /* if we can't make the dir, withToolLock will fail to lock → shared bearer */
  }

  return await withToolLock(toolLockPath(tool), async (held) => {
    if (!held) {
      // No kernel lock (Windows, or contended past the deadline) → don't mint
      // unlocked; ride the shared bearer this run and retry next time.
      return { ...shared, source: "shared" } as Auth;
    }
    // Re-check under the lock — a peer may have minted while we waited.
    const fresh = loadToolAuth(tool);
    if (fresh && sameIdentity(fresh, shared)) return { ...fresh, source: "own", tool } as Auth;
    if (fresh && !sameIdentity(fresh, shared)) clearToolAuth(tool); // foreign leftover

    const r = await exchange(shared, tool);
    if (r.kind === "minted") {
      const cred = {
        server: shared.server, token: r.token,
        user_id: shared.user_id, device_id: shared.device_id, tool, version: 1,
      };
      try {
        saveToolAuth(tool, cred);
      } catch {
        /* couldn't persist — still usable this run */
      }
      // A fresh mint must not inherit the previous (dead) credential's suppression.
      state.invalidate();
      return { ...cred, source: "own" } as Auth;
    }
    if (r.kind === "revoked") {
      clearToolAuth(tool);
      // Tombstone: stay down; falling back to the shared bearer would resurrect a
      // tool the user just removed. Only an explicit reconnect lifts this.
      state.setLocalOnly(state.REVOKED, { tool, device_id: shared.device_id ?? null });
      return null;
    }
    if (r.kind === "not_entitled") {
      // Free plan, a different tool owns the single slot → local-only. Don't fall
      // back to the shared bearer (that would let this tool masquerade as entitled).
      state.setLocalOnly(state.NOT_ENTITLED, { tool, device_id: shared.device_id ?? null });
      return null;
    }
    // Unverified → never-brick: keep the shared bearer, retry next run.
    return { ...shared, source: "shared" } as Auth;
  });
}
