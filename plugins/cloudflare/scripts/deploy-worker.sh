#!/usr/bin/env bash
#
# deploy-worker.sh — Deploy a Cloudflare Worker
#
# Usage:
#   ./scripts/deploy-worker.sh              # Deploy to default environment
#   ./scripts/deploy-worker.sh --env production  # Deploy to production
#   ./scripts/deploy-worker.sh --dry-run    # Validate without deploying
#   ./scripts/deploy-worker.sh --help       # Show help
#
# Environment variables:
#   CLOUDFLARE_API_TOKEN   — Authentication token (required in CI)
#   CLOUDFLARE_ACCOUNT_ID  — Cloudflare account ID
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

Deploy a Cloudflare Worker using Wrangler.

Options:
  --env ENV       Deploy to a specific environment (e.g., staging, production)
  --dry-run       Validate the build without deploying
  --migrate       Apply D1 migrations before deploying
  --tail          Stream live logs after deployment
  --yes           Skip confirmation prompts
  --help          Show this help message

Environment Variables:
  CLOUDFLARE_API_TOKEN   Authentication token (required in CI)
  CLOUDFLARE_ACCOUNT_ID  Cloudflare account ID

Examples:
  $(basename "$0")                         # Deploy to default environment
  $(basename "$0") --env production        # Deploy to production
  $(basename "$0") --env staging --migrate # Deploy with D1 migrations
  $(basename "$0") --dry-run               # Validate build only
EOF
}

# ─── Parse Arguments ──────────────────────────────────────────────────────────
ENV_FLAG=""
DRY_RUN=false
MIGRATE=false
TAIL=false
YES_FLAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_FLAG="--env $2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --migrate)
      MIGRATE=true
      shift
      ;;
    --tail)
      TAIL=true
      shift
      ;;
    --yes)
      YES_FLAG="--yes"
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

# Check that Wrangler CLI is installed
if ! command -v wrangler &>/dev/null; then
  warn "Wrangler CLI not found. Installing..."
  npm install -g wrangler
fi

WRANGLER_VERSION=$(wrangler --version 2>/dev/null | head -1)
info "Wrangler CLI version: ${WRANGLER_VERSION}"

# Check for wrangler.toml
if [[ ! -f "wrangler.toml" ]] && [[ ! -f "wrangler.jsonc" ]]; then
  error "No wrangler.toml or wrangler.jsonc found in the current directory."
  error "Please run this script from the project root."
  exit 1
fi

# Extract Worker name from wrangler.toml
WORKER_NAME="unknown"
if [[ -f "wrangler.toml" ]]; then
  WORKER_NAME=$(grep -m1 '^name' wrangler.toml | sed 's/name *= *"\(.*\)"/\1/' || echo "unknown")
fi
info "Worker name: ${WORKER_NAME}"

# Check for authentication in CI
if [[ -n "${CI:-}" ]]; then
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    error "CLOUDFLARE_API_TOKEN is required in CI environments."
    error "Set it as a secret in your CI provider."
    exit 1
  fi
fi

success "Preflight checks passed."

# ─── TypeScript Check ─────────────────────────────────────────────────────────
if [[ -f "tsconfig.json" ]]; then
  info "Running TypeScript type check..."
  if npx tsc --noEmit 2>/dev/null; then
    success "TypeScript check passed."
  else
    warn "TypeScript errors detected. The build may still succeed if errors are non-blocking."
  fi
fi

# ─── Dry Run ──────────────────────────────────────────────────────────────────
if [[ "${DRY_RUN}" == true ]]; then
  info "Dry run mode — validating build without deploying..."
  # shellcheck disable=SC2086
  wrangler deploy --dry-run --outdir /tmp/worker-build ${ENV_FLAG} || {
    error "Build validation failed."
    exit 1
  }
  success "Build validation passed. No deployment was created."
  exit 0
fi

