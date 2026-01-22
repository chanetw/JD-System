-- Migration Script for Urgent Priority & SLA Shift Requirement
-- Run this in Supabase SQL Editor

-- 1. เพิ่ม Columns ใน jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS original_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shifted_by_job_id INTEGER REFERENCES jobs(id);

COMMENT ON COLUMN jobs.priority IS 'Priority of the job: Low, Normal, Urgent';
COMMENT ON COLUMN jobs.original_due_date IS 'Original due date before being shifted by urgent jobs';
COMMENT ON COLUMN jobs.shifted_by_job_id IS 'ID of the urgent job that caused this job to shift';

-- 2. สร้างตาราง SLA Shift Logs (เก็บประวัติการเลื่อน)
CREATE TABLE IF NOT EXISTS sla_shift_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    urgent_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    original_due_date TIMESTAMP WITH TIME ZONE,
    new_due_date TIMESTAMP WITH TIME ZONE,
    shift_days INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_assignee_status ON jobs(assignee_id, status);
