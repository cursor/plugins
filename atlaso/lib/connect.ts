/** Device connect — the client half of the link-only auth handshake, in TS.
 *
 * Gets a token onto this machine and writes the SHARED ~/.atlaso/auth.json (the
 * same file every connector reads), so the otherwise read-only hooks can talk to
 * the user's cloud brain. Engine-free; global fetch only.
 *
 * Flow (PKCE + loopback, RFC 8252; the brain implements the server side —
 * identical to the Python `connect.py`):
 *   1. start a one-shot HTTP listener on 127.0.0.1:<ephemeral>
 *   2. POST /v1/device/start  → send a PKCE challenge + that loopback redirect_uri,
 *                               get back a verification link
 *   3. open the link          → the user clicks "Authorize"; the browser is
 *                               redirected to OUR loopback with a one-time code
 *                               (machine-local — a phished link lands on the
 *                               victim's own 127.0.0.1, not ours)
 *   4. POST /v1/device/token  → redeem {code, code_verifier} for the token (one-time)
 *   5. write auth.json (atomic + fsync'd)
 *
 * `maybeAutoconnect()` makes 1-2 automatic: a hook calls it and, if this machine
 * isn't connected, spawns a DETACHED `bun run hooks/connect.ts` (which opens the
 * browser). Fast + best-effort — never blocks the hook, never throws.
 */
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  appendFileSync, chmodSync, closeSync, fsyncSync, mkdirSync, openSync,
  renameSync, statSync, unlinkSync, writeFileSync, writeSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { atlasoDir, authPath, defaultServer, loadAuth } from "./atlaso";
import { invalidate as invalidateVerdict } from "./state";

const LOCK_NAME = ".connecting";
const LOCK_TTL_MS = 15 * 60 * 1000;
const START_TIMEOUT_MS = 15000;
const POLL_TIMEOUT_MS = 15000;

export function hasToken(): boolean {
  return !!loadAuth()?.token;
}

function lockPath(): string {
  return join(atlasoDir(), LOCK_NAME);
}

/** Atomically + durably write {server, token, user_id, device_id} at 0600:
 *  unpredictable temp name (O_EXCL, no symlink follow), fsync the file, atomic
 *  rename, then fsync the directory. Mirrors the Python `connect.save_auth`. */
export function writeAuth(
  server: string,
  token: string,
  user_id: string,
  device_id: string | null,
): string {
  const dir = atlasoDir();
  mkdirSync(dir, { recursive: true });
  try {
    chmodSync(dir, 0o700);
  } catch {
    /* ignore */
  }
  const p = authPath();
  const data = JSON.stringify({ server, token, user_id, device_id }, null, 2);
  const tmp = join(dir, `.auth.${process.pid}.${randomUUID()}.tmp`);
  const fd = openSync(tmp, "wx", 0o600); // O_CREAT|O_EXCL|O_WRONLY, owner-only
  try {
    writeFileSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, p);
  try {
    const dfd = openSync(dir, "r"); // fsync the dir so the rename is durable
    try {
      fsyncSync(dfd);
    } finally {
      closeSync(dfd);
    }
  } catch {
    /* dir fsync best-effort */
  }
  // A fresh token = the link changed: drop any cached entitlement verdict so the
  // next op re-verifies from scratch (no stale free pass to the new credential).
  invalidateVerdict();
  return p;
}

function openBrowser(url: string): void {
  if (process.env.ATLASO_NO_BROWSER) return;
  try {
    const plt = process.platform;
    const cmd = plt === "darwin" ? "open" : plt === "win32" ? "cmd" : "xdg-open";
    const args = plt === "win32" ? ["/c", "start", "", url] : [url];
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* best-effort */
  }
}

