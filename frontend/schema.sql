
-- ==========================================
-- DJ System Database Schema (PostgreSQL)
-- ==========================================

-- 1. Tenants (บริษัท)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    subdomain VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Business Units (ฝ่าย)
CREATE TABLE IF NOT EXISTS buds (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Departments (แผนก)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    bud_id INTEGER REFERENCES buds(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    manager_id INTEGER, -- FK to users (will add constraint later)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Projects (โครงการ)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    bud_id INTEGER REFERENCES buds(id),
    department_id INTEGER REFERENCES departments(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Users (ผู้ใช้งาน - Public Profile)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- We use Serial for migration compatibility, plan to migrate to UUID later
    tenant_id INTEGER REFERENCES tenants(id),
    department_id INTEGER REFERENCES departments(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    role VARCHAR(50), -- marketing, approver, assignee, admin
    phone_number VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Circular FK Constraint
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_manager;
ALTER TABLE departments ADD CONSTRAINT fk_manager FOREIGN KEY (manager_id) REFERENCES users(id);

-- 6. Job Types (ประเภทงาน)
CREATE TABLE IF NOT EXISTS job_types (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sla_days INTEGER DEFAULT 3,
    icon VARCHAR(50),
    color_theme VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- 7. Job Type Items (ชิ้นงานย่อย Master)
CREATE TABLE IF NOT EXISTS job_type_items (
    id SERIAL PRIMARY KEY,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    default_size VARCHAR(100),
    is_required BOOLEAN DEFAULT false
);

-- 8. Jobs (ใบงานหลัก)
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    project_id INTEGER REFERENCES projects(id),
    job_type_id INTEGER REFERENCES job_types(id),
    
    -- Design Brief
    dj_id VARCHAR(50) UNIQUE, -- Auto-generated
    subject VARCHAR(255) NOT NULL,
    objective TEXT,
    description TEXT,
    headline VARCHAR(255),
    sub_headline VARCHAR(255),
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- People
    requester_id INTEGER REFERENCES users(id),
    assignee_id INTEGER REFERENCES users(id),
    
    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    close_requested_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Meta
    close_requested_by INTEGER REFERENCES users(id),
    closed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Design Job Items (ชิ้นงานย่อย Transaction)
CREATE TABLE IF NOT EXISTS design_job_items (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    job_type_item_id INTEGER REFERENCES job_type_items(id),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT
);

-- 10. Activity Logs (ประวัติ/Timeline)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50),
    message TEXT,
    detail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Security (Row Level Security)
-- ==========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE buds ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Default Policy: Allow All Access for Anon (Development Phase ONLY)
-- Warning: REMOVE THIS when implementing Real Auth
CREATE POLICY "Public Access" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access" ON buds FOR ALL USING (true);
CREATE POLICY "Public Access" ON departments FOR ALL USING (true);
CREATE POLICY "Public Access" ON projects FOR ALL USING (true);
CREATE POLICY "Public Access" ON users FOR ALL USING (true);
CREATE POLICY "Public Access" ON job_types FOR ALL USING (true);
CREATE POLICY "Public Access" ON job_type_items FOR ALL USING (true);
CREATE POLICY "Public Access" ON jobs FOR ALL USING (true);
CREATE POLICY "Public Access" ON design_job_items FOR ALL USING (true);
CREATE POLICY "Public Access" ON activity_logs FOR ALL USING (true);

-- ==========================================
-- Automation (Triggers & Functions)
-- ==========================================

-- 1. Auto Generate DJ ID (DJ-YYYY-XXXX)
CREATE SEQUENCE IF NOT EXISTS dj_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_dj_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dj_id IS NULL THEN
    NEW.dj_id := 'DJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('dj_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dj_id ON jobs;
CREATE TRIGGER set_dj_id
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE PROCEDURE generate_dj_id();
