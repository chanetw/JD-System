#!/bin/bash

# ===================================================
# Backend Deployment Script - V1 Role Migration
# ===================================================

set -e

echo "🚀 Deploying Backend..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/../backend/api-server"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Step 2: Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript V2 code...${NC}"
npm run build:v2

# Step 3: Start server
echo -e "${YELLOW}🚀 Starting backend server...${NC}"
npm start

# The script will keep running and show backend logs
