-- ========================================
-- Migration Script: Add Missing Columns
-- Created: 2026-01-22
-- Purpose: เพิ่ม columns ที่ขาดหายไปตาม Development Plan
-- ========================================

-- ========================================
-- 1. Users Table - เพิ่ม columns สำหรับ SSO & User Management
-- ========================================

-- เพิ่ม title (คำนำหน้าชื่อ)
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(50);

-- เพิ่ม must_change_password (สำหรับ Admin สร้าง User)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- เพิ่ม SSO Support
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_user_id VARCHAR(255);

-- เพิ่ม Index สำหรับ SSO
CREATE INDEX IF NOT EXISTS idx_users_sso_provider ON users(sso_provider);
CREATE INDEX IF NOT EXISTS idx_users_sso_user_id ON users(sso_user_id);

-- เพิ่ม Unique Constraint สำหรับ SSO (provider + user_id ต้อง unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_unique 
ON users(tenant_id, sso_provider, sso_user_id) 
WHERE sso_provider IS NOT NULL AND sso_user_id IS NOT NULL;

COMMENT ON COLUMN users.title IS 'คำนำหน้าชื่อ (Mr., Ms., Dr., etc.)';
COMMENT ON COLUMN users.must_change_password IS 'บังคับเปลี่ยนรหัสผ่านครั้งแรก (Admin Create User)';
COMMENT ON COLUMN users.sso_provider IS 'SSO Provider (azure_ad, google, etc.)';
COMMENT ON COLUMN users.sso_user_id IS 'User ID จาก SSO Provider';

-- ========================================
-- 2. Jobs Table - เพิ่ม columns สำหรับ Auto-Approve & Completion
-- ========================================

-- เพิ่ม auto_approved_levels (JSONB) - บันทึก Level ที่ Auto-Approve แล้ว
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_approved_levels JSONB DEFAULT '[]'::jsonb;

-- เพิ่ม completed_by - ผู้ปิดงาน (Graphic Designer)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- เพิ่ม final_files (JSONB) - ไฟล์สุดท้ายที่ส่งมอบ
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_files JSONB DEFAULT '[]'::jsonb;

-- เพิ่ม Index
CREATE INDEX IF NOT EXISTS idx_jobs_completed_by ON jobs(completed_by);
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(completed_at);

COMMENT ON COLUMN jobs.auto_approved_levels IS 'Array ของ Level ที่ Auto-Approve (เมื่อผู้บริหารสร้างงานเอง)';
COMMENT ON COLUMN jobs.completed_by IS 'ผู้ปิดงาน (Graphic Designer ที่ทำงานเสร็จ)';
COMMENT ON COLUMN jobs.final_files IS 'ไฟล์สุดท้ายที่ส่งมอบ [{"name": "file.ai", "url": "...", "size": 1024}]';

-- ========================================
-- 3. ตรวจสอบความสมบูรณ์ของ Tables ที่มีอยู่แล้ว
-- ========================================

-- ตรวจสอบว่า approval_flows table มี columns ครบหรือไม่
DO $$
BEGIN
    -- เพิ่ม is_override column ถ้ายังไม่มี
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_flows' AND column_name = 'is_override'
    ) THEN
        ALTER TABLE approval_flows ADD COLUMN is_override BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN approval_flows.is_override IS 'TRUE = Override, FALSE = Master Default';
    END IF;
END $$;

-- ========================================
-- 4. สร้าง Function สำหรับ Updated_at Trigger
-- ========================================

-- Function สำหรับ auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- เพิ่ม Trigger ถ้ายังไม่มี
DO $$
BEGIN
    -- Trigger สำหรับ users table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
    ) THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger สำหรับ jobs table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at'
    ) THEN
        CREATE TRIGGER update_jobs_updated_at
        BEFORE UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ========================================
-- 5. User Registration Requests - ตาราง Self-Service Registration
-- ========================================

CREATE TABLE IF NOT EXISTS user_registration_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    title VARCHAR(50),                          -- คำนำหน้าชื่อ (นาย, นาง, นางสาว, Mr., Mrs., Ms., Dr.)
    first_name VARCHAR(100) NOT NULL,           -- ชื่อ
    last_name VARCHAR(100) NOT NULL,            -- นามสกุล
    phone VARCHAR(20),                          -- เบอร์โทรศัพท์
    department VARCHAR(100) NOT NULL,           -- หน่วยงาน/แผนก (text field)
    position VARCHAR(100),                      -- ตำแหน่ง
    status VARCHAR(20) DEFAULT 'pending',       -- pending, approved, rejected
    rejected_reason TEXT,                       -- เหตุผลการปฏิเสธ
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- ผู้อนุมัติ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (tenant_id, email)                   -- 1 email = 1 request ต่อ tenant
);

-- Indexes สำหรับ user_registration_requests
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_tenant_id 
ON user_registration_requests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_registration_requests_status 
ON user_registration_requests(status);

CREATE INDEX IF NOT EXISTS idx_user_registration_requests_email 
ON user_registration_requests(email);

CREATE INDEX IF NOT EXISTS idx_user_registration_requests_created_at 
ON user_registration_requests(created_at DESC);

COMMENT ON TABLE user_registration_requests IS 'คำขอสมัครใช้งาน Self-Service';
COMMENT ON COLUMN user_registration_requests.status IS 'สถานะ: pending (รอการอนุมัติ), approved (อนุมัติแล้ว), rejected (ปฏิเสธ)';
COMMENT ON COLUMN user_registration_requests.department IS 'หน่วยงาน/แผนก (text field ไม่จำเป็นต้องเป็น predefined)';

-- ========================================
-- 6. Password Reset Requests - ตาราง Forgot Password OTP
-- ========================================

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,               -- OTP 6 หลัก
    otp_expires_at TIMESTAMP NOT NULL,          -- หมดอายุ OTP (15 นาที)
    status VARCHAR(20) DEFAULT 'pending',       -- pending, used, expired
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes สำหรับ password_reset_requests
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id 
ON password_reset_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status 
ON password_reset_requests(status);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_created_at 
ON password_reset_requests(created_at DESC);

COMMENT ON TABLE password_reset_requests IS 'คำขอรีเซ็ตรหัสผ่าน (Forgot Password OTP)';
COMMENT ON COLUMN password_reset_requests.otp_expires_at IS 'วันหมดอายุ OTP (ปกติ 15 นาที)';

-- ========================================
-- 7. Verification Queries (ใช้ตรวจสอบหลัง Migrate)
-- ========================================

-- ตรวจสอบ columns ที่เพิ่มใหม่
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' 
-- AND column_name IN ('title', 'must_change_password', 'sso_provider', 'sso_user_id')
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'jobs' 
-- AND column_name IN ('auto_approved_levels', 'completed_by', 'final_files')
-- ORDER BY ordinal_position;

-- ตรวจสอบ Indexes ที่สร้างใหม่
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('users', 'jobs')
-- AND indexname LIKE 'idx_%sso%' OR indexname LIKE 'idx_%completed%';

-- ========================================
-- End of Migration Script
-- ========================================