/** fetch with a hard timeout. null on timeout/transport error. */
async function fetchT(url: string, init: RequestInit, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const b64url = (b: Buffer): string =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** (code_verifier, code_challenge) — RFC 7636 S256. The verifier never leaves this
 *  process; only its sha256 challenge is sent at /device/start. */
function pkcePair(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(48)); // 64 url-safe chars (within RFC 43..128)
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Serve the one-shot loopback callback. Resolves the one-time code once a request
 *  arrives with a matching `state` (CSRF guard), or null on timeout. Other requests
 *  (favicon, wrong state) get a 400 and are ignored. */
function waitForCode(server: Server, expectedState: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    server.on("request", (req, res) => {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      const code = u.searchParams.get("code") || "";
      const st = u.searchParams.get("state") || "";
      const ok = !!code && st === expectedState;
      const msg = ok
        ? "<h2>Atlaso connected ✓</h2><p>You can close this tab and return to your terminal.</p>"
        : "<h2>Atlaso: connection failed</h2><p>Return to your terminal and try again.</p>";
      res.writeHead(ok ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<html><body style='font-family:system-ui;max-width:30rem;margin:4rem auto;text-align:center'>${msg}</body></html>`);
      if (ok) {
        clearTimeout(timer);
        finish(code);
      }
    });
  });
}

/** Run the connect handshake to completion. 0 on success. Releases the lock. */
export async function runConnect(): Promise<number> {
  let server: Server | null = null;
  try {
    const base = (process.env.ATLASO_SERVER || loadAuth()?.server || defaultServer()).replace(/\/+$/, "");
    const label = (hostname() || "this device").slice(0, 80);
    const tool = process.env.ATLASO_TOOL || "cursor";
    const existing = loadAuth() || ({} as Record<string, any>);
    const { verifier, challenge } = pkcePair();
    const state = b64url(randomBytes(16));

    // Start a one-shot loopback listener on an ephemeral port (127.0.0.1 ONLY) —
    // RFC 8252 §7.3. The approved code is delivered here, machine-local.
    server = createServer();
    const port = await new Promise<number>((resolve) => {
      server!.once("error", () => resolve(0));
      server!.listen(0, "127.0.0.1", () => {
        const a = server!.address();
        resolve(a && typeof a === "object" ? a.port : 0);
      });
    });
    if (!port) return 1;
    const redirectUri = `http://127.0.0.1:${port}/cb`;

    const startBody: Record<string, any> = {
      label, tool: tool.slice(0, 40), code_challenge: challenge, redirect_uri: redirectUri, state,
    };
    if (existing.device_id) startBody.device_id = existing.device_id; // reconnect rotates in place

    const r = await fetchT(
      `${base}/v1/device/start`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(startBody) },
      START_TIMEOUT_MS,
    );
    if (!r || !r.ok) return 1;
    let d: any;
    try {
      d = await r.json();
    } catch {
      return 1;
    }
    const verifyUrl = d?.verification_uri_complete || d?.verification_uri || base;
    const expiresIn = parseInt(String(d?.expires_in)) || 600;

    // Surface the link even if the browser can't open (headless / xdg-open missing).
    try {
      appendFileSync(join(atlasoDir(), "connect.log"),
        `${new Date().toISOString()} authorize this device: ${verifyUrl}\n`, { mode: 0o600 });
    } catch {
      /* best-effort */
    }
    console.log(`Atlaso — authorize this device:\n  ${verifyUrl}`);
    openBrowser(verifyUrl);

    const code = await waitForCode(server, state, expiresIn * 1000);
    if (!code) return 1;

    const tr = await fetchT(
      `${base}/v1/device/token`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, code_verifier: verifier }) },
      POLL_TIMEOUT_MS,
    );
    if (!tr || tr.status !== 200) return 1;
    let t: any;
    try {
      t = await tr.json();
    } catch {
      return 1;
    }
    if (t?.status === "approved") {
      if (!t.token || !t.user_id) return 1;
      writeAuth(base, t.token, t.user_id, t.device_id ?? null);
      return 0;
    }
    return 1;
  } finally {
    try {
      server?.close();
    } catch {
      /* ignore */
    }
    releaseConnectLock();
  }
}

export function releaseConnectLock(): void {
  try {
    unlinkSync(lockPath());
  } catch {
    /* already gone */
  }
}

/** Atomically claim the connect lock (O_EXCL). false if a fresh lock exists; a
 *  stale lock (> TTL) is reclaimed. */
function acquireLock(lock: string): boolean {
  for (let i = 0; i < 2; i++) {
    try {
      const fd = openSync(lock, "wx", 0o600); // wx = O_CREAT|O_EXCL|O_WRONLY
      try {
        writeSync(fd, String(Date.now()));
      } finally {
        closeSync(fd);
      }
      return true;
    } catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs >= LOCK_TTL_MS) {
          unlinkSync(lock); // stale → reclaim and retry
          continue;
        }
      } catch {
        /* ignore */
      }
      return false;
    }
  }
  return false;
}

/** Auto-trigger (called by the recall hook): if not connected, spawn a DETACHED
 *  connect (opens the browser) and return true. No-op + false if already
 *  connected, opted out (ATLASO_NO_CONNECT), extracting, in CI, or a connect is
 *  already in flight. Fast — never blocks, never touches the network itself. */
export function maybeAutoconnect(tool = "cursor"): boolean {
  if (hasToken()) return false;
  if (process.env.ATLASO_NO_CONNECT || process.env.ATLASO_EXTRACTING || process.env.CI) return false;
  const dir = atlasoDir();
  try {
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o700);
  } catch {
    /* ignore */
  }
  const lock = lockPath();
  if (!acquireLock(lock)) return false;
  try {
    const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "hooks", "connect.ts");
    spawn("bun", ["run", entry], {
      stdio: "ignore",
      detached: true,
      env: { ...process.env, ATLASO_TOOL: tool },
    }).unref();
    return true;
  } catch {
    try {
      unlinkSync(lock); // release so a later hook can retry
    } catch {
      /* ignore */
    }
    return false;
  }
}
