/**
 * Manual Migration 5: Seed sample departments
 * Run this in Supabase SQL Editor AFTER 004_add_jobs_assigned_at.sql
 * 
 * NOTE: Change tenant_id = 1 to match your actual tenant ID if different
 */

-- Insert sample departments (only if they don't exist)
INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Design Team', 'DESIGN', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM departments 
  WHERE code = 'DESIGN' AND tenant_id = 1
);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Marketing Team', 'MARKETING', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM departments 
  WHERE code = 'MARKETING' AND tenant_id = 1
);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Social Media Team', 'SOCIAL', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM departments 
  WHERE code = 'SOCIAL' AND tenant_id = 1
);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Creative Team', 'CREATIVE', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM departments 
  WHERE code = 'CREATIVE' AND tenant_id = 1
);

-- Verify departments created
SELECT 
  id,
  name,
  code,
  manager_id,
  is_active,
  created_at
FROM departments
ORDER BY name;
