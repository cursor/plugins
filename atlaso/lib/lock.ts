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
 *  Where flock is unavailable (Windows, or any platform without bun:ffi) we fall back
 *  to an O_EXCL lockfile — see `withExclusiveFileLock` at the bottom for why that is
 *  acceptable there and was NOT acceptable as the primary mechanism. Before that
 *  fallback existed, Windows got `held: false` on every run, which meant it never
 *  called /v1/device/exchange, never observed `tool_revoked`, and so REMOVING A TOOL
 *  DID NOT STOP IT SYNCING on Windows. Every platform now mints per-tool credentials.
 *
 *  Load-bearing invariant (never-brick): a lock we could not take is never a verdict.
 *  `held: false` still means "do not mint this run, keep the shared bearer, retry
 *  next run" — it must never take a tool offline.
 */
import { closeSync, openSync, statSync, unlinkSync, writeFileSync } from "node:fs";

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
  // Escape hatch: exercise the portable path on a machine that HAS flock. Tests use
  // it, and it makes the Windows behaviour reproducible during support triage.
  if (process.env.ATLASO_LOCK_NO_FLOCK === "1") {
    _flock = null;
    return null;
  }
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
  if (!flock) return withExclusiveFileLock(lockPath, fn);

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

// ── portable fallback lock (no flock: Windows, or any platform without bun:ffi) ──
//
// WHY THIS EXISTS. Yielding `held: false` on Windows looked conservative, but it was
// not: `resolveCredential` then returns the SHARED bearer without ever calling
// /v1/device/exchange, so the tool never mints its own credential and never observes
// a `tool_revoked` verdict. Net effect — on Windows, removing Cursor did not stop it
// syncing. The per-tool credential guarantee was simply false there.
// (cursor/plugins#157, Bugbot "Lock miss skips tool revoke", Medium/Security.)
//
// The obvious alternative — call exchange without holding a lock — is WRONG: the
// server's exchange ROTATES the credential in place (mints a new token, deletes the
// previous), so an un-persisted mint on every hook run would churn a fresh token row
// per invocation, forever.
//
// So: give Windows a real mutex instead. O_EXCL create is atomic on every platform,
// including Windows. The header above rejects lockfiles because staleness rules are
// TOCTOU races — that critique is correct, and the reason it is ACCEPTABLE here is
// the blast radius, not the absence of the race: this lock is held only across one
// exchange (≤8s), the stale threshold is an order of magnitude beyond that, and if
// two processes ever did mint concurrently the loser simply holds a rotated-away
// token, 401s on its next call, clears its own tool file and re-mints. Transient
// churn that self-heals — not corruption, and not a brick. Weighed against
// revocation silently not working on an entire operating system, that trade is easy.
const STALE_MS = 60_000;

function staleMs(): number {
  const n = parseInt(process.env.ATLASO_LOCK_STALE_MS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : STALE_MS;
}

/** Separate path from the flock lock file: the two mechanisms must never contend
 *  on the same inode, and this one is unlinked on release while that one never is. */
function exclPath(lockPath: string): string {
  return lockPath + ".excl";
}

async function withExclusiveFileLock<T>(
  lockPath: string,
  fn: (held: boolean) => Promise<T>,
): Promise<T> {
  const p = exclPath(lockPath);
  const deadline = Date.now() + lockTimeoutMs();
  let held = false;

  while (Date.now() < deadline) {
    try {
      // "wx" = O_CREAT|O_EXCL|O_WRONLY — atomic create-or-fail on all platforms.
      const fd = openSync(p, "wx", 0o600);
      try {
        writeFileSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
      } catch {
        /* diagnostics only — holding the lock is what matters */
      }
      closeSync(fd);
      held = true;
      break;
    } catch {
      // Someone holds it, or it was orphaned by a process that died mid-exchange.
      // Reclaim ONLY when far past any legitimate hold.
      try {
        if (Date.now() - statSync(p).mtimeMs > staleMs()) unlinkSync(p);
      } catch {
        /* vanished or unreadable — the next attempt settles it */
      }
      await sleep(SPIN_MS);
    }
  }

  try {
    return await fn(held);
  } finally {
    if (held) {
      try {
        unlinkSync(p); // release; an O_EXCL lock is held by the file's existence
      } catch {
        /* already reclaimed as stale — nothing to release */
      }
    }
  }
}

/** Reset the cached flock probe. Tests only — lets one process exercise both paths. */
export function _resetFlockProbeForTests(): void {
  _flock = undefined;
}
