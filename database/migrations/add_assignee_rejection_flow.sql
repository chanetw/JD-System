-- Migration: Add Assignee Rejection Flow
-- Description: เพิ่มฟิลด์สำหรับ Assignee ปฏิเสธงาน และ status ใหม่ assignee_rejected
-- Date: 2026-02-17

-- 1. Add new status value to jobs.status (VARCHAR, no enum to alter)
-- Note: jobs.status uses VARCHAR(50), not PostgreSQL ENUM, so no ALTER TYPE needed

-- 2. Add rejection tracking fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS rejected_by INT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejection_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_rejected_by ON jobs(rejected_by);
CREATE INDEX IF NOT EXISTS idx_jobs_rejection_source ON jobs(rejection_source);

-- 4. Add comment for documentation
COMMENT ON COLUMN jobs.rejected_by IS 'User ID who rejected the job (Assignee rejection flow)';
COMMENT ON COLUMN jobs.rejection_source IS 'Source of rejection: assignee, approver';
COMMENT ON COLUMN jobs.rejection_comment IS 'Reason/comment for rejection';
