#!/usr/bin/env bash
# ─── Ledgererp Database Backup Script ───────────────────────────
# Creates a timestamped, compressed backup of the SQLite database.
#
# Usage: ./backup.sh
# Cron example (daily 03:00):
#   0 3 * * * cd /opt/ledgererp && ./backup.sh >> /var/log/ledgererp-backup.log 2>&1

set -euo pipefail
cd "$(dirname "$0")"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="db/backups"
BACKUP_FILE="${BACKUP_DIR}/ledgererp_${TIMESTAMP}.db"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

mkdir -p "${BACKUP_DIR}"

echo "💾 Backing up SQLite database..."
$COMPOSE cp ledgererp-app:/app/db/ledgererp.db "${BACKUP_FILE}"

# Compress to save space
gzip -f "${BACKUP_FILE}"
echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only the last 14 backups
ls -1t "${BACKUP_DIR}"/ledgererp_*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "🧹 Old backups pruned (kept 14)"

# Optional off-server sync — uncomment and configure rclone first:
# rclone copy "${BACKUP_FILE}.gz" remote:ledgererp-backups/
