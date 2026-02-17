-- ============================================================================
-- Count Records in V2 Tables (Safe Version - Using PL/pgSQL)
-- ============================================================================
-- This script counts records in each V2 table safely
-- Uses PL/pgSQL dynamic execution to avoid relation errors
-- Shows output in Results tab via RAISE NOTICE
-- ============================================================================

DO $$
DECLARE
    v2_audit_logs_count INT;
    v2_email_logs_count INT;
    v2_organizations_count INT;
    v2_password_reset_tokens_count INT;
    v2_registration_requests_count INT;
    v2_roles_count INT;
    v2_users_count INT;
    v2_users_active_count INT;
    total_v2_records INT := 0;
    total_v2_tables INT := 0;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'V2 TABLES RECORD COUNT REPORT';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';

    -- Count v2_audit_logs
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_audit_logs') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_audit_logs' INTO v2_audit_logs_count;
        RAISE NOTICE 'v2_audit_logs: % records', v2_audit_logs_count;
        total_v2_records := total_v2_records + v2_audit_logs_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_audit_logs: Table does not exist (expected)';
    END IF;

    -- Count v2_email_logs
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_email_logs') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_email_logs' INTO v2_email_logs_count;
        RAISE NOTICE 'v2_email_logs: % records', v2_email_logs_count;
        total_v2_records := total_v2_records + v2_email_logs_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_email_logs: Table does not exist (expected)';
    END IF;

    -- Count v2_organizations
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_organizations') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_organizations' INTO v2_organizations_count;
        RAISE NOTICE 'v2_organizations: % records', v2_organizations_count;
        total_v2_records := total_v2_records + v2_organizations_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_organizations: Table does not exist (expected)';
    END IF;

    -- Count v2_password_reset_tokens
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_password_reset_tokens') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_password_reset_tokens' INTO v2_password_reset_tokens_count;
        RAISE NOTICE 'v2_password_reset_tokens: % records total', v2_password_reset_tokens_count;
        total_v2_records := total_v2_records + v2_password_reset_tokens_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_password_reset_tokens: Table does not exist (expected)';
    END IF;

    -- Count v2_registration_requests
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_registration_requests') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_registration_requests' INTO v2_registration_requests_count;
        RAISE NOTICE 'v2_registration_requests: % records total', v2_registration_requests_count;
        total_v2_records := total_v2_records + v2_registration_requests_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_registration_requests: Table does not exist (expected)';
    END IF;

    -- Count v2_roles
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_roles') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_roles' INTO v2_roles_count;
        RAISE NOTICE 'v2_roles: % records', v2_roles_count;
        total_v2_records := total_v2_records + v2_roles_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_roles: Table does not exist (expected)';
    END IF;

    -- Count v2_users
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v2_users') THEN
        EXECUTE 'SELECT COUNT(*) FROM v2_users' INTO v2_users_count;
        EXECUTE 'SELECT COUNT(*) FROM v2_users WHERE is_active = true' INTO v2_users_active_count;
        RAISE NOTICE 'v2_users: % records total (% active)', v2_users_count, v2_users_active_count;
        total_v2_records := total_v2_records + v2_users_count;
        total_v2_tables := total_v2_tables + 1;
    ELSE
        RAISE NOTICE 'v2_users: Table does not exist (expected)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'V2 tables found: %', total_v2_tables;
    RAISE NOTICE 'Total V2 records: %', total_v2_records;
    RAISE NOTICE '';

    IF total_v2_tables = 0 THEN
        RAISE NOTICE '✅ RECOMMENDED ACTION: No action needed';
        RAISE NOTICE '   V2 tables do not exist (expected state)';
    ELSIF total_v2_records = 0 THEN
        RAISE NOTICE '✅ RECOMMENDED ACTION: Safe to drop V2 tables (empty)';
        RAISE NOTICE '   All V2 tables exist but contain no records';
    ELSIF total_v2_records < 10 THEN
        RAISE NOTICE '⚠️  RECOMMENDED ACTION: Review data before dropping';
        RAISE NOTICE '   V2 tables contain % records (few but not empty)', total_v2_records;
    ELSE
        RAISE WARNING '⚠️  RECOMMENDED ACTION: BACKUP before dropping';
        RAISE NOTICE '   V2 tables contain % records - may need migration', total_v2_records;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'NEXT STEPS';
    RAISE NOTICE '============================================================================';

    IF total_v2_tables = 0 THEN
        RAISE NOTICE 'No action needed - system is clean';
    ELSIF total_v2_records = 0 THEN
        RAISE NOTICE 'Run this to drop V2 tables:';
        RAISE NOTICE 'DROP TABLE IF EXISTS v2_email_logs, v2_audit_logs, v2_password_reset_tokens, v2_registration_requests, v2_roles, v2_organizations, v2_users CASCADE;';
    ELSE
        RAISE NOTICE '1. ⚠️  BACKUP: Export V2 tables via Supabase Table Editor (Dashboard > Table Editor)';
        RAISE NOTICE '2. Review if data needs migration to V1 tables';
        RAISE NOTICE '3. If no migration needed, run:';
        RAISE NOTICE '   DROP TABLE IF EXISTS v2_email_logs, v2_audit_logs, v2_password_reset_tokens, v2_registration_requests, v2_roles, v2_organizations, v2_users CASCADE;';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'END OF REPORT';
    RAISE NOTICE '============================================================================';
END $$;
