#!/usr/bin/env bash
#
# validate-workflows.sh
#
# Validates GitHub Actions workflow files for syntax errors, best-practice
# violations, and common security issues.
#
# Usage:
#   ./scripts/validate-workflows.sh [workflow-dir]
#
# Arguments:
#   workflow-dir  Path to the workflows directory (default: .github/workflows)
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#
# Dependencies (optional but recommended):
#   - actionlint  (https://github.com/rhysd/actionlint)
#   - yamllint    (https://github.com/adrienverge/yamllint)
#   - python3     (for YAML parsing fallback)

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

WORKFLOW_DIR="${1:-.github/workflows}"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# ─── Helper Functions ───────────────────────────────────────────────────────────

info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[PASS]${NC}  %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; WARNINGS=$((WARNINGS + 1)); }
fail()    { printf "${RED}[FAIL]${NC}  %s\n" "$*"; ERRORS=$((ERRORS + 1)); }

command_exists() { command -v "$1" &> /dev/null; }

# ─── Pre-flight Checks ─────────────────────────────────────────────────────────

if [[ ! -d "$WORKFLOW_DIR" ]]; then
  info "Workflow directory '$WORKFLOW_DIR' does not exist. Nothing to validate."
  exit 0
fi

WORKFLOW_FILES=()
while IFS= read -r -d '' file; do
  WORKFLOW_FILES+=("$file")
done < <(find "$WORKFLOW_DIR" -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) -print0 2>/dev/null)

if [[ ${#WORKFLOW_FILES[@]} -eq 0 ]]; then
  info "No workflow files found in '$WORKFLOW_DIR'. Nothing to validate."
  exit 0
fi

info "Found ${#WORKFLOW_FILES[@]} workflow file(s) in '$WORKFLOW_DIR'"
echo ""

# ─── Check 1: YAML Syntax ──────────────────────────────────────────────────────

info "── Check 1: YAML Syntax ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")

  if command_exists yamllint; then
    if yamllint -d relaxed "$file" > /dev/null 2>&1; then
      success "$basename_file — valid YAML (yamllint)"
    else
      fail "$basename_file — invalid YAML"
      yamllint -d relaxed "$file" 2>&1 | head -10 | sed 's/^/       /'
    fi
  elif command_exists python3; then
    if python3 -c "import yaml, sys; yaml.safe_load(open('$file'))" 2>/dev/null; then
      success "$basename_file — valid YAML (python3)"
    else
      fail "$basename_file — invalid YAML"
    fi
  else
    warn "$basename_file — skipped (install yamllint or python3 for YAML validation)"
  fi
done
echo ""

# ─── Check 2: actionlint ───────────────────────────────────────────────────────

info "── Check 2: actionlint ──"

if command_exists actionlint; then
  for file in "${WORKFLOW_FILES[@]}"; do
    basename_file=$(basename "$file")
    output=$(actionlint "$file" 2>&1)
    if [[ -z "$output" ]]; then
      success "$basename_file — no actionlint errors"
    else
      fail "$basename_file — actionlint found issues:"
      echo "$output" | head -20 | sed 's/^/       /'
    fi
  done
else
  warn "actionlint not installed — skipping (install: https://github.com/rhysd/actionlint)"
fi
echo ""

# ─── Check 3: Pinned Action Versions ───────────────────────────────────────────

info "── Check 3: Pinned Action Versions ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  unpinned=$(grep -n 'uses:' "$file" \
    | grep -v '@[a-f0-9]\{40\}' \
    | grep -v 'uses: \./' \
    | grep -v '^\s*#' \
    || true)

  if [[ -z "$unpinned" ]]; then
    success "$basename_file — all actions pinned to SHAs"
  else
    warn "$basename_file — actions not pinned to full SHA:"
    echo "$unpinned" | sed 's/^/       /'
  fi
done
echo ""

# ─── Check 4: Permissions Declared ─────────────────────────────────────────────

info "── Check 4: Permissions Block ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  if grep -q '^permissions:' "$file"; then
    success "$basename_file — top-level permissions declared"
  else
    warn "$basename_file — no top-level 'permissions:' block (defaults to read-write)"
  fi
done
echo ""

# ─── Check 5: Concurrency Groups ───────────────────────────────────────────────

info "── Check 5: Concurrency Groups ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  if grep -q '^concurrency:' "$file"; then
    success "$basename_file — concurrency group configured"
  else
    warn "$basename_file — no 'concurrency:' block (duplicate runs may waste resources)"
  fi
done
echo ""

# ─── Check 6: Timeout Set ──────────────────────────────────────────────────────

info "── Check 6: Job Timeouts ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  if grep -q 'timeout-minutes:' "$file"; then
    success "$basename_file — timeout-minutes configured"
  else
    warn "$basename_file — no 'timeout-minutes:' found (jobs default to 6 hours)"
  fi
done
echo ""

# ─── Check 7: pull_request_target Safety ────────────────────────────────────────

info "── Check 7: pull_request_target Safety ──"

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  if grep -q 'pull_request_target' "$file"; then
    if grep -q 'actions/checkout' "$file" && grep -q 'pull_request.head' "$file"; then
      fail "$basename_file — uses pull_request_target with checkout of PR HEAD (security risk!)"
    else
      warn "$basename_file — uses pull_request_target (review carefully for security)"
    fi
  else
    success "$basename_file — no pull_request_target usage"
  fi
done
echo ""

# ─── Check 8: Secrets Not Hard-coded ───────────────────────────────────────────

info "── Check 8: Hard-coded Secrets ──"

SECRET_PATTERNS='(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|gho_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{48})'

for file in "${WORKFLOW_FILES[@]}"; do
  basename_file=$(basename "$file")
  if grep -qE "$SECRET_PATTERNS" "$file"; then
    fail "$basename_file — possible hard-coded secret detected!"
  else
    success "$basename_file — no hard-coded secrets found"
  fi
done
echo ""

# ─── Summary ────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -gt 0 ]]; then
  printf "${RED}RESULT: %d error(s), %d warning(s)${NC}\n" "$ERRORS" "$WARNINGS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  printf "${YELLOW}RESULT: 0 errors, %d warning(s)${NC}\n" "$WARNINGS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  printf "${GREEN}RESULT: All checks passed!${NC}\n"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
