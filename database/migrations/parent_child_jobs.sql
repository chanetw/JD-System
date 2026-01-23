-- Migration Script: Parent-Child Jobs Structure
-- Purpose: เพิ่มโครงสร้างให้ 1 งาน (Parent) มีได้หลาย Job Types (Children)
-- Run this in Supabase SQL Editor
-- Date: 2026-01-22

-- =====================================================
-- 1. เพิ่ม Dummy Job Type สำหรับ Parent
-- (เพื่อไม่ต้องแก้ NOT NULL constraint ของ job_type_id)
-- หมายเหตุ: ปรับ Column ให้ตรงกับโครงสร้าง DB จริง
-- =====================================================
INSERT INTO job_types (name)
VALUES ('Project Group (Parent)')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. เพิ่ม Column เพื่อ Link Parent-Child
-- =====================================================
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS parent_job_id INTEGER REFERENCES jobs(id) ON DELETE RESTRICT;

-- Comment: ON DELETE RESTRICT = ป้องกันการลบ Parent ถ้ายังมีลูกอยู่

-- =====================================================
-- 3. เพิ่ม Column ระบุว่าเป็น Parent หรือ Child
-- =====================================================
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 4. Index สำหรับ Query ลูก (Performance)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_jobs_parent_id ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_parent ON jobs(is_parent);

-- =====================================================
-- 5. View สำหรับดึง Parent Jobs พร้อม Aggregate ของ Children
-- =====================================================
CREATE OR REPLACE VIEW v_parent_jobs AS
SELECT
    p.id,
    p.tenant_id,
    p.dj_id,
    p.subject,
    p.project_id,
    p.requester_id,
    p.priority,
    p.status as parent_status,
    p.created_at,
    p.due_date as parent_deadline,
    -- Aggregate from Children
    (SELECT COUNT(*) FROM jobs c WHERE c.parent_job_id = p.id) as child_count,
    (SELECT COUNT(*) FROM jobs c WHERE c.parent_job_id = p.id AND c.status = 'completed') as completed_count,
    (SELECT MAX(due_date) FROM jobs c WHERE c.parent_job_id = p.id) as max_child_deadline
FROM jobs p
WHERE p.is_parent = TRUE;

-- =====================================================
-- 6. Function: Auto-update Parent Status เมื่อ Children เปลี่ยน
-- =====================================================
CREATE OR REPLACE FUNCTION update_parent_status()
RETURNS TRIGGER AS $$
DECLARE
    parent_id INTEGER;
    total_children INTEGER;
    completed_children INTEGER;
    in_progress_children INTEGER;
BEGIN
    -- ถ้างานนี้มี parent
    IF NEW.parent_job_id IS NOT NULL THEN
        parent_id := NEW.parent_job_id;
        
        -- นับลูกทั้งหมด
        SELECT COUNT(*) INTO total_children
        FROM jobs WHERE parent_job_id = parent_id;
        
        -- นับลูกที่เสร็จแล้ว
        SELECT COUNT(*) INTO completed_children
        FROM jobs WHERE parent_job_id = parent_id AND status = 'completed';
        
        -- นับลูกที่กำลังทำ
        SELECT COUNT(*) INTO in_progress_children
        FROM jobs WHERE parent_job_id = parent_id AND status IN ('in_progress', 'rework');
        
        -- Update สถานะ Parent
        IF completed_children = total_children AND total_children > 0 THEN
            -- ลูกเสร็จหมด -> Parent เสร็จ
            UPDATE jobs SET status = 'completed', completed_at = NOW() WHERE id = parent_id;
        ELSIF in_progress_children > 0 THEN
            -- มีลูกกำลังทำ -> Parent กำลังทำ
            UPDATE jobs SET status = 'in_progress' WHERE id = parent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Trigger: เรียก Function เมื่อ Child เปลี่ยนสถานะ
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_parent_status ON jobs;
CREATE TRIGGER trigger_update_parent_status
AFTER UPDATE OF status ON jobs
FOR EACH ROW
WHEN (NEW.parent_job_id IS NOT NULL)
EXECUTE FUNCTION update_parent_status();

