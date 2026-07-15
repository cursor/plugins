/** Cloud-link / tool-entitlement gate — ported from the Python client's
 *  `_online()` + `_verify_entitlement()` + `cloud_mode()`.
 *
 *  The free plan allows ONE active tool per device, and the brain does NOT
 *  enforce that on the memory endpoints — so before any cloud recall/deposit the
 *  hooks call `online()`, which checks the cached verdict and (when stale)
 *  verifies with `/v1/entitlement`, self-claiming the active slot if it's free.
 *  A non-active tool on a free plan runs LOCAL-ONLY (no cloud calls) and the
 *  recall hook surfaces an upgrade notice. Verdict is cached + (tool, device)-scoped.
 */
import { claimToolCall, entitlementCall, markRevoked, type Auth } from "./atlaso";
import * as state from "./state";

export type { Verdict } from "./state";

/** Should we attempt a cloud call right now? True = cloud-linked, False =
 *  local-only this turn. Never throws (memory must never break a turn). Hits the
 *  network only on a stale/foreign verdict (cached otherwise). */
export async function online(auth: Auth | null, tool: string, deviceId: string | null): Promise<boolean> {
  if (!auth) return false;
  try {
    const st = state.get();
    const mine = state.matches(st, tool, deviceId);
    if (st.mode === state.LOCAL_ONLY) {
      if (mine && st.reason === state.REVOKED) return false; // sticky until reconnect
      if (mine && state.isFresh(st)) return false; // trust a fresh local-only (e.g. not_entitled)
      return await verify(auth, tool, deviceId);
    }
    if (mine && state.isFresh(st)) return true; // trust a fresh linked verdict
    return await verify(auth, tool, deviceId);
  } catch {
    return false;
  }
}

/** Ask the brain + persist a scoped verdict. */
async function verify(auth: Auth, tool: string, deviceId: string | null): Promise<boolean> {
  const ent = await entitlementCall(auth);
  // null = revoked (call() already retired auth.json on 401/403) OR transient — either
  // way, don't grant a cloud window this turn; leave state unchanged to retry next time.
  if (!ent) return false;
  if (ent.needs_reconnect) {
    markRevoked(); // device gone server-side → re-authorize next session
    return false;
  }
  const grace: state.Grace | null = ent.in_grace
    ? { in_grace: true, days_left: ent.grace_days_left ?? null, tools_connected: ent.tools_connected ?? null }
    : null;
  // paid (or grace) → multi-tool; a generic/no-tool client is never gated.
  if (ent.multi_tool || !tool) {
    state.setLinked({ tool, device_id: deviceId, grace });
    return true;
  }
  // free plan: single active tool.
  let active: string | null = ent.active_tool ?? null;
  if (active == null) {
    const claimed = await claimToolCall(auth, tool); // self-claim the free slot
    if (!claimed) return false;
    active = claimed.active_tool ?? null;
  }
  if (active === tool) {
    state.setLinked({ tool, device_id: deviceId });
    return true;
  }
  state.setLocalOnly(state.NOT_ENTITLED, { active_tool: active, tool, device_id: deviceId });
  return false;
}

/** The current verdict for surfacing a user notice (no network). */
export function cloudMode(auth: Auth | null, tool: string, deviceId: string | null): state.Verdict {
  if (!auth) return { ...state.defaultState(), mode: state.LOCAL_ONLY, reason: state.NOT_CONNECTED };
  const st = state.get();
  if (!state.matches(st, tool, deviceId)) return state.defaultState(); // foreign → no notice
  return st;
}
