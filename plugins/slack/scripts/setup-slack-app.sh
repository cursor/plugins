#!/usr/bin/env bash
#
# setup-slack-app.sh
#
# Validates the local Slack app development environment and checks that
# required tokens, dependencies, and configuration are in place.
#
# Usage:
#   ./scripts/setup-slack-app.sh [project-dir]
#
# Arguments:
#   project-dir  Path to the Slack app project (default: current directory)
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#
# Dependencies:
#   - node (>= 18)
#   - npm

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

PROJECT_DIR="${1:-.}"
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

# ─── Check 1: Node.js ──────────────────────────────────────────────────────────

info "── Check 1: Node.js ──"

if command_exists node; then
  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    success "Node.js v${NODE_VERSION} installed (>= 18 required)"
  else
    fail "Node.js v${NODE_VERSION} is too old. Version 18+ is required."
  fi
else
  fail "Node.js is not installed. Install from https://nodejs.org/"
fi
echo ""

# ─── Check 2: npm ──────────────────────────────────────────────────────────────

info "── Check 2: npm ──"

if command_exists npm; then
  NPM_VERSION=$(npm --version)
  success "npm v${NPM_VERSION} installed"
else
  fail "npm is not installed. It should come with Node.js."
fi
echo ""

# ─── Check 3: Project Structure ────────────────────────────────────────────────

info "── Check 3: Project Structure ──"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  success "package.json found"
else
  fail "package.json not found in $PROJECT_DIR — run 'npm init -y' first"
fi

if [[ -f "$PROJECT_DIR/tsconfig.json" ]]; then
  success "tsconfig.json found"
else
  warn "tsconfig.json not found — TypeScript is recommended for Slack apps"
fi

if [[ -d "$PROJECT_DIR/src" ]]; then
  success "src/ directory found"
else
  warn "src/ directory not found — standard project structure uses src/"
fi
echo ""

# ─── Check 4: Dependencies ─────────────────────────────────────────────────────

info "── Check 4: Dependencies ──"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  check_dep() {
    local dep=$1
    local label=$2
    if grep -q "\"$dep\"" "$PROJECT_DIR/package.json"; then
      success "$label ($dep) is listed in package.json"
    else
      fail "$label ($dep) is not installed. Run: npm install $dep"
    fi
  }

  check_dep "@slack/bolt" "Slack Bolt SDK"

  if grep -q "\"@slack/web-api\"" "$PROJECT_DIR/package.json"; then
    success "Slack Web API client (@slack/web-api) is listed in package.json"
  else
    info "@slack/web-api is bundled with @slack/bolt — standalone install is optional"
  fi

  if grep -q "\"dotenv\"" "$PROJECT_DIR/package.json"; then
    success "dotenv is listed in package.json"
  else
    warn "dotenv is not installed. Recommended for managing environment variables. Run: npm install dotenv"
  fi
else
  warn "Skipping dependency checks — no package.json"
fi
echo ""

# ─── Check 5: Environment Variables ────────────────────────────────────────────

info "── Check 5: Environment Variables ──"

check_env() {
  local var_name=$1
  local description=$2
  local required=$3

  if [[ -n "${!var_name:-}" ]]; then
    # Mask the token for display
    local value="${!var_name}"
    local masked="${value:0:8}…${value: -4}"
    success "$var_name is set ($masked)"
  elif [[ -f "$PROJECT_DIR/.env" ]] && grep -q "^${var_name}=" "$PROJECT_DIR/.env" 2>/dev/null; then
    success "$var_name is defined in .env file"
  else
    if [[ "$required" == "required" ]]; then
      fail "$var_name is not set — $description"
    else
      warn "$var_name is not set — $description"
    fi
  fi
}

check_env "SLACK_BOT_TOKEN" "Bot User OAuth Token (xoxb-...) from OAuth & Permissions" "required"
check_env "SLACK_SIGNING_SECRET" "Signing Secret from App Credentials page" "required"
check_env "SLACK_APP_TOKEN" "App-Level Token (xapp-...) for Socket Mode" "optional"
echo ""

# ─── Check 6: .env Security ────────────────────────────────────────────────────

info "── Check 6: .env Security ──"

if [[ -f "$PROJECT_DIR/.env" ]]; then
  success ".env file exists"

  if [[ -f "$PROJECT_DIR/.gitignore" ]]; then
    if grep -q '\.env' "$PROJECT_DIR/.gitignore"; then
      success ".env is listed in .gitignore"
    else
      fail ".env is NOT in .gitignore — tokens may be committed to git!"
    fi
  else
    warn ".gitignore not found — create one and add .env to prevent token leaks"
  fi
else
  info "No .env file found — using system environment variables or secrets manager"
fi
echo ""

# ─── Check 7: Token Format Validation ──────────────────────────────────────────

info "── Check 7: Token Format ──"

validate_token_format() {
  local var_name=$1
  local prefix=$2
  local label=$3

  local value="${!var_name:-}"
  if [[ -z "$value" ]] && [[ -f "$PROJECT_DIR/.env" ]]; then
    value=$(grep "^${var_name}=" "$PROJECT_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2-)
  fi

  if [[ -z "$value" ]]; then
    return
  fi

  if [[ "$value" == "${prefix}"* ]]; then
    success "$label token has correct prefix ($prefix…)"
  else
    fail "$label token has incorrect format — expected prefix '$prefix'"
  fi
}

validate_token_format "SLACK_BOT_TOKEN" "xoxb-" "Bot"
validate_token_format "SLACK_APP_TOKEN" "xapp-" "App-Level"
echo ""

# ─── Check 8: Slack App Configuration Reminders ────────────────────────────────

info "── Check 8: App Dashboard Checklist ──"

echo "  Please verify the following in your Slack App dashboard (https://api.slack.com/apps):"
echo ""
echo "  □ OAuth & Permissions → Bot Token Scopes include at minimum:"
echo "      - chat:write"
echo "      - app_mentions:read (if using @mentions)"
echo "      - commands (if using slash commands)"
echo "  □ Event Subscriptions → Enabled, with these bot events subscribed:"
echo "      - app_mention"
echo "      - message.im (for DM bots)"
echo "  □ Socket Mode → Enabled (for local development)"
echo "  □ Interactivity & Shortcuts → Enabled (for buttons, modals, selects)"
echo "  □ App installed to workspace (reinstall after scope changes)"
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
