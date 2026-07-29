#!/usr/bin/env bash
# Pre-action gate check — runs before risky shell commands.
# Called by hooks/hooks.json beforeShellExecution hook.
# Delegates to the published ThumbGate gate-check entrypoint.

set -euo pipefail

INPUT=$(cat)
RESULT=$(echo "$INPUT" | npx --yes --package thumbgate@latest thumbgate gate-check 2>/dev/null) || true

if [ -z "$RESULT" ]; then
  exit 0
fi

echo "$RESULT"

if echo "$RESULT" | grep -q '"permissionDecision":\s*"deny"'; then
  exit 2
fi

exit 0
