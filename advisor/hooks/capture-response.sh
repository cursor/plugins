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

jq -r '.text // empty' <<< "$HOOK_INPUT" | tail -c 400 > "$LAST_RESPONSE_FILE"
exit 0
