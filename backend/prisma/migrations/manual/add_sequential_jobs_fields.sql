-- Add predecessor_id for Job Dependency (Self-Relation)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS predecessor_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL;

-- Add sla_days to store OG SLA duration (for recalculation)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sla_days INTEGER DEFAULT 0;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_predecessor_id ON jobs(predecessor_id);

-- Optional: New Status 'pending_dependency' is just a string, no schema change needed if using VARCHAR
-- But good to comment: 'pending_dependency' added to logic
