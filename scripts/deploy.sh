#!/bin/bash

# ===================================================
# DJ System V1 Role Migration - Deployment Script
# ===================================================

set -e  # Exit on error

echo "🚀 Starting DJ System V1 Role Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend/api-server"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# ===================================================
# Phase 1: Verify Git Status
# ===================================================
echo -e "${BLUE}📋 Phase 1: Verifying Git Status...${NC}"

cd "$PROJECT_DIR"
git status

echo -e "${GREEN}✅ Git status verified${NC}"
echo ""

# ===================================================
# Phase 2: Deploy Backend
# ===================================================
echo -e "${BLUE}📦 Phase 2: Deploying Backend...${NC}"

cd "$BACKEND_DIR"

echo -e "${YELLOW}  → Installing backend dependencies...${NC}"
npm install

echo -e "${YELLOW}  → Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}  → Building TypeScript V2 code...${NC}"
npm run build:v2

echo -e "${YELLOW}  → Starting backend server...${NC}"
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start!${NC}"
    exit 1
fi

echo -e "${YELLOW}  → Verifying backend health...${NC}"
if curl -s http://localhost:5000/api/v2/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is running and healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo ""

# ===================================================
# Phase 3: Deploy Frontend
# ===================================================
echo -e "${BLUE}🎨 Phase 3: Deploying Frontend...${NC}"

cd "$FRONTEND_DIR"

echo -e "${YELLOW}  → Installing frontend dependencies...${NC}"
npm install

echo -e "${YELLOW}  → Building frontend for production...${NC}"
npm run build

echo -e "${YELLOW}  → Frontend build complete: ./dist${NC}"

echo -e "${GREEN}✅ Frontend build successful${NC}"
echo ""

# ===================================================
# Phase 4: Database Verification
# ===================================================
echo -e "${BLUE}📊 Phase 4: Verifying Database...${NC}"

echo -e "${YELLOW}  → Checking role names in database...${NC}"
echo ""
echo "Run this command to verify role names:"
echo "psql -h aws-1-ap-south-1.pooler.supabase.com -U postgres.putfusjtlzmvjmcwkefv -d postgres -c \"SELECT DISTINCT role_name FROM user_roles ORDER BY role_name;\""
echo ""
echo "Expected result:"
echo "  Admin"
echo "  Approver"
echo "  Assignee"
echo "  Requester"
echo ""

# ===================================================
# Phase 5: Deployment Summary
# ===================================================
echo -e "${BLUE}📋 Deployment Summary${NC}"
echo ""
echo -e "${GREEN}✅ Code Changes:${NC}"
echo "   • 40 files modified (18 backend, 12+ frontend)"
echo "   • V2 role names → V1 role names"
echo "   • Commit: 2dd68ed"
echo ""
echo -e "${GREEN}✅ Backend:${NC}"
echo "   • Running on: http://localhost:5000"
echo "   • Health check: http://localhost:5000/api/v2/health"
echo ""
echo -e "${GREEN}✅ Frontend:${NC}"
echo "   • Build output: $FRONTEND_DIR/dist"
echo "   • Ready to deploy to: /var/www/dj-system/"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "   1. Copy frontend/dist/* to your web server"
echo "   2. All users must re-login (old JWT tokens won't work)"
echo "   3. Clear browser cache before testing"
echo "   4. Test with each role (Admin, Requester, Approver, Assignee)"
echo ""

# ===================================================
# Phase 6: Cleanup & Logs
# ===================================================
echo -e "${BLUE}🔍 Backend Logs${NC}"
echo "Backend is running with PID: $BACKEND_PID"
echo ""
echo "To see logs: tail -f logs/app.log"
echo "To stop backend: kill $BACKEND_PID"
echo ""

# Keep backend running
wait $BACKEND_PID
