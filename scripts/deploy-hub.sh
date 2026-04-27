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
DEFAULT_BACKEND_IMAGE="chanetw/dj-system-backend:latest"
DEFAULT_FRONTEND_IMAGE="chanetw/dj-system-frontend:latest"
BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-3000}"
FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-80}"
BACKEND_URL="${BACKEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-}"
BACKEND_IMAGE="${BACKEND_IMAGE:-$DEFAULT_BACKEND_IMAGE}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-$DEFAULT_FRONTEND_IMAGE}"
ALLOW_LATEST_IMAGE="false"

usage() {
    cat <<'EOF'
Usage: ./scripts/deploy-hub.sh [options]

Options:
  --release-tag <tag>               Use chanetw/dj-system-backend:<tag> and frontend:<tag>
  --backend-image <name:tag>        Override backend image reference
  --frontend-image <name:tag>       Override frontend image reference
  --allow-latest-image              Allow :latest tags (not recommended for prod)
  -h, --help                        Show this help
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --release-tag)
            BACKEND_IMAGE="chanetw/dj-system-backend:$2"
            FRONTEND_IMAGE="chanetw/dj-system-frontend:$2"
            shift 2
            ;;
        --backend-image)
            BACKEND_IMAGE="$2"
            shift 2
            ;;
        --frontend-image)
            FRONTEND_IMAGE="$2"
            shift 2
            ;;
        --allow-latest-image)
            ALLOW_LATEST_IMAGE="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

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

validate_image_ref() {
    local service="$1"
    local image="$2"

    if [[ -z "$image" || "$image" != *:* ]]; then
        echo -e "${RED}❌ ${service} image must include an explicit tag or digest (got: ${image})${NC}"
        exit 1
    fi

    if [[ "$ALLOW_LATEST_IMAGE" != "true" && "$image" == *":latest" ]]; then
        echo -e "${RED}❌ ${service} image uses :latest: ${image}${NC}"
        echo "Use --release-tag <tag> or --${service}-image <repo:tag> for production deploys."
        exit 1
    fi
}

# ===================================================
# ตรวจสอบไฟล์ที่จำเป็น
# ===================================================
echo -e "${BLUE}[1/6] Pre-flight checks...${NC}"
echo -e "${BLUE}   Backend image: ${BACKEND_IMAGE}${NC}"
echo -e "${BLUE}   Frontend image: ${FRONTEND_IMAGE}${NC}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found. Run from project root.${NC}"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo -e "${RED}❌ docker compose not available.${NC}"
    exit 1
fi

validate_image_ref "backend" "$BACKEND_IMAGE"
validate_image_ref "frontend" "$FRONTEND_IMAGE"
export BACKEND_IMAGE FRONTEND_IMAGE

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
echo -e "${BLUE}[3/6] Pulling release images (backend + frontend only)...${NC}"
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
echo -e "   Images:    ${BACKEND_IMAGE}"
echo -e "              ${FRONTEND_IMAGE}"
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
