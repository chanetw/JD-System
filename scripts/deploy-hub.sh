#!/bin/bash
# ===================================================
# DJ System - Deploy from Docker Hub (Code-Only)
# Pull latest images + recreate backend/frontend
# ไม่แตะ postgres container หรือ database volume
#
# Usage: ./scripts/deploy-hub.sh
# ===================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-3000}"
FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-80}"
BACKEND_URL="${BACKEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-}"

if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL="http://localhost:${BACKEND_HOST_PORT}"
fi

if [ -z "$FRONTEND_URL" ]; then
    if [ "$FRONTEND_HOST_PORT" = "80" ]; then
        FRONTEND_URL="http://localhost"
    else
        FRONTEND_URL="http://localhost:${FRONTEND_HOST_PORT}"
    fi
fi

# ===================================================
# ตรวจสอบไฟล์ที่จำเป็น
# ===================================================
echo -e "${BLUE}[1/6] Pre-flight checks...${NC}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found. Run from project root.${NC}"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo -e "${RED}❌ docker compose not available.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-flight OK${NC}"

# ===================================================
# ตรวจสถานะ containers ก่อน deploy
# ===================================================
echo ""
echo -e "${BLUE}[2/6] Current container status:${NC}"
docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "(no containers running)"

# ===================================================
# Pull images ใหม่ (เฉพาะ backend + frontend)
# ===================================================
echo ""
echo -e "${BLUE}[3/6] Pulling latest images (backend + frontend only)...${NC}"
docker compose -f "$COMPOSE_FILE" pull backend frontend
echo -e "${GREEN}✅ Images pulled${NC}"

# ===================================================
# Recreate backend + frontend (ไม่แตะ postgres)
# ===================================================
echo ""
echo -e "${BLUE}[4/6] Recreating backend + frontend containers...${NC}"
echo -e "${YELLOW}   ⚠️  postgres container will NOT be touched${NC}"
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate backend frontend
echo -e "${GREEN}✅ Containers recreated${NC}"

# ===================================================
# รอ health check
# ===================================================
echo ""
echo -e "${BLUE}[5/6] Waiting for health checks...${NC}"

# รอ backend healthy (max 90s)
echo -n "   Backend: "
for i in $(seq 1 18); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' dj-backend-prod 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        echo -e "${GREEN}healthy ✅${NC}"
        break
    fi
    if [ "$i" -eq 18 ]; then
        echo -e "${RED}timeout (status: $STATUS) ❌${NC}"
        echo -e "${YELLOW}   Check logs: docker logs dj-backend-prod --tail 50${NC}"
        exit 1
    fi
    echo -n "."
    sleep 5
done

# ตรวจ frontend (ไม่มี healthcheck, ตรวจว่า running)
STATUS=$(docker inspect --format='{{.State.Status}}' dj-frontend-prod 2>/dev/null || echo "unknown")
echo -e "   Frontend: ${GREEN}${STATUS} ✅${NC}"

# ===================================================
# Post-deploy verification
# ===================================================
echo ""
echo -e "${BLUE}[6/6] Post-deploy verification...${NC}"

# Health endpoint
HEALTH=$(curl -sf "${BACKEND_URL}/health" 2>/dev/null || echo "FAILED")
if echo "$HEALTH" | grep -q '"status"'; then
    echo -e "   Health: ${GREEN}OK ✅${NC}"
else
    echo -e "   Health: ${RED}FAILED ❌${NC}"
    echo "   Response: $HEALTH"
fi

# Version endpoint
VERSION=$(curl -sf "${FRONTEND_URL}/api/version" 2>/dev/null || echo "FAILED")
echo -e "   Version: ${GREEN}${VERSION}${NC}"

# Frontend
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   Frontend: ${GREEN}200 OK ✅${NC}"
else
    echo -e "   Frontend: ${RED}HTTP ${HTTP_CODE} ❌${NC}"
fi

# Backend logs (last 5 lines)
echo ""
echo -e "${BLUE}Backend startup logs:${NC}"
docker logs dj-backend-prod --tail 10 2>&1 | grep -v "^$"

# ===================================================
# Summary
# ===================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Deploy complete! 🚀${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "   Images:    chanetw/dj-system-backend:latest"
echo -e "              chanetw/dj-system-frontend:latest"
echo -e "   Database:  ${GREEN}untouched${NC} (dj-data-prod volume)"
echo -e "   Uploads:   ${GREEN}preserved${NC} (dj-files-prod volume)"
echo ""
echo -e "${YELLOW}📋 Manual checks:${NC}"
echo "   1. Open browser → login with existing user"
echo "   2. Create a test job → verify due date"
echo "   3. Check dashboard flat view (no parent jobs)"
echo "   4. Check Socket.io: docker logs dj-backend-prod | grep -i socket"
echo ""
echo -e "${YELLOW}🔄 Rollback:${NC}"
echo "   docker compose -f $COMPOSE_FILE stop backend frontend"
echo "   # Edit $COMPOSE_FILE → change image tags to previous version"
echo "   docker compose -f $COMPOSE_FILE up -d --no-deps backend frontend"
