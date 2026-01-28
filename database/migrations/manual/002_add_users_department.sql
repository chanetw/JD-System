/**
 * Manual Migration 2: Add department_id to users table
 * Run this in Supabase SQL Editor AFTER 001_create_departments.sql
 */

-- Add department_id column to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- Add comment
COMMENT ON COLUMN users.department_id IS 'Foreign key to departments table';

-- Verify column added
SELECT 
  'department_id column added to users table' AS status,
  COUNT(*) as users_count
FROM users;
