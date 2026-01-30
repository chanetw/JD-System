
-- =================================================================
-- Migration: 009_fix_rls_policies_for_token.sql
-- Description: Update RLS policies to read tenantId directly from JWT
--              Fixes "Loaded 0 jobs" issue caused by missing app.tenant_id
-- =================================================================

-- 1. Create Helper Function (Optional but recommended for debugging)
CREATE OR REPLACE FUNCTION debug_jwt() 
RETURNS jsonb 
LANGUAGE sql 
STABLE 
AS $$ SELECT auth.jwt(); $$;

-- 2. Drop Old Policies (Reset "Tenant Isolation")
DROP POLICY IF EXISTS "Tenant Isolation" ON tenants;
DROP POLICY IF EXISTS "Tenant Isolation" ON buds;
DROP POLICY IF EXISTS "Tenant Isolation" ON departments;
DROP POLICY IF EXISTS "Tenant Isolation" ON projects;
DROP POLICY IF EXISTS "Tenant Isolation" ON jobs;
DROP POLICY IF EXISTS "Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Tenant Isolation" ON job_types;
DROP POLICY IF EXISTS "Tenant Isolation" ON approval_flows;

-- 3. Create New Policies (Use auth.jwt() -> 'tenantId')

-- Tenants (Special case: check against ID)
CREATE POLICY "Tenant Isolation" ON tenants
FOR ALL
USING (id = (auth.jwt() ->> 'tenantId')::integer);

-- Buds
CREATE POLICY "Tenant Isolation" ON buds
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Departments
CREATE POLICY "Tenant Isolation" ON departments
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Projects
CREATE POLICY "Tenant Isolation" ON projects
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Jobs
CREATE POLICY "Tenant Isolation" ON jobs
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Users
CREATE POLICY "Tenant Isolation" ON users
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Job Types
CREATE POLICY "Tenant Isolation" ON job_types
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenantId')::integer)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenantId')::integer);

-- Approval Flows (Join via Project)
CREATE POLICY "Tenant Isolation" ON approval_flows
FOR ALL
USING (
    project_id IN (
        SELECT id FROM projects 
        WHERE tenant_id = (auth.jwt() ->> 'tenantId')::integer
    )
)
WITH CHECK (
    project_id IN (
        SELECT id FROM projects 
        WHERE tenant_id = (auth.jwt() ->> 'tenantId')::integer
    )
);

-- Done!
