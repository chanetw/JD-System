-- ============================================================================
-- Check if V2 Tables Actually Exist (Using information_schema)
-- ============================================================================
-- This uses ACTUAL table existence check, NOT statistics/cache
-- ============================================================================

SELECT
    'V2 TABLE EXISTENCE CHECK' as report_section,
    table_name,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_audit_logs')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_audit_logs,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_email_logs')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_email_logs,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_organizations')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_organizations,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_password_reset_tokens')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_password_reset_tokens,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_registration_requests')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_registration_requests,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_roles')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_roles,
    CASE
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_users')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as v2_users
FROM (SELECT 1 as table_name) t;

-- ============================================================================
-- List ALL V2 tables that actually exist
-- ============================================================================

SELECT
    'ALL EXISTING V2 TABLES' as report_section,
    table_name,
    table_type,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'v2_%'
ORDER BY table_name;

-- ============================================================================
-- Final verdict
-- ============================================================================

SELECT
    'VERDICT' as report_section,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'v2_%') = 0
        THEN '✅ NO V2 TABLES EXIST - System is clean'
        ELSE '⚠️  V2 TABLES EXIST - Listed above'
    END as status;
