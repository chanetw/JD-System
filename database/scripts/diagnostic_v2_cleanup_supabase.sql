-- ============================================================================
-- V2 Authentication Tables Diagnostic & Cleanup Script (Supabase Edition)
-- ============================================================================
-- Purpose: Check for V2 tables existence and data before cleanup
-- Safe to run: This is READ-ONLY diagnostic (until you uncomment DROP commands)
--
-- Optimized for: Supabase SQL Editor
-- Differences from standard version:
--   - Removed \echo commands (use RAISE NOTICE instead)
--   - Removed \COPY commands (use Supabase Dashboard export instead)
--   - All output goes to Messages panel
--
-- Usage in Supabase:
--   1. Go to SQL Editor in Supabase Dashboard
--   2. Paste this entire script
--   3. Click "Run" button
--   4. Check Messages panel for output
-- ============================================================================

-- Show separator
DO $$ BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'V2 TABLES DIAGNOSTIC REPORT';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- PART 1: Check if V2 tables exist
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 1: V2 Tables Existence Check ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_tables TEXT[] := ARRAY[
        'v2_users',
        'v2_organizations',
        'v2_roles',
        'v2_password_reset_tokens',
        'v2_registration_requests',
        'v2_audit_logs',
        'v2_email_logs'
    ];
    tbl TEXT;
    table_exists BOOLEAN;
    found_tables INT := 0;
BEGIN
    FOREACH tbl IN ARRAY v2_tables
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = tbl
        ) INTO table_exists;

        IF table_exists THEN
            RAISE NOTICE '✗ FOUND: % (should not exist)', tbl;
            found_tables := found_tables + 1;
        ELSE
            RAISE NOTICE '✓ NOT FOUND: % (expected)', tbl;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    IF found_tables > 0 THEN
        RAISE WARNING 'Found % V2 tables that should not exist!', found_tables;
    ELSE
        RAISE NOTICE '✓ All V2 tables are absent (correct state)';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Check V2 table record counts (if tables exist)
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 2: V2 Tables Record Counts (if exist) ---';
    RAISE NOTICE '';
END $$;

-- v2_users
DO $$
DECLARE
    v2_users_count INT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_users') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_users' INTO v2_users_count;
        RAISE NOTICE 'v2_users: % records', v2_users_count;
    ELSE
        RAISE NOTICE 'v2_users: Table does not exist (expected)';
    END IF;
END $$;

-- v2_organizations
DO $$
DECLARE
    record_count INT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_organizations') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_organizations' INTO record_count;
        RAISE NOTICE 'v2_organizations: % records', record_count;
    ELSE
        RAISE NOTICE 'v2_organizations: Table does not exist (expected)';
    END IF;
END $$;

-- v2_roles
DO $$
DECLARE
    record_count INT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_roles') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_roles' INTO record_count;
        RAISE NOTICE 'v2_roles: % records', record_count;
    ELSE
        RAISE NOTICE 'v2_roles: Table does not exist (expected)';
    END IF;
END $$;

-- v2_registration_requests
DO $$
DECLARE
    total_count INT;
    pending_count INT;
    approved_count INT;
    rejected_count INT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_registration_requests') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_registration_requests' INTO total_count;
        EXECUTE 'SELECT COUNT(*) FROM v2_registration_requests WHERE status = ''pending''' INTO pending_count;
        EXECUTE 'SELECT COUNT(*) FROM v2_registration_requests WHERE status = ''approved''' INTO approved_count;
        EXECUTE 'SELECT COUNT(*) FROM v2_registration_requests WHERE status = ''rejected''' INTO rejected_count;

        RAISE NOTICE 'v2_registration_requests: % total (pending: %, approved: %, rejected: %)',
            total_count, pending_count, approved_count, rejected_count;
    ELSE
        RAISE NOTICE 'v2_registration_requests: Table does not exist (expected)';
    END IF;
END $$;

