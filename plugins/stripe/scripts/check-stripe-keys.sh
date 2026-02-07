#!/usr/bin/env bash
#
# Pre-commit hook: Prevent committing live Stripe keys
#
# This script scans staged files for live Stripe secret keys (sk_live_*, rk_live_*)
# and restricted keys that could expose your Stripe account in production.
# Test keys (sk_test_*, pk_test_*, pk_live_*) are allowed.
#
# Exit codes:
#   0 — No live keys found, commit is safe
#   1 — Live keys detected, commit is blocked

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Patterns for live/restricted Stripe keys that must NOT be committed
BLOCKED_PATTERNS=(
  'sk_live_[a-zA-Z0-9]{10,}'
  'rk_live_[a-zA-Z0-9]{10,}'
  'whsec_[a-zA-Z0-9]{10,}'
)

# Files to exclude from scanning (e.g., this script itself, docs, configs)
EXCLUDE_PATTERNS=(
  '*.md'
  '*.mdc'
  'check-stripe-keys.sh'
  '*.lock'
  '*.png'
  '*.jpg'
  '*.svg'
  '*.ico'
)

found_keys=0
flagged_files=""

# Build the exclude arguments for grep
exclude_args=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  exclude_args="$exclude_args --exclude=$pattern"
done

# Get list of staged files (only added/modified, not deleted)
staged_files=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -z "$staged_files" ]; then
  exit 0
fi

echo -e "${YELLOW}Stripe Key Check:${NC} Scanning staged files for live Stripe keys..."

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  # Search staged file contents for blocked patterns
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
        echo -e "${RED}BLOCKED:${NC} Live Stripe key found in ${YELLOW}${file}${NC}:"
        echo "$matches" | while IFS= read -r line; do
          # Mask the key value for security
          masked=$(echo "$line" | sed -E "s/(sk_live_|rk_live_|whsec_)[a-zA-Z0-9]+/\1***REDACTED***/g")
          echo "  $masked"
        done
        found_keys=1
        flagged_files="$flagged_files\n  - $file"
      fi
    fi
  done <<< "$staged_files"
done

if [ "$found_keys" -ne 0 ]; then
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  COMMIT BLOCKED: Live Stripe keys detected!                ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Affected files:${flagged_files}"
  echo ""
  echo -e "To fix this:"
  echo -e "  1. Replace live keys with environment variable references"
  echo -e "     e.g., ${GREEN}process.env.STRIPE_SECRET_KEY${NC}"
  echo -e "  2. Use test keys (sk_test_*) in code examples and tests"
  echo -e "  3. Add sensitive files to .gitignore"
  echo ""
  echo -e "To bypass this check (NOT recommended):"
  echo -e "  ${YELLOW}git commit --no-verify${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} No live Stripe keys found in staged files."
exit 0
