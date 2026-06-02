// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Shared path / workspace helpers for the Evolver Cursor plugin hooks.
// Pure Node.js built-ins, no external dependencies. Every exported helper is
// defensive: it must never throw, because the hooks that call it are expected
// to emit valid JSON and exit 0 even under failure conditions.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// Pattern an external tool relies on for the workspace identifier: a lowercase
// hex string of at least 32 characters. Keep this in sync with the contract.
const WORKSPACE_ID_PATTERN = /^[a-f0-9]{32,}$/i;

/**
 * Return true when `candidate` is a string pointing at an existing directory.
 * Any stat failure is swallowed and treated as "not a directory".
 */
function looksLikeDir(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return false;
  }
  try {
    return fs.statSync(candidate).isDirectory();
  } catch (_err) {
    return false;
  }
}

/**
 * Resolve the directory of the user's current project.
 *
 * Preference order:
 *   1. CURSOR_PROJECT_DIR  (if it names an existing directory)
 *   2. CLAUDE_PROJECT_DIR  (if it names an existing directory)
 *   3. the process working directory
 */
function resolveProjectDir() {
  const fromCursor = process.env.CURSOR_PROJECT_DIR;
  if (looksLikeDir(fromCursor)) {
    return fromCursor;
  }
  const fromClaude = process.env.CLAUDE_PROJECT_DIR;
  if (looksLikeDir(fromClaude)) {
    return fromClaude;
  }
  return process.cwd();
}

/**
 * Determine whether `dir` lives inside a git working tree.
 * Shells out to `git rev-parse --is-inside-work-tree`. Returns false on any
 * problem (git missing, not a repo, timeout, etc.).
 */
