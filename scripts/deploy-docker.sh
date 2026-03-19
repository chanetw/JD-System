#!/bin/bash
# ===================================================
# DJ System - Docker Production Deploy Script
# ใช้สำหรับ deploy ระบบทั้งหมดบน server ด้วย Docker
# ===================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 DJ System - Docker Production Deploy${NC}"
echo ""

# ===================================================
# ตรวจสอบ ENV file
# ===================================================
echo -e "${BLUE}📋 Step 1: Checking ENV files...${NC}"

if [ ! -f "$PROJECT_DIR/backend/api-server/.env.production" ]; then
    echo -e "${YELLOW}⚠  .env.production not found — copying from example...${NC}"
    cp "$PROJECT_DIR/backend/api-server/.env.production.example" "$PROJECT_DIR/backend/api-server/.env.production"
    echo -e "${RED}❌ Please edit backend/api-server/.env.production before deploying!${NC}"
    echo "   Required: POSTGRES_PASSWORD, JWT_SECRET, VITE_API_URL"
    exit 1
fi

echo -e "${GREEN}✅ ENV file found${NC}"
echo ""

# ===================================================
# Build และ Start Docker containers
# ===================================================
echo -e "${BLUE}🐳 Step 2: Building Docker images...${NC}"
cd "$PROJECT_DIR"

docker compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✅ Docker images built${NC}"
echo ""

# ===================================================
# Run Database migrations
# ===================================================
echo -e "${BLUE}📦 Step 3: Starting database...${NC}"
docker compose -f docker-compose.prod.yml up -d postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo -e "${BLUE}📦 Step 4: Running Prisma migrations...${NC}"
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy --schema ./prisma/schema.prisma
echo -e "${GREEN}✅ Migrations complete${NC}"
echo ""

# ===================================================
# Start all services
# ===================================================
echo -e "${BLUE}🚀 Step 5: Starting all services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo -e "${BLUE}📋 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "   Frontend:  http://localhost"
echo "   Backend:   http://localhost:3000"
echo "   Health:    http://localhost:3000/health"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   Logs:      docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:      docker compose -f docker-compose.prod.yml down"
echo "   Restart:   docker compose -f docker-compose.prod.yml restart"
