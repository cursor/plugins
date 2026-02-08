#!/usr/bin/env bash
#
# check-aws-credentials.sh
# Pre-commit hook script to detect hardcoded AWS credentials in staged files.
# Prevents accidental commits of access keys, secret keys, and session tokens.
#

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Patterns that indicate hardcoded AWS credentials
PATTERNS=(
  # AWS Access Key ID (starts with AKIA, ABIA, ACCA, ASIA)
  '(^|[^A-Za-z0-9/+=])(A3T[A-Z0-9]|AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}([^A-Za-z0-9/+=]|$)'
  # AWS Secret Access Key (40-char base64)
  '(?i)(aws_secret_access_key|aws_secret_key|secret_access_key)\s*[=:]\s*[A-Za-z0-9/+=]{40}'
  # Hardcoded secret key assignment in code
  'secretAccessKey\s*[=:]\s*["\x27][A-Za-z0-9/+=]{40}["\x27]'
  # AWS Session Token
  '(?i)(aws_session_token|session_token)\s*[=:]\s*[A-Za-z0-9/+=]{100,}'
)

DESCRIPTION=(
  "AWS Access Key ID"
  "AWS Secret Access Key"
  "Hardcoded Secret Access Key"
  "AWS Session Token"
)

# Get list of staged files (excluding deleted files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=d 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

FOUND=0

for i in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$i]}"
  desc="${DESCRIPTION[$i]}"

  # Search staged files for the pattern
  while IFS= read -r file; do
    # Skip binary files, lock files, and common non-source files
    case "$file" in
      *.lock|*.png|*.jpg|*.jpeg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.svg)
        continue
        ;;
    esac

    # Check file content from the staging area
    matches=$(git show ":$file" 2>/dev/null | grep -Pn "$pattern" 2>/dev/null || true)

    if [ -n "$matches" ]; then
      echo -e "${RED}ERROR:${NC} Potential ${YELLOW}${desc}${NC} found in ${file}:"
      echo "$matches" | head -5
      echo ""
      FOUND=1
    fi
  done <<< "$STAGED_FILES"
done

if [ "$FOUND" -eq 1 ]; then
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}COMMIT BLOCKED: AWS credentials detected${NC}"
  echo -e "${RED}========================================${NC}"
  echo ""
  echo "To fix this:"
  echo "  1. Remove hardcoded credentials from your code"
  echo "  2. Use environment variables or AWS credential providers instead"
  echo "  3. Store secrets in AWS Secrets Manager or SSM Parameter Store"
  echo ""
  echo "If this is a false positive, you can bypass with:"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo -e "${YELLOW}✓${NC} No AWS credentials detected in staged files."
exit 0
