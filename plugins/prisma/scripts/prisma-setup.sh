#!/usr/bin/env bash
#
# Prisma Setup and Migration Helper Script
# Usage: ./scripts/prisma-setup.sh [command]
#
# Commands:
#   init        Initialize Prisma in the current project
#   migrate     Create and apply a new migration
#   deploy      Deploy migrations to production
#   reset       Reset the database and re-apply all migrations
#   seed        Run the seed script
#   studio      Open Prisma Studio
#   generate    Generate the Prisma Client
#   validate    Validate the Prisma schema
#   status      Show migration status
#   format      Format the Prisma schema file
#   help        Show this help message

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

check_prerequisites() {
  if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js v18 or later."
  fi

  if ! command -v npx &> /dev/null; then
    error "npx is not available. Please install npm."
  fi

  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    warn "Node.js v18+ is recommended. Current version: $(node -v)"
  fi
}

check_env() {
  if [ ! -f ".env" ]; then
    warn ".env file not found. Make sure DATABASE_URL is set."
  elif ! grep -q "DATABASE_URL" .env 2>/dev/null; then
    warn "DATABASE_URL not found in .env file."
  fi
}

cmd_init() {
  info "Initializing Prisma..."
  check_prerequisites

  local provider="${1:-postgresql}"

  # Install dependencies
  if [ -f "package.json" ]; then
    info "Installing Prisma dependencies..."
    npm install prisma --save-dev
    npm install @prisma/client
  else
    error "No package.json found. Run 'npm init' first."
  fi

  # Initialize Prisma
  npx prisma init --datasource-provider "$provider"

  success "Prisma initialized with $provider provider."
  info "Next steps:"
  echo "  1. Set DATABASE_URL in .env"
  echo "  2. Define your models in prisma/schema.prisma"
  echo "  3. Run: ./scripts/prisma-setup.sh migrate \"init\""
}

cmd_migrate() {
  info "Creating migration..."
  check_prerequisites
  check_env

  local name="${1:-$(date +%Y%m%d_%H%M%S)}"

  npx prisma migrate dev --name "$name"

  success "Migration '$name' created and applied."
}

cmd_deploy() {
  info "Deploying migrations to production..."
  check_prerequisites
  check_env

  npx prisma migrate deploy

  success "Migrations deployed."
}

cmd_reset() {
  warn "This will reset your database and delete all data!"
  read -r -p "Are you sure? (y/N) " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    info "Resetting database..."
    npx prisma migrate reset --force
    success "Database reset complete."
  else
    info "Reset cancelled."
  fi
}

cmd_seed() {
  info "Running seed script..."
  check_prerequisites
  check_env

  npx prisma db seed

  success "Database seeded."
}

cmd_studio() {
  info "Opening Prisma Studio..."
  check_prerequisites
  check_env

  npx prisma studio
}

cmd_generate() {
  info "Generating Prisma Client..."
  check_prerequisites

  npx prisma generate

  success "Prisma Client generated."
}

cmd_validate() {
  info "Validating Prisma schema..."
  check_prerequisites

  npx prisma validate

  success "Schema is valid."
}

cmd_status() {
  info "Checking migration status..."
  check_prerequisites
  check_env

  npx prisma migrate status
}

cmd_format() {
  info "Formatting Prisma schema..."
  check_prerequisites

  npx prisma format

  success "Schema formatted."
}

cmd_help() {
  echo ""
  echo "Prisma Setup and Migration Helper"
  echo "================================="
  echo ""
  echo "Usage: $0 [command] [args]"
  echo ""
  echo "Commands:"
  echo "  init [provider]   Initialize Prisma (default: postgresql)"
  echo "  migrate [name]    Create and apply a new migration"
  echo "  deploy            Deploy migrations to production"
  echo "  reset             Reset the database (with confirmation)"
  echo "  seed              Run the database seed script"
  echo "  studio            Open Prisma Studio"
  echo "  generate          Generate the Prisma Client"
  echo "  validate          Validate the Prisma schema"
  echo "  status            Show migration status"
  echo "  format            Format the Prisma schema file"
  echo "  help              Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 init postgresql"
  echo "  $0 migrate add_user_table"
  echo "  $0 deploy"
  echo "  $0 seed"
  echo ""
}

# Main command dispatcher
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  init)     cmd_init "$@" ;;
  migrate)  cmd_migrate "$@" ;;
  deploy)   cmd_deploy ;;
  reset)    cmd_reset ;;
  seed)     cmd_seed ;;
  studio)   cmd_studio ;;
  generate) cmd_generate ;;
  validate) cmd_validate ;;
  status)   cmd_status ;;
  format)   cmd_format ;;
  help)     cmd_help ;;
  *)
    error "Unknown command: $COMMAND. Run '$0 help' for usage."
    ;;
esac
