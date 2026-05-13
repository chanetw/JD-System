-- Migration: Ensure job_deliverables table exists before deploying deliverable sync.
-- Safe to run on environments where the table already exists.
-- If preflight reports missing columns on an existing table, stop and inspect manually.

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_deliverables (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by INTEGER NOT NULL REFERENCES public.users(id),
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_deliverables_tenant_id
  ON public.job_deliverables(tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_deliverables_job_id
  ON public.job_deliverables(job_id);

CREATE INDEX IF NOT EXISTS idx_job_deliverables_version
  ON public.job_deliverables(version);

COMMIT;
