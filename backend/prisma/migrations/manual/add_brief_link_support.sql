-- Migration: Add Brief Link and Files Support to Job
-- Purpose: Support Google Drive links and file attachments in job brief
-- Date: 2026-02-05

-- Add brief_link column for storing Google Drive links
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS brief_link VARCHAR(1000) DEFAULT NULL;

-- Add brief_files column for storing file attachment metadata as JSON
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS brief_files JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance on jobs with brief links
CREATE INDEX IF NOT EXISTS idx_jobs_brief_link ON jobs(brief_link)
WHERE brief_link IS NOT NULL;

-- Add comment to explain the new fields
COMMENT ON COLUMN jobs.brief_link IS 'Link to external brief document (e.g., Google Drive link)';
COMMENT ON COLUMN jobs.brief_files IS 'JSON array of file attachments with metadata {name, url, uploadedAt}';
