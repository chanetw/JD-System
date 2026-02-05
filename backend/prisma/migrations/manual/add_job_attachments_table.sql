-- Migration: Create job_attachments table
-- Date: 2026-02-05

CREATE TABLE IF NOT EXISTS public.job_attachments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    attachment_type VARCHAR(100),
    uploaded_by INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_job_attachments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_attachments_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
