#!/bin/bash

# ===================================================
# DJ System Production Deployment Verification
# ===================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"

FAILED=0

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; FAILED=$((FAILED + 1)); }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo -e "${BLUE}🔍 Verifying DJ System Production Deployment${NC}"
echo "Backend:  ${BACKEND_URL}"
echo "Frontend: ${FRONTEND_URL}"
echo ""

echo -e "${BLUE}Test 1: Docker service state${NC}"
if docker compose -f docker-compose.prod.yml ps >/dev/null 2>&1; then
    docker compose -f docker-compose.prod.yml ps
    pass "docker compose status accessible"
else
    fail "cannot read docker compose service state"
fi
echo ""

echo -e "${BLUE}Test 2: Backend health endpoint${NC}"
if curl -fsS "${BACKEND_URL}/health" >/tmp/dj_backend_health.json 2>/dev/null; then
    pass "GET /health returned 200"
    if grep -qi 'connected' /tmp/dj_backend_health.json; then
        pass "health payload reports database connected"
    else
        warn "health payload did not include expected database connected marker"
    fi
else
    fail "GET /health failed"
fi
echo ""

echo -e "${BLUE}Test 3: API readiness endpoints${NC}"
if curl -fsS "${BACKEND_URL}/api/version" >/dev/null 2>&1; then
    pass "GET /api/version returned 200"
else
    fail "GET /api/version failed"
fi

if curl -fsS -X OPTIONS "${BACKEND_URL}/api/v2/auth/login" >/dev/null 2>&1; then
    pass "Auth route reachable (/api/v2/auth/login)"
else
    warn "Auth OPTIONS check did not return success (may be policy-dependent)"
fi
echo ""

echo -e "${BLUE}Test 4: Frontend and static checks${NC}"
if curl -fsS "${FRONTEND_URL}/" >/tmp/dj_frontend_index.html 2>/dev/null; then
    pass "Frontend root reachable"
else
    fail "Frontend root is unreachable"
fi

if curl -fsS "${FRONTEND_URL}/index.html" >/dev/null 2>&1; then
    pass "index.html reachable"
else
    fail "index.html unreachable"
fi
echo ""

echo -e "${BLUE}Test 5: Nginx to backend proxy path${NC}"
if curl -fsS "${FRONTEND_URL}/api/version" >/dev/null 2>&1; then
    pass "Nginx proxy to backend (/api/version) working"
else
    fail "Nginx proxy to backend failed"
fi
echo ""

echo -e "${BLUE}Test 6: Upload path probe${NC}"
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/uploads/" || true)
if [[ "$UPLOAD_STATUS" == "200" || "$UPLOAD_STATUS" == "403" || "$UPLOAD_STATUS" == "404" ]]; then
    pass "Uploads route responds (status ${UPLOAD_STATUS})"
else
    fail "Uploads route probe failed (status ${UPLOAD_STATUS})"
fi
echo ""

echo -e "${BLUE}📋 Verification Summary${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All production checks passed${NC}"
else
    echo -e "${RED}❌ ${FAILED} check(s) failed${NC}"
    echo "Hint: run ./scripts/collect-502-diagnostics.sh for incident evidence"
fi

rm -f /tmp/dj_backend_health.json /tmp/dj_frontend_index.html
exit $FAILED
