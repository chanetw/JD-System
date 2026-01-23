-- ==========================================
-- DJ System Database Schema Phase 2 (Add-ons)
-- ==========================================

-- 1. Notifications Table (ระบบแจ้งเตือน)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,           -- ประเภท: job_created, job_approved, job_rejected, urgent_impact, etc.
    title VARCHAR(255) NOT NULL,         -- หัวข้อแจ้งเตือน
    message TEXT,                        -- เนื้อหาละเอียด
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, -- งานที่เกี่ยวข้อง
    link VARCHAR(255),                   -- ลิงก์ไปหน้าจอที่เกี่ยวข้อง
    is_read BOOLEAN DEFAULT false,       -- สถานะอ่าน
    metadata JSONB,                      -- ข้อมูลเพิ่มเติม (เช่น reason, shift_days)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index เพื่อให้ดึงข้อมูลแจ้งเตือนของผู้ใช้ได้เร็ว
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 2. Notification Logs (ประวัติการส่ง Email)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    event_type VARCHAR(50),
    recipient_type VARCHAR(20),          -- 'user' หรือ 'custom_email'
    recipient_email VARCHAR(255),
    recipient_user_id INTEGER REFERENCES users(id),
    subject VARCHAR(255),
    body TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SLA Shift Logs (ประวัติการเลื่อนกำหนดส่งงาน)
CREATE TABLE IF NOT EXISTS sla_shift_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,        -- งานที่ถูกเลื่อน SLA
    urgent_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, -- งานด่วนที่เป็นสาเหตุ
    original_due_date TIMESTAMP WITH TIME ZONE,                  -- กำหนดส่งเดิม
    new_due_date TIMESTAMP WITH TIME ZONE,                       -- กำหนดส่งใหม่
    shift_days INTEGER,                                          -- จำนวนวันที่ถูกเลื่อน (+2)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Security Policy Integration (RLS)
-- เปิดให้เข้าถึงได้ระหว่างรยาพัฒนา (Production ควรระบุ Policy ให้ชัดเจนกว่านี้)

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON notifications;
CREATE POLICY "Public Access" ON notifications FOR ALL USING (true);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON notification_logs;
CREATE POLICY "Public Access" ON notification_logs FOR ALL USING (true);

ALTER TABLE sla_shift_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON sla_shift_logs;
CREATE POLICY "Public Access" ON sla_shift_logs FOR ALL USING (true);
