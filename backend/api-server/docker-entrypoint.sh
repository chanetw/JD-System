#!/bin/sh
set -e

echo "============================================"
echo "  DJ System Backend - Starting..."
echo "============================================"

# Run database migrations (ถ้ามี pending migrations)
echo "[Entrypoint] Running Prisma migrate deploy..."
npx prisma migrate deploy --schema ./prisma/schema.prisma 2>&1 || {
  echo "[Entrypoint] ⚠️  Migration failed or no migrations found — continuing..."
}

# Seed database ถ้าตั้ง RUN_SEED=true (ใช้ครั้งแรกเท่านั้น)
if [ "$RUN_SEED" = "true" ]; then
  echo "[Entrypoint] Running database seed..."
  node ./prisma/seed.js 2>&1 || {
    echo "[Entrypoint] ⚠️  Seed failed — database may already have data"
  }
fi

# Seed admin user ถ้าตั้ง SEED_ADMIN=true
if [ "$SEED_ADMIN" = "true" ]; then
  echo "[Entrypoint] Seeding admin user..."
  node ./scripts/seed-admin.js 2>&1 || {
    echo "[Entrypoint] ⚠️  Admin seed failed — admin may already exist"
  }
fi

echo "[Entrypoint] Starting Node.js server..."
exec node src/index.js
