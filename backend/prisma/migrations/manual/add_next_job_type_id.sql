-- Add next_job_type_id column to job_types table for job chaining/sequencing
-- This allows setting up automatic job sequences where one job type leads to another

-- Add the column (nullable, self-referencing foreign key)
ALTER TABLE job_types
ADD COLUMN IF NOT EXISTS next_job_type_id INTEGER;

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE job_types
ADD CONSTRAINT fk_job_types_next_job_type
FOREIGN KEY (next_job_type_id)
REFERENCES job_types(id)
ON DELETE SET NULL;

-- Add index for performance when querying job chains
CREATE INDEX IF NOT EXISTS idx_job_types_next_job_type_id
ON job_types(next_job_type_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_types'
  AND column_name = 'next_job_type_id';
