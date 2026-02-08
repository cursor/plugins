#!/usr/bin/env bash
#
# deploy-cdk.sh
# Deploy an AWS CDK project with validation, diff, and safety checks.
# Usage: ./scripts/deploy-cdk.sh [environment] [--skip-tests] [--force]
#
# Examples:
#   ./scripts/deploy-cdk.sh dev
#   ./scripts/deploy-cdk.sh staging
#   ./scripts/deploy-cdk.sh prod
#   ./scripts/deploy-cdk.sh dev --skip-tests
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
ENVIRONMENT="${1:-dev}"
SKIP_TESTS=false
FORCE=false

# Parse flags
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true ;;
    --force) FORCE=true ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
  shift
done

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AWS CDK Deployment Pipeline        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo ""

# ─── Step 1: Validate AWS credentials ────────────────────────────────────────

echo -e "${BLUE}[1/7]${NC} Validating AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo -e "${RED}ERROR: AWS credentials are not configured or expired.${NC}"
  echo "Run 'aws sso login' or configure credentials in ~/.aws/credentials"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
REGION="${AWS_REGION:-us-east-1}"
echo -e "  Account: ${GREEN}${ACCOUNT_ID}${NC}"
echo -e "  Region:  ${GREEN}${REGION}${NC}"
echo ""

# ─── Step 2: Production safety checks ────────────────────────────────────────

if [[ "$ENVIRONMENT" == "prod" || "$ENVIRONMENT" == "production" ]]; then
  echo -e "${YELLOW}⚠  Production deployment detected${NC}"

  if [[ "$FORCE" != true ]]; then
    # Check we are on the main branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
      echo -e "${RED}ERROR: Production deployments must be from the main/master branch.${NC}"
      echo -e "Current branch: ${YELLOW}${CURRENT_BRANCH}${NC}"
      echo "Use --force to override."
      exit 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
      echo -e "${RED}ERROR: Uncommitted changes detected. Commit or stash before deploying to production.${NC}"
      exit 1
    fi
  fi
  echo ""
fi

# ─── Step 3: Install dependencies ────────────────────────────────────────────

echo -e "${BLUE}[2/7]${NC} Installing dependencies..."
npm ci --silent
echo -e "  ${GREEN}✓${NC} Dependencies installed"
echo ""

# ─── Step 4: Run tests ───────────────────────────────────────────────────────

if [[ "$SKIP_TESTS" == true ]]; then
  echo -e "${YELLOW}[3/7] Skipping tests (--skip-tests)${NC}"
else
  echo -e "${BLUE}[3/7]${NC} Running tests..."

  # Type checking
  echo -e "  Running type checks..."
  npx tsc --noEmit
  echo -e "  ${GREEN}✓${NC} Type checks passed"

  # Unit tests
  echo -e "  Running unit tests..."
  npm test -- --silent 2>&1 || {
    echo -e "${RED}ERROR: Tests failed. Fix test failures before deploying.${NC}"
    exit 1
  }
  echo -e "  ${GREEN}✓${NC} All tests passed"
fi
echo ""

# ─── Step 5: Synthesize ──────────────────────────────────────────────────────

echo -e "${BLUE}[4/7]${NC} Synthesizing CloudFormation templates..."
npx cdk synth --context environment="$ENVIRONMENT" --quiet
echo -e "  ${GREEN}✓${NC} Synthesis complete"
echo ""

# ─── Step 6: Diff ────────────────────────────────────────────────────────────

echo -e "${BLUE}[5/7]${NC} Running diff against deployed stacks..."
echo ""
npx cdk diff --context environment="$ENVIRONMENT" 2>&1 || true
echo ""

# ─── Step 7: Deploy ──────────────────────────────────────────────────────────

APPROVAL_LEVEL="broadening"
if [[ "$ENVIRONMENT" == "prod" || "$ENVIRONMENT" == "production" ]]; then
  APPROVAL_LEVEL="broadening"
fi

echo -e "${BLUE}[6/7]${NC} Deploying to ${GREEN}${ENVIRONMENT}${NC}..."
npx cdk deploy --all \
  --context environment="$ENVIRONMENT" \
  --require-approval "$APPROVAL_LEVEL" \
  --outputs-file "cdk-outputs-${ENVIRONMENT}.json" \
  --ci

echo ""
echo -e "  ${GREEN}✓${NC} Deployment complete"
echo ""

# ─── Step 8: Post-deploy verification ────────────────────────────────────────

echo -e "${BLUE}[7/7]${NC} Post-deployment verification..."

if [[ -f "cdk-outputs-${ENVIRONMENT}.json" ]]; then
  echo -e "  Stack outputs saved to: ${GREEN}cdk-outputs-${ENVIRONMENT}.json${NC}"
  echo ""
  cat "cdk-outputs-${ENVIRONMENT}.json"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deployment Successful! 🎉         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "Account:     ${GREEN}${ACCOUNT_ID}${NC}"
echo -e "Region:      ${GREEN}${REGION}${NC}"
echo -e "Timestamp:   ${GREEN}$(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
