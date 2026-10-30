#!/bin/bash

# afterAgentResponse hook for Advisor.
# Keeps the tail of the latest assistant message so the stop hook can tell
# whether the agent ended its turn with a question for the user.
#
# Input:  { "text": "<assistant response text>", ...common }
# Output: none

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

HOOK_INPUT=$(cat)

advisor_require_enabled
advisor_bind_conversation "$HOOK_INPUT" || exit 0

# Slice characters in jq: a byte cut can split a UTF-8 sequence, and BSD tr in
# the stop hook rejects the resulting invalid input.
jq -r '.text // empty | .[-400:]' <<< "$HOOK_INPUT" > "$LAST_RESPONSE_FILE"
exit 0
