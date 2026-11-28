#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
HOOK="$SCRIPT_DIR/../capture-response.sh"
TEST_PROJECT=$(mktemp -d)
STATE_DIR="$TEST_PROJECT/.cursor/ralph"
DONE_FLAG="$STATE_DIR/done"

cleanup() {
  rm -rf "$TEST_PROJECT"
}
trap cleanup EXIT

mkdir -p "$STATE_DIR"
cat >"$STATE_DIR/scratchpad.md" <<'EOF'
---
iteration: 1
max_iterations: 10
completion_promise: "ALL TESTS PASS"
---
Run the requested task.
EOF

run_case() {
  local name=$1
  local response=$2
  local expected=$3
  local actual="absent"

  rm -f "$DONE_FLAG"
  jq -n --arg text "$response" '{text: $text}' |
    CURSOR_PROJECT_DIR="$TEST_PROJECT" bash "$HOOK"

  if [[ -f "$DONE_FLAG" ]]; then
    actual="present"
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $name (expected done flag $expected, got $actual)" >&2
    return 1
  fi

  echo "PASS: $name"
}

run_case "untagged matching text" "ALL TESTS PASS" "absent"
run_case "tagged matching text" \
  "Finished: <promise>ALL TESTS PASS</promise>" "present"
run_case "tagged text with normalized whitespace" \
  $'<promise>\n  ALL   TESTS\n  PASS  \n</promise>' "present"
run_case "tagged non-matching text" \
  "<promise>TESTS FAILED</promise>" "absent"
run_case "missing closing tag" "<promise>ALL TESTS PASS" "absent"
run_case "empty response" "" "absent"
