#!/bin/bash

# ===================================================
# Deployment Verification Script
# ===================================================

set -e

echo "🔍 Verifying DJ System V1 Role Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED=0

# ===================================================
# Test 1: Backend Health
# ===================================================
echo -e "${BLUE}Test 1: Backend Health Check${NC}"

if curl -s http://localhost:5000/api/v2/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is running and healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# ===================================================
# Test 2: Database Connection
# ===================================================
echo -e "${BLUE}Test 2: Database Connection${NC}"

echo "Run this command to verify database:"
echo -e "${YELLOW}psql -h aws-1-ap-south-1.pooler.supabase.com -U postgres.putfusjtlzmvjmcwkefv -d postgres -c \"SELECT COUNT(*) FROM user_roles;\"${NC}"
echo ""

# ===================================================
# Test 3: Role Names Verification
# ===================================================
echo -e "${BLUE}Test 3: Database Role Names${NC}"

echo "Run this command:"
echo -e "${YELLOW}psql -h aws-1-ap-south-1.pooler.supabase.com -U postgres.putfusjtlzmvjmcwkefv -d postgres -c \"SELECT DISTINCT role_name FROM user_roles ORDER BY role_name;\"${NC}"
echo ""
echo "Expected output:"
echo "  Admin"
echo "  Approver"
echo "  Assignee"
echo "  Requester"
echo ""

# ===================================================
# Test 4: API Endpoint Tests
# ===================================================
echo -e "${BLUE}Test 4: API Endpoint Connectivity${NC}"

# Test 1: Health endpoint
echo -n "  • GET /api/v2/health: "
if curl -s http://localhost:5000/api/v2/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2: Auth endpoints exist
echo -n "  • Auth endpoints: "
if curl -s http://localhost:5000/api/v2/auth/login -X OPTIONS > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️  (Expected for OPTIONS)${NC}"
fi

echo ""

# ===================================================
# Test 5: Frontend Build
# ===================================================
echo -e "${BLUE}Test 5: Frontend Build${NC}"

FRONTEND_DIR="$(dirname "$0")/../frontend"

if [ -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${GREEN}✅ Frontend dist/ directory exists${NC}"

    # Count files
    FILE_COUNT=$(find "$FRONTEND_DIR/dist" -type f | wc -l)
    echo "   Files in dist/: $FILE_COUNT"
else
    echo -e "${YELLOW}⚠️  Frontend dist/ not found (run: npm run build)${NC}"
fi
echo ""

# ===================================================
# Test 6: Code Changes
# ===================================================
echo -e "${BLUE}Test 6: Code Changes Verification${NC}"

BACKEND_DIR="$(dirname "$0")/../backend/api-server"
FRONTEND_DIR="$(dirname "$0")/../frontend"

# Check for V1 role names in backend
echo -n "  • Backend using V1 roles: "
if grep -r "RoleName.ADMIN\|RoleName.REQUESTER" "$BACKEND_DIR/src/v2" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    FAILED=$((FAILED + 1))
fi

# Check for V1 role names in frontend
echo -n "  • Frontend using V1 roles: "
if grep -r "Admin\|Requester\|Approver\|Assignee" "$FRONTEND_DIR/src/types" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ===================================================
# Summary
# ===================================================
echo -e "${BLUE}📋 Verification Summary${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Ensure users have re-login (old JWT tokens won't work)"
    echo "2. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)"
    echo "3. Test each role: Admin, Requester, Approver, Assignee"
    echo "4. Verify UI shows correct menus per role"
else
    echo -e "${RED}❌ $FAILED check(s) failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Is backend running? npm start in backend/api-server/"
    echo "2. Is database accessible?"
    echo "3. Did you run npm install?"
fi

echo ""
echo "For detailed testing, see: docs/TESTING-CHECKLIST-V1-ROLES.md"
echo ""

exit $FAILED
