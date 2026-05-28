#!/bin/bash
# founder-gtm sessionStart hook
#
# Fires on every new agent session. In each project, surfaces a one-time
# welcome message suggesting /gtm-setup if the founder hasn't already
# built a sales pack here.
#
# Gates (silent unless ALL pass):
#   1. We can identify cwd
#   2. No sales-pack.md exists in cwd (founder isn't already set up)
#   3. No .gtm-state/welcomed marker (we haven't already nagged in this project)
#
# Always sets the marker before emitting output, so even if the founder
# ignores the welcome they only see it once per project.

set -eu

input=$(cat 2>/dev/null || true)
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || true)

# Fall back to PWD if cwd isn't in the hook input
if [ -z "${cwd:-}" ]; then
  cwd="${PWD:-}"
fi

# Bail if we still can't identify cwd
if [ -z "${cwd:-}" ] || [ ! -d "$cwd" ]; then
  printf '%s\n' '{}'
  exit 0
fi

state_dir="$cwd/.gtm-state"
marker="$state_dir/welcomed"

# Already welcomed here, or founder already has a sales pack, silent
if [ -f "$marker" ] || [ -f "$cwd/sales-pack.md" ]; then
  mkdir -p "$state_dir" 2>/dev/null || true
  touch "$marker" 2>/dev/null || true
  printf '%s\n' '{}'
  exit 0
fi

# Set marker BEFORE emitting so a missed greeting doesn't keep re-firing
mkdir -p "$state_dir" 2>/dev/null || true
touch "$marker" 2>/dev/null || true

cat <<'JSON'
{
  "additional_context": "[founder-gtm plugin] Welcome. This project has no sales-pack.md yet. If the user wants to set up GTM outbound (sales pack interview, prospect lists, drafting X DMs / LinkedIn notes / cold email in their voice, weekly learning loop), invoke the /gtm-setup skill to begin the 30-minute onboarding. If the user wants something else, ignore this welcome and proceed with their actual request."
}
JSON
