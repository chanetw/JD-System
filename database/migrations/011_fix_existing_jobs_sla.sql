-- Migration: 011_fix_existing_jobs_sla
-- Description: ปรับปรุงข้อมูล Jobs เดิมที่มีอยู่ในระบบให้มีค่าวันที่ครบถ้วน เพื่อให้ทดสอบระบบ SLA Health ได้

BEGIN;

-- 1. Backfill NULL due_date (ถ้าไม่มีกำหนดส่ง ให้ใส่เป็นอีก 7 วันข้างหน้า)
UPDATE jobs 
SET due_date = NOW() + INTERVAL '7 days'
WHERE due_date IS NULL AND status NOT IN ('completed', 'cancelled', 'closed');

-- 2. Backfill NULL started_at for In Progress jobs (ให้เริ่มเมื่อตอนสร้าง)
UPDATE jobs 
SET started_at = created_at
WHERE status = 'in_progress' AND started_at IS NULL;

-- 3. Simulation: สุ่มทำให้งานบางส่วน "เลยกำหนด" (Overdue) เพื่อทดสอบตัวแดง
-- ลือกงานที่ยังไม่เสร็จ ID น้อยๆ (งานเก่า) มาแก้ due_date เป็นเมื่อวาน
UPDATE jobs 
SET due_date = NOW() - INTERVAL '1 day' 
WHERE id IN (
    SELECT id FROM jobs 
    WHERE status IN ('assigned', 'in_progress') 
    LIMIT 2
);

-- 4. Simulation: สุ่มทำให้งานบางส่วน "ด่วน/วิกฤต" (Critical < 4hr)
UPDATE jobs 
SET due_date = NOW() + INTERVAL '3 hours' 
WHERE id IN (
    SELECT id FROM jobs 
    WHERE status IN ('assigned', 'in_progress') 
    AND due_date > NOW() -- ไม่เอางานที่แก้เป็น Overdue เมื่อกี้
    LIMIT 2
);

COMMIT;
