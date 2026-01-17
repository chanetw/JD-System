-- DJ System Database Schema
-- MySQL Database

-- ========================================
-- 1. Users & Authentication
-- ========================================

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'marketing', 'approver', 'assignee', 'admin'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. Projects & Organization
-- ========================================

CREATE TABLE buds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  bud_id INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bud_id) REFERENCES buds(id),
  INDEX idx_bud_id (bud_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. Job Types & SLA Configuration
-- ========================================

CREATE TABLE job_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  sla_working_days INT NOT NULL,
  description TEXT,
  required_attachments JSON, -- ["CI Guideline", "Project Key Message", "Logo Pack"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. Design Jobs (Main Table)
-- ========================================

CREATE TABLE design_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  dj_id VARCHAR(50) UNIQUE NOT NULL, -- DJ-2024-0001
  project_id INT NOT NULL,
  job_type_id INT NOT NULL,
  subject VARCHAR(500) NOT NULL,
  priority ENUM('low', 'normal', 'urgent') DEFAULT 'normal',
  status ENUM(
    'draft', 'scheduled', 'submitted', 'pending_approval', 
    'approved', 'assigned', 'in_progress', 'rework', 
    'rejected', 'completed', 'closed'
  ) DEFAULT 'draft',
  
  -- Requester & Assignee
  requester_id INT NOT NULL,
  assignee_id INT,
  
  -- Dates & SLA
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  scheduled_submit_at TIMESTAMP NULL, -- For auto-submit
  deadline TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- SLA Tracking
  sla_working_days INT,
  is_overdue BOOLEAN DEFAULT FALSE,
  overdue_days INT DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (job_type_id) REFERENCES job_types(id),
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  
  INDEX idx_dj_id (dj_id),
  INDEX idx_status (status),
  INDEX idx_requester_id (requester_id),
  INDEX idx_assignee_id (assignee_id),
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. Job Briefs
-- ========================================

CREATE TABLE job_briefs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  objective TEXT NOT NULL, -- Min 200 characters
  headline VARCHAR(500),
  sub_headline VARCHAR(500),
  selling_points JSON, -- ["ฟรีค่าโอน", "ฟรีค่าจดจำนอง"]
  price VARCHAR(200),
  reference_url VARCHAR(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  INDEX idx_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. Attachments & Deliverables
-- ========================================

CREATE TABLE job_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT, -- bytes
  file_type VARCHAR(100),
  attachment_type VARCHAR(100), -- "CI Guideline", "Logo Pack", etc.
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_deliverables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by INT NOT NULL,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_job_id (job_id),
  INDEX idx_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. Approval Workflow
-- ========================================

CREATE TABLE approval_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Conditions (JSON)
  conditions JSON, -- {"job_type": "online", "project": "park-grand", "priority": "urgent"}
  
  -- Approver Steps (JSON)
  approver_steps JSON, -- [{"step": 1, "role": "head", "user_id": 5}, {"step": 2, "role": "bud_head", "user_id": 10}]
  
  allow_override BOOLEAN DEFAULT FALSE,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE approvals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  step_number INT NOT NULL,
  approver_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'returned') DEFAULT 'pending',
  comment TEXT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_job_id (job_id),
  INDEX idx_approver_id (approver_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 8. Activities & Comments
-- ========================================

CREATE TABLE job_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  user_id INT,
  activity_type VARCHAR(50) NOT NULL, -- 'created', 'submitted', 'approved', 'assigned', 'uploaded', etc.
  description TEXT,
  metadata JSON, -- Additional data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  mentions JSON, -- User IDs mentioned with @
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 9. Notifications
-- ========================================

CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'job_created', 'job_assigned', 'comment_added', 'sla_overdue', etc.
  title VARCHAR(500) NOT NULL,
  message TEXT,
  link VARCHAR(500), -- Deep link to relevant page
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 10. Holidays
-- ========================================

CREATE TABLE holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE, -- For annual holidays
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 11. Media Portal
-- ========================================

CREATE TABLE media_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT,
  project_id INT,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  mime_type VARCHAR(100),
  thumbnail_path VARCHAR(1000),
  uploaded_by INT NOT NULL,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES design_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_project_id (project_id),
  INDEX idx_file_type (file_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Insert Default Data
-- ========================================

-- Roles
INSERT INTO roles (name, display_name, description) VALUES
('marketing', 'Marketing (Requester)', 'เปิดงาน DJ, แก้ brief, แนบไฟล์'),
('approver', 'Approver (Head/Manager)', 'อนุมัติ/ตีกลับ/ปรับผู้อนุมัติ'),
('assignee', 'Assignee (Graphic/Web)', 'รับงาน, ดู brief, แชท, ส่งงาน'),
('admin', 'Admin', 'จัดการประเภทงาน, SLA, วันหยุด, Approval flow');

-- BUDs
INSERT INTO buds (name, code, description) VALUES
('BUD 1 - สายงานขาย', 'BUD1', 'Business Unit Division 1'),
('BUD 2 - สายงานก่อสร้าง', 'BUD2', 'Business Unit Division 2');

-- Job Types
INSERT INTO job_types (name, code, sla_working_days, description, required_attachments) VALUES
('Online Artwork', 'ONLINE', 7, 'งาน Artwork สำหรับสื่อออนไลน์ เช่น Facebook, LINE, IG, Website', 
 '["CI Guideline", "Project Key Message", "Logo Pack"]'),
('Print Artwork', 'PRINT', 10, 'งาน Artwork สำหรับสื่อสิ่งพิมพ์ เช่น Brochure, Poster, Flyer', 
 '["CI Guideline", "Logo Pack", "Print Spec"]'),
('Video Production', 'VIDEO', 15, 'งานผลิตวิดีโอ เช่น Walkthrough, TVC, VDO Presentation', 
 '["Script", "Storyboard", "Logo Pack"]'),
('Social Media Content', 'SOCIAL', 3, 'งานคอนเทนต์โซเชียลมีเดีย เช่น IG Story, Facebook Post', 
 '["Content Brief", "Logo Pack"]'),
('Website Banner', 'BANNER', 5, 'งาน Banner สำหรับเว็บไซต์', 
 '["CI Guideline", "Logo Pack"]'),
('Event Material', 'EVENT', 7, 'งานสื่อสำหรับงานอีเวนต์ เช่น Backdrop, Standee, Booth', 
 '["Event Brief", "Logo Pack", "Venue Info"]');
