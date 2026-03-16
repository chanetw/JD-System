#!/bin/bash
# backup-docker.sh
# Backup ข้อมูล Docker (Database + Files)
#
# Usage: ./scripts/backup-docker.sh

set -e

DOCKER_CONTAINER="${DOCKER_CONTAINER:-dj-postgres}"
DOCKER_DB="${DOCKER_DB:-dj_system}"
DOCKER_USER="${DOCKER_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "  DJ System: Docker Backup"
echo "=========================================="

# สร้างโฟลเดอร์ backup
mkdir -p "$BACKUP_DIR"

# 1. Backup database
echo ""
echo "📦 [1/2] Backing up database..."
docker exec "$DOCKER_CONTAINER" pg_dump -U "$DOCKER_USER" "$DOCKER_DB" > "$BACKUP_DIR/backup_db_${DATE}.sql"
echo "   ✅ Database backup: $BACKUP_DIR/backup_db_${DATE}.sql ($(du -h "$BACKUP_DIR/backup_db_${DATE}.sql" | cut -f1))"

# 2. Backup files (Docker volume)
echo ""
echo "📦 [2/2] Backing up files..."
if docker volume ls -q | grep -q "dj-files"; then
  docker run --rm \
    -v dj-files-prod:/data \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine tar czf "/backup/backup_files_${DATE}.tar.gz" -C /data .
  echo "   ✅ Files backup: $BACKUP_DIR/backup_files_${DATE}.tar.gz"
else
  echo "   ⏭️  No dj-files volume found, skipping file backup"
fi

echo ""
echo "=========================================="
echo "  ✅ Backup complete: ${DATE}"
echo "  📁 Location: $BACKUP_DIR/"
echo "=========================================="
