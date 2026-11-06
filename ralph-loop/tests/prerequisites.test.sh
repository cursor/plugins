#!/bin/bash

# Tests for the dependency guards in ralph-loop/hooks/*.sh.
# Standalone (no test runner): bash ralph-loop/tests/prerequisites.test.sh
#
# Each case runs a hook with a PATH that contains the usual coreutils but
# deliberately omits jq (and, for one case, perl), then checks that the hook
# reports the missing tool and leaves the loop state untouched.

set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/hooks"
FAILURES=0

make_project() {
  local dir
  dir="$(mktemp -d)"
  mkdir -p "$dir/.cursor/ralph"
  cat > "$dir/.cursor/ralph/scratchpad.md" <<'EOF'
---
iteration: 1
max_iterations: 5
completion_promise: "ALL TESTS PASS"
---
do the thing
EOF
  echo "$dir"
}

# Build a PATH with everything the hooks need except the tools named in $@.
make_path_without() {
  local bindir
  bindir="$(mktemp -d)"
  local tool
  for tool in bash sh cat sed grep awk mv rm touch mktemp dirname basename jq perl; do
    case " $* " in *" $tool "*) continue ;; esac
    if command -v "$tool" >/dev/null 2>&1; then
      ln -s "$(command -v "$tool")" "$bindir/$tool"
    fi
  done
  echo "$bindir"
}

iteration_of() {
  sed -n 's/^iteration: *//p' "$1/.cursor/ralph/scratchpad.md"
}

check() {
  local name="$1" ok="$2"
  if [[ "$ok" == "1" ]]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    FAILURES=$((FAILURES + 1))
  fi
}

# --- stop hook without jq: message, exit 0, iteration not advanced, no followup

project="$(make_project)"
bindir="$(make_path_without jq)"
stdout="$(echo '{"conversation_id":"x","status":"completed","loop_count":0}' \
  | PATH="$bindir" CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/stop-hook.sh" 2>"$project/stderr")"
status=$?
check "stop-hook without jq exits 0" "$([[ $status -eq 0 ]] && echo 1 || echo 0)"
check "stop-hook without jq names jq on stderr" "$(grep -q 'jq is required' "$project/stderr" && echo 1 || echo 0)"
check "stop-hook without jq emits no followup" "$([[ -z "$stdout" ]] && echo 1 || echo 0)"
check "stop-hook without jq leaves iteration at 1" "$([[ "$(iteration_of "$project")" == "1" ]] && echo 1 || echo 0)"
rm -rf "$project" "$bindir"

# --- stop hook with jq (control): followup emitted, iteration advanced

if command -v jq >/dev/null 2>&1; then
  project="$(make_project)"
  stdout="$(echo '{"conversation_id":"x","status":"completed","loop_count":0}' \
    | CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/stop-hook.sh" 2>/dev/null)"
  check "stop-hook with jq emits followup_message" "$(printf '%s' "$stdout" | jq -e '.followup_message | test("iteration 2")' >/dev/null 2>&1 && echo 1 || echo 0)"
  check "stop-hook with jq advances iteration to 2" "$([[ "$(iteration_of "$project")" == "2" ]] && echo 1 || echo 0)"
  rm -rf "$project"
else
  echo "SKIP: control cases need jq on the host"
fi

# --- capture-response without jq / without perl: message, exit 0, no done flag

for missing in jq perl; do
  project="$(make_project)"
  bindir="$(make_path_without "$missing")"
  echo '{"text":"<promise>ALL TESTS PASS</promise>"}' \
    | PATH="$bindir" CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/capture-response.sh" 2>"$project/stderr"
  status=$?
  check "capture-response without $missing exits 0" "$([[ $status -eq 0 ]] && echo 1 || echo 0)"
  check "capture-response without $missing names $missing on stderr" "$(grep -q "$missing is required" "$project/stderr" && echo 1 || echo 0)"
  check "capture-response without $missing does not create the done flag" "$([[ ! -f "$project/.cursor/ralph/done" ]] && echo 1 || echo 0)"
  rm -rf "$project" "$bindir"
done

# --- no active loop: guards must stay silent so unrelated projects see no noise

project="$(mktemp -d)"
bindir="$(make_path_without jq)"
echo '{"conversation_id":"x","status":"completed","loop_count":0}' \
  | PATH="$bindir" CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/stop-hook.sh" 2>"$project/stderr" >/dev/null
check "stop-hook without jq is silent when no loop is active" "$([[ ! -s "$project/stderr" ]] && echo 1 || echo 0)"
rm -rf "$project" "$bindir"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "$FAILURES check(s) failed."
  exit 1
fi
echo "All checks passed."
