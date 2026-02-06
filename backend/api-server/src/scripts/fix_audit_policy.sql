
-- Fix Audit Logs Policy to be safe for Frontend (Supabase Client) usage

-- 1. Drop existing policy
DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON "audit_logs";

-- 2. Recreate with fallback logic
-- It checks 'app.tenant_id' (Backend) OR 'auth.jwt()->tenantId' (Frontend)
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs"
AS PERMISSIVE FOR ALL
TO public
USING (
  tenant_id = (
    COALESCE(
      current_setting('app.tenant_id', true),
      (auth.jwt() ->> 'tenantId')
    )
  )::integer
)
WITH CHECK (
  tenant_id = (
    COALESCE(
      current_setting('app.tenant_id', true),
      (auth.jwt() ->> 'tenantId')
    )
  )::integer
);