-- v2_password_reset_tokens
DO $$
DECLARE
    total_count INT;
    active_count INT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_password_reset_tokens') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_password_reset_tokens' INTO total_count;
        EXECUTE 'SELECT COUNT(*) FROM v2_password_reset_tokens WHERE is_used = false AND expires_at > NOW()' INTO active_count;

        RAISE NOTICE 'v2_password_reset_tokens: % total (active: %)', total_count, active_count;
    ELSE
        RAISE NOTICE 'v2_password_reset_tokens: Table does not exist (expected)';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Check V1 tables that V2 would have used
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 3: V1 Tables Health Check ---';
    RAISE NOTICE '';
END $$;

-- Check users table (V1)
DO $$
DECLARE
    total_users INT;
    active_users INT;
    users_with_tenant INT;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) FILTER (WHERE is_active = true) INTO active_users FROM users;
    SELECT COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) INTO users_with_tenant FROM users;

    RAISE NOTICE 'V1 Users Table: % total (active: %, with tenant: %)',
        total_users, active_users, users_with_tenant;
END $$;

-- Check roles usage (V1)
DO $$
DECLARE
    total_assignments INT;
    users_with_roles INT;
BEGIN
    SELECT COUNT(*) INTO total_assignments FROM user_roles;
    SELECT COUNT(DISTINCT user_id) INTO users_with_roles FROM user_roles;

    RAISE NOTICE 'V1 Roles Usage: % role assignments (% users with roles)',
        total_assignments, users_with_roles;
END $$;

-- Check password_reset_requests (V1)
DO $$
DECLARE
    total_requests INT;
BEGIN
    SELECT COUNT(*) INTO total_requests FROM password_reset_requests;
    RAISE NOTICE 'V1 Password Reset Requests: % total', total_requests;
END $$;

-- Check user_scope_assignments (used by V2 API)
DO $$
DECLARE
    total_assignments INT;
    users_with_scopes INT;
    tenant_scopes INT;
    bud_scopes INT;
    project_scopes INT;
BEGIN
    SELECT COUNT(*) INTO total_assignments FROM user_scope_assignments;
    SELECT COUNT(DISTINCT user_id) INTO users_with_scopes FROM user_scope_assignments;
    SELECT COUNT(*) FILTER (WHERE scope_level = 'tenant') INTO tenant_scopes FROM user_scope_assignments;
    SELECT COUNT(*) FILTER (WHERE scope_level = 'bud') INTO bud_scopes FROM user_scope_assignments;
    SELECT COUNT(*) FILTER (WHERE scope_level = 'project') INTO project_scopes FROM user_scope_assignments;

    RAISE NOTICE 'V1 User Scope Assignments: % total (% users, tenant: %, bud: %, project: %)',
        total_assignments, users_with_scopes, tenant_scopes, bud_scopes, project_scopes;
END $$;

-- ============================================================================
-- PART 4: Check for orphaned V2 data in V1 tables
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 4: V2 Data Migration Check ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_pattern_users INT;
BEGIN
    -- Check for users that might have been created through V2 registration
    SELECT COUNT(*) INTO v2_pattern_users
    FROM users
    WHERE created_at >= '2024-01-01'::timestamp
    AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id
    );

    RAISE NOTICE 'Users without roles (potential V2 incomplete registrations): %', v2_pattern_users;

    IF v2_pattern_users > 0 THEN
        RAISE WARNING 'Found % users without role assignments - may need manual review', v2_pattern_users;
    END IF;
END $$;

-- ============================================================================
-- PART 5: Foreign Key Dependencies Check
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 5: Foreign Key Dependencies (if V2 tables exist) ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_table_exists BOOLEAN;
    fk_count INT := 0;
BEGIN
    -- Check if any V2 tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name LIKE 'v2_%'
    ) INTO v2_table_exists;

    IF v2_table_exists THEN
        RAISE NOTICE 'Checking foreign key dependencies...';

        SELECT COUNT(*) INTO fk_count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name LIKE 'v2_%';

        IF fk_count > 0 THEN
            RAISE WARNING 'Found % foreign key dependencies to V2 tables', fk_count;
        ELSE
            RAISE NOTICE 'No foreign key dependencies found';
        END IF;
    ELSE
        RAISE NOTICE 'No V2 tables found - skipping FK dependency check';
    END IF;
END $$;

