#!/bin/bash
# ─── Ledgererp Deployment Script ───────────────────────────────
# Usage: ./deploy.sh [command]
# Commands: install, start, stop, restart, backup, logs, status, update
# ────────────────────────────────────────────────────────────────

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory (where this script lives)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# ─── Helper Functions ──────────────────────────────────────────

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

check_docker() {
  if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/"
  fi
  if ! docker info &> /dev/null; then
    error "Docker daemon is not running. Please start Docker."
  fi
  success "Docker is available"
}

check_compose() {
  if docker compose version &> /dev/null; then
    success "Docker Compose (v2) is available"
  elif command -v docker-compose &> /dev/null; then
    warn "Using legacy docker-compose (v1). Consider upgrading to Docker Compose v2."
  else
    error "Docker Compose is not installed. Please install Docker Compose."
  fi
}

# Use the correct compose command
compose_cmd() {
  if docker compose version &> /dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

# ─── Commands ──────────────────────────────────────────────────

cmd_install() {
  info "Installing Ledgererp..."

  check_docker
  check_compose

  # Create .env from example if it doesn't exist
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env
      warn "Created .env from .env.example — please review and update values!"
    else
      error "No .env.example found. Create a .env file manually."
    fi
  else
    success ".env file already exists"
  fi

  # Create db and backups directories
  mkdir -p db/backups
  success "Created db/backups directory"

  # Build and start containers
  info "Building Docker image (this may take a few minutes on first run)..."
  compose_cmd build
  success "Docker image built"

  info "Starting containers..."
  compose_cmd up -d
  success "Containers started"

  info "Waiting for health check..."
  sleep 5
  cmd_status
}

cmd_start() {
  info "Starting Ledgererp..."
  check_docker
  compose_cmd up -d
  success "Containers started"
  sleep 3
  cmd_status
}

cmd_stop() {
  info "Stopping Ledgererp..."
  check_docker
  compose_cmd down
  success "Containers stopped"
}

cmd_restart() {
  info "Restarting Ledgererp..."
  cmd_stop
  sleep 2
  cmd_start
}

cmd_backup() {
  info "Triggering database backup..."
  check_docker

  # Check if container is running
  if ! docker ps --format '{{.Names}}' | grep -q 'ledgererp-app'; then
    error "Container ledgererp-app is not running. Start it first with: ./deploy.sh start"
  fi

  # Trigger backup via API endpoint
  HTTP_CODE=$(curl -s -o /tmp/backup_response.json -w "%{http_code}" \
    http://localhost:3000/api/backup 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    success "Backup triggered successfully"
    if [ -f /tmp/backup_response.json ]; then
      cat /tmp/backup_response.json
      echo ""
    fi
  else
    warn "Backup endpoint returned HTTP $HTTP_CODE"
    warn "You can manually backup the SQLite database from the db/backups volume"
  fi
}

cmd_logs() {
  check_docker
  info "Showing logs (Ctrl+C to exit)..."
  compose_cmd logs -f
}

cmd_status() {
  check_docker

  info "Container status:"
  compose_cmd ps

  echo ""
  info "Health check:"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/health 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    success "Application is healthy (HTTP 200)"
  elif [ "$HTTP_CODE" = "000" ]; then
    warn "Application is not reachable — it may still be starting up"
  else
    warn "Application returned HTTP $HTTP_CODE"
  fi
}

cmd_update() {
  info "Updating Ledgererp (zero-downtime deployment)..."

  check_docker
  check_compose

  # Pull latest code if in a git repo
  if [ -d .git ]; then
    info "Pulling latest code from Git..."
    git pull origin main || warn "Git pull failed — continuing with local code"
  else
    warn "Not a Git repository — skipping git pull"
  fi

  # Rebuild image
  info "Rebuilding Docker image..."
  compose_cmd build

  # Rolling restart: start new before stopping old
  info "Performing rolling restart..."
  compose_cmd up -d --no-deps --build ledgererp

  success "Update complete"
  sleep 5
  cmd_status
}

# ─── Main ──────────────────────────────────────────────────────

show_help() {
  echo "Ledgererp Deployment Script"
  echo ""
  echo "Usage: ./deploy.sh [command]"
  echo ""
  echo "Commands:"
  echo "  install   First-time setup: check deps, create .env, build & start"
  echo "  start     Start containers in detached mode"
  echo "  stop      Stop and remove containers"
  echo "  restart   Stop then start containers"
  echo "  backup    Trigger a database backup via API"
  echo "  logs      Follow container logs"
  echo "  status    Show container status and health check"
  echo "  update    Pull latest code, rebuild, and restart (zero-downtime)"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh install    # First-time deployment"
  echo "  ./deploy.sh status     # Check if app is running"
  echo "  ./deploy.sh logs       # View live logs"
  echo "  ./deploy.sh update     # Update to latest version"
}

COMMAND="${1:-}"

case "$COMMAND" in
  install)  cmd_install  ;;
  start)    cmd_start    ;;
  stop)     cmd_stop     ;;
  restart)  cmd_restart  ;;
  backup)   cmd_backup   ;;
  logs)     cmd_logs     ;;
  status)   cmd_status   ;;
  update)   cmd_update   ;;
  help|--help|-h)
    show_help
    ;;
  *)
    if [ -n "$COMMAND" ]; then
      error "Unknown command: $COMMAND"
    fi
    show_help
    exit 1
    ;;
esac
