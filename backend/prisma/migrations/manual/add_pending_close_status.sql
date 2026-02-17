-- Add pending_close status to JobStatus enum
-- This migration adds the intermediate 'pending_close' status in the job workflow
-- allowing Requesters to confirm or request revisions before final job completion

-- For PostgreSQL ENUM types:
-- Add the new enum value before 'completed'
ALTER TYPE "JobStatus" ADD VALUE 'pending_close' BEFORE 'completed';

-- Note: If this fails with "BEFORE value not found", use:
-- ALTER TYPE "JobStatus" ADD VALUE 'pending_close';
-- And manually update the enum order in the schema later

-- Verify the new enum value was added
-- SELECT enum_range(NULL::"JobStatus");
