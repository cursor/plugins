#!/bin/bash

# afterFileEdit hook for Advisor.
# Remembers that files changed since the last advisor consult, so the stop hook
# can ask for a pre-completion review if the turn ends without one.
#
# Input:  { "file_path": "<absolute path>", "edits": [...], ...common }
# Output: none

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

HOOK_INPUT=$(cat)

advisor_require_enabled
advisor_bind_conversation "$HOOK_INPUT" || exit 0

FILE_PATH=$(jq -r '.file_path // empty' <<< "$HOOK_INPUT")

# The plugin's own state is not work product.
case "$FILE_PATH" in
  */.cursor/advisor/*) exit 0 ;;
esac

touch "$PENDING_FILE"
exit 0
