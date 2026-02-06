-- ============================================================
-- Script: Cleanup SENX Tenant
-- Purpose: ลบ SENX tenant ออกจากระบบ เหลือแค่ SENA เท่านั้น
-- Date: 2026-02-04
-- ============================================================

-- ⚠️ WARNING: Script นี้จะลบข้อมูลทั้งหมดของ SENX tenant!
-- กรุณา backup database ก่อน run script นี้

-- ============================================================
-- STEP 1: ตรวจสอบ Tenant ที่มีอยู่
-- ============================================================
SELECT id, name, code, subdomain, is_active, created_at
FROM tenants
ORDER BY id;

-- ============================================================
-- STEP 2: ตรวจสอบข้อมูลใน SENX Tenant (สมมติว่า SENX = tenant_id 2)
-- ============================================================
-- หา tenant_id ของ SENX ก่อน (อาจเป็น 2 หรือตัวอื่น)
SELECT id FROM tenants WHERE code = 'SENX' OR name ILIKE '%senx%';

-- นับจำนวน data ในแต่ละตาราง (เปลี่ยน 2 เป็น tenant_id จริง)
DO $$
DECLARE
    v_tenant_id INTEGER := 2; -- << เปลี่ยนตรงนี้ถ้า tenant_id ไม่ใช่ 2
    v_count INTEGER;
BEGIN
    RAISE NOTICE '=== SENX Tenant Data Summary (tenant_id = %) ===', v_tenant_id;

    -- Users
    SELECT COUNT(*) INTO v_count FROM users WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'users: %', v_count;

    -- Roles
    SELECT COUNT(*) INTO v_count FROM roles WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'roles: %', v_count;

    -- BUDs
    SELECT COUNT(*) INTO v_count FROM buds WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'buds: %', v_count;

    -- Projects
    SELECT COUNT(*) INTO v_count FROM projects WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'projects: %', v_count;

    -- Departments
    SELECT COUNT(*) INTO v_count FROM departments WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'departments: %', v_count;

    -- Job Types
    SELECT COUNT(*) INTO v_count FROM job_types WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'job_types: %', v_count;

    -- Jobs
    SELECT COUNT(*) INTO v_count FROM jobs WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'jobs: %', v_count;

    -- Approval Flows
    SELECT COUNT(*) INTO v_count FROM approval_flows WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'approval_flows: %', v_count;

    -- Holidays
    SELECT COUNT(*) INTO v_count FROM holidays WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'holidays: %', v_count;
END $$;

-- ============================================================
-- STEP 3: แสดง Users ที่จะถูกลบ
-- ============================================================
SELECT id, email, display_name, role, is_active
FROM users
WHERE tenant_id = 2  -- << เปลี่ยนตรงนี้
ORDER BY id;

-- ============================================================
-- STEP 4: ลบ SENX Tenant (Hard Delete)
-- ============================================================
-- ⚠️ ทุก data ที่ผูกกับ tenant นี้จะถูกลบอัตโนมัติ (CASCADE)

-- Option A: ถ้ารู้ tenant_id แน่นอน
-- DELETE FROM tenants WHERE id = 2;

-- Option B: ถ้าต้องการลบโดยใช้ code
-- DELETE FROM tenants WHERE code = 'SENX';

-- ============================================================
-- STEP 5: ยืนยันว่าลบเรียบร้อย
-- ============================================================
-- SELECT id, name, code FROM tenants ORDER BY id;

-- ============================================================
-- OPTIONAL: ถ้าต้องการ Soft Delete แทน (แค่ปิดใช้งาน)
-- ============================================================
-- UPDATE tenants SET is_active = false WHERE code = 'SENX';


-- ============================================================
-- BACKUP COMMAND (Run ก่อน delete)
-- ============================================================
-- pg_dump -h your-host -U postgres -d dj_system > backup_before_senx_delete.sql
