-- ============================================================================
-- V2 Authentication Tables Diagnostic & Cleanup Script
-- ============================================================================
-- Purpose: Check for V2 tables existence and data before cleanup
-- Safe to run: This is READ-ONLY diagnostic (until you uncomment DROP commands)
--
-- Background:
-- - V2 Auth was planned but migration files (010, 011) were NEVER executed
-- - Current system uses V2 API → V1 Data (via PrismaV1Adapter)
-- - V2 tables should NOT exist in production
--
-- Usage:
--   psql -U your_user -d your_database -f diagnostic_v2_cleanup.sql
-- ============================================================================

\echo '============================================================================'
\echo 'V2 TABLES DIAGNOSTIC REPORT'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- PART 1: Check if V2 tables exist
-- ============================================================================
\echo '--- PART 1: V2 Tables Existence Check ---'
\echo ''

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

\echo ''

-- ============================================================================
-- PART 2: Check V2 table record counts (if tables exist)
-- ============================================================================
\echo '--- PART 2: V2 Tables Record Counts (if exist) ---'
\echo ''

-- v2_users
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_users') THEN
        EXECUTE format('
            SELECT
                ''v2_users'' as table_name,
                COUNT(*) as record_count,
                COUNT(*) FILTER (WHERE "isActive" = true) as active_users,
                COUNT(*) FILTER (WHERE "emailVerified" = true) as verified_users
            FROM v2_users
        ');
    ELSE
        RAISE NOTICE 'v2_users: Table does not exist (expected)';
    END IF;
END $$;

-- v2_organizations
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_organizations') THEN
        EXECUTE 'SELECT ''v2_organizations'' as table_name, COUNT(*) as record_count FROM v2_organizations';
    ELSE
        RAISE NOTICE 'v2_organizations: Table does not exist (expected)';
    END IF;
END $$;

-- v2_roles
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_roles') THEN
        EXECUTE 'SELECT ''v2_roles'' as table_name, COUNT(*) as record_count FROM v2_roles';
    ELSE
        RAISE NOTICE 'v2_roles: Table does not exist (expected)';
    END IF;
END $$;

-- v2_registration_requests
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_registration_requests') THEN
        EXECUTE format('
            SELECT
                ''v2_registration_requests'' as table_name,
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = ''pending'') as pending_requests,
                COUNT(*) FILTER (WHERE status = ''approved'') as approved_requests,
                COUNT(*) FILTER (WHERE status = ''rejected'') as rejected_requests
            FROM v2_registration_requests
        ');
    ELSE
        RAISE NOTICE 'v2_registration_requests: Table does not exist (expected)';
    END IF;
END $$;

-- v2_password_reset_tokens
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v2_password_reset_tokens') THEN
        EXECUTE format('
            SELECT
                ''v2_password_reset_tokens'' as table_name,
                COUNT(*) as total_tokens,
                COUNT(*) FILTER (WHERE "isUsed" = false AND "expiresAt" > NOW()) as active_tokens
            FROM v2_password_reset_tokens
        ');
    ELSE
        RAISE NOTICE 'v2_password_reset_tokens: Table does not exist (expected)';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 3: Check V1 tables that V2 would have used
-- ============================================================================
\echo '--- PART 3: V1 Tables Health Check ---'
\echo ''

-- Check users table (V1)
\echo 'V1 Users Table:'
SELECT
    'users (V1)' as table_name,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE "isActive" = true) as active_users,
    COUNT(*) FILTER (WHERE "tenantId" IS NOT NULL) as users_with_tenant
FROM users;

\echo ''

-- Check roles usage (V1)
\echo 'V1 Roles Usage:'
SELECT
    'user_roles (V1)' as table_name,
    COUNT(*) as total_role_assignments,
    COUNT(DISTINCT "userId") as users_with_roles
FROM user_roles;

\echo ''

-- Check password_reset_requests (V1)
\echo 'V1 Password Reset Requests:'
SELECT
    'password_reset_requests (V1)' as table_name,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE used = false AND "expiresAt" > NOW()) as active_requests
FROM password_reset_requests;

\echo ''

-- Check user_scope_assignments (used by V2 API)
\echo 'V1 User Scope Assignments (used by V2 API):'
SELECT
    'user_scope_assignments' as table_name,
    COUNT(*) as total_assignments,
    COUNT(DISTINCT "userId") as users_with_scopes,
    COUNT(*) FILTER (WHERE "scopeLevel" = 'tenant') as tenant_scopes,
    COUNT(*) FILTER (WHERE "scopeLevel" = 'bud') as bud_scopes,
    COUNT(*) FILTER (WHERE "scopeLevel" = 'project') as project_scopes
