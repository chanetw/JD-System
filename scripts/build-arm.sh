#!/bin/bash
# ===================================================
# DJ System - Build Docker Images for linux/arm64
# ใช้สำหรับ build image บน Mac (M1/M2/M3) หรือ x86
# เพื่อ deploy บน server linux/arm64 (AWS Graviton, Oracle ARM, ฯลฯ)
#
# ต้องการ: Docker Desktop พร้อม buildx
# ===================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PLATFORM="linux/arm64"
BACKEND_TAG="${BACKEND_TAG:-dj-backend:arm64}"
FRONTEND_TAG="${FRONTEND_TAG:-dj-frontend:arm64}"

echo -e "${BLUE}🏗️  DJ System - ARM64 Docker Build${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo ""

# ===================================================
# ตรวจสอบ buildx
# ===================================================
echo -e "${BLUE}[1/4] Checking docker buildx...${NC}"
if ! docker buildx version &>/dev/null; then
    echo -e "${RED}❌ docker buildx not available. Please upgrade Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ buildx available${NC}"

# สร้าง builder instance (ถ้ายังไม่มี)
docker buildx create --use --name dj-arm-builder 2>/dev/null \
    || docker buildx use dj-arm-builder 2>/dev/null \
    || true
docker buildx inspect --bootstrap &>/dev/null

# ===================================================
# โหลด ENV สำหรับ build args
# ===================================================
ENV_FILE="$PROJECT_DIR/backend/api-server/.env.production"
VITE_API_URL="http://localhost"
if [ -f "$ENV_FILE" ]; then
    VITE_API_URL=$(grep -E '^VITE_API_URL=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "http://localhost")
fi

# ===================================================
# Build Backend
# ===================================================
echo ""
echo -e "${BLUE}[2/4] Building Backend (${BACKEND_TAG})...${NC}"
docker buildx build \
    --platform "${PLATFORM}" \
    --load \
    -t "${BACKEND_TAG}" \
    "${PROJECT_DIR}/backend"
echo -e "${GREEN}✅ Backend built: ${BACKEND_TAG}${NC}"

# ===================================================
# Build Frontend
# ===================================================
echo ""
echo -e "${BLUE}[3/4] Building Frontend (${FRONTEND_TAG})...${NC}"
docker buildx build \
    --platform "${PLATFORM}" \
    --load \
    --build-arg "VITE_API_URL=${VITE_API_URL}" \
    --build-arg "VITE_FRONTEND_MODE=api_only" \
    --build-arg "VITE_AUTH_MODE=jwt_only" \
    -t "${FRONTEND_TAG}" \
    "${PROJECT_DIR}/frontend"
echo -e "${GREEN}✅ Frontend built: ${FRONTEND_TAG}${NC}"

# ===================================================
# Summary
# ===================================================
echo ""
echo -e "${BLUE}[4/4] Build Summary${NC}"
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" \
    | grep -E "dj-backend|dj-frontend" || true
echo ""
echo -e "${GREEN}✅ ARM64 images ready!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. ตรวจสอบ backend/api-server/.env.production (เปลี่ยน password และ secret)"
echo "   2. Push image ขึ้น registry (ถ้า deploy บน server อื่น):"
echo "      docker tag ${BACKEND_TAG} your-registry/${BACKEND_TAG}"
echo "      docker push your-registry/${BACKEND_TAG}"
echo "   3. หรือ deploy โดยตรงด้วย:"
echo "      ./scripts/deploy-docker.sh"
