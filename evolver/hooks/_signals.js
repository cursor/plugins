// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Keyword-based evolution signal detection. Shared by the afterFileEdit and
// stop hooks. Deliberately simple: substring matching against a small,
// hand-curated keyword table, with a heuristic to skip code/comment lines.

'use strict';

// Each signal category maps to a set of lowercase trigger phrases. A category
// fires if any of its phrases appears as a substring of the (lowercased) text.
const SIGNAL_KEYWORDS = {
  perf_bottleneck: [
    'timeout',
    'slow',
    'latency',
    'bottleneck',
    'oom',
    'out of memory',
    'performance',
  ],
  capability_gap: [
    'not supported',
    'unsupported',
    'not implemented',
    'missing feature',
    'not available',
  ],
  log_error: [
    'error:',
    'exception:',
    'typeerror',
    'referenceerror',
    'syntaxerror',
    'failed',
  ],
  user_feature_request: [
    'add feature',
    'implement',
    'new function',
    'new module',
    'please add',
  ],
  recurring_error: [
    'same error',
    'still failing',
    'not fixed',
    'keeps failing',
    'repeatedly',
  ],
  deployment_issue: [
    'deploy failed',
    'build failed',
    'ci failed',
    'pipeline',
    'rollback',
  ],
  test_failure: [
    'test failed',
    'test failure',
    'assertion',
    'expect(',
    'assert.',
  ],
};

// Prefixes that mark a line as "probably code or a comment" — we skip those to
// cut down on false positives from source files that merely mention keywords.
const CODE_LINE_PREFIXES = ['//', '#', '*', '{', '[', '}', ']', '/*'];

function looksLikeCode(trimmedLine) {
  for (const prefix of CODE_LINE_PREFIXES) {
    if (trimmedLine.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect evolution signals within free-form text.
 *
 * @param {string} text
 * @returns {string[]} sorted, de-duplicated list of signal category names
 */
function detectSignals(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }

  // Build the prose-only corpus: drop lines that look like code/comments.
  const prose = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return false;
      }
      return !looksLikeCode(trimmed);
    })
    .join('\n')
    .toLowerCase();

  if (!prose) {
    return [];
  }

  const found = new Set();
  for (const [category, phrases] of Object.entries(SIGNAL_KEYWORDS)) {
    for (const phrase of phrases) {
      if (prose.indexOf(phrase) !== -1) {
        found.add(category);
        break;
      }
    }
  }
  return Array.from(found).sort();
}

module.exports = { detectSignals, SIGNAL_KEYWORDS };
