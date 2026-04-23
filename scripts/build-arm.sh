#!/bin/bash
# ===================================================
# DJ System - Multi-arch Docker build script
# รองรับ linux/amd64 และ linux/arm64 พร้อม optional push ไป Docker Hub
#
# ต้องการ: Docker Desktop พร้อม buildx
# ===================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
REGISTRY="${REGISTRY:-chanetw}"
BACKEND_IMAGE="${BACKEND_IMAGE:-${REGISTRY}/dj-system-backend:latest}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-${REGISTRY}/dj-system-frontend:latest}"
RELEASE_TAG="${RELEASE_TAG:-}"
PUSH_MODE="false"
TARGET="all"

usage() {
    cat <<'EOF'
Usage: ./scripts/build-arm.sh [options]

Options:
  --target <all|backend|frontend>   Build scope (default: all)
  --platforms <list>                Comma-separated platform list (default: linux/amd64,linux/arm64)
  --backend-image <name:tag>        Backend image tag
  --frontend-image <name:tag>       Frontend image tag
    --release-tag <tag>               Add additional tag for both images (e.g. 2026.04.23-abc123)
  --push                            Push manifest/images to registry (requires docker login)
  -h, --help                        Show this help

Examples:
  ./scripts/build-arm.sh --push
    ./scripts/build-arm.sh --push --release-tag 2026.04.23-abc123
  ./scripts/build-arm.sh --target backend --backend-image chanetw/dj-system-backend:2026.04.22-a1b2c3d
  ./scripts/build-arm.sh --platforms linux/arm64 --target frontend
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --platforms)
            PLATFORMS="$2"
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
        --release-tag)
            RELEASE_TAG="$2"
            shift 2
            ;;
        --push)
            PUSH_MODE="true"
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

if [[ "$TARGET" != "all" && "$TARGET" != "backend" && "$TARGET" != "frontend" ]]; then
    echo -e "${RED}❌ Invalid --target: $TARGET${NC}"
    exit 1
fi

echo -e "${BLUE}🏗️  DJ System - Multi-arch Docker Build${NC}"
echo -e "${BLUE}Target: ${TARGET}${NC}"
echo -e "${BLUE}Platforms: ${PLATFORMS}${NC}"
echo -e "${BLUE}Push mode: ${PUSH_MODE}${NC}"
if [[ -n "${RELEASE_TAG}" ]]; then
    echo -e "${BLUE}Release tag: ${RELEASE_TAG}${NC}"
fi
echo ""

strip_tag() {
    local image="$1"
    echo "${image%%:*}"
}

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

if [[ "$PUSH_MODE" == "true" ]]; then
    if ! docker info 2>/dev/null | grep -q '^ Username:'; then
        echo -e "${RED}❌ Docker registry login not found. Run: docker login${NC}"
        exit 1
    fi
fi

# ===================================================
# โหลด ENV สำหรับ build args
# ===================================================
ENV_FILE="$PROJECT_DIR/backend/api-server/.env.production"
VITE_API_URL="http://localhost"
if [ -f "$ENV_FILE" ]; then
    VITE_API_URL=$(grep -E '^VITE_API_URL=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "http://localhost")
fi

# ===================================================
# Build flags
BUILD_OUTPUT_FLAG="--load"
if [[ "$PUSH_MODE" == "true" ]]; then
    BUILD_OUTPUT_FLAG="--push"
elif [[ "$PLATFORMS" == *,* ]]; then
    LOCAL_PLATFORM="linux/$(docker version --format '{{.Server.Arch}}' 2>/dev/null || echo arm64)"
    echo -e "${YELLOW}⚠ Multi-platform local load is not supported. Falling back to single platform: ${LOCAL_PLATFORM}${NC}"
    PLATFORMS="$LOCAL_PLATFORM"
fi

# Build Backend
# ===================================================
if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
    echo ""
    echo -e "${BLUE}[2/4] Building Backend (${BACKEND_IMAGE})...${NC}"
    BACKEND_REPO="$(strip_tag "$BACKEND_IMAGE")"
    BACKEND_EXTRA_TAG_ARGS=()
    if [[ -n "$RELEASE_TAG" ]]; then
        BACKEND_EXTRA_TAG_ARGS+=("-t" "${BACKEND_REPO}:${RELEASE_TAG}")
    fi
    docker buildx build \
        --platform "${PLATFORMS}" \
        ${BUILD_OUTPUT_FLAG} \
        -f "${PROJECT_DIR}/backend/api-server/Dockerfile" \
        -t "${BACKEND_IMAGE}" \
        "${BACKEND_EXTRA_TAG_ARGS[@]}" \
        "${PROJECT_DIR}/backend"
    echo -e "${GREEN}✅ Backend built: ${BACKEND_IMAGE}${NC}"
    if [[ -n "$RELEASE_TAG" ]]; then
        echo -e "${GREEN}✅ Backend tagged: ${BACKEND_REPO}:${RELEASE_TAG}${NC}"
    fi
fi

# ===================================================
# Build Frontend
# ===================================================
if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
    echo ""
    echo -e "${BLUE}[3/4] Building Frontend (${FRONTEND_IMAGE})...${NC}"
    FRONTEND_REPO="$(strip_tag "$FRONTEND_IMAGE")"
    FRONTEND_EXTRA_TAG_ARGS=()
    if [[ -n "$RELEASE_TAG" ]]; then
        FRONTEND_EXTRA_TAG_ARGS+=("-t" "${FRONTEND_REPO}:${RELEASE_TAG}")
    fi
    docker buildx build \
        --platform "${PLATFORMS}" \
        ${BUILD_OUTPUT_FLAG} \
        --build-arg "VITE_API_URL=${VITE_API_URL}" \
        --build-arg "VITE_FRONTEND_MODE=api_only" \
        --build-arg "VITE_AUTH_MODE=jwt_only" \
        -t "${FRONTEND_IMAGE}" \
        "${FRONTEND_EXTRA_TAG_ARGS[@]}" \
        "${PROJECT_DIR}/frontend"
    echo -e "${GREEN}✅ Frontend built: ${FRONTEND_IMAGE}${NC}"
    if [[ -n "$RELEASE_TAG" ]]; then
        echo -e "${GREEN}✅ Frontend tagged: ${FRONTEND_REPO}:${RELEASE_TAG}${NC}"
    fi
fi

# ===================================================
# Summary
# ===================================================
echo ""
echo -e "${BLUE}[4/4] Build Summary${NC}"
if [[ "$PUSH_MODE" == "true" ]]; then
    echo -e "${GREEN}✅ Multi-arch images pushed to registry${NC}"
    if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
        echo "   Backend:  ${BACKEND_IMAGE}"
        if [[ -n "$RELEASE_TAG" ]]; then
            echo "             $(strip_tag "$BACKEND_IMAGE"):${RELEASE_TAG}"
        fi
    fi
    if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
        echo "   Frontend: ${FRONTEND_IMAGE}"
        if [[ -n "$RELEASE_TAG" ]]; then
            echo "             $(strip_tag "$FRONTEND_IMAGE"):${RELEASE_TAG}"
        fi
    fi
else
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" \
        | grep -E "dj-system-backend|dj-system-frontend|dj-backend|dj-frontend" || true
fi
echo ""
echo -e "${GREEN}✅ Build complete${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Login registry: docker login"
echo "   2. Deploy backend:  ./scripts/deploy-docker.sh --target backend --action pull"
echo "   3. Deploy frontend: ./scripts/deploy-docker.sh --target frontend --action pull"
