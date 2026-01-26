-- ========================================
-- Migration 004: Soft Delete Implementation
-- Purpose: Add deleted_at column and soft delete functions
-- Date: 2026-01-26
-- ========================================

-- 1. Add deleted_at column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

-- 2. Add deleted_at column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);

-- 3. Add deleted_at to job_attachments (ถ้ามี table นี้)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        ALTER TABLE job_attachments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
        ALTER TABLE job_attachments ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);
        CREATE INDEX IF NOT EXISTS idx_job_attachments_deleted_at ON job_attachments(deleted_at);
    END IF;
END $$;

-- 4. Add deleted_at to job_comments (ถ้ามี table นี้)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        ALTER TABLE job_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
        ALTER TABLE job_comments ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);
        CREATE INDEX IF NOT EXISTS idx_job_comments_deleted_at ON job_comments(deleted_at);
    END IF;
END $$;

-- 5. Create indexes for deleted_at columns (core tables)
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- ========================================
-- Soft Delete Functions
-- ========================================

-- Function: Soft delete a job
CREATE OR REPLACE FUNCTION soft_delete_job(
    p_job_id INTEGER,
    p_deleted_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if job exists and not already deleted
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Job not found or already deleted';
    END IF;
    
    -- Soft delete the job
    UPDATE jobs 
    SET 
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Soft delete related attachments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        UPDATE job_attachments 
        SET 
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE job_id = p_job_id AND deleted_at IS NULL;
    END IF;
    
    -- Soft delete related comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        UPDATE job_comments 
        SET 
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE job_id = p_job_id AND deleted_at IS NULL;
    END IF;
    
    -- Log activity (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_activities') THEN
        INSERT INTO job_activities (tenant_id, job_id, user_id, activity_type, description, metadata, created_at)
        SELECT tenant_id, p_job_id, p_deleted_by, 'deleted', 'Job was deleted', '{"soft_delete": true}'::jsonb, NOW()
        FROM jobs WHERE id = p_job_id;
    END IF;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'job_id', p_job_id,
        'deleted_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Function: Restore a soft-deleted job
CREATE OR REPLACE FUNCTION restore_deleted_job(
    p_job_id INTEGER,
    p_restored_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if job exists and is deleted
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND deleted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Job not found or not deleted';
    END IF;
    
    -- Restore the job
    UPDATE jobs 
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Restore related attachments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        UPDATE job_attachments 
        SET 
            deleted_at = NULL,
            deleted_by = NULL
        WHERE job_id = p_job_id AND deleted_at IS NOT NULL;
    END IF;
    
    -- Restore related comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        UPDATE job_comments 
        SET 
            deleted_at = NULL,
            deleted_by = NULL
        WHERE job_id = p_job_id AND deleted_at IS NOT NULL;
    END IF;
    
    -- Log activity (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_activities') THEN
        INSERT INTO job_activities (tenant_id, job_id, user_id, activity_type, description, metadata, created_at)
        SELECT tenant_id, p_job_id, p_restored_by, 'restored', 'Job was restored', '{"restored": true}'::jsonb, NOW()
        FROM jobs WHERE id = p_job_id;
    END IF;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'job_id', p_job_id,
        'restored_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Function: Soft delete a user
CREATE OR REPLACE FUNCTION soft_delete_user(
    p_user_id INTEGER,
    p_deleted_by INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if user exists and not already deleted
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'User not found or already deleted';
    END IF;
    
    -- Soft delete the user
    UPDATE users 
    SET 
        deleted_at = NOW(),
        deleted_by = p_deleted_by,
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Deactivate user roles
    UPDATE user_roles 
    SET is_active = FALSE
    WHERE user_id = p_user_id;
    
    -- Deactivate user scope assignments
    UPDATE user_scope_assignments 
    SET is_active = FALSE
    WHERE user_id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'deleted_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Function: Permanently delete old soft-deleted records (for cleanup)
CREATE OR REPLACE FUNCTION cleanup_deleted_records(
    p_days_old INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_jobs_deleted INTEGER := 0;
    v_users_deleted INTEGER := 0;
    v_attachments_deleted INTEGER := 0;
    v_comments_deleted INTEGER := 0;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := NOW() - (p_days_old || ' days')::INTERVAL;
    
    -- Delete old job attachments first (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_attachments') THEN
        DELETE FROM job_attachments 
        WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
        GET DIAGNOSTICS v_attachments_deleted = ROW_COUNT;
    END IF;
    
    -- Delete old job comments (ถ้ามี table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_comments') THEN
        DELETE FROM job_comments 
        WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
        GET DIAGNOSTICS v_comments_deleted = ROW_COUNT;
    END IF;
    
    -- Delete old jobs
    DELETE FROM jobs 
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
    GET DIAGNOSTICS v_jobs_deleted = ROW_COUNT;
    
    -- Delete old users
    DELETE FROM users 
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff_date;
    GET DIAGNOSTICS v_users_deleted = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'cutoff_date', v_cutoff_date,
        'jobs_deleted', v_jobs_deleted,
        'users_deleted', v_users_deleted,
        'attachments_deleted', v_attachments_deleted,
        'comments_deleted', v_comments_deleted
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION soft_delete_job(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_job(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_deleted_records(INTEGER) TO service_role;

-- Comments
COMMENT ON FUNCTION soft_delete_job IS 'Soft delete a job and its related data';
COMMENT ON FUNCTION restore_deleted_job IS 'Restore a soft-deleted job and its related data';
COMMENT ON FUNCTION soft_delete_user IS 'Soft delete a user and deactivate their roles/scopes';
COMMENT ON FUNCTION cleanup_deleted_records IS 'Permanently delete soft-deleted records older than specified days';

-- ========================================
-- Views for Active Records Only
-- ========================================

-- View: Active jobs only
CREATE OR REPLACE VIEW v_active_jobs AS
SELECT * FROM jobs WHERE deleted_at IS NULL;

-- View: Active users only
CREATE OR REPLACE VIEW v_active_users AS
SELECT * FROM users WHERE deleted_at IS NULL AND is_active = TRUE;

-- Grant view permissions
GRANT SELECT ON v_active_jobs TO authenticated;
GRANT SELECT ON v_active_users TO authenticated;
