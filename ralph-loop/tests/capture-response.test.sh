#!/bin/bash

# Tests for ralph-loop/hooks/capture-response.sh.
# Standalone (no test runner): bash ralph-loop/tests/capture-response.test.sh

set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/hooks/capture-response.sh"
FAILURES=0

run_case() {
  local name="$1" response="$2" promise="$3" expected="$4"
  local tmp
  tmp="$(mktemp -d)"
  mkdir -p "$tmp/.cursor/ralph"
  {
    echo "---"
    echo "iteration: 1"
    echo "max_iterations: 5"
    echo "completion_promise: $promise"
    echo "---"
    echo "do the thing"
  } > "$tmp/.cursor/ralph/scratchpad.md"

  jq -n --arg text "$response" '{text: $text}' \
    | CURSOR_PROJECT_DIR="$tmp" "$HOOK"

  local actual="not-done"
  [[ -f "$tmp/.cursor/ralph/done" ]] && actual="done"

  if [[ "$actual" = "$expected" ]]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name (expected $expected, got $actual)"
    FAILURES=$((FAILURES + 1))
  fi

  rm -rf "$tmp"
}

run_case "tagged promise matching"           "All good. <promise>ALL TESTS PASS</promise>" "ALL TESTS PASS" "done"
run_case "tagged promise with whitespace"    "<promise>  ALL   TESTS PASS </promise>"        "ALL TESTS PASS" "done"
run_case "untagged response equal to promise" "ALL TESTS PASS"                              "ALL TESTS PASS" "not-done"
run_case "different tagged promise"          "<promise>NOPE</promise>"                      "ALL TESTS PASS" "not-done"
run_case "unclosed tag"                      "<promise>ALL TESTS PASS"                     "ALL TESTS PASS" "not-done"
run_case "no promise configured"             "ALL TESTS PASS"                              "null"           "not-done"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "$FAILURES test(s) failed."
  exit 1
fi

echo "All tests passed."
