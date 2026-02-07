#!/usr/bin/env bash
#
# deploy.sh — Deploy the current project to Vercel
#
# Usage:
#   ./scripts/deploy.sh              # Preview deployment
#   ./scripts/deploy.sh --prod       # Production deployment
#   ./scripts/deploy.sh --help       # Show help
#
# Environment variables:
#   VERCEL_TOKEN       — Authentication token (required in CI)
#   VERCEL_ORG_ID      — Vercel organization/team ID
#   VERCEL_PROJECT_ID  — Vercel project ID
#

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Deploy the current project to Vercel.

Options:
  --prod          Deploy to production
  --prebuilt      Deploy using pre-built output (.vercel/output)
  --token TOKEN   Vercel authentication token (overrides \$VERCEL_TOKEN)
  --team TEAM     Vercel team slug or ID
  --yes           Skip confirmation prompts
  --dry-run       Run build validation without deploying
  --help          Show this help message

Environment Variables:
  VERCEL_TOKEN       Authentication token (required in CI)
  VERCEL_ORG_ID      Organization/team ID
  VERCEL_PROJECT_ID  Project ID

Examples:
  $(basename "$0")               # Preview deployment
  $(basename "$0") --prod        # Production deployment
  $(basename "$0") --dry-run     # Validate build only
EOF
}

# ─── Parse Arguments ──────────────────────────────────────────────────────────
PROD_FLAG=""
PREBUILT_FLAG=""
TOKEN_FLAG=""
TEAM_FLAG=""
YES_FLAG=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      PROD_FLAG="--prod"
      shift
      ;;
    --prebuilt)
      PREBUILT_FLAG="--prebuilt"
      shift
      ;;
    --token)
      TOKEN_FLAG="--token $2"
      shift 2
      ;;
    --team)
      TEAM_FLAG="--scope $2"
      shift 2
      ;;
    --yes)
      YES_FLAG="--yes"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# ─── Preflight Checks ────────────────────────────────────────────────────────
info "Running preflight checks..."

# Check that Vercel CLI is installed
if ! command -v vercel &>/dev/null; then
  warn "Vercel CLI not found. Installing..."
  npm install -g vercel
fi

VERCEL_VERSION=$(vercel --version 2>/dev/null | head -1)
info "Vercel CLI version: ${VERCEL_VERSION}"

# Check for package.json
if [[ ! -f "package.json" ]]; then
  error "No package.json found in the current directory."
  error "Please run this script from the project root."
  exit 1
fi

# Detect framework
FRAMEWORK="unknown"
if [[ -f "next.config.js" ]] || [[ -f "next.config.mjs" ]] || [[ -f "next.config.ts" ]]; then
  FRAMEWORK="Next.js"
elif [[ -f "nuxt.config.ts" ]] || [[ -f "nuxt.config.js" ]]; then
  FRAMEWORK="Nuxt"
elif [[ -f "svelte.config.js" ]]; then
  FRAMEWORK="SvelteKit"
elif [[ -f "astro.config.mjs" ]] || [[ -f "astro.config.ts" ]]; then
  FRAMEWORK="Astro"
elif [[ -f "remix.config.js" ]] || [[ -f "remix.config.ts" ]]; then
  FRAMEWORK="Remix"
fi

info "Detected framework: ${FRAMEWORK}"

# Check for environment variables in CI
if [[ -n "${CI:-}" ]]; then
  if [[ -z "${VERCEL_TOKEN:-}" ]] && [[ -z "${TOKEN_FLAG}" ]]; then
    error "VERCEL_TOKEN is required in CI environments."
    error "Set it as a secret in your CI provider."
    exit 1
  fi
  TOKEN_FLAG="${TOKEN_FLAG:-"--token ${VERCEL_TOKEN}"}"
fi

success "Preflight checks passed."

# ─── Build Validation ────────────────────────────────────────────────────────
info "Validating build configuration..."

# Check TypeScript errors if tsconfig exists
if [[ -f "tsconfig.json" ]]; then
  info "Running TypeScript type check..."
  if npx tsc --noEmit 2>/dev/null; then
    success "TypeScript check passed."
  else
    warn "TypeScript errors detected. The build may still succeed if errors are non-blocking."
  fi
fi

# Dry run — validate only, do not deploy
if [[ "${DRY_RUN}" == true ]]; then
  info "Dry run mode — building without deploying..."
  vercel build ${PROD_FLAG} ${TOKEN_FLAG} ${TEAM_FLAG} || {
    error "Build validation failed."
    exit 1
  }
  success "Build validation passed. No deployment was created."
  exit 0
fi

# ─── Deploy ───────────────────────────────────────────────────────────────────
DEPLOY_ENV="Preview"
if [[ -n "${PROD_FLAG}" ]]; then
  DEPLOY_ENV="Production"
fi

info "Starting ${DEPLOY_ENV} deployment..."

# shellcheck disable=SC2086
DEPLOYMENT_URL=$(vercel deploy \
  ${PROD_FLAG} \
  ${PREBUILT_FLAG} \
  ${TOKEN_FLAG} \
  ${TEAM_FLAG} \
  ${YES_FLAG} \
  2>&1 | tail -1)

if [[ -z "${DEPLOYMENT_URL}" ]] || [[ "${DEPLOYMENT_URL}" == *"Error"* ]]; then
  error "Deployment failed."
  echo "${DEPLOYMENT_URL}"
  exit 1
fi

success "Deployment complete!"
info "URL: ${DEPLOYMENT_URL}"

# ─── Post-Deploy Health Check ─────────────────────────────────────────────────
info "Running post-deployment health check..."

MAX_RETRIES=5
RETRY_DELAY=5

for i in $(seq 1 ${MAX_RETRIES}); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOYMENT_URL}" 2>/dev/null || echo "000")

  if [[ "${HTTP_STATUS}" == "200" ]]; then
    success "Health check passed (HTTP ${HTTP_STATUS})."
    break
  elif [[ "${HTTP_STATUS}" == "308" ]] || [[ "${HTTP_STATUS}" == "307" ]]; then
    success "Health check passed (HTTP ${HTTP_STATUS} — redirect detected)."
    break
  else
    if [[ ${i} -lt ${MAX_RETRIES} ]]; then
      warn "Health check attempt ${i}/${MAX_RETRIES} returned HTTP ${HTTP_STATUS}. Retrying in ${RETRY_DELAY}s..."
      sleep ${RETRY_DELAY}
    else
      warn "Health check failed after ${MAX_RETRIES} attempts (HTTP ${HTTP_STATUS})."
      warn "The deployment may still be building. Check: ${DEPLOYMENT_URL}"
    fi
  fi
done

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Deployment Summary                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Environment:  %-43s ║\n" "${DEPLOY_ENV}"
printf "║  Framework:    %-43s ║\n" "${FRAMEWORK}"
printf "║  URL:          %-43s ║\n" "${DEPLOYMENT_URL}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
