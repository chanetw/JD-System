-- ==========================================
-- Notification Table Migration
-- ==========================================
--
-- @file 012_create_notifications_table.sql
-- @description สร้างตาราง notifications สำหรับเก็บข้อมูล
--
-- Schema Version: 1.0
-- Date: 2026-01-27

-- ==========================================
-- Create notifications Table
-- ==========================================

CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id BIGSERIAL PRIMARY KEY,
  
  -- Foreign Keys
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Metadata
  -- ประเภทของ Notification (job_assigned, approval_needed, sla_alert, etc.)
  type VARCHAR(50) NOT NULL,
  
  -- ระดับความสำคัญ (CRITICAL, HIGH, MEDIUM, LOW)
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  
  -- ชื่อ Notification
  title VARCHAR(255) NOT NULL,
  
  -- ข้อความรายละเอียด
  message TEXT,
  
  -- ข้อมูล JSON ที่เกี่ยวข้อง (jobId, djId, approvalId, etc.)
  data JSONB,
  
  -- Read Status
  -- คนสถานะว่ากำลังอ่านแล้วหรือไม่
  is_read BOOLEAN DEFAULT false,
  
  -- เวลาที่อ่านแล้ว
  read_at TIMESTAMP,
  
  -- Lifecycle
  -- เวลาที่สร้าง
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- เวลาที่ Notification หมดอายุ (30 วัน)
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  
  -- Updated At (สำหรับการเปลี่ยนแปลง)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================
-- Create Indexes สำหรับ Performance
-- ==========================================

-- Index สำหรับ Query unread notifications ของ user
-- ใช้เมื่อดึง unread count หรือ list unread notifications
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Index สำหรับ Query โดยเรียง created_at (ล่าสุดก่อน)
-- ใช้เมื่อแสดง notification list
CREATE INDEX idx_notifications_created 
  ON notifications(user_id, created_at DESC);

-- Index สำหรับ Cleanup expired notifications
-- ใช้เมื่อลบ notifications ที่หมดอายุ
CREATE INDEX idx_notifications_expires 
  ON notifications(expires_at)
  WHERE expires_at > CURRENT_TIMESTAMP;

-- Index สำหรับ Tenant Isolation
-- ใช้เมื่อ query ตาม tenant_id
CREATE INDEX idx_notifications_tenant 
  ON notifications(tenant_id, user_id, created_at DESC);

-- ==========================================
-- Add Comments สำหรับ Documentation
-- ==========================================

COMMENT ON TABLE notifications IS 'Real-time notifications table for DJ System';
COMMENT ON COLUMN notifications.id IS 'Unique notification ID';
COMMENT ON COLUMN notifications.tenant_id IS 'Multi-tenant isolation';
COMMENT ON COLUMN notifications.user_id IS 'Target user for notification';
COMMENT ON COLUMN notifications.type IS 'Notification type (job_assigned, approval_needed, sla_alert, comment_added, job_completed, etc.)';
COMMENT ON COLUMN notifications.priority IS 'Priority level: CRITICAL (red), HIGH (orange), MEDIUM (blue), LOW (gray)';
COMMENT ON COLUMN notifications.title IS 'Short title/subject of notification';
COMMENT ON COLUMN notifications.message IS 'Detailed message';
COMMENT ON COLUMN notifications.data IS 'JSON data with associated resource IDs (jobId, djId, approvalId, etc.)';
COMMENT ON COLUMN notifications.is_read IS 'Read status (false = unread, true = read)';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when user marked as read';
COMMENT ON COLUMN notifications.created_at IS 'When notification was created';
COMMENT ON COLUMN notifications.expires_at IS 'When notification expires (30 days from creation)';

-- ==========================================
-- Seed Data (Optional - for testing)
-- ==========================================

-- Uncomment to add test data
-- INSERT INTO notifications (tenant_id, user_id, type, priority, title, message, data, is_read, created_at)
-- VALUES 
--   (1, 1, 'job_assigned', 'HIGH', 'DJ-2026-0001 assigned', 'Banner Design job assigned', '{"jobId": 1, "djId": "DJ-2026-0001"}', false, NOW()),
--   (1, 1, 'sla_alert_24h', 'CRITICAL', 'Deadline approaching', 'DJ-2026-0001 due in 24 hours', '{"jobId": 1}', false, NOW() - INTERVAL '1 hour');
