#!/bin/bash
# ===================================================
# DJ System - Docker Production Deploy Script
# Split deployment: backend | frontend | all
# ===================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/backend/api-server/.env.production"

DEPLOY_TARGET="all"
ACTION="build"
USE_LOCAL_DB="false"
ALLOW_MIGRATION_FAILURE="false"
WAIT_TIMEOUT=120

BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-3000}"
FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-80}"
POSTGRES_PORT="${POSTGRES_PORT:-5434}"

usage() {
    cat <<'EOF'
Usage: ./scripts/deploy-docker.sh [options]

Options:
  --target <all|backend|frontend>   Deploy scope (default: all)
  --action <build|pull>             Build locally or pull from registry (default: build)
  --with-local-db                   Start local postgres service before backend deploy
  --allow-migration-failure         Continue deploy even if migrate deploy fails
  --timeout <seconds>               Health wait timeout (default: 120)
  -h, --help                        Show this help

Examples:
  ./scripts/deploy-docker.sh --target backend --action pull
  ./scripts/deploy-docker.sh --target frontend --action pull
  ./scripts/deploy-docker.sh --target all --action build --with-local-db
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --target)
            DEPLOY_TARGET="$2"
            shift 2
            ;;
        --action)
            ACTION="$2"
            shift 2
            ;;
        --with-local-db)
            USE_LOCAL_DB="true"
            shift
            ;;
        --allow-migration-failure)
            ALLOW_MIGRATION_FAILURE="true"
            shift
            ;;
        --timeout)
            WAIT_TIMEOUT="$2"
            shift 2
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

if [[ "$DEPLOY_TARGET" != "all" && "$DEPLOY_TARGET" != "backend" && "$DEPLOY_TARGET" != "frontend" ]]; then
    echo -e "${RED}❌ Invalid --target: $DEPLOY_TARGET${NC}"
    exit 1
fi

if [[ "$ACTION" != "build" && "$ACTION" != "pull" ]]; then
    echo -e "${RED}❌ Invalid --action: $ACTION${NC}"
    exit 1
fi

