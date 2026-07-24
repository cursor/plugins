/** Persisted cloud-link / entitlement verdict — ported 1:1 from the Python thin
 *  client's `state.py`. The free plan allows ONE active tool per device; the
 *  SERVER does not enforce that on the memory endpoints (by design), so each tool
 *  caches its own verdict here and self-gates. The verdict is scoped to
 *  (tool, device_id) so one tool never inherits another's, and is trusted for a
 *  short TTL before re-verifying with the brain.
 *
 *  Stored at <atlaso_dir>/cloud_state.json (next to auth.json), overridable via
 *  ATLASO_STATE. Written atomically (wx temp + fsync + rename).
 */
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { atlasoDir } from "./atlaso";

// `0` (or negative) disables caching → re-verify every call, like the Python client.
const _ttl = parseInt(process.env.ATLASO_ENTITLEMENT_TTL ?? "600", 10);
export const ENTITLEMENT_TTL = Number.isFinite(_ttl) ? _ttl : 600;

export const LINKED = "linked";
export const LOCAL_ONLY = "local_only";
export const REVOKED = "revoked";
export const NOT_ENTITLED = "not_entitled";
export const NOT_CONNECTED = "not_connected";

export interface Grace {
  in_grace: boolean;
  days_left: number | null;
  tools_connected: number | null;
}

export interface Verdict {
  mode: string; // "linked" | "local_only"
  reason: string | null; // "revoked" | "not_entitled" | "not_connected" | null
  since: number;
  checked_at: number;
  active_tool: string | null;
  tool: string | null;
  device_id: string | null;
  grace: Grace | null;
}

function statePath(): string {
  return process.env.ATLASO_STATE || join(atlasoDir(), "cloud_state.json");
}

const nowS = () => Math.floor(Date.now() / 1000);

/** An UNVERIFIED-LINKED baseline (checked_at:0 → never fresh) so first-run /
 *  foreign / corrupt state forces a re-verify rather than blocking. */
export function defaultState(): Verdict {
  return { mode: LINKED, reason: null, since: 0, checked_at: 0, active_tool: null, tool: null, device_id: null, grace: null };
}

export function get(): Verdict {
  try {
    const o = JSON.parse(readFileSync(statePath(), "utf-8"));
    if (o && typeof o === "object" && o.mode) return { ...defaultState(), ...o };
  } catch {
    /* missing / malformed → default */
  }
  return defaultState();
}

function write(v: Verdict): void {
  try {
    const target = statePath();
    const dir = dirname(target); // temp in the TARGET's dir so the rename is atomic (honors ATLASO_STATE)
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.cloud_state.${process.pid}.${randomUUID()}.tmp`);
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeFileSync(fd, JSON.stringify(v, null, 2));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, target);
  } catch {
    /* best-effort — absence just forces re-verify */
  }
}

export function setLinked(opts: { tool?: string | null; device_id?: string | null; grace?: Grace | null }): void {
  write({
    mode: LINKED, reason: null, since: 0, checked_at: nowS(), active_tool: null,
    tool: opts.tool ?? null, device_id: opts.device_id ?? null, grace: opts.grace ?? null,
  });
}

export function setLocalOnly(
  reason: string,
  opts: { active_tool?: string | null; tool?: string | null; device_id?: string | null },
): void {
  const prev = get();
  // preserve `since` across same-reason+identity rewrites (so a one-time notice isn't re-shown)
  const same = prev.mode === LOCAL_ONLY && prev.reason === reason &&
    prev.tool === (opts.tool ?? null) && prev.device_id === (opts.device_id ?? null);
  write({
    mode: LOCAL_ONLY, reason, since: same ? prev.since : nowS(), checked_at: nowS(),
    active_tool: opts.active_tool ?? null, tool: opts.tool ?? null, device_id: opts.device_id ?? null, grace: null,
  });
}

/** Drop the verdict so a fresh credential never inherits a stale free pass. */
export function invalidate(): void {
  try {
    unlinkSync(statePath());
  } catch {
    /* already gone */
  }
}

/** A verdict is authoritative only for the (tool, device_id) that produced it. */
export function matches(st: Verdict, tool: string | null | undefined, deviceId: string | null | undefined): boolean {
  return st.tool === (tool ?? null) && st.device_id === (deviceId ?? null);
}

export function isFresh(st: Verdict): boolean {
  try {
    return nowS() - (st.checked_at || 0) < ENTITLEMENT_TTL;
  } catch {
    return false;
  }
}
