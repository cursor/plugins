#!/bin/bash
# founder-gtm afterFileEdit hook: scan outbound-content edits for AI tells.
#
# Fires after Write or Edit. Reads the edit JSON from stdin.
#
# Only acts when the edited file path is inside one of the actual outbound
# content directories (outreach-log/, prospects/, drafts/) under the project
# root. Anything else returns {} silently.
#
# When in scope, scans the new file content for:
#   - em dash (U+2014) and en dash (U+2013)
#   - "I hope this finds you well" and common variants
#   - "Excited to announce", "Thrilled to share", "In today's"
#   - High-risk subject patterns from gtm-cold-email: "unlock", "10x",
#     "accelerating", or a version number like "2.0:"
#
# Fail-open. If anything goes sideways, return {} so the agent is not blocked.
# The goal is surfacing AI tells, not gating saves.

set -u

input=$(cat 2>/dev/null || true)

# Extract the edited file path. Cursor's afterFileEdit payload has shifted
# across versions, so try the common keys defensively.
file_path=$(printf '%s' "$input" | jq -r '
  (.tool_input.file_path // .tool_input.path
   // .file_path // .path
   // .arguments.file_path // .arguments.path
   // empty)
' 2>/dev/null || true)

if [ -z "${file_path:-}" ] || [ ! -f "$file_path" ]; then
  printf '%s\n' '{}'
  exit 0
fi

# Only fire for files inside the outbound content dirs. Match anywhere in the
# path because Cursor may pass absolute or project-relative paths.
case "$file_path" in
  */outreach-log/*|*/prospects/*|*/drafts/*) ;;
  *) printf '%s\n' '{}'; exit 0;;
esac

# Read the saved file content. Hooks fire after the write completes, so the
# file on disk reflects the new content.
content=$(cat "$file_path" 2>/dev/null || true)
if [ -z "$content" ]; then
  printf '%s\n' '{}'
  exit 0
fi

tells=()

if printf '%s' "$content" | LC_ALL=C grep -q $'\xe2\x80\x94'; then
  tells+=("em dash (U+2014)")
fi
if printf '%s' "$content" | LC_ALL=C grep -q $'\xe2\x80\x93'; then
  tells+=("en dash (U+2013)")
fi
if printf '%s' "$content" | grep -Eiq "I hope (this|you|this email|this message) (email )?finds (you|this) (well|safe)"; then
  tells+=("\"I hope this finds you well\" or variant")
fi
if printf '%s' "$content" | grep -Eiq "Excited to announce"; then
  tells+=("\"Excited to announce\"")
fi
if printf '%s' "$content" | grep -Eiq "Thrilled to share"; then
  tells+=("\"Thrilled to share\"")
fi
if printf '%s' "$content" | grep -Eiq "In today'?s"; then
  tells+=("\"In today's\"")
fi
if printf '%s' "$content" | grep -Eiq "\bunlock\b"; then
  tells+=("high-risk subject word \"unlock\"")
fi
if printf '%s' "$content" | grep -Eq "\b10x\b"; then
  tells+=("high-risk subject word \"10x\"")
fi
if printf '%s' "$content" | grep -Eiq "\baccelerating\b"; then
  tells+=("high-risk subject word \"accelerating\"")
fi

if [ "${#tells[@]}" -eq 0 ]; then
  printf '%s\n' '{}'
  exit 0
fi

joined=""
for t in "${tells[@]}"; do
  if [ -z "$joined" ]; then joined="$t"; else joined="$joined, $t"; fi
done

msg="[voice-guide] WARNING: ${file_path} contains AI tells (${joined}). Rewrite before sending. Apply gtm-voice-guide.mdc."

jq -nc --arg m "$msg" '{additional_context: $m}' 2>/dev/null || printf '%s\n' '{}'
exit 0
