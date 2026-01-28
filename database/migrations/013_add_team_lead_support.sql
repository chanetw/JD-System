/**
 * @file 013_add_team_lead_support.sql
 * @description Add Departments table, Team Lead support, and fix Approval Flow
 * @date 2026-01-27
 */

-- ========================================
-- 1. Create Departments Table
-- ========================================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Team Lead / Department Manager
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- ========================================
-- 2. Link users.department_id to departments (FK)
-- ========================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

-- Index for user department lookup
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- ========================================
-- 3. Add Team Lead Support to Approval Flows
-- ========================================

-- Allow teams to optionally include Team Lead as an approver
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS include_team_lead BOOLEAN DEFAULT FALSE;

-- Add team_lead_id if needed (for explicit team lead assignment)
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS team_lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Ensure approval_flows has project_id column (if coming from old schema)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='approval_flows' AND column_name='project_id') THEN
        ALTER TABLE approval_flows ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_approval_flows_project_id ON approval_flows(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_flows_team_lead_id ON approval_flows(team_lead_id);

-- ========================================
-- 4. Add assigned_at column to design_jobs
-- ========================================

ALTER TABLE design_jobs
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- ========================================
-- 5. Seed sample departments (optional - for testing)
-- ========================================

-- Insert sample departments if table is empty (only for tenant_id = 1)
INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Design Team', 'DESIGN', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'DESIGN' AND tenant_id = 1);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Marketing Team', 'MARKETING', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'MARKETING' AND tenant_id = 1);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Social Media Team', 'SOCIAL', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'SOCIAL' AND tenant_id = 1);

INSERT INTO departments (tenant_id, name, code, manager_id, is_active)
SELECT 1, 'Creative Team', 'CREATIVE', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'CREATIVE' AND tenant_id = 1);

-- ========================================
-- 6. Comments for Documentation
-- ========================================

COMMENT ON TABLE departments IS 'Organization departments/teams with assigned managers';
COMMENT ON COLUMN departments.manager_id IS 'Team Lead / Department Manager who oversees this department';
COMMENT ON COLUMN approval_flows.include_team_lead IS 'If TRUE, Team Lead can approve jobs in addition to approval flow';
COMMENT ON COLUMN approval_flows.team_lead_id IS 'Explicit team lead user ID (optional override)';
COMMENT ON COLUMN design_jobs.assigned_at IS 'Timestamp when job was assigned to assignee_id';
COMMENT ON COLUMN users.department_id IS 'Foreign key to departments table';

-- ========================================
-- 7. Verification Query (run manually to verify)
-- ========================================

-- SELECT 
--   d.name as department_name,
--   d.code as dept_code,
--   u.display_name as manager_name,
--   d.is_active
-- FROM departments d
-- LEFT JOIN users u ON d.manager_id = u.id
-- WHERE d.is_active = TRUE
-- ORDER BY d.name;
