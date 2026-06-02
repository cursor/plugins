// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Cursor hook: stop.
// Records the outcome of the session by inspecting the git diff of the project
// directory, writing a memory-graph entry (and optionally posting to a Hub),
// and leaving a breadcrumb in the evolution log.
//
// Invocation: `node session-end.js` with a JSON object on stdin.
// Output: a JSON object on stdout, exit 0. On any failure: `{}`.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { resolveProjectDir, findMemoryGraph, resolveWorkspaceId } = require('./_paths');
const { detectSignals } = require('./_signals');

const STDIN_WATCHDOG_MS = 7000;
const GIT_TIMEOUT_MS = 5000;
const GIT_MAX_BUFFER = 10 * 1024 * 1024; // 10 MB
const HUB_TIMEOUT_MS = 8000;

let alreadyEmitted = false;

/** Emit JSON exactly once and exit. */
function emit(obj) {
  if (alreadyEmitted) {
    return;
  }
  alreadyEmitted = true;
  let text = '{}';
  try {
    text = JSON.stringify(obj);
  } catch (_err) {
    text = '{}';
  }
  process.stdout.write(text);
  process.exit(0);
}

/**
 * Append a timestamped line to the evolution log. Best effort; never throws.
 */
function appendEvolutionLog(line) {
  try {
    const dir =
      process.env.EVOLVER_HOOK_LOG_DIR ||
      path.join(os.homedir(), '.evolver', 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'evolution.log');
    fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
  } catch (_err) {
    // best effort
  }
}

