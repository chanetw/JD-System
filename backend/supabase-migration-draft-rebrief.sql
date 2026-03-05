-- =====================================================
-- Migration: Add Draft Submit & Rebrief Fields
-- Date: 2025-01-09
-- Description: เพิ่ม fields สำหรับ Draft Submit และ Rebrief features
-- =====================================================

-- เพิ่ม Draft Submit fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS draft_files JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS draft_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draft_count INTEGER DEFAULT 0;

-- เพิ่ม Rebrief fields
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS rebrief_reason TEXT,
ADD COLUMN IF NOT EXISTS rebrief_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rebrief_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rebrief_response TEXT;

-- เพิ่ม comments สำหรับ documentation
COMMENT ON COLUMN jobs.draft_files IS 'Draft files/links submitted for review (JSON array)';
COMMENT ON COLUMN jobs.draft_submitted_at IS 'Timestamp of last draft submission';
COMMENT ON COLUMN jobs.draft_count IS 'Number of times draft has been submitted';
COMMENT ON COLUMN jobs.rebrief_reason IS 'Reason for requesting additional information from requester';
COMMENT ON COLUMN jobs.rebrief_count IS 'Number of times rebrief has been requested';
COMMENT ON COLUMN jobs.rebrief_at IS 'Timestamp of last rebrief request';
COMMENT ON COLUMN jobs.rebrief_response IS 'Response from requester with additional information';

-- เพิ่ม index สำหรับ performance (optional แต่แนะนำ)
CREATE INDEX IF NOT EXISTS idx_jobs_draft_submitted_at ON jobs(draft_submitted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_rebrief_at ON jobs(rebrief_at);

-- ตรวจสอบผลลัพธ์
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN (
    'draft_files', 
    'draft_submitted_at', 
    'draft_count',
    'rebrief_reason',
    'rebrief_count',
    'rebrief_at',
    'rebrief_response'
)
ORDER BY column_name;
