-- DJ System Database Schema
-- PostgreSQL Database with Multi-tenant Support
-- Updated: 2026-01-20

-- ========================================
-- ENUM Types (PostgreSQL ต้องสร้าง Type ก่อน)
-- ========================================

-- ประเภทความสำคัญของงาน
CREATE TYPE priority_enum AS ENUM ('low', 'normal', 'urgent');

-- สถานะงาน Design Job
CREATE TYPE job_status_enum AS ENUM (
  'draft', 'scheduled', 'submitted', 'pending_approval', 
  'approved', 'assigned', 'in_progress', 'rework', 
  'rejected', 'completed', 'closed'
);

-- สถานะการอนุมัติ
CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'returned');

-- ========================================
-- 0. Tenants (Multi-tenant) - ตารางหลักสำหรับแยกข้อมูลบริษัท
-- ========================================

CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,                    -- ชื่อบริษัท/องค์กร
  code VARCHAR(50) UNIQUE NOT NULL,              -- รหัสบริษัท (ใช้ใน subdomain)
  subdomain VARCHAR(100) UNIQUE,                 -- subdomain เช่น "company1" สำหรับ company1.dj-system.com
  logo_url VARCHAR(500),                         -- โลโก้บริษัท
  primary_color VARCHAR(20) DEFAULT '#E11D48',   -- สีหลัก (Rose)
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',                   -- การตั้งค่าเพิ่มเติม
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_code ON tenants(code);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- ========================================
-- 1. Users & Authentication (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, email)  -- email unique ภายใน tenant เดียวกัน
);

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- 'marketing', 'approver', 'assignee', 'admin'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, name)  -- role name unique ภายใน tenant เดียวกัน
);

-- Indexes
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, role_id)
);