# ─── Apply D1 Migrations ─────────────────────────────────────────────────────
if [[ "${MIGRATE}" == true ]]; then
  info "Applying D1 migrations..."

  # Find D1 database names from wrangler.toml
  if [[ -f "wrangler.toml" ]]; then
    DB_NAMES=$(grep 'database_name' wrangler.toml | sed 's/.*= *"\(.*\)"/\1/' || true)
    if [[ -n "${DB_NAMES}" ]]; then
      while IFS= read -r db_name; do
        info "Applying migrations for D1 database: ${db_name}"
        # shellcheck disable=SC2086
        wrangler d1 migrations apply "${db_name}" --remote ${ENV_FLAG} || {
          error "Failed to apply migrations for ${db_name}."
          exit 1
        }
        success "Migrations applied for ${db_name}."
      done <<< "${DB_NAMES}"
    else
      warn "No D1 databases found in wrangler.toml. Skipping migrations."
    fi
  fi
fi

# ─── Deploy ───────────────────────────────────────────────────────────────────
DEPLOY_ENV="default"
if [[ -n "${ENV_FLAG}" ]]; then
  DEPLOY_ENV=$(echo "${ENV_FLAG}" | awk '{print $2}')
fi

info "Starting deployment to '${DEPLOY_ENV}' environment..."

# shellcheck disable=SC2086
DEPLOY_OUTPUT=$(wrangler deploy ${ENV_FLAG} 2>&1) || {
  error "Deployment failed."
  echo "${DEPLOY_OUTPUT}"
  exit 1
}

# Extract the deployment URL from output
DEPLOYMENT_URL=$(echo "${DEPLOY_OUTPUT}" | grep -oE 'https://[^ ]+\.workers\.dev' | head -1 || true)
if [[ -z "${DEPLOYMENT_URL}" ]]; then
  DEPLOYMENT_URL=$(echo "${DEPLOY_OUTPUT}" | grep -oE 'https://[^ ]+' | head -1 || true)
fi

success "Deployment complete!"
if [[ -n "${DEPLOYMENT_URL}" ]]; then
  info "URL: ${DEPLOYMENT_URL}"
fi

# ─── Post-Deploy Health Check ─────────────────────────────────────────────────
if [[ -n "${DEPLOYMENT_URL}" ]]; then
  info "Running post-deployment health check..."

  MAX_RETRIES=5
  RETRY_DELAY=3

  for i in $(seq 1 ${MAX_RETRIES}); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEPLOYMENT_URL}" 2>/dev/null || echo "000")

    if [[ "${HTTP_STATUS}" == "200" ]]; then
      success "Health check passed (HTTP ${HTTP_STATUS})."
      break
    elif [[ "${HTTP_STATUS}" =~ ^3[0-9]{2}$ ]]; then
      success "Health check passed (HTTP ${HTTP_STATUS} — redirect detected)."
      break
    else
      if [[ ${i} -lt ${MAX_RETRIES} ]]; then
        warn "Health check attempt ${i}/${MAX_RETRIES} returned HTTP ${HTTP_STATUS}. Retrying in ${RETRY_DELAY}s..."
        sleep ${RETRY_DELAY}
      else
        warn "Health check failed after ${MAX_RETRIES} attempts (HTTP ${HTTP_STATUS})."
        warn "The Worker may still be propagating. Check: ${DEPLOYMENT_URL}"
      fi
    fi
  done
fi

# ─── Tail Logs ────────────────────────────────────────────────────────────────
if [[ "${TAIL}" == true ]]; then
  info "Starting live log stream (Ctrl+C to stop)..."
  # shellcheck disable=SC2086
  wrangler tail ${ENV_FLAG}
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Deployment Summary                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Worker:       %-43s ║\n" "${WORKER_NAME}"
printf "║  Environment:  %-43s ║\n" "${DEPLOY_ENV}"
if [[ -n "${DEPLOYMENT_URL}" ]]; then
printf "║  URL:          %-43s ║\n" "${DEPLOYMENT_URL}"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
