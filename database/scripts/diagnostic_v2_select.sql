-- ============================================================================
-- V2 Tables Diagnostic (SELECT Version - Safe for Missing Tables)
-- ============================================================================
-- This version uses SELECT to show output in Results tab
-- Safe to run even if V2 tables don't exist
-- ============================================================================

-- PART 1: V2 Tables List with Columns
SELECT
    '=== V2 TABLES FOUND ===' as report_section,
    table_name,
    (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
     FROM information_schema.columns c
     WHERE c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name LIKE 'v2_%'
ORDER BY table_name;

-- PART 2: V1 Tables Health Check
SELECT
    '=== V1 TABLES HEALTH ===' as report_section,
    'users (V1)' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as with_tenant
FROM users

UNION ALL

SELECT
    '=== V1 TABLES HEALTH ===' as report_section,
    'user_roles (V1)',
    COUNT(*) as total,
    COUNT(DISTINCT user_id) as users_with_roles,
    NULL as with_tenant
FROM user_roles;

-- PART 3: Summary
WITH v2_summary AS (
    SELECT COUNT(*) as v2_table_count
    FROM information_schema.tables
    WHERE table_name LIKE 'v2_%'
),
v1_summary AS (
    SELECT
        COUNT(*) FILTER (WHERE is_active = true) as v1_active_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_roles) as v1_users_with_roles
    FROM users
)
SELECT
    '=== SUMMARY ===' as report_section,
    v2.v2_table_count as v2_tables_found,
    v1.v1_active_users as v1_active_users,
    v1.v1_users_with_roles as v1_users_with_roles,
    CASE
        WHEN v2.v2_table_count = 0 THEN '✅ No V2 tables - system is clean'
        ELSE '⚠️  V2 tables found - listed in PART 1 above'
    END as recommendation
FROM v2_summary v2, v1_summary v1;

-- PART 4: Next Steps Recommendation
SELECT
    '=== NEXT STEPS ===' as report_section,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'v2_%') = 0
        THEN '✅ No action needed - V2 tables do not exist'

        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'v2_%') > 0
        THEN '⚠️  V2 tables exist - review PART 1 for table names, then manually check if empty'

        ELSE 'Unknown state'
    END as next_step,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'v2_%') > 0
        THEN 'To check if empty: SELECT COUNT(*) FROM <table_name>; for each table in PART 1'
        ELSE 'Archive migration files 010, 011 - they were never executed'
    END as additional_info;
