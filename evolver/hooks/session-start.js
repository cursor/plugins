// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Cursor hook: sessionStart.
// Surfaces recent, workspace-scoped evolution memory (and a one-time notice if
// the folder isn't a git repo) to the agent as additional context.
//
// Invocation: `node session-start.js` with a JSON object on stdin.
// Output: a JSON object on stdout, exit 0. On any failure: `{}`.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolveProjectDir,
  isGitWorkspace,
  findMemoryGraph,
  resolveWorkspaceId,
} = require('./_paths');
const { filterRelevant } = require('./_filter');

const MAX_SCAN_ENTRIES = 5; // how many workspace-matched entries to gather
const LINE_MAX = 200; // per-outcome line truncation
const NONGIT_TTL_MS = 30 * 60 * 1000; // throttle the non-git notice
const THROTTLE_PRUNE_MS = 24 * 60 * 60 * 1000;

const NONGIT_NOTICE =
  '[Evolver] This folder is not a git repository, so evolution memory is ' +
  'inactive (outcomes are derived from git diffs). Run `git init` here, or ' +
  'open a git project, to enable recall and recording.';

// The hook's own timeout is 3s; give stdin a slightly shorter window to drain.
const STDIN_WATCHDOG_MS = 2000;

let alreadyEmitted = false;

/**
 * Emit a JSON object exactly once and exit cleanly. Falls back to `{}` if
 * serialization somehow fails.
 */
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
 * Lightweight throttle backed by a small JSON map of key -> last-fired epoch.
 * Returns true when `key` fired within `ttlMs` (caller should suppress).
 * Otherwise records "now" and returns false. Fails open (false) on any error.
 */
function throttled(key, ttlMs) {
  try {
    const base =
      process.env.EVOLVER_SESSION_STATE_DIR ||
      path.join(os.homedir(), '.evolver');
    const stateFile = path.join(base, 'session-start-state.json');

    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (!state || typeof state !== 'object') {
        state = {};
      }
    } catch (_err) {
      state = {};
    }

    const now = Date.now();
    const last = state[key];
    if (typeof last === 'number' && now - last < ttlMs) {
      return true; // recently fired -> suppress
    }

    // Record this firing and prune stale entries.
    state[key] = now;
    for (const k of Object.keys(state)) {
      if (typeof state[k] !== 'number' || now - state[k] > THROTTLE_PRUNE_MS) {
        delete state[k];
      }
    }

    try {
      fs.mkdirSync(base, { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify(state));
    } catch (_err) {
      // best effort
    }
    return false;
  } catch (_err) {
    return false; // fail open
  }
}

/**
 * Decide whether a memory entry belongs to the current workspace.
 *   - tagged with workspace_id, our id known: match iff equal.
 *   - tagged with workspace_id, our id UNKNOWN: do not blanket-include (that
 *     would leak other workspaces' entries from a shared graph). Fall back to
 *     cwd matching: in-scope iff the entry's cwd equals currentDir; if the
 *     entry has no cwd and currentDir is unknown too, then (and only then)
 *     don't exclude.
 *   - else tagged with cwd: match iff equal (lenient only when currentDir
 *     is unknown).
 *   - untagged (no workspace_id and no cwd): always include (legacy).
 */
function belongsToWorkspace(entry, currentId, currentDir) {
  if (entry && typeof entry.workspace_id === 'string' && entry.workspace_id) {
    if (currentId === null || currentId === undefined) {
      // Cannot resolve our own id — fall back to cwd matching rather than
      // surfacing a possibly-foreign workspace's entries.
      if (typeof entry.cwd === 'string' && entry.cwd) {
        return currentDir ? entry.cwd === currentDir : false;
      }
      return !currentDir;
    }
    return entry.workspace_id === currentId;
  }
  if (entry && typeof entry.cwd === 'string' && entry.cwd) {
    if (!currentDir) {
      return true;
    }
    return entry.cwd === currentDir;
  }
  return true;
}

/**
 * Read the JSONL graph and gather up to MAX_SCAN_ENTRIES entries belonging to
 * this workspace, scanning from newest (end) to oldest. Returns them in
 * chronological order.
 */
