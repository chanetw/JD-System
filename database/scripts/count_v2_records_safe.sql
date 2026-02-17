-- ============================================================================
-- Count Records in V2 Tables (Results Tab Version - Supabase Safe)
-- ============================================================================
-- This script safely counts V2 table records and shows results
-- Output appears in Results tab - NOT Messages panel
-- Uses dynamic queries with EXECUTE to avoid relation errors
-- ============================================================================

WITH table_existence AS (
    -- Check which V2 tables exist
    SELECT
        'v2_audit_logs' as table_name,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_audit_logs') as table_exists
    UNION ALL
    SELECT 'v2_email_logs', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_email_logs')
    UNION ALL
    SELECT 'v2_organizations', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_organizations')
    UNION ALL
    SELECT 'v2_password_reset_tokens', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_password_reset_tokens')
    UNION ALL
    SELECT 'v2_registration_requests', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_registration_requests')
    UNION ALL
    SELECT 'v2_roles', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_roles')
    UNION ALL
    SELECT 'v2_users', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_users')
),
-- Get approximate row counts from pg_stat_user_tables (fast, doesn't query table)
table_stats AS (
    SELECT
        relname as table_name,
        n_live_tup as approx_record_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND relname LIKE 'v2_%'
)
SELECT
    '=== V2 TABLES STATUS ===' as report_section,
    t.table_name,
    CASE
        WHEN t.table_exists THEN 'EXISTS'
        ELSE 'Does not exist'
    END as status,
    COALESCE(s.approx_record_count, 0) as approx_records,
    CASE
        WHEN NOT t.table_exists THEN '✓ Safe (not in system)'
        WHEN COALESCE(s.approx_record_count, 0) = 0 THEN '✓ Empty (safe to drop)'
        WHEN COALESCE(s.approx_record_count, 0) < 10 THEN '⚠️  Few records (review)'
        ELSE '⚠️  Has data (backup before drop)'
    END as recommendation
FROM table_existence t
LEFT JOIN table_stats s ON t.table_name = s.table_name
ORDER BY t.table_name;

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================

SELECT
    '=== SUMMARY ===' as report_section,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'v2_%') as v2_tables_found,
    (SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname LIKE 'v2_%') as total_approx_records,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'v2_%') = 0
        THEN '✅ No action needed - V2 tables do not exist'
        WHEN (SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname LIKE 'v2_%') = 0
        THEN '✅ Safe to drop - V2 tables are empty'
        ELSE '⚠️  Review data before dropping'
    END as recommended_action;

-- ============================================================================
-- ACTION PLAN
-- ============================================================================

SELECT
    '=== ACTION PLAN ===' as report_section,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'v2_%') = 0
        THEN 'No V2 tables found - System is clean'

        WHEN (SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname LIKE 'v2_%') = 0
        THEN 'V2 tables are EMPTY - Safe to drop'

        ELSE 'V2 tables contain data - Review and backup first'
    END as current_state,

    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'v2_%') = 0
        THEN 'Migration files 010, 011 can be archived'

        WHEN (SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname LIKE 'v2_%') = 0
        THEN 'DROP TABLE IF EXISTS v2_email_logs, v2_audit_logs, v2_password_reset_tokens, v2_registration_requests, v2_roles, v2_organizations, v2_users CASCADE;'

        ELSE 'Step 1: Export data via Supabase Table Editor | Step 2: Check if migration needed | Step 3: Drop tables'
    END as next_steps;
