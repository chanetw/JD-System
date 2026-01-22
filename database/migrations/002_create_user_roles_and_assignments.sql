-- filepath: /database/migrations/002_create_user_roles_and_assignments.sql
-- ========================================
-- Migration Script: User Roles & Scope Assignments
-- Created: 2026-01-22
-- Purpose: เพิ่ม tables สำหรับ Role Assignment และ Scope Management
-- ========================================

-- ========================================
-- 1. user_roles Table - เก็บ Role ของ User (Multi-role support)
-- ========================================

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,             -- admin, marketing, approver, assignee
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_role_per_tenant 
        UNIQUE(user_id, tenant_id, role_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

COMMENT ON TABLE user_roles IS 'เก็บ Role ของ User (สามารถมี Multiple Roles ต่อ User ได้)';
COMMENT ON COLUMN user_roles.role_name IS 'ชื่อบทบาท: admin, marketing, approver, assignee';
COMMENT ON COLUMN user_roles.assigned_by IS 'Admin ผู้กำหนดบทบาท';

-- Trigger for auto-update updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. user_scope_assignments Table - เก็บการกำหนด Scope/Project
-- ========================================

CREATE TABLE IF NOT EXISTS user_scope_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope_level VARCHAR(20) NOT NULL,           -- 'Tenant', 'BUD', 'Project'
    scope_id INTEGER,                            -- ID ของ BUD หรือ Project (NULL สำหรับ Tenant scope)
    scope_name VARCHAR(255),                    -- ชื่อ BUD/Project (cache)
    role_type VARCHAR(50),                      -- marketing_allowed, assignee_assigned, approver_scope, etc.
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_scope_assignments_user_id ON user_scope_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_assignments_tenant_id ON user_scope_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_assignments_scope_level ON user_scope_assignments(scope_level);
CREATE INDEX IF NOT EXISTS idx_user_scope_assignments_scope_id ON user_scope_assignments(scope_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_assignments_role_type ON user_scope_assignments(role_type);

COMMENT ON TABLE user_scope_assignments IS 'เก็บการกำหนด Scope/Project ให้ User (เช่น Marketing สร้าง DJ ได้ โครงการไหนบ้าง)';
COMMENT ON COLUMN user_scope_assignments.scope_level IS 'ระดับ: Tenant (บริษัท), BUD (สายงาน), Project (โครงการ)';
COMMENT ON COLUMN user_scope_assignments.scope_id IS 'ID ของ Scope (NULL สำหรับ Tenant level)';
COMMENT ON COLUMN user_scope_assignments.role_type IS 'ประเภท Role สำหรับ Scope นี้ (marketing_allowed, assignee_assigned, etc.)';

-- Trigger for auto-update updated_at
CREATE TRIGGER update_user_scope_assignments_updated_at
BEFORE UPDATE ON user_scope_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. เพิ่ม department Column ใน users table (ถ้ายังไม่มี)
-- ========================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);

COMMENT ON COLUMN users.department IS 'หน่วยงาน/แผนก ของ User';

-- ========================================
-- 4. Verification Queries
-- ========================================

-- ตรวจสอบ user_roles table
-- SELECT * FROM user_roles LIMIT 10;

-- ตรวจสอบ user_scope_assignments table
-- SELECT * FROM user_scope_assignments LIMIT 10;

-- ========================================
-- End of Migration Script
-- ========================================
