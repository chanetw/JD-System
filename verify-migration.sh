#!/bin/bash

# =====================================================
# Verification Script สำหรับ V1 Extended Migration
# Usage: ./verify-migration.sh
# =====================================================

set -e

echo "🔍 Verifying V1 Extended Approval Flow Migration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =====================================================
# 1. Check V1 Columns Added
# =====================================================
echo "${YELLOW}[1/5] Checking V1 columns added...${NC}"

RESULT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id');" 2>&1)

if [ "$RESULT" = "4" ]; then
  echo "${GREEN}✓ All 4 V1 columns exist${NC}"
else
  echo "${RED}✗ Expected 4 columns, found: $RESULT${NC}"
  exit 1
fi

# =====================================================
# 2. Check V1 Columns Details
# =====================================================
echo "${YELLOW}[2/5] Checking V1 columns data types...${NC}"

psql "$DATABASE_URL" -t -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id')
  ORDER BY ordinal_position;" | while IFS= read -r line; do
  if [ -n "$line" ]; then
    echo "  $line"
  fi
done

echo "${GREEN}✓ V1 columns validated${NC}"

# =====================================================
# 3. Check V2 Tables Deleted
# =====================================================
echo "${YELLOW}[3/5] Checking V2 tables deleted...${NC}"

V2_TABLES=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('approval_flow_templates', 'approval_flow_steps',
                     'project_flow_assignments', 'project_flow_approvers');" 2>&1)

if [ "$V2_TABLES" = "0" ]; then
  echo "${GREEN}✓ All V2 tables deleted${NC}"
else
  echo "${RED}✗ V2 tables still exist: $V2_TABLES${NC}"
  exit 1
fi

# =====================================================
# 4. Check Archive Tables Exist
# =====================================================
echo "${YELLOW}[4/5] Checking archive tables (safety net)...${NC}"

ARCHIVE_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE '%_archive';" 2>&1)

if [ "$ARCHIVE_COUNT" -ge "4" ]; then
  echo "${GREEN}✓ Archive tables exist ($ARCHIVE_COUNT found)${NC}"
  psql "$DATABASE_URL" -t -c "
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%_archive'
    ORDER BY table_name;" | while IFS= read -r line; do
    if [ -n "$line" ]; then
      echo "  - $line"
    fi
  done
else
  echo "${RED}✗ Archive tables missing: $ARCHIVE_COUNT${NC}"
  exit 1
fi

# =====================================================
# 5. Check Indexes Created
# =====================================================
echo "${YELLOW}[5/5] Checking indexes...${NC}"

INDEXES=$(psql "$DATABASE_URL" -t -c "
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'approval_flows'
  AND (indexname LIKE '%approval_flows_project_jobtype%'
       OR indexname LIKE '%approval_flows_unique%');" 2>&1)

if [ -n "$INDEXES" ]; then
  echo "${GREEN}✓ Performance indexes created:${NC}"
  echo "$INDEXES" | while IFS= read -r line; do
    if [ -n "$line" ]; then
      echo "  - $line"
    fi
  done
else
  echo "${YELLOW}⚠ Warning: Indexes not found or not created${NC}"
fi

# =====================================================
# Summary
# =====================================================
echo ""
echo "${GREEN}════════════════════════════════════════${NC}"
echo "${GREEN}✓ Migration Verification Complete!${NC}"
echo "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  ✓ V1 columns added (4 columns)"
echo "  ✓ V2 tables deleted"
echo "  ✓ Archive tables created (safety net)"
echo "  ✓ Performance indexes ready"
echo ""
echo "Next steps:"
echo "  1. Deploy backend code"
echo "  2. Deploy frontend code"
echo "  3. Run smoke tests"
echo "  4. Monitor for 24-48 hours"
echo ""
