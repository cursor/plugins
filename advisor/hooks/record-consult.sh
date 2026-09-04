#!/bin/bash

# subagentStop hook for Advisor (matcher: the `advisor-subagent` subagent).
# Counts the consult, clears the pending-edits marker, and appends the advice
# to .cursor/advisor/log.md so the user can review it later.
#
# Input:  { "subagent_type": "advisor-subagent", "status": "completed"|"error"|"aborted",
#           "description": "...", "summary": "...", ...common }
# Output: none

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

HOOK_INPUT=$(cat)

advisor_require_enabled
advisor_bind_conversation "$HOOK_INPUT" || exit 0

SUBAGENT_TYPE=$(jq -r '.subagent_type // empty' <<< "$HOOK_INPUT")
STATUS=$(jq -r '.status // empty' <<< "$HOOK_INPUT")
if [[ "$SUBAGENT_TYPE" != "advisor-subagent" || "$STATUS" != "completed" ]]; then
  exit 0
fi

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
advisor_state_update '.consults = ((.consults // 0) + 1) | .last_consult_at = $now' --arg now "$NOW"
rm -f "$PENDING_FILE"

DESCRIPTION=$(jq -r '.description // "Advisor consult"' <<< "$HOOK_INPUT")
SUMMARY=$(jq -r '.summary // empty' <<< "$HOOK_INPUT" | head -c 6000)
{
  printf '## %s — %s\n\n' "$NOW" "$DESCRIPTION"
  if [[ -n "$SUMMARY" ]]; then
    printf '%s\n\n' "$SUMMARY"
  else
    printf '_No summary captured._\n\n'
  fi
} >> "$LOG_FILE"

exit 0