FROM user_scope_assignments;

\echo ''

-- ============================================================================
-- PART 4: Check for orphaned V2 data in V1 tables
-- ============================================================================
\echo '--- PART 4: V2 Data Migration Check ---'
\echo ''

-- Check if there are any users created through V2 registration
-- (This would be indicated by specific patterns or metadata)
DO $$
DECLARE
    v2_pattern_users INT;
BEGIN
    -- Check for users that might have been created through V2 registration
    -- V2 users might have specific email patterns or creation metadata
    SELECT COUNT(*) INTO v2_pattern_users
    FROM users
    WHERE "createdAt" >= '2024-01-01'::timestamp  -- Adjust date as needed
    AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur."userId" = users.id
    );

    RAISE NOTICE 'Users without roles (potential V2 incomplete registrations): %', v2_pattern_users;

    IF v2_pattern_users > 0 THEN
        RAISE WARNING 'Found % users without role assignments - may need manual review', v2_pattern_users;
    END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 5: Foreign Key Dependencies Check
-- ============================================================================
\echo '--- PART 5: Foreign Key Dependencies (if V2 tables exist) ---'
\echo ''

DO $$
BEGIN
    -- Check foreign keys pointing to V2 tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name IN ('v2_users', 'v2_organizations', 'v2_roles')
    ) THEN
        RAISE NOTICE 'Checking foreign key dependencies...';

        EXECUTE '
            SELECT
                tc.table_name as dependent_table,
                kcu.column_name as fk_column,
                ccu.table_name as referenced_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = ''FOREIGN KEY''
            AND ccu.table_name LIKE ''v2_%''
            ORDER BY tc.table_name
        ';
    ELSE
        RAISE NOTICE 'No V2 tables found - skipping FK dependency check';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- PART 6: Backup Commands (for safety)
-- ============================================================================
\echo '--- PART 6: Backup Commands (if V2 tables exist) ---'
\echo ''
\echo 'If V2 tables exist and contain data, run these backup commands:'
\echo ''
\echo '-- Backup v2_users (if exists):'
\echo 'CREATE TABLE v2_users_backup AS SELECT * FROM v2_users;'
\echo ''
\echo '-- Backup v2_registration_requests (if exists):'
\echo 'CREATE TABLE v2_registration_requests_backup AS SELECT * FROM v2_registration_requests;'
\echo ''
\echo '-- Export to CSV (run from shell):'
\echo 'psql -d your_db -c "\COPY v2_users TO ''/tmp/v2_users_backup.csv'' CSV HEADER"'
\echo 'psql -d your_db -c "\COPY v2_registration_requests TO ''/tmp/v2_registration_requests_backup.csv'' CSV HEADER"'
\echo ''

-- ============================================================================
-- PART 7: Cleanup Commands (COMMENTED OUT FOR SAFETY)
-- ============================================================================
\echo '--- PART 7: Cleanup Commands (COMMENTED - Uncomment to execute) ---'
\echo ''
\echo 'To drop V2 tables (only if diagnostic confirms they exist and are empty):'
\echo ''

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

-- \echo 'V2 tables dropped successfully'

\echo ''
\echo '⚠️  IMPORTANT: Do NOT uncomment DROP commands without:'
\echo '   1. Reviewing this diagnostic output'
\echo '   2. Creating backups if tables contain data'
\echo '   3. Confirming no data migration is needed'
\echo ''

-- ============================================================================
-- PART 8: Summary & Recommendations
-- ============================================================================
\echo '============================================================================'
\echo 'DIAGNOSTIC SUMMARY'
\echo '============================================================================'
\echo ''

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
    SELECT COUNT(*) INTO v1_users FROM users WHERE "isActive" = true;
    SELECT COUNT(DISTINCT "userId") INTO v1_roles FROM user_roles;

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

\echo ''
\echo '============================================================================'
\echo 'END OF DIAGNOSTIC REPORT'
\echo '============================================================================'
\echo ''
\echo 'Next Steps:'
\echo '  1. Review the output above'
\echo '  2. If V2 tables exist with data: create backups first'
\echo '  3. If V2 tables are empty: uncomment DROP commands in Part 7'
\echo '  4. Archive migration files 010, 011 (never executed, never will be)'
\echo '  5. Document architecture: V2 API → V1 Data (adapter pattern)'
\echo ''
