#!/bin/bash

# ===================================================
# Frontend Deployment Script - V1 Role Migration
# ===================================================

set -e

echo "🎨 Deploying Frontend..."
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Step 2: Build for production
echo -e "${YELLOW}🔨 Building for production...${NC}"
npm run build

# Step 3: Show build output location
echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Build output: $(pwd)/dist"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Copy dist/* to your web server:"
echo "   cp -r dist/* /var/www/dj-system/"
echo ""
echo "2. Or run preview:"
echo "   npm run preview"
echo ""
echo "3. Don't forget to:"
echo "   - Clear browser cache (Cmd+Shift+R)"
echo "   - Have users re-login"
echo "   - Verify each role has correct permissions"
echo ""