function isGitWorkspace(dir) {
  try {
    const result = spawnSync(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      {
        cwd: looksLikeDir(dir) ? dir : undefined,
        shell: false,
        timeout: 5000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    if (result.status !== 0 || typeof result.stdout !== 'string') {
      return false;
    }
    return result.stdout.trim() === 'true';
  } catch (_err) {
    return false;
  }
}

/**
 * Return the path to the evolution memory graph (a JSONL file). Honours the
 * MEMORY_GRAPH_PATH override; otherwise defaults to a well-known location under
 * the home directory and best-effort creates the parent directory.
 */
function findMemoryGraph() {
  const override = process.env.MEMORY_GRAPH_PATH;
  if (typeof override === 'string' && override.length > 0) {
    return override;
  }
  const defaultPath = path.join(
    os.homedir(),
    '.evolver',
    'memory',
    'evolution',
    'memory_graph.jsonl'
  );
  try {
    fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
  } catch (_err) {
    // Best effort only; callers tolerate a missing directory.
  }
  return defaultPath;
}

/**
 * Walk upward from `start` looking for the directory that directly contains a
 * `.git` entry (either a directory for normal repos or a file for worktrees /
 * submodules). Returns the repo root, or null if none is found.
 */
function findRepoRoot(start) {
  let current = path.resolve(start);
  // Guard against pathological loops on weird filesystems.
  let guard = 0;
  while (guard < 256) {
    guard += 1;
    try {
      if (fs.existsSync(path.join(current, '.git'))) {
        return current;
      }
    } catch (_err) {
      // Ignore and keep climbing.
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break; // reached filesystem root
    }
    current = parent;
  }
  return null;
}

/**
 * Read the workspace-id file at `idFile`, applying symlink / regular-file
 * guards. Returns the validated id string, or null if the file is missing,
 * a symlink, not a regular file, or malformed.
 *
 * `dotEvolverDir` is the `.evolver` directory; if it is itself a symlink we
 * refuse to trust anything beneath it.
 */
function readWorkspaceIdFile(dotEvolverDir, idFile) {
  // Refuse to follow a symlinked `.evolver` directory.
  let dirStat;
  try {
    dirStat = fs.lstatSync(dotEvolverDir);
  } catch (_err) {
    return { ok: false, missing: true };
  }
  if (dirStat.isSymbolicLink()) {
    return { ok: false, missing: false };
  }

  let fileStat;
  try {
    fileStat = fs.lstatSync(idFile);
  } catch (_err) {
    // ENOENT (or similar) => treat as missing so the caller may create it.
    return { ok: false, missing: true };
  }
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    return { ok: false, missing: false };
  }

  let raw;
  try {
    raw = fs.readFileSync(idFile, 'utf8');
  } catch (_err) {
    return { ok: false, missing: false };
  }
  const value = raw.trim();
  if (WORKSPACE_ID_PATTERN.test(value)) {
    return { ok: true, id: value };
  }
  return { ok: false, missing: false };
}

/**
 * Compute the workspace root used to anchor the workspace-id file.
 *   - OPENCLAW_WORKSPACE wins if set.
 *   - Otherwise find the git repo root above `projectDir`; if that root has a
 *     `workspace/` subdirectory use it, else the root itself.
 *   - If no repo root exists, fall back to `projectDir`.
 */
function computeWorkspaceRoot(projectDir) {
  const explicit = process.env.OPENCLAW_WORKSPACE;
  if (typeof explicit === 'string' && explicit.length > 0) {
    return explicit;
  }
  const repoRoot = findRepoRoot(projectDir);
  if (!repoRoot) {
    return projectDir;
  }
  const nestedWorkspace = path.join(repoRoot, 'workspace');
  if (looksLikeDir(nestedWorkspace)) {
    return nestedWorkspace;
  }
  return repoRoot;
}

/**
 * Resolve (or lazily create) the forge-resistant workspace identifier.
 *
 * Contract with external tooling — do not change without coordination:
 *   - file path:  <workspaceRoot>/.evolver/workspace-id
 *   - file mode:  0600
 *   - format:     a single 32+ char hex string
 *
 * Returns the id string, or null when it cannot be safely read or created.
 * Never throws.
 */
function resolveWorkspaceId(projectDir) {
  try {
    const fromEnv = process.env.EVOLVER_WORKSPACE_ID;
    if (typeof fromEnv === 'string' && fromEnv.length > 0) {
      return String(fromEnv);
    }

    const workspaceRoot = computeWorkspaceRoot(projectDir);
    const dotEvolverDir = path.join(workspaceRoot, '.evolver');
    const idFile = path.join(dotEvolverDir, 'workspace-id');

    // First attempt: read an existing, trusted file.
    const existing = readWorkspaceIdFile(dotEvolverDir, idFile);
    if (existing.ok) {
      return existing.id;
    }
    if (!existing.missing) {
      // A file (or `.evolver`) is present but failed the guards. Never clobber
      // it — surface "unknown" instead.
      return null;
    }

    // File is genuinely missing: create it. Re-check the `.evolver` symlink
    // guard right before writing.
    try {
      const dirStat = fs.lstatSync(dotEvolverDir);
      if (dirStat.isSymbolicLink()) {
        return null;
      }
    } catch (_err) {
      // Does not exist yet — that is fine, mkdir below.
    }

    try {
      fs.mkdirSync(dotEvolverDir, { recursive: true });
    } catch (_err) {
      return null;
    }

    const fresh = crypto.randomBytes(16).toString('hex'); // 32 hex chars
    let fd;
    try {
      // O_EXCL + O_NOFOLLOW: fail rather than follow a symlink or overwrite a
      // racing writer's file.
      const flags =
        fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW;
      fd = fs.openSync(idFile, flags, 0o600);
      fs.writeSync(fd, fresh);
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        // Someone created it between our check and write — re-read it through
        // the same guards.
        const raced = readWorkspaceIdFile(dotEvolverDir, idFile);
        return raced.ok ? raced.id : null;
      }
      return null;
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch (_err) {
          // ignore
        }
      }
    }

    // Tighten permissions in case the umask widened them.
    try {
      fs.chmodSync(idFile, 0o600);
    } catch (_err) {
      // best effort
    }
    return fresh;
  } catch (_err) {
    // EACCES / EIO / anything else: degrade to "unknown workspace".
    return null;
  }
}

module.exports = {
  resolveProjectDir,
  isGitWorkspace,
  findMemoryGraph,
  resolveWorkspaceId,
};
