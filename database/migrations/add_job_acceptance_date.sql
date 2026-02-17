-- Migration: Add Job Acceptance Date Fields
-- Created: 2026-02-17
-- Description: เพิ่ม fields สำหรับการจัดการวันรับงานและการ extend งาน

-- เพิ่ม columns ใหม่
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS acceptance_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS acceptance_method VARCHAR(20) DEFAULT 'auto';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS original_due_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS extension_count INT DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_extended_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS extension_reason TEXT;

-- เพิ่ม index สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_jobs_acceptance_date ON jobs(acceptance_date);
CREATE INDEX IF NOT EXISTS idx_jobs_extension_count ON jobs(extension_count) WHERE extension_count > 0;

-- บันทึก log
COMMENT ON COLUMN jobs.acceptance_date IS 'วันที่ผู้รับงานเลือกรับงาน (NULL = ยังไม่เลือก)';
COMMENT ON COLUMN jobs.acceptance_method IS 'วิธีการรับงาน: auto, manual, extended';
COMMENT ON COLUMN jobs.original_due_date IS 'Due date เดิมก่อน extend (สำหรับ tracking)';
COMMENT ON COLUMN jobs.extension_count IS 'จำนวนครั้งที่ extend';
COMMENT ON COLUMN jobs.last_extended_at IS 'วันที่ extend ครั้งล่าสุด';
COMMENT ON COLUMN jobs.extension_reason IS 'เหตุผลการ extend';
