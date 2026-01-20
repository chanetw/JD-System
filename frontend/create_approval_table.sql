
-- ⚠️ IMPORTANT: Please check that you are in the correct Supabase Project
-- Your Project URL reference is: putfusjtlzmvjmcwkefv

-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.approval_flows (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id),
    job_type_id INTEGER REFERENCES public.job_types(id), 
    level INTEGER NOT NULL,
    approver_id INTEGER REFERENCES public.users(id),
    role VARCHAR(50), 
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.approval_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.approval_flows FOR ALL USING (true);
