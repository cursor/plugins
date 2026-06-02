// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Relevance filter for evolution memory entries. Decides which recorded
// outcomes are worth surfacing back to the agent at session start.

'use strict';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_SCORE = 0.5;
const MAX_RESULTS = 3;

/**
 * Parse an entry timestamp into epoch milliseconds, or NaN if absent/invalid.
 */
function timestampMs(entry) {
  if (!entry || typeof entry.timestamp !== 'string') {
    return NaN;
  }
  return Date.parse(entry.timestamp);
}

/**
 * Keep only recent, successful, high-scoring outcomes — at most the latest 3.
 *
 * An entry survives when ALL of the following hold:
 *   - outcome.status === 'success'
 *   - outcome.score  >= 0.5
 *   - its timestamp is within the last 7 days
 *
 * @param {Array<object>} entries
 * @returns {Array<object>}
 */
function filterRelevant(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const now = Date.now();
  const cutoff = now - SEVEN_DAYS_MS;

  const relevant = entries.filter((entry) => {
    const outcome = entry && entry.outcome;
    if (!outcome || outcome.status !== 'success') {
      return false;
    }
    if (typeof outcome.score !== 'number' || outcome.score < MIN_SCORE) {
      return false;
    }
    const ts = timestampMs(entry);
    if (Number.isNaN(ts)) {
      return false;
    }
    return ts >= cutoff && ts <= now;
  });

  // The input arrives chronologically; the most useful items are the latest,
  // so keep the tail.
  if (relevant.length > MAX_RESULTS) {
    return relevant.slice(relevant.length - MAX_RESULTS);
  }
  return relevant;
}

module.exports = { filterRelevant };
