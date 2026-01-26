-- ========================================
-- Migration 006: Rename Marketing Role to Requester
-- Purpose: Change role name from 'marketing' to 'requester' to support multiple departments
-- Date: 2026-01-26
-- Compatible: Supabase PostgreSQL
-- ========================================

-- ========================================
-- FORWARD MIGRATION
-- ========================================

-- 1. Update roles table: marketing → requester (ถ้ามี table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        UPDATE roles 
        SET 
            name = 'requester',
            display_name = 'Requester (ผู้เปิดงาน)',
            description = 'เปิดงาน DJ, แก้ brief, แนบไฟล์',
            updated_at = NOW()
        WHERE name = 'marketing';
        
        RAISE NOTICE '✅ Updated roles table: marketing → requester';
    ELSE
        RAISE NOTICE '⚠️  Table "roles" does not exist, skipping...';
    END IF;
END $$;

-- 2. Update user_roles table: marketing → requester (ถ้ามี table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        UPDATE user_roles 
        SET 
            role_name = 'requester',
            updated_at = NOW()
        WHERE role_name = 'marketing';
        
        RAISE NOTICE '✅ Updated user_roles table: marketing → requester';
    ELSE
        RAISE NOTICE '⚠️  Table "user_roles" does not exist, skipping...';
    END IF;
END $$;

-- 3. Update user_scope_assignments: marketing_allowed → requester_allowed (ถ้ามี table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scope_assignments') THEN
        UPDATE user_scope_assignments 
        SET 
            role_type = 'requester_allowed',
            updated_at = NOW()
        WHERE role_type = 'marketing_allowed';
        
        RAISE NOTICE '✅ Updated user_scope_assignments table: marketing_allowed → requester_allowed';
    ELSE
        RAISE NOTICE '⚠️  Table "user_scope_assignments" does not exist, skipping...';
    END IF;
END $$;

-- 4. Update audit_logs if exists (for historical context)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Update entity_type references
        UPDATE audit_logs 
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{role_migrated}',
            '"marketing->requester"'::jsonb
        )
        WHERE (old_values->>'role_name' = 'marketing' OR new_values->>'role_name' = 'marketing')
          AND metadata->>'role_migrated' IS NULL;
        
        RAISE NOTICE '✅ Updated audit_logs metadata';
    ELSE
        RAISE NOTICE '⚠️  Table "audit_logs" does not exist, skipping...';
    END IF;
END $$;

-- 5. Update comments (ถ้า tables มีอยู่)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        COMMENT ON COLUMN user_roles.role_name IS 'ชื่อบทบาท: admin, requester, approver, assignee';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scope_assignments') THEN
        COMMENT ON COLUMN user_scope_assignments.role_type IS 'ประเภท Role สำหรับ Scope นี้ (requester_allowed, assignee_assigned, etc.)';
        COMMENT ON TABLE user_scope_assignments IS 'เก็บการกำหนด Scope/Project ให้ User (เช่น ผู้เปิดงานสร้าง DJ ได้ โครงการไหนบ้าง)';
    END IF;
END $$;

-- 6. Verify changes
DO $$
DECLARE
    v_roles_count INTEGER := 0;
    v_user_roles_count INTEGER := 0;
    v_scope_count INTEGER := 0;
    v_has_roles BOOLEAN;
    v_has_user_roles BOOLEAN;
    v_has_scope BOOLEAN;
BEGIN
    -- ตรวจสอบว่า tables มีอยู่ไหม
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') INTO v_has_roles;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') INTO v_has_user_roles;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scope_assignments') INTO v_has_scope;
    
    -- นับจำนวนถ้า table มีอยู่
    IF v_has_roles THEN
        SELECT COUNT(*) INTO v_roles_count FROM roles WHERE name = 'requester';
    END IF;
    
    IF v_has_user_roles THEN
        SELECT COUNT(*) INTO v_user_roles_count FROM user_roles WHERE role_name = 'requester';
    END IF;
    
    IF v_has_scope THEN
        SELECT COUNT(*) INTO v_scope_count FROM user_scope_assignments WHERE role_type = 'requester_allowed';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration 006 completed successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE '   - Roles table: % record(s) with requester', v_roles_count;
    RAISE NOTICE '   - User roles table: % record(s) with requester', v_user_roles_count;
    RAISE NOTICE '   - Scope assignments table: % record(s) with requester_allowed', v_scope_count;
    RAISE NOTICE '';
    
    -- ตรวจสอบว่ายังมี 'marketing' เหลืออยู่ไหม (เฉพาะ tables ที่มีอยู่)
    IF v_has_roles THEN
        IF EXISTS (SELECT 1 FROM roles WHERE name = 'marketing') THEN
            RAISE WARNING '⚠️  Found remaining "marketing" role in roles table';
        END IF;
    END IF;
    
    IF v_has_user_roles THEN
        IF EXISTS (SELECT 1 FROM user_roles WHERE role_name = 'marketing') THEN
            RAISE WARNING '⚠️  Found remaining "marketing" role in user_roles table';
        END IF;
    END IF;
    
    IF v_has_scope THEN
        IF EXISTS (SELECT 1 FROM user_scope_assignments WHERE role_type = 'marketing_allowed') THEN
            RAISE WARNING '⚠️  Found remaining "marketing_allowed" in user_scope_assignments table';
        END IF;
    END IF;
END $$;

-- ========================================
-- ROLLBACK SCRIPT (if needed)
-- ========================================
-- To rollback this migration, run the following:
/*
-- Rollback roles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        UPDATE roles 
        SET 
            name = 'marketing',
            display_name = 'Marketing (Requester)',
            description = 'เปิดงาน DJ, แก้ brief, แนบไฟล์',
            updated_at = NOW()
        WHERE name = 'requester';
        RAISE NOTICE '✅ Rolled back roles table';
    END IF;
END $$;

-- Rollback user_roles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        UPDATE user_roles 
        SET 
            role_name = 'marketing',
            updated_at = NOW()
        WHERE role_name = 'requester';
        RAISE NOTICE '✅ Rolled back user_roles table';
    END IF;
END $$;

-- Rollback user_scope_assignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scope_assignments') THEN
        UPDATE user_scope_assignments 
        SET 
            role_type = 'marketing_allowed',
            updated_at = NOW()
        WHERE role_type = 'requester_allowed';
        RAISE NOTICE '✅ Rolled back user_scope_assignments table';
    END IF;
END $$;

-- Rollback comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        COMMENT ON COLUMN user_roles.role_name IS 'ชื่อบทบาท: admin, marketing, approver, assignee';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_scope_assignments') THEN
        COMMENT ON COLUMN user_scope_assignments.role_type IS 'ประเภท Role สำหรับ Scope นี้ (marketing_allowed, assignee_assigned, etc.)';
        COMMENT ON TABLE user_scope_assignments IS 'เก็บการกำหนด Scope/Project ให้ User (เช่น Marketing สร้าง DJ ได้ โครงการไหนบ้าง)';
    END IF;
    
    RAISE NOTICE '✅ Migration 006 rolled back successfully';
END $$;
*/
