/**
 * Database Diagnostic Query
 * Run this first to see what tables exist in your Supabase database
 */

-- List all tables in your database
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check specifically for job-related tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%job%'
ORDER BY table_name;

-- Check if design_jobs table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'design_jobs' AND table_schema = 'public'
    ) THEN '✅ design_jobs table exists'
    ELSE '❌ design_jobs table NOT found'
  END as design_jobs_status;

-- Show columns in design_jobs if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_jobs' AND table_schema = 'public') THEN
        RAISE NOTICE '=== design_jobs table columns ===';
        
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'design_jobs'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
    ELSE
        RAISE NOTICE 'design_jobs table not found';
    END IF;
END $$;