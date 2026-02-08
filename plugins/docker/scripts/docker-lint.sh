#!/usr/bin/env bash
#
# docker-lint.sh — Linting and validation utilities for Docker files.
# Used by the Docker Cursor plugin hooks.
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

info()    { echo -e "${BLUE}[info]${NC} $*"; }
success() { echo -e "${GREEN}[pass]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
error()   { echo -e "${RED}[fail]${NC} $*"; }

command_exists() { command -v "$1" &>/dev/null; }

# -------------------------------------------------------------------
# lint-dockerfile: Lint one or more Dockerfiles with hadolint
# -------------------------------------------------------------------
lint_dockerfile() {
  local files=("${@}")
  local exit_code=0

  if [ ${#files[@]} -eq 0 ]; then
    warn "No Dockerfile paths provided."
    return 0
  fi

  for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
      warn "File not found: $file"
      continue
    fi

    info "Linting $file ..."

    if command_exists hadolint; then
      if hadolint --no-color "$file"; then
        success "$file passed hadolint checks."
      else
        warn "$file has hadolint warnings/errors."
        exit_code=1
      fi
    elif command_exists docker; then
      if docker run --rm -i hadolint/hadolint < "$file"; then
        success "$file passed hadolint checks."
      else
        warn "$file has hadolint warnings/errors."
        exit_code=1
      fi
    else
      warn "hadolint is not installed. Falling back to basic checks for $file."
      basic_dockerfile_lint "$file" || exit_code=1
    fi
  done

  return $exit_code
}

# -------------------------------------------------------------------
# basic_dockerfile_lint: Simple pattern-based Dockerfile checks
# -------------------------------------------------------------------
basic_dockerfile_lint() {
  local file="$1"
  local exit_code=0

  # Check for :latest tag in FROM instructions
  if grep -Pn '^FROM\s+\S+:latest' "$file" 2>/dev/null; then
    warn "$file: Uses ':latest' tag in FROM instruction. Pin to a specific version."
    exit_code=1
  fi

  # Check for missing USER instruction
  if ! grep -qP '^\s*USER\s+' "$file" 2>/dev/null; then
    warn "$file: No USER instruction found. Container will run as root."
    exit_code=1
  fi

  # Check for ADD instead of COPY
  if grep -Pn '^\s*ADD\s+(?!https?://)' "$file" 2>/dev/null; then
    warn "$file: Uses ADD instead of COPY. Prefer COPY unless extracting archives."
    exit_code=1
  fi

  # Check for missing HEALTHCHECK
  if ! grep -qP '^\s*HEALTHCHECK\s+' "$file" 2>/dev/null; then
    warn "$file: No HEALTHCHECK instruction found."
  fi

  # Check for apt-get without cleanup
  if grep -qP 'apt-get install' "$file" && ! grep -qP 'rm -rf /var/lib/apt/lists' "$file"; then
    warn "$file: apt-get install without cleanup. Add 'rm -rf /var/lib/apt/lists/*'."
    exit_code=1
  fi

  if [ $exit_code -eq 0 ]; then
    success "$file passed basic checks."
  fi

  return $exit_code
}

# -------------------------------------------------------------------
# lint-compose: Validate Docker Compose files
# -------------------------------------------------------------------
lint_compose() {
  local files=("${@}")
  local exit_code=0

  if [ ${#files[@]} -eq 0 ]; then
    warn "No Compose file paths provided."
    return 0
  fi

  for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
      warn "File not found: $file"
      continue
    fi

    info "Validating $file ..."

    # Syntax validation with docker compose
    if command_exists docker; then
      if docker compose -f "$file" config --quiet 2>/dev/null; then
        success "$file is valid."
      else
        error "$file has syntax errors."
        docker compose -f "$file" config 2>&1 || true
        exit_code=1
      fi
    else
      warn "docker not available. Running basic YAML checks on $file."
      basic_compose_lint "$file" || exit_code=1
    fi
  done

  return $exit_code
}

# -------------------------------------------------------------------
# basic_compose_lint: Simple checks for Compose files
# -------------------------------------------------------------------
basic_compose_lint() {
  local file="$1"
  local exit_code=0

  # Check for :latest tags
  if grep -Pn 'image:\s*\S+:latest' "$file" 2>/dev/null; then
    warn "$file: Uses ':latest' image tag. Pin to a specific version."
    exit_code=1
  fi

  # Check for missing healthcheck
  if ! grep -q 'healthcheck:' "$file"; then
    warn "$file: No healthcheck defined for any service."
  fi

  # Check for resource limits
  if ! grep -q 'resources:' "$file" && ! grep -q 'deploy:' "$file"; then
    warn "$file: No resource limits defined."
  fi

  if [ $exit_code -eq 0 ]; then
    success "$file passed basic checks."
  fi

  return $exit_code
}

# -------------------------------------------------------------------
# check-dockerignore: Verify .dockerignore exists
# -------------------------------------------------------------------
check_dockerignore() {
  local project_root
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  if [ -f "$project_root/.dockerignore" ]; then
    success ".dockerignore exists at $project_root/.dockerignore"

    # Check for common entries
    local missing=()
    for entry in ".git" "node_modules" ".env"; do
      if ! grep -q "$entry" "$project_root/.dockerignore"; then
        missing+=("$entry")
      fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
      warn ".dockerignore is missing recommended entries: ${missing[*]}"
    fi
  else
    warn "No .dockerignore found at project root ($project_root). Consider creating one."
    return 1
  fi
}

# -------------------------------------------------------------------
# check-no-latest: Ensure no :latest tags are used
# -------------------------------------------------------------------
check_no_latest() {
  local files=("${@}")
  local exit_code=0

  for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
      continue
    fi

    # Check Dockerfiles
    if echo "$file" | grep -iqE 'dockerfile'; then
      if grep -Pn '^FROM\s+\S+:latest' "$file" 2>/dev/null; then
        warn "$file: FROM uses ':latest' tag."
        exit_code=1
      fi
    fi

    # Check Compose files
    if echo "$file" | grep -iqE 'compose|docker-compose'; then
      if grep -Pn 'image:\s*\S+:latest' "$file" 2>/dev/null; then
        warn "$file: Service image uses ':latest' tag."
        exit_code=1
      fi
    fi
  done

  if [ $exit_code -eq 0 ]; then
    success "No ':latest' tags found."
  fi

  return $exit_code
}

# -------------------------------------------------------------------
# security-scan: Scan Docker images for vulnerabilities
# -------------------------------------------------------------------
security_scan() {
  info "Running security scan on built images..."

  if command_exists trivy; then
    info "Using trivy for vulnerability scanning."
    local images
    images=$(docker images --format '{{.Repository}}:{{.Tag}}' --filter 'dangling=false' | head -5)
    for image in $images; do
      info "Scanning $image ..."
      trivy image --severity HIGH,CRITICAL "$image"
    done
  elif command_exists docker && docker scout version &>/dev/null 2>&1; then
    info "Using Docker Scout for vulnerability scanning."
    local images
    images=$(docker images --format '{{.Repository}}:{{.Tag}}' --filter 'dangling=false' | head -5)
    for image in $images; do
      info "Scanning $image ..."
      docker scout cves "$image" --only-severity critical,high
    done
  elif command_exists grype; then
    info "Using grype for vulnerability scanning."
    local images
    images=$(docker images --format '{{.Repository}}:{{.Tag}}' --filter 'dangling=false' | head -5)
    for image in $images; do
      info "Scanning $image ..."
      grype "$image" --only-fixed --fail-on high
    done
  else
    error "No vulnerability scanner found. Install trivy, grype, or Docker Scout."
    return 1
  fi
}

# -------------------------------------------------------------------
# Main dispatcher
# -------------------------------------------------------------------
main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    lint-dockerfile)  lint_dockerfile "$@" ;;
    lint-compose)     lint_compose "$@" ;;
    check-dockerignore) check_dockerignore ;;
    check-no-latest)  check_no_latest "$@" ;;
    security-scan)    security_scan ;;
    help|--help|-h)
      echo "Usage: docker-lint.sh <command> [files...]"
      echo ""
      echo "Commands:"
      echo "  lint-dockerfile <files...>   Lint Dockerfiles with hadolint"
      echo "  lint-compose <files...>      Validate Docker Compose files"
      echo "  check-dockerignore           Verify .dockerignore exists"
      echo "  check-no-latest <files...>   Check for :latest tag usage"
      echo "  security-scan                Scan images for vulnerabilities"
      echo "  help                         Show this help message"
      ;;
    *)
      error "Unknown command: $command"
      main help
      return 1
      ;;
  esac
}

main "$@"
