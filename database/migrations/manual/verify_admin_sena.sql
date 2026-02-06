-- ============================================================
-- Script: Verify admin@sena.co.th User
-- Purpose: ตรวจสอบการใช้งาน admin@sena.co.th ก่อนลบ SENX
-- Date: 2026-02-04
-- ============================================================

-- ============================================================
-- STEP 1: ตรวจสอบ admin@sena.co.th ในระบบ
-- ============================================================
SELECT
    id,
    email,
    display_name,
    first_name,
    last_name,
    tenant_id,
    role,
    is_active,
    status,
    created_at,
    updated_at,
    last_login_at
FROM users
WHERE email = 'admin@sena.co.th'
LIMIT 1;

-- ============================================================
-- STEP 2: ตรวจสอบ User Roles ที่เกี่ยวข้อง
-- ============================================================
SELECT
    ur.id,
    ur.user_id,
    ur.role_name as "role",
    ur.tenant_id,
    ur.is_active
FROM user_roles ur
WHERE ur.user_id = (
    SELECT id FROM users WHERE email = 'admin@sena.co.th'
)
ORDER BY ur.id;

-- ============================================================
-- STEP 3: ตรวจสอบ Tenant ที่ user อยู่
-- ============================================================
SELECT
    t.id,
    t.name,
    t.code,
    t.subdomain,
    t.is_active,
    t.created_at
FROM tenants t
WHERE t.id = (
    SELECT tenant_id FROM users WHERE email = 'admin@sena.co.th'
)
LIMIT 1;

-- ============================================================
-- STEP 4: ตรวจสอบ Jobs ที่ admin สร้าง (requester)
-- ============================================================
SELECT
    COUNT(*) as job_count,
    MIN(created_at) as first_job,
    MAX(created_at) as last_job
FROM jobs
WHERE requester_id = (
    SELECT id FROM users WHERE email = 'admin@sena.co.th'
);

-- ============================================================
-- STEP 5: ตรวจสอบ Jobs ที่ admin อนุมัติ (approver)
-- ============================================================
SELECT
    COUNT(*) as approval_count
FROM approvals
WHERE approver_id = (
    SELECT id FROM users WHERE email = 'admin@sena.co.th'
);

-- ============================================================
-- STEP 6: Tenant Summary
-- ============================================================
SELECT
    'Tenant: SENA' as info,
    COUNT(*) as user_count
FROM users
WHERE tenant_id = 1
UNION ALL
SELECT
    'Tenant: SENX' as info,
    COUNT(*) as user_count
FROM users
WHERE tenant_id = 2
ORDER BY info DESC;

-- ============================================================
-- STEP 7: Data Summary ที่จะลบเมื่อลบ SENX
-- ============================================================
DO $$
DECLARE
    v_users INTEGER;
    v_jobs INTEGER;
    v_approvals INTEGER;
    v_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users FROM users WHERE tenant_id = 2;
    SELECT COUNT(*) INTO v_jobs FROM jobs WHERE tenant_id = 2;
    SELECT COUNT(*) INTO v_approvals FROM approvals WHERE tenant_id = 2;
    SELECT COUNT(*) INTO v_projects FROM projects WHERE tenant_id = 2;

    RAISE NOTICE '===== SENX Tenant (ID=2) Data Summary =====';
    RAISE NOTICE 'Users: %', v_users;
    RAISE NOTICE 'Jobs: %', v_jobs;
    RAISE NOTICE 'Approvals: %', v_approvals;
    RAISE NOTICE 'Projects: %', v_projects;
    RAISE NOTICE 'Total items to be deleted: %', (v_users + v_jobs + v_approvals + v_projects);
END $$;

-- ============================================================
-- STEP 8: Admin User Status Check
-- ============================================================
SELECT
    email,
    CASE
        WHEN is_active = true THEN '✅ Active'
        ELSE '❌ Inactive'
    END as account_status,
    CASE
        WHEN status IS NULL THEN '⚠️ No Status'
        WHEN status = 'APPROVED' THEN '✅ Approved'
        WHEN status = 'PENDING' THEN '⏳ Pending Approval'
        WHEN status = 'REJECTED' THEN '❌ Rejected'
        ELSE status
    END as approval_status,
    CASE
        WHEN last_login_at IS NULL THEN '❌ Never Logged In'
        WHEN last_login_at >= CURRENT_DATE - INTERVAL '7 days' THEN '✅ Active User'
        WHEN last_login_at >= CURRENT_DATE - INTERVAL '30 days' THEN '⚠️ Inactive (30 days)'
        ELSE '❌ Inactive (30+ days)'
    END as login_status
FROM users
WHERE email = 'admin@sena.co.th';

-- ============================================================
-- RESULT CHECKLIST
-- ============================================================
-- ✅ Checklist ก่อนดำเนินการลบ:
--
-- □ admin@sena.co.th มี role = admin หรือ approver
-- □ admin@sena.co.th tenant_id = 1 (SENA)
-- □ admin@sena.co.th is_active = true
-- □ admin@sena.co.th status = APPROVED
-- □ admin@sena.co.th เข้าสู่ระบบมาแล้ว (last_login_at ไม่ NULL)
-- □ ไม่มี jobs/approvals ที่ขึ้นต่อกับ SENX tenant
--
-- ถ้า ✅ ทั้งหมด → ดำเนินการลบ SENX ได้

