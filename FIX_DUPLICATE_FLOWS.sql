-- ============================================
-- FIX: Duplicate Approval Flows
-- Problem: Multiple active flows for same (project, job_type) combination
-- ============================================

-- 1. CHECK: Find duplicates
SELECT
    project_id,
    job_type_id,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as ids,
    STRING_AGG(name, ' | ') as names
FROM approval_flows
WHERE is_active = TRUE
GROUP BY project_id, job_type_id
HAVING COUNT(*) > 1
ORDER BY project_id, job_type_id;

-- 2. DEACTIVATE: Keep newest, deactivate older ones
-- (Run after reviewing the CHECK results above)

-- For each duplicate group, keep the one with latest updated_at
WITH duplicates AS (
    SELECT
        project_id,
        job_type_id,
        id,
        ROW_NUMBER() OVER (PARTITION BY project_id, job_type_id ORDER BY updated_at DESC) as rn
    FROM approval_flows
    WHERE is_active = TRUE
    GROUP BY project_id, job_type_id, id, updated_at
    HAVING COUNT(*) OVER (PARTITION BY project_id, job_type_id) > 1
)
UPDATE approval_flows
SET is_active = FALSE,
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 3. VERIFY: Check no more duplicates
SELECT
    project_id,
    job_type_id,
    COUNT(*) as active_count
FROM approval_flows
WHERE is_active = TRUE
GROUP BY project_id, job_type_id
HAVING COUNT(*) > 1;

-- Expected: No rows returned (means duplicates fixed!)

-- 4. INFO: Show deactivated flows
SELECT
    id,
    project_id,
    job_type_id,
    name,
    is_active,
    updated_at
FROM approval_flows
WHERE is_active = FALSE
ORDER BY project_id, updated_at DESC;