/** Run a git subcommand in `cwd`, returning { status, stdout } (stdout = ''). */
function git(args, cwd) {
  try {
    const result = spawnSync('git', args, {
      cwd,
      shell: false,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      status: typeof result.status === 'number' ? result.status : 1,
      stdout: typeof result.stdout === 'string' ? result.stdout : '',
    };
  } catch (_err) {
    return { status: 1, stdout: '' };
  }
}

/**
 * Collect the git diff for the session.
 *   - statText: output of `git diff --stat HEAD~1`, falling back to plain diff.
 *   - body: output of `git diff --no-color HEAD~1`, likewise with fallback.
 *   - isRepo: whether we're inside a git work tree.
 */
function collectDiff(projectDir) {
  const insideTree = git(['rev-parse', '--is-inside-work-tree'], projectDir);
  const isRepo = insideTree.status === 0 && insideTree.stdout.trim() === 'true';

  let stat = git(['diff', '--stat', 'HEAD~1'], projectDir);
  if (stat.status !== 0) {
    stat = git(['diff', '--stat'], projectDir);
  }

  let body = git(['diff', '--no-color', 'HEAD~1'], projectDir);
  if (body.status !== 0) {
    body = git(['diff', '--no-color'], projectDir);
  }

  return {
    isRepo,
    statText: stat.stdout || '',
    body: body.stdout || '',
  };
}

/**
 * Parse "N files changed, A insertions(+), D deletions(-)" from a --stat tail.
 * Missing pieces default to 0.
 */
function parseStat(statText) {
  const files = (statText.match(/(\d+)\s+files?\s+changed/) || [])[1];
  const ins = (statText.match(/(\d+)\s+insertions?\(\+\)/) || [])[1];
  const del = (statText.match(/(\d+)\s+deletions?\(-\)/) || [])[1];
  return {
    files: files ? parseInt(files, 10) : 0,
    insertions: ins ? parseInt(ins, 10) : 0,
    deletions: del ? parseInt(del, 10) : 0,
  };
}

/** True when running inside the Cursor host (unless explicitly forced verbose). */
function isCursorHost() {
  const verbose = process.env.EVOLVER_HOOK_VERBOSE;
  if (verbose === '1' || verbose === 'true') {
    return false; // escape hatch: always speak up
  }
  return (
    process.env.EVOLVER_HOOK_HOST === 'cursor' ||
    process.env.TERM_PROGRAM === 'cursor' ||
    typeof process.env.CURSOR_TRACE_ID === 'string' ||
    typeof process.env.CURSOR_SESSION_ID === 'string'
  );
}

/**
 * Attempt to POST the outcome to a configured Hub via curl. Returns true on a
 * zero-exit curl. Never throws.
 */
function recordToHub(payload) {
  try {
    const hubUrl = process.env.EVOMAP_HUB_URL || process.env.A2A_HUB_URL;
    const apiKey = process.env.EVOMAP_API_KEY || process.env.A2A_NODE_SECRET;
    if (!hubUrl || !apiKey) {
      return false;
    }
    const url = `${hubUrl.replace(/\/+$/, '')}/a2a/evolution/record`;
    const result = spawnSync(
      'curl',
      [
        '-s',
        '-S',
        '-X',
        'POST',
        '-H',
        'Content-Type: application/json',
        '-H',
        `Authorization: Bearer ${apiKey}`,
        '--max-time',
        '8',
        '--data-binary',
        JSON.stringify(payload),
        url,
      ],
      {
        shell: false,
        timeout: HUB_TIMEOUT_MS,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    return result.status === 0;
  } catch (_err) {
    return false;
  }
}

/**
 * Append one JSON entry to the memory graph. The field shape here is a hard
 * contract consumed by external tooling — keep it exact. Returns true on
 * success.
 */
function recordToLocal(entry) {
  try {
    const graphPath = findMemoryGraph();
    fs.mkdirSync(path.dirname(graphPath), { recursive: true });
    fs.appendFileSync(graphPath, `${JSON.stringify(entry)}\n`);
    return true;
  } catch (_err) {
    return false;
  }
}

function finish(projectDir, diff) {
  const stats = parseStat(diff.statText);
  const hasChanges = diff.statText.trim().length > 0;

  // No changes: just leave a breadcrumb, never a memory-graph entry.
  if (!hasChanges) {
    const reason = diff.isRepo
      ? 'no changes detected this session'
      : 'not a git workspace';
    appendEvolutionLog(`[Evolution] Session end: nothing recorded (${reason}).`);
    emit({});
    return;
  }

  // Changes present: derive signals / status / score.
  let signals = detectSignals(diff.body);
  if (signals.length === 0) {
    signals = ['stable_success_plateau'];
  }
  const failed = signals.includes('log_error') || signals.includes('test_failure');
  const status = failed ? 'failed' : 'success';
  const score = failed ? 0.3 : 0.8;

  const summary =
    `Session end: ${stats.files} files changed, ` +
    `+${stats.insertions}/-${stats.deletions}. Signals: [${signals.join(', ')}]`;

  // Try the Hub first (if configured).
  const hubOk = recordToHub({
    gene_id: 'ad_hoc',
    signals,
    status,
    score,
    summary,
    sender_id: process.env.EVOMAP_NODE_ID || process.env.A2A_NODE_ID,
  });

  // Always also attempt a local record.
  const localOk = recordToLocal({
    timestamp: new Date().toISOString(),
    gene_id: 'ad_hoc',
    signals,
    outcome: { status, score, note: summary },
    cwd: projectDir,
    workspace_id: resolveWorkspaceId(projectDir),
    source: 'hook:session-end',
  });

  let destination;
  if (hubOk) {
    destination = 'Hub';
  } else if (localOk) {
    destination = 'local memory';
  } else {
    destination = 'nowhere (no Hub or local path)';
  }
  const receipt = `[Evolution] Session outcome recorded to ${destination}: ${summary}`;
  appendEvolutionLog(receipt);

  // Cursor mishandles a stop-hook systemMessage (it re-injects it as a prompt),
  // so suppress output entirely when we detect the Cursor host.
  if (isCursorHost()) {
    emit({});
    return;
  }
  emit({ systemMessage: receipt });
}

// Drain stdin (we don't use it) with a watchdog, then do the work.
(function run() {
  try {
    const projectDir = resolveProjectDir();
    let done = false;

    const proceed = () => {
      if (done) {
        return;
      }
      done = true;
      try {
        const diff = collectDiff(projectDir);
        finish(projectDir, diff);
      } catch (_err) {
        emit({});
      }
    };

    const watchdog = setTimeout(() => {
      // Stdin never closed in time — emit a bare object and bail.
      if (!done) {
        done = true;
        emit({});
      }
    }, STDIN_WATCHDOG_MS);
    if (typeof watchdog.unref === 'function') {
      watchdog.unref();
    }

    process.stdin.on('data', () => {});
    process.stdin.on('end', () => {
      clearTimeout(watchdog);
      proceed();
    });
    process.stdin.on('error', () => {
      clearTimeout(watchdog);
      proceed();
    });
    process.stdin.resume();
  } catch (_err) {
    emit({});
  }
})();
