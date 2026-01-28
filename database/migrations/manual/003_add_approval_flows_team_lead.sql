/**
 * Manual Migration 3: Add Team Lead columns to approval_flows
 * Run this in Supabase SQL Editor AFTER 002_add_users_department.sql
 */

-- Add include_team_lead column
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS include_team_lead BOOLEAN DEFAULT FALSE;

-- Add team_lead_id column
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS team_lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_flows_team_lead_id ON approval_flows(team_lead_id);

-- Add comments
COMMENT ON COLUMN approval_flows.include_team_lead IS 'If TRUE, auto-assign to Team Lead after final approval';
COMMENT ON COLUMN approval_flows.team_lead_id IS 'Explicit team lead user ID for auto-assignment';

-- Verify columns added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'approval_flows'
AND column_name IN ('include_team_lead', 'team_lead_id')
ORDER BY column_name;
