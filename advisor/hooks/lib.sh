#!/bin/bash

# Shared helpers for the Advisor hooks. Source this file; do not run it.
#
# State lives in $CURSOR_PROJECT_DIR/.cursor/advisor/:
#   state.json          written by the advisor skill, kept current here
#   pending             marker: files were edited since the last consult
#   last-response.txt   tail of the latest assistant message
#   log.md              one entry per completed consult

ADVISOR_DIR="${CURSOR_PROJECT_DIR:-.}/.cursor/advisor"
STATE_FILE="$ADVISOR_DIR/state.json"
PENDING_FILE="$ADVISOR_DIR/pending"
LAST_RESPONSE_FILE="$ADVISOR_DIR/last-response.txt"
LOG_FILE="$ADVISOR_DIR/log.md"

# Exit quietly unless advisor mode is on and jq is available.
advisor_require_enabled() {
  command -v jq >/dev/null 2>&1 || exit 0
  [[ -f "$STATE_FILE" ]] || exit 0
  [[ "$(jq -r '.enabled // false' "$STATE_FILE" 2>/dev/null)" == "true" ]] || exit 0
}

# Atomically apply a jq filter to state.json.
# Usage: advisor_state_update '<filter>' [jq args...]
advisor_state_update() {
  local filter="$1"
  shift
  local tmp="${STATE_FILE}.tmp.$$"
  if jq "$@" "$filter" "$STATE_FILE" > "$tmp" 2>/dev/null; then
    mv "$tmp" "$STATE_FILE"
  else
    rm -f "$tmp"
  fi
}

# Bind the state to the first conversation that touches it and keep transcript_path
# current. Returns 1 when the hook input belongs to a different conversation, so
# callers can stay out of conversations that did not enable the advisor.
# A fresh bind also drops per-conversation markers so a re-bind cannot inherit
# the previous conversation's pending edits.
advisor_bind_conversation() {
  local input="$1"
  local conv bound transcript current
  conv=$(jq -r '.conversation_id // empty' <<< "$input")
  bound=$(jq -r '.conversation_id // empty' "$STATE_FILE")
  if [[ -n "$conv" ]]; then
    if [[ -z "$bound" ]]; then
      advisor_state_update '.conversation_id = $conv' --arg conv "$conv"
      rm -f "$PENDING_FILE" "$LAST_RESPONSE_FILE"
    elif [[ "$bound" != "$conv" ]]; then
      return 1
    fi
  fi
  transcript=$(jq -r '.transcript_path // empty' <<< "$input")
  current=$(jq -r '.transcript_path // empty' "$STATE_FILE")
  if [[ -n "$transcript" && "$transcript" != "$current" ]]; then
    advisor_state_update '.transcript_path = $path' --arg path "$transcript"
  fi
  return 0
}
