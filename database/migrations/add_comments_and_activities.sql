-- Migration: Create job_comments and job_activities tables
-- Date: 2026-02-05

-- 1. Create job_activities table
CREATE TABLE IF NOT EXISTS public.job_activities (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    user_id INTEGER,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT job_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT job_activities_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT job_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Create job_comments table
CREATE TABLE IF NOT EXISTS public.job_comments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    mentions JSONB,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT job_comments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT job_comments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT job_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Create Indexes (Performance)
CREATE INDEX IF NOT EXISTS job_activities_job_id_idx ON public.job_activities(job_id);
CREATE INDEX IF NOT EXISTS job_activities_created_at_idx ON public.job_activities(created_at);
CREATE INDEX IF NOT EXISTS job_comments_job_id_idx ON public.job_comments(job_id);
CREATE INDEX IF NOT EXISTS job_comments_created_at_idx ON public.job_comments(created_at);

-- 4. Enable RLS
ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Simple tenant isolation)
-- Job Activities
CREATE POLICY "Tenant Isolation Policy" ON public.job_activities
    USING (tenant_id = (current_setting('app.tenant_id'::text, true))::integer);

-- Job Comments
CREATE POLICY "Tenant Isolation Policy" ON public.job_comments
    USING (tenant_id = (current_setting('app.tenant_id'::text, true))::integer);
