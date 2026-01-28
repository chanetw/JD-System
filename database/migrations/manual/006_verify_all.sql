/**
 * Manual Migration 6: Verification Queries
 * Run this in Supabase SQL Editor to verify all migrations succeeded
 */

-- Check 1: Verify departments table exists and has data
SELECT 
  'Departments Table' AS check_name,
  COUNT(*) as record_count
FROM departments;

-- Check 2: Verify users.department_id column exists
SELECT 
  'users.department_id' AS check_name,
  COUNT(*) as total_users,
  COUNT(department_id) as users_with_department
FROM users;

-- Check 3: Verify approval_flows new columns exist
SELECT 
  'approval_flows columns' AS check_name,
  COUNT(*) as total_flows,
  COUNT(include_team_lead) as has_include_team_lead,
  COUNT(team_lead_id) as has_team_lead_id
FROM approval_flows;

-- Check 4: Verify design_jobs.assigned_at column exists
SELECT 
  'design_jobs.assigned_at' AS check_name,
  COUNT(*) as total_jobs,
  COUNT(assigned_at) as jobs_with_assigned_at
FROM design_jobs;

-- Check 5: List all department details
SELECT 
  d.id,
  d.name,
  d.code,
  d.manager_id,
  u.display_name as manager_name,
  d.is_active
FROM departments d
LEFT JOIN users u ON d.manager_id = u.id
ORDER BY d.name;

-- Check 6: Verify indexes created
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('departments', 'users', 'approval_flows', 'design_jobs')
AND indexname LIKE '%department%' OR indexname LIKE '%team_lead%' OR indexname LIKE '%assigned%'
ORDER BY tablename, indexname;
