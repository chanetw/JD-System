-- ============================================
-- ROLLBACK Migration 016: Restore V2 + Remove V1 Extensions
-- Date: 2026-01-31
-- USE ONLY IN EMERGENCY!
-- ============================================

-- ============================================
-- PART 1: Restore V2 Tables from Archive
-- ============================================

-- Restore approval_flow_templates
CREATE TABLE IF NOT EXISTS approval_flow_templates AS
SELECT
  id, tenant_id, name, description, total_levels,
  auto_assign_type, auto_assign_user_id, is_active,
  created_at, updated_at
FROM approval_flow_templates_archive;

-- Re-add primary key and constraints
ALTER TABLE approval_flow_templates ADD PRIMARY KEY (id);
ALTER TABLE approval_flow_templates ADD CONSTRAINT fk_aft_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE approval_flow_templates ADD CONSTRAINT fk_aft_user
  FOREIGN KEY (auto_assign_user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_aft_tenant ON approval_flow_templates(tenant_id);

-- Restore approval_flow_steps
CREATE TABLE IF NOT EXISTS approval_flow_steps AS
SELECT
  id, template_id, level, name, approver_type,
  required_approvals, created_at
FROM approval_flow_steps_archive;

ALTER TABLE approval_flow_steps ADD PRIMARY KEY (id);
ALTER TABLE approval_flow_steps ADD CONSTRAINT fk_afs_template
  FOREIGN KEY (template_id) REFERENCES approval_flow_templates(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_afs_template ON approval_flow_steps(template_id);

-- Restore project_flow_assignments
CREATE TABLE IF NOT EXISTS project_flow_assignments AS
SELECT
  id, tenant_id, project_id, job_type_id, template_id,
  override_auto_assign, auto_assign_type, auto_assign_user_id,
  is_active, created_at
FROM project_flow_assignments_archive;

ALTER TABLE project_flow_assignments ADD PRIMARY KEY (id);
ALTER TABLE project_flow_assignments ADD CONSTRAINT fk_pfa_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE project_flow_assignments ADD CONSTRAINT fk_pfa_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE project_flow_assignments ADD CONSTRAINT fk_pfa_jobtype
  FOREIGN KEY (job_type_id) REFERENCES job_types(id) ON DELETE CASCADE;
ALTER TABLE project_flow_assignments ADD CONSTRAINT fk_pfa_template
  FOREIGN KEY (template_id) REFERENCES approval_flow_templates(id) ON DELETE CASCADE;
ALTER TABLE project_flow_assignments ADD CONSTRAINT fk_pfa_user
  FOREIGN KEY (auto_assign_user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfa_unique ON project_flow_assignments(project_id, COALESCE(job_type_id, 0));
CREATE INDEX IF NOT EXISTS idx_pfa_project ON project_flow_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pfa_jobtype ON project_flow_assignments(job_type_id);

-- Restore project_flow_approvers
CREATE TABLE IF NOT EXISTS project_flow_approvers AS
SELECT
  id, assignment_id, level, approver_id, is_active, created_at
FROM project_flow_approvers_archive;

ALTER TABLE project_flow_approvers ADD PRIMARY KEY (id);
ALTER TABLE project_flow_approvers ADD CONSTRAINT fk_pfap_assignment
  FOREIGN KEY (assignment_id) REFERENCES project_flow_assignments(id) ON DELETE CASCADE;
ALTER TABLE project_flow_approvers ADD CONSTRAINT fk_pfap_approver
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfap_unique ON project_flow_approvers(assignment_id, level, approver_id);
CREATE INDEX IF NOT EXISTS idx_pfap_assignment ON project_flow_approvers(assignment_id);

-- ============================================
-- PART 2: Remove V1 Extensions
-- ============================================

-- Drop unique index first
DROP INDEX IF EXISTS idx_approval_flows_unique_project_jobtype;
DROP INDEX IF EXISTS idx_approval_flows_project_jobtype;

-- Remove V1 extension columns
ALTER TABLE approval_flows DROP COLUMN IF EXISTS job_type_id;
ALTER TABLE approval_flows DROP COLUMN IF EXISTS skip_approval;
ALTER TABLE approval_flows DROP COLUMN IF EXISTS auto_assign_type;
ALTER TABLE approval_flows DROP COLUMN IF EXISTS auto_assign_user_id;

-- ============================================
-- PART 3: Verification
-- ============================================

-- Verify V2 tables restored
SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('approval_flow_templates', 'approval_flow_steps', 'project_flow_assignments', 'project_flow_approvers');

-- Verify V1 columns removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'approval_flows'
AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id');

-- This should return 0 rows if rollback successful

DO $$
BEGIN
  RAISE NOTICE 'ROLLBACK COMPLETE. V2 tables restored, V1 extensions removed.';
END $$;
