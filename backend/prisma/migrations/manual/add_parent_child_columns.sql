-- Manual Migration for Parent-Child Jobs
-- Based on schema.prisma changes

-- 1. Add is_parent column (Boolean, default false)
ALTER TABLE "jobs" 
ADD COLUMN IF NOT EXISTS "is_parent" BOOLEAN NOT NULL DEFAULT false;

-- 2. Add parent_job_id column (Integer, Nullable)
ALTER TABLE "jobs" 
ADD COLUMN IF NOT EXISTS "parent_job_id" INTEGER;

-- 3. Add Foreign Key Constraint (Self-relation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jobs_parent_job_id_fkey'
    ) THEN
        ALTER TABLE "jobs" 
        ADD CONSTRAINT "jobs_parent_job_id_fkey" 
        FOREIGN KEY ("parent_job_id") 
        REFERENCES "jobs"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create Index on parent_job_id (Optional but recommended)
CREATE INDEX IF NOT EXISTS "jobs_parent_job_id_idx" ON "jobs"("parent_job_id");
