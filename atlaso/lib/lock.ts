/** Cross-process advisory lock for per-tool credential minting — a real kernel
 *  lock via bun:ffi flock(2), the TS counterpart of the Python client's
 *  fcntl.flock in `_credential.py`.
 *
 *  WHY a kernel lock and not a lockfile-with-staleness: a self-managed lockfile
 *  needs a staleness rule, and every staleness rule is a TOCTOU race where two
 *  contenders both decide the other's lock is stale and stomp it. The kernel drops
 *  a flock when the holding process dies — no staleness to reason about, nothing to
 *  steal, and the lock file is NEVER unlinked (deleting a file another process holds
 *  an fd to is its own race).
 *
 *  Load-bearing invariant (never-brick): if the primitive isn't available on this
 *  platform (e.g. Windows, where flock lives under a different API), the caller must
 *  fall back to the SHARED bearer and NOT mint unlocked — so `withToolLock` yields
 *  `held: false` rather than pretending. Windows keeps running exactly as it does
 *  today (shared bearer); macOS/Linux get per-tool credentials.
 */
import { closeSync, openSync } from "node:fs";

const LOCK_EX = 2;
const LOCK_NB = 4;
const LOCK_UN = 8;
const SPIN_MS = 50;

// How long to wait for a contended lock before giving up (→ shared bearer). Shorter
// than the exchange it guards (8s), so "proceed unlocked" is never tempting. Read
// per-call (not at module load) so it stays env-overridable for tests.
function lockTimeoutMs(): number {
  const n = parseInt(process.env.ATLASO_LOCK_TIMEOUT_MS ?? "5000", 10);
  return Number.isFinite(n) ? n : 5000;
}

type FlockFn = (fd: number, op: number) => number;

// Resolve flock(2) from libc once. null = no primitive on this platform → the
// caller degrades to the shared bearer. Cached (including the null) so we probe once.
let _flock: FlockFn | null | undefined;

function resolveFlock(): FlockFn | null {
  if (_flock !== undefined) return _flock;
  const libs =
    process.platform === "darwin"
      ? ["libSystem.B.dylib"]
      : process.platform === "linux"
        ? ["libc.so.6", "libc.so"]
        : []; // win32 / others: flock is not the API — no primitive, degrade safely
  for (const lib of libs) {
    try {
      // Lazy import so a platform without bun:ffi never trips over the import itself.
      const { dlopen, FFIType } = require("bun:ffi");
      const { symbols } = dlopen(lib, {
        flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
      });
      _flock = symbols.flock as unknown as FlockFn;
      return _flock;
    } catch {
      /* try the next candidate */
    }
  }
  _flock = null;
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `fn(held)` holding an exclusive advisory lock on `lockPath`.
 *
 * - `held: true`  — the lock is ours; it's safe to exchange + write the credential.
 * - `held: false` — no primitive, couldn't open the file, or the 5s deadline passed
 *   while another instance held it. The caller MUST NOT mint; it falls back to the
 *   shared bearer and retries next run. The timeout is deliberately shorter than the
 *   exchange it guards, so "proceed unlocked" is never the tempting option.
 *
 * The lock is released (LOCK_UN) and the fd closed in `finally`, always. The lock
 * file itself is left in place — never unlinked.
 */
export async function withToolLock<T>(
  lockPath: string,
  fn: (held: boolean) => Promise<T>,
): Promise<T> {
  const flock = resolveFlock();
  if (!flock) return fn(false);

  let fd: number;
  try {
    // "a" = O_CREAT|O_WRONLY|O_APPEND — creates the lock file if absent, never
    // truncates, and we never write to it; we only need a stable fd to flock.
    fd = openSync(lockPath, "a", 0o600);
  } catch {
    return fn(false); // can't even open the lock file → don't mint unlocked
  }

  const deadline = Date.now() + lockTimeoutMs();
  let held = false;
  while (Date.now() < deadline) {
    if (flock(fd, LOCK_EX | LOCK_NB) === 0) {
      held = true;
      break;
    }
    await sleep(SPIN_MS);
  }

  try {
    return await fn(held);
  } finally {
    if (held) {
      try {
        flock(fd, LOCK_UN);
      } catch {
        /* releasing on close anyway */
      }
    }
    try {
      closeSync(fd);
    } catch {
      /* fd already gone */
    }
  }
}
