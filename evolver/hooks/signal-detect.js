// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Cursor hook: afterFileEdit.
// Inspects freshly edited content for evolution signals (errors, perf hints,
// feature requests, ...) and, when any are found, nudges the agent to consider
// recording the outcome.
//
// Invocation: `node signal-detect.js` with a JSON object on stdin.
// Output: a JSON object on stdout, exit 0. On any failure / timeout: `{}`.

'use strict';

const { detectSignals } = require('./_signals');

const STDIN_WATCHDOG_MS = 1500;

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
 * Pull the edited content out of the various shapes Cursor / Claude may use.
 */
function extractContent(input) {
  if (!input || typeof input !== 'object') {
    return '';
  }
  const ti = input.tool_input;
  if (ti && typeof ti === 'object') {
    if (typeof ti.content === 'string') return ti.content;
    if (typeof ti.new_string === 'string') return ti.new_string;
    if (typeof ti.file_content === 'string') return ti.file_content;
  }
  if (typeof input.content === 'string') return input.content;
  if (typeof input.file_content === 'string') return input.file_content;
  if (typeof input.diff === 'string') return input.diff;
  return '';
}

/**
 * Pull the edited file path out of the various shapes.
 */
function extractFilePath(input) {
  if (!input || typeof input !== 'object') {
    return '';
  }
  const ti = input.tool_input;
  if (ti && typeof ti === 'object' && typeof ti.file_path === 'string') {
    return ti.file_path;
  }
  const tr = input.tool_response;
  if (tr && typeof tr === 'object' && typeof tr.filePath === 'string') {
    return tr.filePath;
  }
  if (typeof input.path === 'string') return input.path;
  if (typeof input.file_path === 'string') return input.file_path;
  return '';
}

function process_(raw) {
  let input = {};
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch (_err) {
    input = {};
  }

  const content = extractContent(input);
  const signals = detectSignals(content);

  if (signals.length === 0) {
    emit({});
    return;
  }

  const where = extractFilePath(input) || 'edited file';
  const ctx =
    `[Evolution Signal] Detected: [${signals.join(', ')}] in ${where}. ` +
    'Consider recording this outcome.';

  emit({ additional_context: ctx, additionalContext: ctx });
}

// Drain stdin with a watchdog so we always exit promptly with valid JSON.
(function run() {
  try {
    let buffer = '';
    const watchdog = setTimeout(() => {
      try {
        process_(buffer);
      } catch (_err) {
        emit({});
      }
    }, STDIN_WATCHDOG_MS);
    if (typeof watchdog.unref === 'function') {
      watchdog.unref();
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(watchdog);
      try {
        process_(buffer);
      } catch (_err) {
        emit({});
      }
    });
    process.stdin.on('error', () => {
      clearTimeout(watchdog);
      emit({});
    });
    process.stdin.resume();
  } catch (_err) {
    emit({});
  }
})();