function gatherWorkspaceEntries(graphPath, currentId, currentDir) {
  let content;
  try {
    content = fs.readFileSync(graphPath, 'utf8');
  } catch (_err) {
    return [];
  }

  const lines = content.split('\n');
  const collected = [];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (_err) {
      continue; // skip malformed lines
    }
    if (belongsToWorkspace(entry, currentId, currentDir)) {
      collected.push(entry);
      if (collected.length >= MAX_SCAN_ENTRIES) {
        break;
      }
    }
  }

  collected.reverse(); // newest-first -> chronological
  return collected;
}

/**
 * Format the human-readable outcome summary block from filtered entries.
 */
function formatSummary(outcomes) {
  const successes = outcomes.filter(
    (o) => o.outcome && o.outcome.status === 'success'
  ).length;
  const failures = outcomes.filter(
    (o) => o.outcome && o.outcome.status === 'failed'
  ).length;

  const header =
    `[Evolution Memory] Recent ${outcomes.length} outcomes ` +
    `(${successes} success, ${failures} failed):`;

  const rows = outcomes.map((entry) => {
    const outcome = entry.outcome || {};
    let icon = '?';
    if (outcome.status === 'success') {
      icon = '+';
    } else if (outcome.status === 'failed') {
      icon = '-';
    }
    const date =
      typeof entry.timestamp === 'string'
        ? entry.timestamp.slice(0, 10)
        : '??????????';
    const score =
      typeof outcome.score === 'number' ? outcome.score : '?';
    const signals = Array.isArray(entry.signals)
      ? entry.signals.slice(0, 3).join(', ')
      : '';
    const note =
      typeof outcome.note === 'string' ? outcome.note : '';
    const line = `[${icon}] ${date} score=${score} signals=[${signals}] ${note}`;
    return line.length > LINE_MAX ? line.slice(0, LINE_MAX) : line;
  });

  return (
    [header, ...rows].join('\n') +
    '\n\nUse successful approaches. Avoid repeating failed patterns.'
  );
}

function main() {
  const parts = [];
  const currentDir = resolveProjectDir();

  // 1. Non-git notice (throttled per directory).
  try {
    if (!isGitWorkspace(currentDir)) {
      if (!throttled(`nongit:${currentDir}`, NONGIT_TTL_MS)) {
        parts.push(NONGIT_NOTICE);
      }
    }
  } catch (_err) {
    // ignore — notice is optional
  }

  // 2. Workspace-scoped evolution memory.
  try {
    const graphPath = findMemoryGraph(currentDir);
    const currentId = resolveWorkspaceId(currentDir);
    const candidates = gatherWorkspaceEntries(graphPath, currentId, currentDir);
    const relevant = filterRelevant(candidates);
    if (relevant.length > 0) {
      parts.push(formatSummary(relevant));
    }
  } catch (_err) {
    // ignore — memory injection is optional
  }

  if (parts.length === 0) {
    emit({});
    return;
  }

  const joined = parts.join('\n\n');
  emit({ agent_message: joined, additionalContext: joined });
}

// This hook does not need stdin, but Cursor still pipes a JSON object. Drain it
// (so the writer never races a half-drained pipe / gets EPIPE) and only then
// run main(). A short watchdog guarantees we still run if stdin never closes.
// main() stays synchronous; we only gate when it is invoked. Guard everything.
(function run() {
  try {
    let started = false;
    const start = () => {
      if (started) {
        return;
      }
      started = true;
      try {
        main();
      } catch (_err) {
        emit({});
      }
    };

    const watchdog = setTimeout(start, STDIN_WATCHDOG_MS);
    if (typeof watchdog.unref === 'function') {
      watchdog.unref();
    }

    // Consume stdin without blocking; we don't actually use its contents.
    process.stdin.on('data', () => {});
    process.stdin.on('end', () => {
      clearTimeout(watchdog);
      start();
    });
    process.stdin.on('error', () => {
      clearTimeout(watchdog);
      start();
    });
    process.stdin.resume();
  } catch (_err) {
    emit({});
  }
})();
