/**
 * Manual Migration 4: Add assigned_at to design_jobs
 * Run this in Supabase SQL Editor AFTER 003_add_approval_flows_team_lead.sql
 */

-- Add assigned_at column
ALTER TABLE design_jobs
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Add comment
COMMENT ON COLUMN design_jobs.assigned_at IS 'Timestamp when job was assigned to assignee_id';

-- Verify column added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'design_jobs'
AND column_name = 'assigned_at';
