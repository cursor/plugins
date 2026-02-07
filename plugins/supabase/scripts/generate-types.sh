#!/usr/bin/env bash
#
# generate-types.sh
# Generates TypeScript types from the Supabase database schema.
#
# Usage:
#   ./scripts/generate-types.sh          # Generate from local database
#   ./scripts/generate-types.sh remote   # Generate from remote (linked) project
#
# Prerequisites:
#   - Supabase CLI installed: npm install -g supabase
#   - For local: supabase local stack running (supabase start)
#   - For remote: project linked (supabase link --project-ref <ref>)
#
# Output:
#   Writes generated types to src/types/supabase.ts (configurable via OUTPUT_FILE)

set -euo pipefail

# Configuration
OUTPUT_FILE="${SUPABASE_TYPES_OUTPUT:-src/types/supabase.ts}"
OUTPUT_DIR="$(dirname "$OUTPUT_FILE")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[supabase-types]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[supabase-types]${NC} $1"
}

log_error() {
  echo -e "${RED}[supabase-types]${NC} $1"
}

# Check that supabase CLI is available
if ! command -v supabase &>/dev/null; then
  log_error "Supabase CLI not found. Install it with: npm install -g supabase"
  exit 1
fi

# Create output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
  log_info "Creating output directory: $OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"
fi

# Determine mode
MODE="${1:-local}"

if [ "$MODE" = "remote" ]; then
  log_info "Generating types from remote database..."

  # Check if project is linked
  if [ ! -f "supabase/.temp/project-ref" ]; then
    log_error "No project linked. Run: supabase link --project-ref <your-project-ref>"
    exit 1
  fi

  PROJECT_REF=$(cat supabase/.temp/project-ref)
  log_info "Using project: $PROJECT_REF"

  supabase gen types typescript \
    --project-id "$PROJECT_REF" \
    > "$OUTPUT_FILE"
else
  log_info "Generating types from local database..."

  # Check if local Supabase is running
  if ! supabase status &>/dev/null 2>&1; then
    log_warn "Local Supabase is not running. Starting it..."
    supabase start
  fi

  supabase gen types typescript \
    --local \
    > "$OUTPUT_FILE"
fi

# Verify output
if [ -s "$OUTPUT_FILE" ]; then
  LINES=$(wc -l < "$OUTPUT_FILE")
  log_info "Types generated successfully: $OUTPUT_FILE ($LINES lines)"
else
  log_error "Generated types file is empty. Check your database schema."
  exit 1
fi

# Optionally run prettier/eslint on the generated file
if command -v npx &>/dev/null; then
  if npx --no-install prettier --check "$OUTPUT_FILE" &>/dev/null 2>&1; then
    log_info "Formatting with prettier..."
    npx --no-install prettier --write "$OUTPUT_FILE" 2>/dev/null || true
  fi
fi

log_info "Done! Import types with: import type { Database } from '@/types/supabase';"
