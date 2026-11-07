#!/usr/bin/env bash
# ─── Ledgererp One-Command Deploy Script ────────────────────────
# Usage (on the VPS, inside the cloned repo):
#   chmod +x deploy.sh && ./deploy.sh
#
# Requires: Docker Engine 24+ with the compose plugin, and a .env file.

set -euo pipefail

cd "$(dirname "$0")"

# ─── Preflight checks ───────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed. Install it first: https://docs.docker.com/engine/install/"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "❌ Docker Compose plugin not found. Install: https://docs.docker.com/compose/install/"
  exit 1
fi

if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Creating one from .env.example ..."
  cp .env.example .env
  echo "✏️  Edit .env now and set DOMAIN (your real domain) + Pi keys, then re-run ./deploy.sh"
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

if [ -z "${DOMAIN:-}" ] || [ "${DOMAIN}" = "your_domain_here" ]; then
  echo "❌ DOMAIN is not set in .env — this must be your real domain (e.g. erp.myshop.com)"
  exit 1
fi

echo "🚀 Deploying Ledgererp on: ${DOMAIN}"

# ─── Build images ───────────────────────────────────────────────
echo "📦 Building images (app + migrator)..."
$COMPOSE build

# ─── Push DB schema (idempotent — safe to run every time) ──────
echo "🗄️  Pushing database schema..."
$COMPOSE run --rm migrator

# ─── Start stack ────────────────────────────────────────────────
echo "▶️  Starting stack (app + Caddy automatic HTTPS)..."
$COMPOSE up -d

# ─── Wait for health ────────────────────────────────────────────
echo "⏳ Waiting for the app to become healthy..."
for i in $(seq 1 30); do
  if $COMPOSE ps --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
    break
  fi
  if [ "$i" = "30" ]; then
    echo "⚠️  App not healthy yet — check logs: $COMPOSE logs -f ledgererp"
    exit 0
  fi
  sleep 2
done

echo ""
echo "✅ Done! Your app will be live at: https://${DOMAIN}"
echo "   (First HTTPS certificate issuance can take up to ~1 minute)"
echo ""
echo "Useful commands:"
echo "  $COMPOSE logs -f ledgererp   # app logs"
echo "  $COMPOSE logs -f caddy       # HTTPS/proxy logs"
echo "  $COMPOSE ps                  # stack status"
echo "  ./backup.sh                  # backup the SQLite database"
