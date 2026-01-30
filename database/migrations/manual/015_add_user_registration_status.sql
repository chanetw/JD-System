-- =============================================================================
-- Add User Registration Status for Approval Workflow
-- =============================================================================
-- This migration adds a status column to track user registration approval state
-- NO NEW TABLES - Only adding columns to existing users table

-- Add status column for registration workflow
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED';

-- Add registration metadata columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add must_change_password flag for first-time login
-- When admin approves and generates password, this is set to TRUE
-- After user changes password, this becomes FALSE
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_status_tenant ON users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by);

-- Update existing active users to have APPROVED status
UPDATE users SET status = 'APPROVED' WHERE is_active = true AND status IS NULL;

-- Update existing inactive users to have INACTIVE status (not pending)
UPDATE users SET status = 'INACTIVE' WHERE is_active = false AND status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.status IS 'Registration status: PENDING, APPROVED, REJECTED, INACTIVE';

-- Verification query (uncomment to run manually):
-- SELECT id, email, status, is_active FROM users LIMIT 10;