-- ============================================================================
-- PART 6: Backup Recommendations
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 6: Backup Recommendations ---';
    RAISE NOTICE '';
    RAISE NOTICE 'If V2 tables exist with data:';
    RAISE NOTICE '  1. Use Supabase Dashboard > Table Editor > Export to CSV';
    RAISE NOTICE '  2. Or create backup tables:';
    RAISE NOTICE '     CREATE TABLE v2_users_backup AS SELECT * FROM v2_users;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 7: Cleanup Commands (COMMENTED OUT FOR SAFETY)
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PART 7: Cleanup Commands (COMMENTED - Uncomment to execute) ---';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  To drop V2 tables, uncomment these commands:';
    RAISE NOTICE '';
END $$;

-- SAFETY: These are commented out. Uncomment ONLY after:
-- 1. Reviewing diagnostic output
-- 2. Creating backups
-- 3. Confirming no V2 data needs migration

-- DROP TABLE IF EXISTS v2_email_logs CASCADE;
-- DROP TABLE IF EXISTS v2_audit_logs CASCADE;
-- DROP TABLE IF EXISTS v2_password_reset_tokens CASCADE;
-- DROP TABLE IF EXISTS v2_registration_requests CASCADE;
-- DROP TABLE IF EXISTS v2_roles CASCADE;
-- DROP TABLE IF EXISTS v2_organizations CASCADE;
-- DROP TABLE IF EXISTS v2_users CASCADE;

DO $$ BEGIN
    RAISE NOTICE '⚠️  IMPORTANT: Do NOT uncomment DROP commands without:';
    RAISE NOTICE '   1. Reviewing this diagnostic output';
    RAISE NOTICE '   2. Creating backups if tables contain data';
    RAISE NOTICE '   3. Confirming no data migration is needed';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 8: Summary & Recommendations
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'DIAGNOSTIC SUMMARY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_count INT;
    v1_users INT;
    v1_roles INT;
BEGIN
    -- Count V2 tables
    SELECT COUNT(*) INTO v2_count
    FROM information_schema.tables
    WHERE table_name LIKE 'v2_%';

    -- Count V1 data
    SELECT COUNT(*) INTO v1_users FROM users WHERE is_active = true;
    SELECT COUNT(DISTINCT user_id) INTO v1_roles FROM user_roles;

    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '   - V2 tables found: %', v2_count;
    RAISE NOTICE '   - V1 active users: %', v1_users;
    RAISE NOTICE '   - V1 users with roles: %', v1_roles;
    RAISE NOTICE '';

    IF v2_count = 0 THEN
        RAISE NOTICE '✅ RECOMMENDED ACTION: No action needed';
        RAISE NOTICE '   - V2 tables do not exist (expected state)';
        RAISE NOTICE '   - System correctly using V2 API → V1 Data architecture';
        RAISE NOTICE '   - Migration files 010, 011 can be archived/deleted';
    ELSE
        RAISE WARNING '⚠️  RECOMMENDED ACTION: Review V2 table data';
        RAISE NOTICE '   1. Check record counts above';
        RAISE NOTICE '   2. If tables are empty → safe to drop';
        RAISE NOTICE '   3. If tables contain data → migrate to V1 first';
        RAISE NOTICE '   4. Create backups before any DROP operations';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📚 Architecture Decision:';
    RAISE NOTICE '   - KEEP: V2 API layer (PrismaV1Adapter)';
    RAISE NOTICE '   - KEEP: V1 database schema';
    RAISE NOTICE '   - DROP: V2 database tables (if they exist)';
    RAISE NOTICE '   - Reason: V1/V2 merge not feasible due to role architecture conflicts';
END $$;

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'END OF DIAGNOSTIC REPORT';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Review the Messages panel above';
    RAISE NOTICE '  2. If V2 tables exist with data: export via Table Editor first';
    RAISE NOTICE '  3. If V2 tables are empty: uncomment DROP commands';
    RAISE NOTICE '  4. Archive migration files 010, 011 (never executed, never will be)';
    RAISE NOTICE '  5. Document architecture: V2 API → V1 Data (adapter pattern)';
    RAISE NOTICE '';
END $$;
