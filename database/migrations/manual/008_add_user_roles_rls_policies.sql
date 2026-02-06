-- Migration: Add RLS Policies for User Role Management
-- Purpose: Allow admin users to INSERT, UPDATE, DELETE on user_roles and user_scope_assignments
-- Date: 2026-02-06

-- ============================================
-- user_roles table policies
-- ============================================

-- Allow admin users to INSERT new roles
CREATE POLICY "Allow admin insert on user_roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- Allow admin users to DELETE roles
CREATE POLICY "Allow admin delete on user_roles"
ON user_roles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- Allow admin users to UPDATE roles
CREATE POLICY "Allow admin update on user_roles"
ON user_roles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- ============================================
-- user_scope_assignments table policies
-- ============================================

-- Check if RLS is enabled on user_scope_assignments
-- If not, enable it first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_scope_assignments'
  ) THEN
    RAISE NOTICE 'Table user_scope_assignments does not exist, skipping RLS setup';
  ELSE
    -- Enable RLS if not already enabled
    ALTER TABLE user_scope_assignments ENABLE ROW LEVEL SECURITY;

    -- Create SELECT policy if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'user_scope_assignments'
      AND policyname = 'Allow authenticated select on user_scope_assignments'
    ) THEN
      CREATE POLICY "Allow authenticated select on user_scope_assignments"
      ON user_scope_assignments FOR SELECT
      TO authenticated
      USING (true);
    END IF;
  END IF;
END $$;

-- Allow admin users to INSERT scope assignments
CREATE POLICY "Allow admin insert on user_scope_assignments"
ON user_scope_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- Allow admin users to DELETE scope assignments
CREATE POLICY "Allow admin delete on user_scope_assignments"
ON user_scope_assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- Allow admin users to UPDATE scope assignments
CREATE POLICY "Allow admin update on user_scope_assignments"
ON user_scope_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (current_setting('app.current_user_id', true))::integer
    AND ur.role_name = 'admin'
    AND ur.is_active = true
  )
);

-- ============================================
-- Verification
-- ============================================

-- Display all policies for user_roles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('user_roles', 'user_scope_assignments')
ORDER BY tablename, policyname;
