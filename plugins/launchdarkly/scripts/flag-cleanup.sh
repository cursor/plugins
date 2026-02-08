#!/usr/bin/env bash
#
# flag-cleanup.sh
# LaunchDarkly feature flag hygiene utilities.
#
# Usage:
#   ./scripts/flag-cleanup.sh --check-secrets      Check for hardcoded SDK keys in staged files
#   ./scripts/flag-cleanup.sh --check-defaults      Warn about variation calls missing defaults
#   ./scripts/flag-cleanup.sh --find-stale          Find potentially stale flag references in code
#   ./scripts/flag-cleanup.sh --list-flags          List all flag keys referenced in the codebase
#
# Examples:
#   ./scripts/flag-cleanup.sh --check-secrets
#   ./scripts/flag-cleanup.sh --find-stale --days 30
#   ./scripts/flag-cleanup.sh --list-flags --format json
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="${1:---help}"
DAYS="${DAYS:-30}"
FORMAT="${FORMAT:-text}"

# Parse additional flags
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days) DAYS="$2"; shift ;;
    --format) FORMAT="$2"; shift ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
  shift
done

# ─── Check for hardcoded SDK keys ─────────────────────────────────────────────

check_secrets() {
  echo -e "${BLUE}Checking for hardcoded LaunchDarkly credentials...${NC}"

  local exit_code=0
  local staged_files

  # Get staged files (if in a git repo with staged changes)
  if git rev-parse --git-dir > /dev/null 2>&1; then
    staged_files=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
  else
    # Not in git or no staged files — scan all source files
    staged_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.env" \) \
      -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null || true)
  fi

  if [[ -z "$staged_files" ]]; then
    echo -e "  ${GREEN}✓${NC} No files to check"
    return 0
  fi

  # Pattern: LaunchDarkly SDK keys (sdk-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
  local sdk_key_pattern='sdk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'

  # Pattern: LaunchDarkly API access tokens (api-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
  local api_token_pattern='api-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'

  # Pattern: LaunchDarkly mobile keys (mob-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
  local mobile_key_pattern='mob-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$file" ]] && continue

    # Skip binary files
    if file --mime "$file" 2>/dev/null | grep -q "binary"; then
      continue
    fi

    # Check for SDK keys
    if grep -Pn "$sdk_key_pattern" "$file" 2>/dev/null; then
      echo -e "  ${RED}✗ Hardcoded SDK key found in: ${file}${NC}"
      exit_code=1
    fi

    # Check for API tokens
    if grep -Pn "$api_token_pattern" "$file" 2>/dev/null; then
      echo -e "  ${RED}✗ Hardcoded API access token found in: ${file}${NC}"
      exit_code=1
    fi

    # Check for mobile keys
    if grep -Pn "$mobile_key_pattern" "$file" 2>/dev/null; then
      echo -e "  ${RED}✗ Hardcoded mobile key found in: ${file}${NC}"
      exit_code=1
    fi
  done <<< "$staged_files"

  if [[ $exit_code -eq 0 ]]; then
    echo -e "  ${GREEN}✓${NC} No hardcoded LaunchDarkly credentials found"
  else
    echo ""
    echo -e "${RED}ERROR: Hardcoded LaunchDarkly credentials detected.${NC}"
    echo -e "Use environment variables instead:"
    echo -e "  ${YELLOW}LAUNCHDARKLY_SDK_KEY${NC} for server-side SDK keys"
    echo -e "  ${YELLOW}LAUNCHDARKLY_ACCESS_TOKEN${NC} for API access tokens"
    echo -e "  ${YELLOW}LAUNCHDARKLY_MOBILE_KEY${NC} for mobile SDK keys"
  fi

  return $exit_code
}

# ─── Check for missing default values ────────────────────────────────────────

