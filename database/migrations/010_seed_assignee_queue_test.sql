-- Migration: 010_seed_assignee_queue_test
-- Description: เพิ่มข้อมูล Mock Data สำหรับทดสอบหน้า My Queue (Assignee Dashboard)
-- Target Assignee: ID 5 (กานต์ ดีไซน์)

BEGIN;

-- 1. Create Jobs covering 4 Health Statuses for 'To Do' (Assigned) and 'In Progress'

-- [CRITICAL] Overdue Job (เลยกำหนด 2 ชม)
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 1, 1, 3, 5, 'Overdue Banner Ads', 'assigned', 'Urgent', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 days', 'TEST-001');

-- [CRITICAL] Critical Job (เหลือเวลา 3 ชม)
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 1, 2, 2, 5, 'Urgent Content Correction', 'in_progress', 'Urgent', NOW() + INTERVAL '3 hours', NOW() - INTERVAL '1 day', 'TEST-002');

-- [WARNING] Warning Job (เหลือเวลา 26 ชม = 1 วันนิดๆ)
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 2, 1, 2, 5, 'Promotion Artwork for Review', 'assigned', 'Normal', NOW() + INTERVAL '26 hours', NOW(), 'TEST-003');

-- [NORMAL] Normal Job (เหลือเวลา 3 วัน)
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 3, 3, 3, 5, 'Monthly Report Design', 'assigned', 'Low', NOW() + INTERVAL '3 days', NOW(), 'TEST-004');

-- [WAITING] Correction Job
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 1, 1, 3, 5, 'Brochure Adjustments', 'correction', 'Normal', NOW() + INTERVAL '5 days', NOW() - INTERVAL '3 days', 'TEST-005');

-- [WAITING] Pending Approval
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, dj_id)
VALUES (1, 2, 1, 2, 5, 'Waiting for Approval Job', 'pending_approval', 'Normal', NOW() + INTERVAL '4 days', NOW() - INTERVAL '1 day', 'TEST-006');

-- [DONE] Completed Job
INSERT INTO jobs (tenant_id, project_id, job_type_id, requester_id, assignee_id, subject, status, priority, due_date, created_at, completed_at, dj_id)
VALUES (1, 1, 2, 2, 5, 'Completed Logo Design', 'completed', 'Normal', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', 'TEST-007');

COMMIT;
