-- Migration: add_bud_job_assignments
-- Created: 2026-02-11
-- Purpose: Add BUD-level assignment support for better scalability and management

-- ========================================
-- 1. Add priority column to existing project_job_assignments
-- ========================================
ALTER TABLE project_job_assignments
    ADD COLUMN IF NOT EXISTS priority INT DEFAULT 100;

COMMENT ON COLUMN project_job_assignments.priority IS 'Priority for conflict resolution: Project-level (100) > BUD-level (50)';

-- ========================================
-- 2. Create bud_job_assignments table
-- ========================================
CREATE TABLE IF NOT EXISTS bud_job_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bud_id INT NOT NULL REFERENCES buds(id) ON DELETE CASCADE,
    job_type_id INT NOT NULL REFERENCES job_types(id) ON DELETE CASCADE,
    assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    priority INT DEFAULT 50 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT unique_bud_job_assignment UNIQUE (tenant_id, bud_id, job_type_id)
);

-- ========================================
-- 3. Create indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_bud_assignments_bud
    ON bud_job_assignments(bud_id);

CREATE INDEX IF NOT EXISTS idx_bud_assignments_job_type
    ON bud_job_assignments(job_type_id);

CREATE INDEX IF NOT EXISTS idx_bud_assignments_assignee
    ON bud_job_assignments(assignee_id);

CREATE INDEX IF NOT EXISTS idx_bud_assignments_assignee_active
    ON bud_job_assignments(assignee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_bud_assignments_tenant
    ON bud_job_assignments(tenant_id);

-- ========================================
-- 4. Comments for documentation
-- ========================================
COMMENT ON TABLE bud_job_assignments IS 'BUD-level job assignments - covers all projects within a BUD automatically';
COMMENT ON COLUMN bud_job_assignments.priority IS 'Priority for conflict resolution: BUD-level (50) < Project-level (100)';
COMMENT ON COLUMN bud_job_assignments.is_active IS 'Soft delete flag - inactive assignments are not used for auto-assignment';

-- ========================================
-- 5. Helper function: Get assignee with priority
-- ========================================
-- This function returns the assignee for a given job, considering both BUD-level and Project-level assignments
-- Priority: Project-level (100) > BUD-level (50)

CREATE OR REPLACE FUNCTION get_job_assignee(
    p_project_id INT,
    p_job_type_id INT
) RETURNS TABLE (
    assignee_id INT,
    assignment_level VARCHAR(20),
    priority INT
) AS $$
BEGIN
    RETURN QUERY
    WITH relevant_assignments AS (
        -- Project-level assignments (priority 100)
        SELECT
            pja.assignee_id,
            'project'::VARCHAR(20) as assignment_level,
            pja.priority
        FROM project_job_assignments pja
        WHERE pja.project_id = p_project_id
          AND pja.job_type_id = p_job_type_id
          AND pja.is_active = true

        UNION ALL

        -- BUD-level assignments (priority 50)
        SELECT
            bja.assignee_id,
            'bud'::VARCHAR(20) as assignment_level,
            bja.priority
        FROM bud_job_assignments bja
        JOIN projects p ON p.bud_id = bja.bud_id
        WHERE p.id = p_project_id
          AND bja.job_type_id = p_job_type_id
          AND bja.is_active = true
    )
    SELECT
        ra.assignee_id,
        ra.assignment_level,
        ra.priority
    FROM relevant_assignments ra
    WHERE ra.assignee_id IS NOT NULL
    ORDER BY ra.priority DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_job_assignee(INT, INT) IS 'Returns the assignee for a job based on priority: Project-level > BUD-level';

-- ========================================
-- 6. Data validation query (run after migration)
-- ========================================
-- Use this query to verify the migration worked correctly

/*
-- Verify table exists
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'bud_job_assignments') as column_count
FROM information_schema.tables
WHERE table_name = 'bud_job_assignments';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bud_job_assignments'
ORDER BY indexname;

-- Verify priority column added
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_job_assignments'
  AND column_name = 'priority';

-- Test the helper function (example)
SELECT * FROM get_job_assignee(1, 1);
*/

-- ========================================
-- Expected Results:
-- ========================================
-- 1. bud_job_assignments table created with proper constraints
-- 2. All indexes created successfully
-- 3. priority column added to project_job_assignments (default 100)
-- 4. Helper function get_job_assignee() created
-- 5. Ready for BUD-level assignments!
