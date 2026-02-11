-- ============================================
-- Approval Flow V2 Migration
-- Date: 2026-01-29
-- Description: สร้างโครงสร้างใหม่สำหรับ Approval Flow Template
-- ============================================

-- 1. Master Template Table
-- เก็บ Template กลาง ที่สร้างครั้งเดียว Apply ได้หลาย Project
CREATE TABLE IF NOT EXISTS approval_flow_templates (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_levels INT DEFAULT 1,
  auto_assign_type VARCHAR(50) DEFAULT 'manual' CHECK (auto_assign_type IN ('manual', 'team_lead', 'dept_manager', 'specific_user')),
  auto_assign_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aft_tenant ON approval_flow_templates(tenant_id);

-- 2. Template Steps
-- เก็บว่า Template นี้มีกี่ Level และแต่ละ Level ต้องกี่คนอนุมัติ
CREATE TABLE IF NOT EXISTS approval_flow_steps (
  id SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES approval_flow_templates(id) ON DELETE CASCADE,
  level INT NOT NULL,
  name VARCHAR(100),
  approver_type VARCHAR(50) DEFAULT 'dept_manager' CHECK (approver_type IN ('dept_manager', 'specific_user', 'role_based', 'team_lead')),
  required_approvals INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_afs_template ON approval_flow_steps(template_id);

-- 3. Project-to-Template Assignment (รองรับ JobType-specific)
-- กำหนดว่า Project + JobType ใดใช้ Template ใด
CREATE TABLE IF NOT EXISTS project_flow_assignments (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_type_id INT REFERENCES job_types(id) ON DELETE CASCADE, -- NULL = Default for all JobTypes
  template_id INT NOT NULL REFERENCES approval_flow_templates(id) ON DELETE CASCADE,
  override_auto_assign BOOLEAN DEFAULT FALSE,
  auto_assign_type VARCHAR(50) CHECK (auto_assign_type IN ('manual', 'team_lead', 'dept_manager', 'specific_user')),
  auto_assign_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Unique: 1 Project + 1 JobType = 1 Assignment (NULL JobType = Default)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfa_unique ON project_flow_assignments(project_id, COALESCE(job_type_id, 0));
CREATE INDEX IF NOT EXISTS idx_pfa_project ON project_flow_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pfa_jobtype ON project_flow_assignments(job_type_id);

-- 4. Project-Specific Approvers
-- ตั้งค่าว่า Level ไหนของ Project นี้ ให้ใครเป็นผู้อนุมัติ (Override Template)
CREATE TABLE IF NOT EXISTS project_flow_approvers (
  id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL REFERENCES project_flow_assignments(id) ON DELETE CASCADE,
  level INT NOT NULL,
  approver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfap_unique ON project_flow_approvers(assignment_id, level, approver_id);
CREATE INDEX IF NOT EXISTS idx_pfap_assignment ON project_flow_approvers(assignment_id);

-- ============================================
-- Sample Data: Default Templates
-- ============================================

-- สร้าง Template "Skip Approval" (total_levels = 0)
INSERT INTO approval_flow_templates (tenant_id, name, description, total_levels, auto_assign_type, is_active)
SELECT id, 'Skip Approval', 'ไม่ต้องมีการอนุมัติ ส่งงานตรงไปยัง Assignee', 0, 'manual', TRUE
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM approval_flow_templates WHERE name = 'Skip Approval' AND tenant_id = tenants.id
);

-- สร้าง Template "Single Level Approval" (1 ขั้นตอน)
INSERT INTO approval_flow_templates (tenant_id, name, description, total_levels, auto_assign_type, is_active)
SELECT id, 'Single Level Approval', 'อนุมัติ 1 ขั้นตอน โดยหัวหน้าแผนก', 1, 'dept_manager', TRUE
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM approval_flow_templates WHERE name = 'Single Level Approval' AND tenant_id = tenants.id
);

-- สร้าง Template "Two Level Approval" (2 ขั้นตอน)
INSERT INTO approval_flow_templates (tenant_id, name, description, total_levels, auto_assign_type, is_active)
SELECT id, 'Two Level Approval', 'อนุมัติ 2 ขั้นตอน (Team Lead + หัวหน้าแผนก)', 2, 'team_lead', TRUE
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM approval_flow_templates WHERE name = 'Two Level Approval' AND tenant_id = tenants.id
);

-- เพิ่ม Steps สำหรับ Single Level Template
INSERT INTO approval_flow_steps (template_id, level, name, approver_type, required_approvals)
SELECT aft.id, 1, 'หัวหน้าแผนก', 'dept_manager', 1
FROM approval_flow_templates aft
WHERE aft.name = 'Single Level Approval'
AND NOT EXISTS (
  SELECT 1 FROM approval_flow_steps WHERE template_id = aft.id AND level = 1
);

-- เพิ่ม Steps สำหรับ Two Level Template
INSERT INTO approval_flow_steps (template_id, level, name, approver_type, required_approvals)
SELECT aft.id, 1, 'Team Lead', 'team_lead', 1
FROM approval_flow_templates aft
WHERE aft.name = 'Two Level Approval'
AND NOT EXISTS (
  SELECT 1 FROM approval_flow_steps WHERE template_id = aft.id AND level = 1
);

INSERT INTO approval_flow_steps (template_id, level, name, approver_type, required_approvals)
SELECT aft.id, 2, 'หัวหน้าแผนก', 'dept_manager', 1
FROM approval_flow_templates aft
WHERE aft.name = 'Two Level Approval'
AND NOT EXISTS (
  SELECT 1 FROM approval_flow_steps WHERE template_id = aft.id AND level = 2
);
