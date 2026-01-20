-- ==========================================
-- ตารางกำหนดผู้รับงานอัตโนมัติ (Assignment Matrix)
-- Project + Job Type -> Assignee
-- ==========================================
-- วิธีใช้: คัดลอก SQL นี้ไปรันใน Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS project_job_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, job_type_id) -- 1 คู่ Project+JobType มี Assignee ได้คนเดียว
);

-- Comment อธิบายตาราง
COMMENT ON TABLE project_job_assignments IS 'ตารางเก็บการจับคู่ โครงการ+ประเภทงาน กับ ผู้รับงานเริ่มต้น';
COMMENT ON COLUMN project_job_assignments.project_id IS 'ID ของโครงการ';
COMMENT ON COLUMN project_job_assignments.job_type_id IS 'ID ของประเภทงาน';
COMMENT ON COLUMN project_job_assignments.assignee_id IS 'ID ของผู้รับงานเริ่มต้น';

-- RLS Policy (เปิดให้ทุกคนใช้งานได้ชั่วคราว - สำหรับ Development)
ALTER TABLE project_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for project_job_assignments" 
    ON project_job_assignments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
