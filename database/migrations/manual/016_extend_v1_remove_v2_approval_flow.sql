-- ============================================
-- Migration 016: Extend V1 Approval Flow + Remove V2
-- Date: 2026-01-31
-- Description:
--   1. Add job_type_id, skip_approval, auto_assign fields to approval_flows (V1)
--   2. Backup V2 tables to archive
--   3. Drop V2 tables
-- ============================================

-- ============================================
-- PART 1: Extend V1 approval_flows Table
-- ============================================

-- Add job_type_id column (nullable = default flow for all job types)
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE;

-- Add skip_approval column
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS skip_approval BOOLEAN DEFAULT FALSE;

-- Add auto_assign_type column
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS auto_assign_type VARCHAR(50) DEFAULT 'manual'
  CHECK (auto_assign_type IN ('manual', 'dept_manager', 'team_lead', 'specific_user'));

-- Add auto_assign_user_id column
ALTER TABLE approval_flows
ADD COLUMN IF NOT EXISTS auto_assign_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create composite index for fast lookup (project_id + job_type_id)
CREATE INDEX IF NOT EXISTS idx_approval_flows_project_jobtype
  ON approval_flows(project_id, job_type_id);

-- Create unique index: one active flow per (project, job_type) combination
-- Using COALESCE to handle NULL job_type_id (default flow)
DROP INDEX IF EXISTS idx_approval_flows_unique_project_jobtype;
CREATE UNIQUE INDEX idx_approval_flows_unique_project_jobtype
  ON approval_flows(project_id, COALESCE(job_type_id, 0))
  WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN approval_flows.job_type_id IS 'JobType ID (NULL = default flow for all job types in project)';
COMMENT ON COLUMN approval_flows.skip_approval IS 'If TRUE, skip all approval steps (requester -> assignee directly)';
COMMENT ON COLUMN approval_flows.auto_assign_type IS 'Auto-assign method when skip_approval=TRUE: manual, dept_manager, team_lead, specific_user';
COMMENT ON COLUMN approval_flows.auto_assign_user_id IS 'Specific user ID for auto-assignment (used when auto_assign_type=specific_user or team_lead)';

-- ============================================
-- PART 2: Backup V2 Tables (Safety Net)
-- ============================================

-- Backup approval_flow_templates
CREATE TABLE IF NOT EXISTS approval_flow_templates_archive AS
SELECT *, NOW() as archived_at FROM approval_flow_templates;

-- Backup approval_flow_steps
CREATE TABLE IF NOT EXISTS approval_flow_steps_archive AS
SELECT *, NOW() as archived_at FROM approval_flow_steps;

-- Backup project_flow_assignments
CREATE TABLE IF NOT EXISTS project_flow_assignments_archive AS
SELECT *, NOW() as archived_at FROM project_flow_assignments;

-- Backup project_flow_approvers
CREATE TABLE IF NOT EXISTS project_flow_approvers_archive AS
SELECT *, NOW() as archived_at FROM project_flow_approvers;

-- ============================================
-- PART 3: Drop V2 Tables
-- ============================================

-- Drop in correct order (child tables first due to foreign keys)
DROP TABLE IF EXISTS project_flow_approvers CASCADE;
DROP TABLE IF EXISTS project_flow_assignments CASCADE;
DROP TABLE IF EXISTS approval_flow_steps CASCADE;
DROP TABLE IF EXISTS approval_flow_templates CASCADE;

-- ============================================
-- PART 4: Verification
-- ============================================

-- Verify V1 columns added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'approval_flows'
AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id')
ORDER BY column_name;

-- Verify V2 tables dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('approval_flow_templates', 'approval_flow_steps', 'project_flow_assignments', 'project_flow_approvers');

-- Verify archive tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%_archive';

-- Show final approval_flows structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'approval_flows'
ORDER BY ordinal_position;
