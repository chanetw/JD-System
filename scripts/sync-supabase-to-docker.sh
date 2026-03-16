#!/bin/bash
# sync-supabase-to-docker.sh
# Sync ข้อมูลจาก Supabase ไป Docker PostgreSQL
#
# Usage: ./scripts/sync-supabase-to-docker.sh
# ต้องตั้ง SUPABASE_DB_URL ใน environment ก่อน

set -e

SUPABASE_DB_URL="${SUPABASE_DB_URL:?กรุณาตั้ง SUPABASE_DB_URL เช่น postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres}"
DOCKER_CONTAINER="${DOCKER_CONTAINER:-dj-postgres}"
DOCKER_DB="${DOCKER_DB:-dj_system}"
DOCKER_USER="${DOCKER_USER:-postgres}"
DUMP_FILE="supabase_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "=========================================="
echo "  DJ System: Supabase → Docker Sync"
echo "=========================================="

# 1. Export จาก Supabase
echo ""
echo "📥 [1/5] Exporting from Supabase..."
pg_dump "$SUPABASE_DB_URL" --no-owner --no-acl > "$DUMP_FILE"
echo "   ✅ Exported to $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# 2. Start Docker database (ถ้ายังไม่ได้ start)
echo ""
echo "🐳 [2/5] Starting Docker database..."
docker-compose up -d postgres
sleep 2

# 3. Wait ให้ database ready
echo ""
echo "⏳ [3/5] Waiting for database to be ready..."
until docker exec "$DOCKER_CONTAINER" pg_isready -U "$DOCKER_USER" 2>/dev/null; do
  echo "   Waiting..."
  sleep 2
done
echo "   ✅ Database is ready"

# 4. Import ไป Docker
echo ""
echo "📤 [4/5] Importing to Docker..."
docker exec -i "$DOCKER_CONTAINER" psql -U "$DOCKER_USER" "$DOCKER_DB" < "$DUMP_FILE"
echo "   ✅ Import complete"

# 5. Verify
echo ""
echo "🔍 [5/5] Verifying data..."
echo "   Jobs count:"
docker exec "$DOCKER_CONTAINER" psql -U "$DOCKER_USER" "$DOCKER_DB" -c "SELECT COUNT(*) as total_jobs FROM jobs;" 2>/dev/null || echo "   ⚠️  jobs table not found"
echo "   Users count:"
docker exec "$DOCKER_CONTAINER" psql -U "$DOCKER_USER" "$DOCKER_DB" -c "SELECT COUNT(*) as total_users FROM users;" 2>/dev/null || echo "   ⚠️  users table not found"

echo ""
echo "=========================================="
echo "  ✅ Sync complete!"
echo "  📁 Dump file: $DUMP_FILE"
echo "=========================================="
