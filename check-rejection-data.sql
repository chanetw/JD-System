-- ตรวจสอบงานที่มีสถานะ assignee_rejected และเหตุผลการปฏิเสธ

-- 1. ดูงานที่ปฏิเสธล่าสุด พร้อมเหตุผล
SELECT
    id,
    dj_id,
    subject,
    status,
    rejection_comment,
    rejection_source,
    rejected_by,
    created_at,
    updated_at,
    CASE
        WHEN rejection_comment IS NULL THEN 'NULL'
        WHEN rejection_comment = '' THEN 'EMPTY STRING'
        ELSE CONCAT('Length: ', LENGTH(rejection_comment))
    END as comment_status
FROM jobs
WHERE status = 'assignee_rejected'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. นับจำนวนงานที่ปฏิเสธแยกตามมีเหตุผลหรือไม่
SELECT
    COUNT(*) as total_rejected,
    COUNT(rejection_comment) as has_comment,
    COUNT(*) - COUNT(rejection_comment) as no_comment,
    SUM(CASE WHEN rejection_comment = '' THEN 1 ELSE 0 END) as empty_comment
FROM jobs
WHERE status = 'assignee_rejected';

-- 3. ดูรายละเอียดเต็มของงานล่าสุด (รวมชื่อผู้รับงาน)
SELECT
    j.id,
    j.dj_id,
    j.subject,
    j.status,
    j.rejection_comment,
    j.rejection_source,
    u.first_name || ' ' || u.last_name as rejected_by_name,
    j.created_at,
    j.updated_at
FROM jobs j
LEFT JOIN users u ON j.rejected_by = u.id
WHERE j.status = 'assignee_rejected'
ORDER BY j.updated_at DESC
LIMIT 5;

-- 4. ดูประวัติ activity log ของการปฏิเสธ
SELECT
    al.id,
    al.job_id,
    j.dj_id,
    al.action,
    al.message,
    al.detail,
    al.created_at,
    u.first_name || ' ' || u.last_name as user_name
FROM activity_logs al
JOIN jobs j ON al.job_id = j.id
JOIN users u ON al.user_id = u.id
WHERE al.action = 'job_rejected_by_assignee'
ORDER BY al.created_at DESC
LIMIT 10;