-- Indexes
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- ========================================
-- 2. Projects & Organization (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE buds (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_buds_tenant_id ON buds(tenant_id);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NOT NULL,
  bud_id INTEGER NOT NULL REFERENCES buds(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_bud_id ON projects(bud_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);

-- ========================================
-- 3. Job Types & SLA Configuration (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE job_types (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  sla_working_days INTEGER NOT NULL,
  description TEXT,
  required_attachments JSONB, -- ["CI Guideline", "Project Key Message", "Logo Pack"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_job_types_tenant_id ON job_types(tenant_id);
CREATE INDEX idx_job_types_code ON job_types(code);
CREATE INDEX idx_job_types_is_active ON job_types(is_active);

-- ========================================
-- 4. Design Jobs (Main Table) (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE design_jobs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dj_id VARCHAR(50) NOT NULL, -- DJ-2024-0001
  project_id INTEGER NOT NULL REFERENCES projects(id),
  job_type_id INTEGER NOT NULL REFERENCES job_types(id),
  subject VARCHAR(500) NOT NULL,
  priority priority_enum DEFAULT 'normal',
  status job_status_enum DEFAULT 'draft',
  
  -- Requester & Assignee
  requester_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  
  -- Dates & SLA
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  scheduled_submit_at TIMESTAMP, -- For auto-submit
  deadline TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- SLA Tracking
  sla_working_days INTEGER,
  is_overdue BOOLEAN DEFAULT FALSE,
  overdue_days INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, dj_id)  -- dj_id unique ภายใน tenant เดียวกัน
);

-- Indexes
CREATE INDEX idx_design_jobs_tenant_id ON design_jobs(tenant_id);
CREATE INDEX idx_design_jobs_dj_id ON design_jobs(dj_id);
CREATE INDEX idx_design_jobs_status ON design_jobs(status);
CREATE INDEX idx_design_jobs_requester_id ON design_jobs(requester_id);
CREATE INDEX idx_design_jobs_assignee_id ON design_jobs(assignee_id);
CREATE INDEX idx_design_jobs_deadline ON design_jobs(deadline);
CREATE INDEX idx_design_jobs_created_at ON design_jobs(created_at);

-- ========================================
-- 5. Job Briefs (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE job_briefs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  objective TEXT NOT NULL, -- Min 200 characters
  headline VARCHAR(500),
  sub_headline VARCHAR(500),
  selling_points JSONB, -- ["ฟรีค่าโอน", "ฟรีค่าจดจำนอง"]
  price VARCHAR(200),
  reference_url VARCHAR(1000),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_briefs_tenant_id ON job_briefs(tenant_id);
CREATE INDEX idx_job_briefs_job_id ON job_briefs(job_id);

-- ========================================
-- 6. Attachments & Deliverables (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE job_attachments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT, -- bytes
  file_type VARCHAR(100),
  attachment_type VARCHAR(100), -- "CI Guideline", "Logo Pack", etc.
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_attachments_tenant_id ON job_attachments(tenant_id);
CREATE INDEX idx_job_attachments_job_id ON job_attachments(job_id);

CREATE TABLE job_deliverables (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_deliverables_tenant_id ON job_deliverables(tenant_id);
CREATE INDEX idx_job_deliverables_job_id ON job_deliverables(job_id);
CREATE INDEX idx_job_deliverables_version ON job_deliverables(version);

-- ========================================
-- 7. Approval Workflow (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE approval_flows (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Conditions (JSONB)
  conditions JSONB, -- {"job_type": "online", "project": "park-grand", "priority": "urgent"}
  
  -- Approver Steps (JSONB)
  approver_steps JSONB, -- [{"step": 1, "role": "head", "user_id": 5}, {"step": 2, "role": "bud_head", "user_id": 10}]
  
  allow_override BOOLEAN DEFAULT FALSE,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approval_flows_tenant_id ON approval_flows(tenant_id);
CREATE INDEX idx_approval_flows_is_active ON approval_flows(is_active);

CREATE TABLE approvals (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  status approval_status_enum DEFAULT 'pending',
  comment TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approvals_tenant_id ON approvals(tenant_id);
CREATE INDEX idx_approvals_job_id ON approvals(job_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- ========================================
-- 8. Activities & Comments (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE job_activities (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- 'created', 'submitted', 'approved', 'assigned', 'uploaded', etc.
  description TEXT,
  metadata JSONB, -- Additional data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_activities_tenant_id ON job_activities(tenant_id);
CREATE INDEX idx_job_activities_job_id ON job_activities(job_id);
CREATE INDEX idx_job_activities_created_at ON job_activities(created_at);

CREATE TABLE job_comments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  mentions JSONB, -- User IDs mentioned with @
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_comments_tenant_id ON job_comments(tenant_id);
CREATE INDEX idx_job_comments_job_id ON job_comments(job_id);
CREATE INDEX idx_job_comments_created_at ON job_comments(created_at);

-- ========================================
-- 9. Notifications (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'job_created', 'job_assigned', 'comment_added', 'sla_overdue', etc.
  title VARCHAR(500) NOT NULL,
  message TEXT,
  link VARCHAR(500), -- Deep link to relevant page
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ========================================
-- 10. Holidays (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE, -- For annual holidays
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_holidays_tenant_id ON holidays(tenant_id);
CREATE INDEX idx_holidays_date ON holidays(date);

-- ========================================
-- 11. Media Portal (เพิ่ม tenant_id)
-- ========================================

CREATE TABLE media_files (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES design_jobs(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id),
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  mime_type VARCHAR(100),
  thumbnail_path VARCHAR(1000),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_files_tenant_id ON media_files(tenant_id);
CREATE INDEX idx_media_files_project_id ON media_files(project_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);

-- ========================================
-- Function: Auto-update updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buds_updated_at BEFORE UPDATE ON buds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_types_updated_at BEFORE UPDATE ON job_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_design_jobs_updated_at BEFORE UPDATE ON design_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_briefs_updated_at BEFORE UPDATE ON job_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_flows_updated_at BEFORE UPDATE ON approval_flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_comments_updated_at BEFORE UPDATE ON job_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Insert Default Data
-- ========================================

-- Default Tenant (Demo)
INSERT INTO tenants (name, code, subdomain, logo_url, primary_color) VALUES
('Demo Company', 'demo', 'demo', '/images/logo-demo.png', '#E11D48');

-- Roles (for tenant_id = 1)
INSERT INTO roles (tenant_id, name, display_name, description) VALUES
(1, 'marketing', 'Marketing (Requester)', 'เปิดงาน DJ, แก้ brief, แนบไฟล์'),
(1, 'approver', 'Approver (Head/Manager)', 'อนุมัติ/ตีกลับ/ปรับผู้อนุมัติ'),
(1, 'assignee', 'Assignee (Graphic/Web)', 'รับงาน, ดู brief, แชท, ส่งงาน'),
(1, 'admin', 'Admin', 'จัดการประเภทงาน, SLA, วันหยุด, Approval flow');

-- BUDs (for tenant_id = 1)
INSERT INTO buds (tenant_id, name, code, description) VALUES
(1, 'BUD 1 - สายงานขาย', 'BUD1', 'Business Unit Division 1'),
(1, 'BUD 2 - สายงานก่อสร้าง', 'BUD2', 'Business Unit Division 2');

-- Job Types (for tenant_id = 1)
INSERT INTO job_types (tenant_id, name, code, sla_working_days, description, required_attachments) VALUES
(1, 'Online Artwork', 'ONLINE', 7, 'งาน Artwork สำหรับสื่อออนไลน์ เช่น Facebook, LINE, IG, Website', 
 '["CI Guideline", "Project Key Message", "Logo Pack"]'),
(1, 'Print Artwork', 'PRINT', 10, 'งาน Artwork สำหรับสื่อสิ่งพิมพ์ เช่น Brochure, Poster, Flyer', 
 '["CI Guideline", "Logo Pack", "Print Spec"]'),
(1, 'Video Production', 'VIDEO', 15, 'งานผลิตวิดีโอ เช่น Walkthrough, TVC, VDO Presentation', 
 '["Script", "Storyboard", "Logo Pack"]'),
(1, 'Social Media Content', 'SOCIAL', 3, 'งานคอนเทนต์โซเชียลมีเดีย เช่น IG Story, Facebook Post', 
 '["Content Brief", "Logo Pack"]'),
(1, 'Website Banner', 'BANNER', 5, 'งาน Banner สำหรับเว็บไซต์', 
 '["CI Guideline", "Logo Pack"]'),
(1, 'Event Material', 'EVENT', 7, 'งานสื่อสำหรับงานอีเวนต์ เช่น Backdrop, Standee, Booth', 
 '["Event Brief", "Logo Pack", "Venue Info"]');
