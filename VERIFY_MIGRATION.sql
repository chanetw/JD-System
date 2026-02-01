-- VERIFY_MIGRATION.sql

-- [1/7] V1 Columns (Expected: 4 rows)
SELECT 'V1 Columns' as check_name, column_name
FROM information_schema.columns
WHERE table_name = 'approval_flows'
AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id')
ORDER BY column_name;

-- [2/7] V2 Tables (Expected: 0 rows)
SELECT 'V2 Tables' as check_name, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('approval_flow_templates', 'approval_flow_steps', 'project_flow_assignments', 'project_flow_approvers');

-- [3/7] Archive Tables (Expected: >= 4 rows)
SELECT 'Archive Tables' as check_name, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%_archive';

-- [4/7] Indexes (Expected: idx_approval_flows_project_jobtype, idx_approval_flows_unique_project_jobtype)
SELECT 'Indexes' as check_name, indexname
FROM pg_indexes
WHERE tablename = 'approval_flows'
AND indexname IN ('idx_approval_flows_project_jobtype', 'idx_approval_flows_unique_project_jobtype');

-- [5/7] Duplicates (Expected: 0 rows)
SELECT 'Duplicates' as check_name, project_id, COUNT(*)
FROM approval_flows
WHERE is_active = TRUE
GROUP BY project_id
HAVING COUNT(*) > 1;

-- [6/7] Active Flows (Expected: > 0)
SELECT 'Active Flows' as check_name, COUNT(*) as active_flows_count
FROM approval_flows
WHERE is_active = TRUE;

-- [7/7] Sample Data
SELECT 'Sample Data' as check_name, id, project_id, job_type_id, skip_approval, auto_assign_type, is_active
FROM approval_flows
LIMIT 5;
