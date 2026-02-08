#!/usr/bin/env bash
# lint-dockerfile.sh — Lint Dockerfiles using Hadolint
# Usage: ./scripts/lint-dockerfile.sh [Dockerfile...]
# If no arguments are provided, lints all Dockerfiles in the current directory.

set -euo pipefail

HADOLINT_VERSION="${HADOLINT_VERSION:-v2.12.0}"
HADOLINT_BIN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Find or install hadolint
find_hadolint() {
  if command -v hadolint &>/dev/null; then
    HADOLINT_BIN="hadolint"
    return 0
  fi

  # Check if hadolint is available via Docker
  if command -v docker &>/dev/null; then
    HADOLINT_BIN="docker_hadolint"
    return 0
  fi

  log_error "hadolint is not installed."
  log_info "Install it via:"
  log_info "  brew install hadolint                    # macOS"
  log_info "  scoop install hadolint                   # Windows"
  log_info "  sudo wget -O /usr/local/bin/hadolint \\"
  log_info "    https://github.com/hadolint/hadolint/releases/download/${HADOLINT_VERSION}/hadolint-Linux-x86_64"
  log_info "  sudo chmod +x /usr/local/bin/hadolint"
  log_info ""
  log_info "Or run via Docker (automatically used if Docker is available)."
  return 1
}

# Run hadolint on a single file
run_hadolint() {
  local file="$1"

  if [[ "$HADOLINT_BIN" == "docker_hadolint" ]]; then
    docker run --rm -i "hadolint/hadolint:${HADOLINT_VERSION}" < "$file"
  else
    hadolint "$file"
  fi
}

# Collect Dockerfiles to lint
collect_dockerfiles() {
  if [[ $# -gt 0 ]]; then
    echo "$@"
  else
    # Find all Dockerfiles in the current directory and subdirectories
    find . -maxdepth 3 \( -name "Dockerfile" -o -name "Dockerfile.*" -o -name "*.dockerfile" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
  fi
}

main() {
  find_hadolint || exit 1

  local files
  files=$(collect_dockerfiles "$@")

  if [[ -z "$files" ]]; then
    log_warn "No Dockerfiles found to lint."
    exit 0
  fi

  local exit_code=0

  while IFS= read -r file; do
    if [[ ! -f "$file" ]]; then
      log_warn "File not found: $file"
      continue
    fi

    log_info "Linting: $file"

    if run_hadolint "$file"; then
      log_info "  ✓ Passed"
    else
      log_error "  ✗ Issues found in $file"
      exit_code=1
    fi
  done <<< "$files"

  echo ""
  if [[ $exit_code -eq 0 ]]; then
    log_info "All Dockerfiles passed linting! ✓"
  else
    log_error "Some Dockerfiles have linting issues. Please fix them before committing."
  fi

  return $exit_code
}

main "$@"