if ! [[ "$WAIT_TIMEOUT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ --timeout must be integer seconds${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 DJ System - Docker Production Deploy${NC}"
echo -e "${BLUE}Target: ${DEPLOY_TARGET} | Action: ${ACTION} | Local DB: ${USE_LOCAL_DB}${NC}"
echo ""

require_env_var() {
    local key="$1"
    if ! grep -qE "^${key}=" "$ENV_FILE"; then
        echo -e "${RED}❌ Missing required env var: ${key}${NC}"
        exit 1
    fi
}

get_env_value() {
    local key="$1"
    grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2-
}

validate_port() {
    local key="$1"
    local value="$2"
    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ ${key} must be an integer port (got: ${value})${NC}"
        exit 1
    fi
    if (( value < 1 || value > 65535 )); then
        echo -e "${RED}❌ ${key} must be between 1 and 65535 (got: ${value})${NC}"
        exit 1
    fi
}

wait_for_health() {
    local service="$1"
    local container="$2"
    local elapsed=0

    echo "Waiting for ${service} to become healthy (timeout ${WAIT_TIMEOUT}s)..."
    while (( elapsed < WAIT_TIMEOUT )); do
        local status
        status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)
        if [[ "$status" == "healthy" || "$status" == "running" ]]; then
            echo -e "${GREEN}✅ ${service} is ${status}${NC}"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done

    echo -e "${RED}❌ ${service} failed health wait (${WAIT_TIMEOUT}s)${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=120 "$service" || true
    exit 1
}

echo -e "${BLUE}📋 Step 1: Preflight validation${NC}"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Missing file: backend/api-server/.env.production${NC}"
    echo "Create it first. Deployment aborted."
    exit 1
fi

require_env_var "DATABASE_URL"
require_env_var "JWT_SECRET"
require_env_var "NODE_ENV"
require_env_var "ALLOWED_ORIGINS"

if ! grep -qE '^JWT_EXPIRES_IN=' "$ENV_FILE"; then
    echo -e "${YELLOW}⚠ JWT_EXPIRES_IN is not set in .env.production. Backend will fallback to code default.${NC}"
fi

validate_port "BACKEND_HOST_PORT" "$BACKEND_HOST_PORT"
validate_port "FRONTEND_HOST_PORT" "$FRONTEND_HOST_PORT"
validate_port "POSTGRES_PORT" "$POSTGRES_PORT"

JWT_SECRET_VALUE="$(get_env_value JWT_SECRET)"
if (( ${#JWT_SECRET_VALUE} < 32 )); then
    echo -e "${RED}❌ JWT_SECRET must be at least 32 chars${NC}"
    exit 1
fi

if ! docker compose -f "$COMPOSE_FILE" config >/dev/null; then
    echo -e "${RED}❌ docker compose config validation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Preflight passed${NC}"
echo ""

cd "$PROJECT_DIR"

echo -e "${BLUE}📦 Step 2: Prepare images (${ACTION})${NC}"
if [[ "$ACTION" == "build" ]]; then
    if [[ "$DEPLOY_TARGET" == "backend" ]]; then
        docker compose -f "$COMPOSE_FILE" build --no-cache backend
    elif [[ "$DEPLOY_TARGET" == "frontend" ]]; then
        docker compose -f "$COMPOSE_FILE" build --no-cache frontend
    else
        docker compose -f "$COMPOSE_FILE" build --no-cache backend frontend
    fi
else
    if [[ "$DEPLOY_TARGET" == "backend" ]]; then
        docker compose -f "$COMPOSE_FILE" pull backend
    elif [[ "$DEPLOY_TARGET" == "frontend" ]]; then
        docker compose -f "$COMPOSE_FILE" pull frontend
    else
        docker compose -f "$COMPOSE_FILE" pull backend frontend
    fi
fi
echo -e "${GREEN}✅ Image step complete${NC}"
echo ""

if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "all" ]]; then
    echo -e "${BLUE}🧪 Step 3: Migration gate (backend)${NC}"
    if [[ "$USE_LOCAL_DB" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" up -d postgres
        wait_for_health "postgres" "dj-postgres-prod"
    fi

    set +e
    docker compose -f "$COMPOSE_FILE" run --rm backend npx prisma migrate deploy --schema ./prisma/schema.prisma
    MIGRATE_EXIT=$?
    set -e

    if [[ $MIGRATE_EXIT -ne 0 ]]; then
        if [[ "$ALLOW_MIGRATION_FAILURE" == "true" ]]; then
            echo -e "${YELLOW}⚠ Migration failed but allowed by flag --allow-migration-failure${NC}"
        else
            echo -e "${RED}❌ Migration gate failed. Deployment stopped.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Migration gate passed${NC}"
    fi
    echo ""
fi

echo -e "${BLUE}🚀 Step 4: Deploy target services${NC}"
if [[ "$DEPLOY_TARGET" == "backend" ]]; then
    docker compose -f "$COMPOSE_FILE" up -d --no-deps backend
    wait_for_health "backend" "dj-backend-prod"
elif [[ "$DEPLOY_TARGET" == "frontend" ]]; then
    docker compose -f "$COMPOSE_FILE" up -d --no-deps frontend
    wait_for_health "frontend" "dj-frontend-prod"
else
    docker compose -f "$COMPOSE_FILE" up -d backend frontend
    wait_for_health "backend" "dj-backend-prod"
    wait_for_health "frontend" "dj-frontend-prod"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete${NC}"
echo -e "${BLUE}📋 Service Status:${NC}"
docker compose -f "$COMPOSE_FILE" ps

FRONTEND_URL="http://localhost"
if [[ "$FRONTEND_HOST_PORT" != "80" ]]; then
    FRONTEND_URL="http://localhost:${FRONTEND_HOST_PORT}"
fi

BACKEND_URL="http://localhost:${BACKEND_HOST_PORT}"

echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "   Frontend:  ${FRONTEND_URL}"
echo "   Backend:   ${BACKEND_URL}"
echo "   Health:    ${BACKEND_URL}/health"

echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   Verify:    ./scripts/verify-deployment.sh"
echo "   Logs:      docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:      docker compose -f docker-compose.prod.yml down"
echo "   Restart:   docker compose -f docker-compose.prod.yml restart"
