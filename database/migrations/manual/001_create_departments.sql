/**
 * Manual Migration 1: Create Departments Table
 * Run this in Supabase SQL Editor
 */

-- Create departments table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- Add comments
COMMENT ON TABLE departments IS 'Organization departments/teams with assigned managers';
COMMENT ON COLUMN departments.manager_id IS 'Team Lead / Department Manager who oversees this department';

-- Verify table created
SELECT 'Departments table created successfully' AS status;
