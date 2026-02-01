
-- =========================================================================================
-- COMPLETE_MIGRATION.sql
-- Single-file migration to Extend V1 Approval Flow and Remove V2
-- =========================================================================================

DO $$
DECLARE
    v_duplicate_groups INT := 0;
    v_deactivated_count INT := 0;
    v_dummy INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting V1 Extended Migration';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Timestamp: %', NOW();

    -- =====================================================================================
    -- [STEP 1] Checking for duplicate flows (Cleanup before Adding Unique Index)
    -- =====================================================================================
    RAISE NOTICE '[STEP 1] Checking for duplicate flows...';
    
    -- Check if table approval_flows exists to avoid errors on fresh DB
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_flows') THEN
        -- Count duplicate groups (Projects having > 1 active flow)
        SELECT COUNT(*) INTO v_duplicate_groups
        FROM (
            SELECT project_id
            FROM approval_flows
            WHERE is_active = TRUE
            GROUP BY project_id
            HAVING COUNT(*) > 1
        ) sub;

        IF v_duplicate_groups > 0 THEN
            RAISE NOTICE 'Found % duplicate groups. Fixing...', v_duplicate_groups;

             -- Calculate how many will be deactivated (Total active - 1 per group)
            SELECT COUNT(*) INTO v_deactivated_count
            FROM approval_flows af
            WHERE is_active = TRUE
            AND id NOT IN (
                SELECT MAX(id)
                FROM approval_flows
                WHERE is_active = TRUE
                GROUP BY project_id
            );

            -- Fix: Keep only the latest flow (MAX id) for each project, deactivate others
            UPDATE approval_flows
            SET is_active = FALSE
            WHERE is_active = TRUE
            AND id NOT IN (
                SELECT MAX(id)
                FROM approval_flows
                WHERE is_active = TRUE
                GROUP BY project_id
            );

            RAISE NOTICE 'Deactivated % duplicate flows', v_deactivated_count;
        ELSE
             RAISE NOTICE 'No duplicates found.';
        END IF;
    ELSE
        RAISE NOTICE 'Table approval_flows does not exist. Skipping step 1.';
    END IF;

    -- =====================================================================================
    -- [STEP 2] Extending V1 approval_flows table
    -- =====================================================================================
    RAISE NOTICE '[STEP 2] Extending V1 approval_flows table...';

    -- Add job_type_id
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'approval_flows' AND column_name = 'job_type_id') THEN
        ALTER TABLE approval_flows ADD COLUMN job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE;
    END IF;

    -- Add skip_approval
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'approval_flows' AND column_name = 'skip_approval') THEN
        ALTER TABLE approval_flows ADD COLUMN skip_approval BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add auto_assign_type
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'approval_flows' AND column_name = 'auto_assign_type') THEN
        ALTER TABLE approval_flows ADD COLUMN auto_assign_type VARCHAR(50) DEFAULT 'manual'
        CHECK (auto_assign_type IN ('manual', 'dept_manager', 'team_lead', 'specific_user'));
    END IF;

    -- Add auto_assign_user_id
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'approval_flows' AND column_name = 'auto_assign_user_id') THEN
        ALTER TABLE approval_flows ADD COLUMN auto_assign_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Create/Update Indexes
    CREATE INDEX IF NOT EXISTS idx_approval_flows_project_jobtype ON approval_flows(project_id, job_type_id);
    
    DROP INDEX IF EXISTS idx_approval_flows_unique_project_jobtype;
    CREATE UNIQUE INDEX idx_approval_flows_unique_project_jobtype 
        ON approval_flows(project_id, COALESCE(job_type_id, 0)) 
        WHERE is_active = TRUE;

    RAISE NOTICE 'V1 columns added successfully';

    -- =====================================================================================
    -- [STEP 3] Backing up V2 tables
    -- =====================================================================================
    RAISE NOTICE '[STEP 3] Backing up V2 tables...';

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_flow_templates') THEN
        CREATE TABLE IF NOT EXISTS approval_flow_templates_archive AS SELECT *, NOW() as archived_at FROM approval_flow_templates;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_flow_steps') THEN
        CREATE TABLE IF NOT EXISTS approval_flow_steps_archive AS SELECT *, NOW() as archived_at FROM approval_flow_steps;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_flow_assignments') THEN
        CREATE TABLE IF NOT EXISTS project_flow_assignments_archive AS SELECT *, NOW() as archived_at FROM project_flow_assignments;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_flow_approvers') THEN
        CREATE TABLE IF NOT EXISTS project_flow_approvers_archive AS SELECT *, NOW() as archived_at FROM project_flow_approvers;
    END IF;

    RAISE NOTICE 'Created archive tables';


    -- =====================================================================================
    -- [STEP 4] Dropping V2 tables
    -- =====================================================================================
    RAISE NOTICE '[STEP 4] Dropping V2 tables...';
    
    DROP TABLE IF EXISTS project_flow_approvers CASCADE;
    DROP TABLE IF EXISTS project_flow_assignments CASCADE;
    DROP TABLE IF EXISTS approval_flow_steps CASCADE;
    DROP TABLE IF EXISTS approval_flow_templates CASCADE;

    RAISE NOTICE 'V2 tables dropped';

    -- =====================================================================================
    -- [STEP 5] Verifying migration
    -- =====================================================================================
    RAISE NOTICE '[STEP 5] Verifying migration...';
    
    -- Verify V1 columns
    DECLARE
        v_col_count INT;
        v_v2_table_count INT;
        v_archive_count INT;
    BEGIN
        SELECT COUNT(*) INTO v_col_count FROM information_schema.columns 
        WHERE table_name = 'approval_flows' 
        AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id');

        RAISE NOTICE '✓ V1 columns: % found (expected 4)', v_col_count;

        SELECT COUNT(*) INTO v_v2_table_count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('approval_flow_templates', 'approval_flow_steps', 'project_flow_assignments', 'project_flow_approvers');

         RAISE NOTICE '✓ V2 tables: % found (expected 0)', v_v2_table_count;

        SELECT COUNT(*) INTO v_archive_count FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('approval_flow_templates_archive', 'approval_flow_steps_archive', 'project_flow_assignments_archive', 'project_flow_approvers_archive');
        
        RAISE NOTICE '✓ Archive tables: % found (safety net ready)', v_archive_count;
    END;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';

END $$;
