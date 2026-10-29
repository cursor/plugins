#!/bin/bash

# Tests for prompts that contain `---` lines (Markdown rules) in the body of
# .cursor/ralph/scratchpad.md.
# Standalone (no test runner): bash ralph-loop/tests/body-separators.test.sh
#
# The hooks must read the frontmatter as the block between the opening `---`
# on line 1 and the first closing `---` only, feed the prompt body back
# verbatim, and rewrite the `iteration:` line in the frontmatter alone.

set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/hooks"
FAILURES=0

check() {
  local name="$1" ok="$2"
  if [[ "$ok" == "1" ]]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    FAILURES=$((FAILURES + 1))
  fi
}

make_project() {
  local dir
  dir="$(mktemp -d)"
  mkdir -p "$dir/.cursor/ralph"
  cat > "$dir/.cursor/ralph/scratchpad.md" <<'EOF'
---
iteration: 1
max_iterations: 5
completion_promise: "ALL GREEN"
---

# Spec

---

Step A: iteration: keep this line as it is.

---

Step B.
EOF
  echo "$dir"
}

# --- stop hook: the followup carries the body verbatim, rules included

project="$(make_project)"
followup="$(echo '{"status":"completed","loop_count":0}' | CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/stop-hook.sh" 2>/tmp/ralph-stderr.$$ | jq -r '.followup_message')"
stderr="$(cat /tmp/ralph-stderr.$$)"
rm -f /tmp/ralph-stderr.$$

expected_body="$(awk 'in_body { print; next } NR == 1 && /^---$/ { in_fm = 1; next } in_fm && /^---$/ { in_body = 1 }' "$project/.cursor/ralph/scratchpad.md" | sed 's/^iteration: .*//')"
check "stop hook does not report a corrupted state file" "$([[ -z "$stderr" ]] && echo 1 || echo 0)"
check "stop hook emits a followup" "$([[ -n "$followup" ]] && echo 1 || echo 0)"
check "followup header names iteration 2 and the promise" "$([[ "$followup" == "[Ralph loop iteration 2. To complete: output <promise>ALL GREEN</promise> ONLY when genuinely true.]"* ]] && echo 1 || echo 0)"
check "followup keeps both --- rules" "$([[ "$(printf '%s\n' "$followup" | grep -c '^---$')" == "2" ]] && echo 1 || echo 0)"
check "followup keeps the body's iteration: line" "$(printf '%s\n' "$followup" | grep -q '^Step A: iteration: keep this line as it is\.$' && echo 1 || echo 0)"
check "followup ends with Step B" "$([[ "$followup" == *"Step B." ]] && echo 1 || echo 0)"

# --- stop hook: only the frontmatter iteration is rewritten

state="$project/.cursor/ralph/scratchpad.md"
check "frontmatter iteration advanced to 2" "$([[ "$(sed -n '2p' "$state")" == "iteration: 2" ]] && echo 1 || echo 0)"
check "body iteration: line untouched" "$(grep -q '^Step A: iteration: keep this line as it is\.$' "$state" && echo 1 || echo 0)"
check "state file still has exactly one frontmatter iteration line" "$([[ "$(grep -c '^iteration:' "$state")" == "1" ]] && echo 1 || echo 0)"
rm -rf "$project"

# --- capture hook: the promise is still read from the frontmatter

project="$(make_project)"
echo '{"text":"done. <promise>ALL GREEN</promise>"}' | CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/capture-response.sh"
check "capture hook sets the done flag with rules in the body" "$([[ -f "$project/.cursor/ralph/done" ]] && echo 1 || echo 0)"
rm -rf "$project"

# --- body with a second frontmatter-like block does not corrupt the loop

project="$(make_project)"
cat >> "$project/.cursor/ralph/scratchpad.md" <<'EOF'

Write a SKILL.md that starts with:

---
name: example
iteration: not a number
---
EOF
followup="$(echo '{"status":"completed","loop_count":0}' | CURSOR_PROJECT_DIR="$project" bash "$HOOKS_DIR/stop-hook.sh" 2>/dev/null | jq -r '.followup_message')"
check "a frontmatter-like block in the body does not stop the loop" "$([[ -f "$project/.cursor/ralph/scratchpad.md" && -n "$followup" ]] && echo 1 || echo 0)"
check "the quoted block comes back verbatim" "$(printf '%s\n' "$followup" | grep -q '^iteration: not a number$' && echo 1 || echo 0)"
rm -rf "$project"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "$FAILURES failure(s)"
  exit 1
fi
echo "all passed"
