-- ==========================================
-- DJ System - Supabase Database Setup
-- ==========================================
-- รัน SQL นี้ใน Supabase SQL Editor
-- https://supabase.com/dashboard/project/putfusjtlzmvjmcwkefv

-- 0. ตรวจสอบว่ามี tables พื้นฐานอยู่แล้วหรือไม่
-- ถ้าไม่มี ให้สร้างก่อน

-- สร้าง tenants table ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- สร้าง users table ถ้ายังไม่มี  
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  roles TEXT[] DEFAULT ARRAY['user'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure users has tenant_id (Critical for RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
    -- Ensure other required columns exist (if table was created partially)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles') THEN
        ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT ARRAY['user'];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100) DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100) DEFAULT '';
    END IF;
END $$;

-- สร้าง job_types table ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS job_types (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure job_types has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_types' AND column_name = 'tenant_id') THEN
        ALTER TABLE job_types ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 1. Create design_jobs table
CREATE TABLE IF NOT EXISTS design_jobs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  dj_id VARCHAR(50) UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  brief TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'draft',
  requester_id INTEGER REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  job_type_id INTEGER REFERENCES job_types(id),
  deadline TIMESTAMP,
  submitted_at TIMESTAMP,
  assigned_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure design_jobs has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'design_jobs' AND column_name = 'tenant_id') THEN
        ALTER TABLE design_jobs ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 2. Create approvals table (พร้อม audit fields)
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  job_id INTEGER NOT NULL REFERENCES design_jobs(id),
  step_number INTEGER NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  comment TEXT,
  approved_at TIMESTAMP,
  approval_token VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure approvals has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'tenant_id') THEN
        ALTER TABLE approvals ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 3. Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  job_id INTEGER REFERENCES design_jobs(id),
  project_id INTEGER,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  mime_type VARCHAR(100),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure media_files has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'tenant_id') THEN
        ALTER TABLE media_files ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 4. Create job_activities table (สำหรับ audit trail)
CREATE TABLE IF NOT EXISTS job_activities (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  job_id INTEGER NOT NULL REFERENCES design_jobs(id),
  user_id INTEGER REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure job_activities has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_activities' AND column_name = 'tenant_id') THEN
        ALTER TABLE job_activities ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure notifications has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'tenant_id') THEN
        ALTER TABLE notifications ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_design_jobs_tenant_id ON design_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_design_jobs_status ON design_jobs(status);
CREATE INDEX IF NOT EXISTS idx_design_jobs_requester_id ON design_jobs(requester_id);
CREATE INDEX IF NOT EXISTS idx_design_jobs_assignee_id ON design_jobs(assignee_id);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_id ON approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_job_id ON approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_token ON approvals(approval_token);

CREATE INDEX IF NOT EXISTS idx_media_files_tenant_id ON media_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_files_job_id ON media_files(job_id);
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by ON media_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_job_activities_tenant_id ON job_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_job_id ON job_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_user_id ON job_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 7. Insert sample data (optional)
-- สร้าง sample tenant ถ้ายังไม่มี
INSERT INTO tenants (name, code, is_active) 
VALUES ('DJ System Demo', 'demo', true) 
ON CONFLICT DO NOTHING;

-- สร้าง sample user ถ้ายังไม่มี
INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, is_active, roles)
SELECT 
  (SELECT id FROM tenants WHERE code = 'demo' LIMIT 1),
  'Admin',
  'User', 
  'admin@dj-system.com',
  '$2b$10$rQZ8ZqGQJqKqQqQqQqQqQu', -- dummy hash
  true,
  ARRAY['admin']
WHERE EXISTS (SELECT 1 FROM tenants WHERE code = 'demo')
ON CONFLICT DO NOTHING;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE design_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- [COMMENTED OUT] Reason: These policies cause Type Error (integer vs uuid) and are superseded by 008_fix_advanced_security.sql
-- Please run database/migrations/manual/008_fix_advanced_security.sql instead for robust security.

/*
-- Users can only see jobs from their tenant
CREATE POLICY "Users can view jobs from their tenant" ON design_jobs
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Users can only see approvals from their tenant
CREATE POLICY "Users can view approvals from their tenant" ON approvals
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Users can only see media files from their tenant
CREATE POLICY "Users can view media files from their tenant" ON media_files
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));
*/

-- 10. Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for design_jobs table
CREATE TRIGGER update_design_jobs_updated_at 
  BEFORE UPDATE ON design_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Setup Complete!
-- ==========================================
-- ตอนนี้คุณสามารถ:
-- 1. เริ่ม API server: cd backend/api-server && npm start
-- 2. ทดสอบ health check: curl http://localhost:3000/health
-- 3. ทดสอบ email templates
