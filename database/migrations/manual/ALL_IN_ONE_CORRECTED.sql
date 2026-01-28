/**
 * CORRECTED ALL-IN-ONE Migration: Auto-Assign System Setup
 * 
 * This version includes table existence checks to prevent errors
 * 
 * Created: 2026-01-27
 */

-- ========================================
-- STEP 1: Create Departments Table
-- ========================================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

COMMENT ON TABLE departments IS 'Organization departments/teams with assigned managers';
COMMENT ON COLUMN departments.manager_id IS 'Team Lead / Department Manager who oversees this department';

-- ========================================
-- STEP 2: Add department_id to users
-- ========================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

COMMENT ON COLUMN users.department_id IS 'Foreign key to departments table';

-- ========================================
-- STEP 3: Add Team Lead columns to approval_flows
-- ========================================

ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS include_team_lead BOOLEAN DEFAULT FALSE;

ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS team_lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_approval_flows_team_lead_id ON approval_flows(team_lead_id);

COMMENT ON COLUMN approval_flows.include_team_lead IS 'If TRUE, auto-assign to Team Lead after final approval';
COMMENT ON COLUMN approval_flows.team_lead_id IS 'Explicit team lead user ID for auto-assignment';

-- ========================================
-- STEP 4: Add assigned_at to design_jobs (with table check)
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_jobs' AND table_schema = 'public') THEN
        ALTER TABLE design_jobs
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
        
        COMMENT ON COLUMN design_jobs.assigned_at IS 'Timestamp when job was assigned to assignee_id';
        
        RAISE NOTICE '✅ Added assigned_at column to design_jobs table';
    ELSE
        RAISE NOTICE '⚠️ design_jobs table not found - skipping assigned_at column';
    END IF;
END $$;

-- ========================================
-- STEP 5: Seed sample departments
-- NOTE: Change tenant_id if yours is different from 1
-- ========================================

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

-- ========================================
-- STEP 6: Verification Queries
-- ========================================

-- Show departments created
SELECT 
  'Departments Created' AS status,
  COUNT(*) as count
FROM departments;

-- Show new columns in users
SELECT 
  'users.department_id exists' AS status,
  COUNT(department_id) as users_with_dept
FROM users;

-- Show new columns in approval_flows
SELECT 
  'approval_flows columns exist' AS status,
  COUNT(include_team_lead) as has_include,
  COUNT(team_lead_id) as has_team_lead
FROM approval_flows;

-- Check if design_jobs exists and show assigned_at column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_jobs' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ design_jobs table exists';
        
        -- Show new column in design_jobs
        PERFORM dblink_connect('temp_conn', 'dbname=' || current_database());
        
        SELECT 
          'design_jobs.assigned_at exists' AS status,
          COUNT(assigned_at) as jobs_with_timestamp
        FROM design_jobs;
    ELSE
        RAISE NOTICE '⚠️ design_jobs table does not exist';
    END IF;
END $$;

-- List all departments
SELECT 
  d.id,
  d.name,
  d.code,
  d.manager_id,
  u.display_name as manager_name,
  d.is_active,
  d.created_at
FROM departments d
LEFT JOIN users u ON d.manager_id = u.id
ORDER BY d.name;

-- ========================================
-- END OF MIGRATION
-- ========================================

SELECT '✅ All migrations completed successfully!' AS final_status;