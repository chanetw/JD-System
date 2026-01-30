
-- Migration: Fix Advanced Security Warnings (Strict Mode - V6 Schema Scoped)
-- Created: 2026-01-28
-- Description: Sets search_path, applies RLS policies via strict public schema introspection

-- ========================================
-- 1. Secure Functions (Set search_path)
-- ========================================

ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION generate_dj_id() SET search_path = public;
ALTER FUNCTION update_parent_status() SET search_path = public;
ALTER FUNCTION create_job_with_items(JSONB, JSONB) SET search_path = public;
ALTER FUNCTION soft_delete_job(INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION restore_deleted_job(INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION soft_delete_user(INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION cleanup_deleted_records(INTEGER) SET search_path = public;
ALTER FUNCTION create_audit_log(INTEGER, INTEGER, VARCHAR, VARCHAR, INTEGER, VARCHAR, JSONB, JSONB, TEXT, JSONB, VARCHAR, TEXT, VARCHAR, VARCHAR) SET search_path = public;
ALTER FUNCTION audit_jobs_changes() SET search_path = public;
ALTER FUNCTION audit_approvals_changes() SET search_path = public;
ALTER FUNCTION audit_users_changes() SET search_path = public;
ALTER FUNCTION get_entity_audit_trail(VARCHAR, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION get_user_activity(INTEGER, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION get_tenant_activity_summary(INTEGER, INTEGER) SET search_path = public;

-- ========================================
-- 2. Enforce Strict Tenant Isolation (Schema Scoped Auto-Detect)
-- ========================================

DO $$
DECLARE
    -- Comprehensive list of tables to secure
    tables_to_secure text[] := ARRAY[
        'jobs', 'users', 'projects', 'buds', 'departments',
        'job_types', 'job_type_items', 'design_job_items', 
        'project_job_assignments', 'approval_flows', 
        'activity_logs', 'notifications', 'notification_logs', 
        'sla_shift_logs', 'holidays', 'job_briefs', 'job_attachments', 
        'job_comments', 'job_deliverables', 'media_files'
    ];
    t text;
    col_tenant boolean;
    col_job boolean;
    col_user boolean;
    col_project boolean;
    col_job_type boolean;
BEGIN
    FOREACH t IN ARRAY tables_to_secure
    LOOP
        -- Check if table exists IN PUBLIC SCHEMA
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- Detect columns IN PUBLIC SCHEMA ONLY
            col_tenant := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id' AND table_schema = 'public');
            col_job := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'job_id' AND table_schema = 'public');
            col_user := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'user_id' AND table_schema = 'public');
            col_project := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'project_id' AND table_schema = 'public');
            col_job_type := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'job_type_id' AND table_schema = 'public');

            -- Clean up old generic policies
            EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated Access" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated Write" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Public Read" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all access for %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow public select on %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);

            -- Apply Policy Selection Strategy
            IF col_tenant THEN
                EXECUTE format('
                    CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL TO authenticated
                    USING (tenant_id = current_setting(''app.tenant_id'', true)::INTEGER)
                    WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::INTEGER)
                ', t);
                RAISE NOTICE '✅ Secured table public.% (Direct tenant_id)', t;
                
            ELSIF col_job THEN
                EXECUTE format('
                    CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL TO authenticated
                    USING (job_id IN (SELECT id FROM public.jobs WHERE tenant_id = current_setting(''app.tenant_id'', true)::INTEGER))
                ', t);
                RAISE NOTICE '✅ Secured table public.% (Via job_id)', t;

            ELSIF col_user THEN
                EXECUTE format('
                    CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL TO authenticated
                    USING (user_id IN (SELECT id FROM public.users WHERE tenant_id = current_setting(''app.tenant_id'', true)::INTEGER))
                ', t);
                RAISE NOTICE '✅ Secured table public.% (Via user_id)', t;

            ELSIF col_project THEN
                EXECUTE format('
                    CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL TO authenticated
                    USING (project_id IN (SELECT id FROM public.projects WHERE tenant_id = current_setting(''app.tenant_id'', true)::INTEGER))
                ', t);
                RAISE NOTICE '✅ Secured table public.% (Via project_id)', t;

            ELSIF col_job_type THEN
                EXECUTE format('
                    CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL TO authenticated
                    USING (job_type_id IN (SELECT id FROM public.job_types WHERE tenant_id = current_setting(''app.tenant_id'', true)::INTEGER))
                ', t);
                RAISE NOTICE '✅ Secured table public.% (Via job_type_id)', t;
                
            ELSE
                RAISE NOTICE '⚠️ Skipping table public.%: No recognizable tenant link column found', t;
            END IF;
            
        END IF;
    END LOOP;

    -- Special Handling for 'tenants' (id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Public Access" ON public.tenants;
        DROP POLICY IF EXISTS "Authenticated Access" ON public.tenants;
        DROP POLICY IF EXISTS "Tenant Isolation" ON public.tenants;
        
        CREATE POLICY "Tenant Isolation" ON public.tenants
        FOR ALL TO authenticated
        USING (id = current_setting('app.tenant_id', true)::INTEGER);
        
        RAISE NOTICE '✅ Secured table: public.tenants';
    END IF;

    -- Special Handling for Public Insert Tables
    
    -- password_reset_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_requests' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow public insert on password_reset_requests" ON public.password_reset_requests;
        DROP POLICY IF EXISTS "Public Access" ON public.password_reset_requests;
        DROP POLICY IF EXISTS "Public Insert Request" ON public.password_reset_requests;
        
        EXECUTE '
        CREATE POLICY "Public Insert Request" ON public.password_reset_requests
        FOR INSERT TO public
        WITH CHECK (otp_code IS NOT NULL)';
    END IF;

    -- user_registration_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registration_requests' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow public insert on user_registration_requests" ON public.user_registration_requests;
        DROP POLICY IF EXISTS "Public Access" ON public.user_registration_requests;
        DROP POLICY IF EXISTS "Public Register Request" ON public.user_registration_requests;
        DROP POLICY IF EXISTS "Admin View Requests" ON public.user_registration_requests;
        
        EXECUTE '
        CREATE POLICY "Public Register Request" ON public.user_registration_requests
        FOR INSERT TO public
        WITH CHECK (email IS NOT NULL)';
        
        EXECUTE '
        CREATE POLICY "Admin View Requests" ON public.user_registration_requests
        FOR SELECT TO authenticated
        USING (tenant_id = current_setting(''app.tenant_id'', true)::INTEGER)';
    END IF;

END $$;
