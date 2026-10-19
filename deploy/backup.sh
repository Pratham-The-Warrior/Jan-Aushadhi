#!/bin/bash
# ============================================================
# JAN AUSHADHI — Database backup
# Dumps the production PostgreSQL database to /opt/backups and keeps
# the last 7 days. Scheduled nightly by setup-server.sh; run it by hand
# any time:   ./deploy/backup.sh
#
# Restore a dump into the running database:
#   gunzip -c /opt/backups/janaushadhi-<date>.sql.gz | \
#     docker compose -f docker-compose.prod.yml exec -T postgres \
#     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#
# A backup on the same server doesn't survive losing the server: now and
# then copy one off it, e.g. from your computer:
#   scp root@<droplet-ip>:/opt/backups/janaushadhi-<date>.sql.gz .
# ============================================================

set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="deploy/.env.production"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/janaushadhi-$(date +%Y-%m-%d_%H%M).sql.gz"

# --no-owner keeps the dump restorable under another database user
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
    | gzip -6 > "$FILE.partial"
mv "$FILE.partial" "$FILE"

find "$BACKUP_DIR" -name 'janaushadhi-*.sql.gz' -mtime +"$((KEEP_DAYS - 1))" -delete
echo "$(date -Is) ✅ Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
