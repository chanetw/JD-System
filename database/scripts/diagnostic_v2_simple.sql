-- ============================================================================
-- V2 Tables Simple Diagnostic (Supabase Safe Version)
-- ============================================================================
-- This version queries actual schema instead of assuming column names
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'V2 TABLES DIAGNOSTIC REPORT (Schema-Safe Version)';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: List ALL V2 tables and their columns
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '--- PART 1: V2 Tables and Columns ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_table RECORD;
    col_list TEXT;
    v2_count INT := 0;
BEGIN
    FOR v2_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'v2_%'
        ORDER BY table_name
    LOOP
        v2_count := v2_count + 1;

        -- Get column list for this table
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO col_list
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = v2_table.table_name;

        RAISE NOTICE '✗ FOUND: %', v2_table.table_name;
        RAISE NOTICE '   Columns: %', col_list;
        RAISE NOTICE '';
    END LOOP;

    IF v2_count = 0 THEN
        RAISE NOTICE '✓ No V2 tables found (expected state)';
    ELSE
        RAISE WARNING 'Found % V2 tables!', v2_count;
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 2: Count records in V2 tables (generic, no column assumptions)
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '--- PART 2: V2 Tables Record Counts ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_table RECORD;
    record_count INT;
BEGIN
    FOR v2_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'v2_%'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', v2_table.table_name) INTO record_count;
        RAISE NOTICE '%: % records', v2_table.table_name, record_count;
    END LOOP;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 3: Show sample data from V2 tables (first 3 rows)
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '--- PART 3: V2 Tables Sample Data ---';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_table RECORD;
    sample_data RECORD;
    row_num INT;
BEGIN
    FOR v2_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'v2_%'
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Table: % (showing first 3 rows)', v2_table.table_name;

        row_num := 0;
        FOR sample_data IN
            EXECUTE format('SELECT * FROM %I LIMIT 3', v2_table.table_name)
        LOOP
            row_num := row_num + 1;
            RAISE NOTICE '  Row %: %', row_num, sample_data;
        END LOOP;

        IF row_num = 0 THEN
            RAISE NOTICE '  (empty table)';
        END IF;

        RAISE NOTICE '';
    END LOOP;
END $$;

-- ============================================================================
-- PART 4: V1 Tables Health Check
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '--- PART 4: V1 Tables Health Check ---';
    RAISE NOTICE '';
END $$;

-- Users table
DO $$
DECLARE
    total_users INT;
    has_is_active BOOLEAN;
    active_users INT := 0;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;

    -- Check if is_active column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) INTO has_is_active;

    IF has_is_active THEN
        SELECT COUNT(*) INTO active_users FROM users WHERE is_active = true;
        RAISE NOTICE 'V1 Users: % total (% active)', total_users, active_users;
    ELSE
        RAISE NOTICE 'V1 Users: % total (is_active column not found)', total_users;
    END IF;
END $$;

-- User roles
DO $$
DECLARE
    total_roles INT;
    users_with_roles INT;
BEGIN
    SELECT COUNT(*) INTO total_roles FROM user_roles;
    SELECT COUNT(DISTINCT user_id) INTO users_with_roles FROM user_roles;

    RAISE NOTICE 'V1 User Roles: % assignments (% users)', total_roles, users_with_roles;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 5: Summary & Recommendations
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    v2_count INT;
    total_v2_records INT := 0;
    v2_table RECORD;
    record_count INT;
BEGIN
    -- Count V2 tables
    SELECT COUNT(*) INTO v2_count
    FROM information_schema.tables
    WHERE table_name LIKE 'v2_%';

    -- Count total records across all V2 tables
    IF v2_count > 0 THEN
        FOR v2_table IN
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'v2_%'
        LOOP
            EXECUTE format('SELECT COUNT(*) FROM %I', v2_table.table_name) INTO record_count;
            total_v2_records := total_v2_records + record_count;
        END LOOP;
    END IF;

    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '   - V2 tables found: %', v2_count;
    RAISE NOTICE '   - Total V2 records: %', total_v2_records;
    RAISE NOTICE '';

    IF v2_count = 0 THEN
        RAISE NOTICE '✅ RECOMMENDED ACTION: No action needed';
        RAISE NOTICE '   - V2 tables do not exist (expected state)';
    ELSIF total_v2_records = 0 THEN
        RAISE NOTICE '✅ RECOMMENDED ACTION: Safe to drop V2 tables';
        RAISE NOTICE '   - V2 tables exist but are empty';
        RAISE NOTICE '   - Run the cleanup script to drop tables';
    ELSE
        RAISE WARNING '⚠️  RECOMMENDED ACTION: BACKUP BEFORE CLEANUP';
        RAISE NOTICE '   - V2 tables contain % records', total_v2_records;
        RAISE NOTICE '   - Review sample data above';
        RAISE NOTICE '   - Export to CSV before dropping';
        RAISE NOTICE '   - Check if data needs migration to V1';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    IF v2_count > 0 AND total_v2_records > 0 THEN
        RAISE NOTICE '  1. ⚠️  BACKUP: Export V2 tables via Supabase Table Editor';
        RAISE NOTICE '  2. Review sample data above';
        RAISE NOTICE '  3. If data is important: migrate to V1 first';
        RAISE NOTICE '  4. If data is not needed: run cleanup script';
    ELSIF v2_count > 0 AND total_v2_records = 0 THEN
        RAISE NOTICE '  1. Tables are empty - safe to drop';
        RAISE NOTICE '  2. Run cleanup commands:';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_email_logs CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_audit_logs CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_password_reset_tokens CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_registration_requests CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_roles CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_organizations CASCADE;';
        RAISE NOTICE '     DROP TABLE IF EXISTS v2_users CASCADE;';
    ELSE
        RAISE NOTICE '  1. No V2 tables found - system is clean';
        RAISE NOTICE '  2. Archive migration files 010, 011';
    END IF;

    RAISE NOTICE '';
END $$;

DO $$ BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'END OF REPORT';
    RAISE NOTICE '============================================================================';
END $$;
