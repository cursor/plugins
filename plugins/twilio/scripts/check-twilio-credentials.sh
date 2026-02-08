#!/usr/bin/env bash
#
# Pre-commit hook: Prevent committing live Twilio credentials
#
# This script scans staged files for Twilio Auth Tokens, API Key Secrets,
# and other sensitive credentials that should never be committed.
# Account SIDs (AC*) are informational and allowed — Auth Tokens are not.
#
# Exit codes:
#   0 — No credentials found, commit is safe
#   1 — Credentials detected, commit is blocked

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Patterns for sensitive Twilio credentials that must NOT be committed
# Auth tokens are 32-character hex strings, API key secrets are similar
BLOCKED_PATTERNS=(
  # Twilio Auth Token (32 hex chars, often assigned to a variable)
  'TWILIO_AUTH_TOKEN\s*=\s*["\x27][a-f0-9]{32}["\x27]'
  'authToken\s*[:=]\s*["\x27][a-f0-9]{32}["\x27]'
  'AUTH_TOKEN\s*=\s*["\x27][a-f0-9]{32}["\x27]'
  # Twilio API Key Secret
  'TWILIO_API_KEY_SECRET\s*=\s*["\x27][a-zA-Z0-9]{32}["\x27]'
  'apiKeySecret\s*[:=]\s*["\x27][a-zA-Z0-9]{32}["\x27]'
)

# Files to exclude from scanning
EXCLUDE_PATTERNS=(
  '*.md'
  '*.mdc'
  'check-twilio-credentials.sh'
  '*.lock'
  '*.png'
  '*.jpg'
  '*.svg'
  '*.ico'
  '*.env.example'
  '*.env.sample'
)

found_credentials=0
flagged_files=""

# Get list of staged files (only added/modified, not deleted)
staged_files=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -z "$staged_files" ]; then
  exit 0
fi

echo -e "${YELLOW}Twilio Credential Check:${NC} Scanning staged files for Twilio credentials..."

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  while IFS= read -r file; do
    # Skip excluded file patterns
    skip=false
    for exclude in "${EXCLUDE_PATTERNS[@]}"; do
      if [[ "$file" == $exclude ]]; then
        skip=true
        break
      fi
    done
    if [ "$skip" = true ]; then
      continue
    fi

    # Check file content from the staging area
    if git show ":$file" 2>/dev/null | grep -qE "$pattern"; then
      matches=$(git show ":$file" | grep -nE "$pattern" || true)
      if [ -n "$matches" ]; then
        echo -e "${RED}BLOCKED:${NC} Twilio credential found in ${YELLOW}${file}${NC}:"
        echo "$matches" | while IFS= read -r line; do
          # Mask the credential value for security
          masked=$(echo "$line" | sed -E "s/[a-f0-9]{32}/***REDACTED***/g")
          echo "  $masked"
        done
        found_credentials=1
        flagged_files="$flagged_files\n  - $file"
      fi
    fi
  done <<< "$staged_files"
done

if [ "$found_credentials" -ne 0 ]; then
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  COMMIT BLOCKED: Twilio credentials detected!              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Affected files:${flagged_files}"
  echo ""
  echo -e "To fix this:"
  echo -e "  1. Replace credentials with environment variable references"
  echo -e "     e.g., ${GREEN}process.env.TWILIO_AUTH_TOKEN${NC}"
  echo -e "  2. Store credentials in your .env file (add .env to .gitignore)"
  echo -e "  3. Use the Twilio CLI for local development"
  echo ""
  echo -e "To bypass this check (NOT recommended):"
  echo -e "  ${YELLOW}git commit --no-verify${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} No Twilio credentials found in staged files."
exit 0
