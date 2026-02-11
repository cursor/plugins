#!/bin/bash

# afterAgentResponse hook for Ralph Loop.
# Checks if the agent's response contains a matching completion promise.
# If found, writes a done flag so the stop hook knows to end the loop.
#
# Input:  { "text": "<assistant response text>" }
# Output: none (fire-and-forget)

set -euo pipefail

HOOK_INPUT=$(cat)

PROJECT_DIR="${CURSOR_PROJECT_DIR:-.}"
STATE_FILE="$PROJECT_DIR/.cursor/ralph/scratchpad.md"
DONE_FLAG="$PROJECT_DIR/.cursor/ralph/done"

# No active loop, nothing to do
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Extract completion promise from state file frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE")
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')

# No promise configured, nothing to check
if [[ "$COMPLETION_PROMISE" = "null" ]] || [[ -z "$COMPLETION_PROMISE" ]]; then
  exit 0
fi

# Extract response text from hook input
RESPONSE_TEXT=$(echo "$HOOK_INPUT" | jq -r '.text // empty')

if [[ -z "$RESPONSE_TEXT" ]]; then
  exit 0
fi

# Check for <promise>TEXT</promise> in the response
PROMISE_TEXT=$(echo "$RESPONSE_TEXT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo "")

if [[ -n "$PROMISE_TEXT" ]] && [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
  touch "$DONE_FLAG"
fi

exit 0