check_defaults() {
  echo -e "${BLUE}Checking for LaunchDarkly variation calls without explicit defaults...${NC}"

  local warnings=0

  # Find variation calls — look for calls with only 2 arguments (missing default)
  # Pattern: .variation("key", context) without a third argument
  # This is a heuristic — it may produce false positives
  local files
  files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" \
    -not -path "*/test/*" -not -path "*/__tests__/*" 2>/dev/null || true)

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$file" ]] && continue

    # Look for .variation( with only two arguments before the closing paren
    # This is approximate — complex expressions may not be caught
    if grep -Pn '\.variation\s*\(\s*"[^"]+"\s*,\s*\w+\s*\)' "$file" 2>/dev/null; then
      echo -e "  ${YELLOW}⚠  Possible missing default value in: ${file}${NC}"
      ((warnings++)) || true
    fi
  done <<< "$files"

  if [[ $warnings -eq 0 ]]; then
    echo -e "  ${GREEN}✓${NC} All variation calls appear to have default values"
  else
    echo ""
    echo -e "${YELLOW}WARNING: ${warnings} file(s) may have variation calls without explicit defaults.${NC}"
    echo -e "Always provide a default value: client.variation(\"key\", context, ${YELLOW}defaultValue${NC})"
  fi

  return 0
}

# ─── Find stale flag references ──────────────────────────────────────────────

find_stale() {
  echo -e "${BLUE}Scanning for feature flag references in codebase...${NC}"
  echo ""

  # Find all variation calls and extract flag keys
  local flag_keys
  flag_keys=$(grep -rPoh '(?:boolVariation|stringVariation|numberVariation|jsonVariation|variation)\s*\(\s*"([^"]+)"' \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    . 2>/dev/null | \
    grep -oP '"[^"]+"' | tr -d '"' | sort -u || true)

  if [[ -z "$flag_keys" ]]; then
    echo -e "  ${GREEN}✓${NC} No feature flag references found in the codebase"
    return 0
  fi

  local count
  count=$(echo "$flag_keys" | wc -l)
  echo -e "  Found ${YELLOW}${count}${NC} unique flag key(s) referenced in code:"
  echo ""

  while IFS= read -r key; do
    [[ -z "$key" ]] && continue

    # Count references
    local refs
    refs=$(grep -r "$key" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | wc -l || echo 0)

    # List files
    local files
    files=$(grep -rl "$key" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | head -5 || true)

    echo -e "  ${BLUE}${key}${NC} — ${refs} reference(s)"
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      echo -e "    → ${f}"
    done <<< "$files"
    echo ""
  done <<< "$flag_keys"

  echo -e "${YELLOW}Review these flags in the LaunchDarkly dashboard to check if any are fully rolled out and ready for cleanup.${NC}"
}

# ─── List all flag keys ──────────────────────────────────────────────────────

list_flags() {
  echo -e "${BLUE}Listing all LaunchDarkly flag keys in the codebase...${NC}"
  echo ""

  local flag_keys
  flag_keys=$(grep -rPoh '(?:boolVariation|stringVariation|numberVariation|jsonVariation|variation)\s*\(\s*"([^"]+)"' \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    . 2>/dev/null | \
    grep -oP '"[^"]+"' | tr -d '"' | sort -u || true)

  if [[ -z "$flag_keys" ]]; then
    echo "No flag keys found."
    return 0
  fi

  if [[ "$FORMAT" == "json" ]]; then
    echo "["
    local first=true
    while IFS= read -r key; do
      [[ -z "$key" ]] && continue
      if [[ "$first" == true ]]; then
        echo "  \"${key}\""
        first=false
      else
        echo ", \"${key}\""
      fi
    done <<< "$flag_keys"
    echo "]"
  else
    while IFS= read -r key; do
      [[ -z "$key" ]] && continue
      echo "  • ${key}"
    done <<< "$flag_keys"
  fi
}

# ─── Help ─────────────────────────────────────────────────────────────────────

show_help() {
  echo -e "${BLUE}LaunchDarkly Flag Cleanup Utilities${NC}"
  echo ""
  echo "Usage: ./scripts/flag-cleanup.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  --check-secrets     Check for hardcoded LaunchDarkly SDK keys in staged/source files"
  echo "  --check-defaults    Warn about variation calls missing explicit default values"
  echo "  --find-stale        Find and list all feature flag references in the codebase"
  echo "  --list-flags        List all LaunchDarkly flag keys referenced in the codebase"
  echo "  --help              Show this help message"
  echo ""
  echo "Options:"
  echo "  --days N            Number of days for staleness threshold (default: 30)"
  echo "  --format FORMAT     Output format: text or json (default: text)"
  echo ""
  echo "Examples:"
  echo "  ./scripts/flag-cleanup.sh --check-secrets"
  echo "  ./scripts/flag-cleanup.sh --find-stale"
  echo "  ./scripts/flag-cleanup.sh --list-flags --format json"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

case "$MODE" in
  --check-secrets) check_secrets ;;
  --check-defaults) check_defaults ;;
  --find-stale) find_stale ;;
  --list-flags) list_flags ;;
  --help) show_help ;;
  *) echo -e "${RED}Unknown command: ${MODE}${NC}"; show_help; exit 1 ;;
esac
