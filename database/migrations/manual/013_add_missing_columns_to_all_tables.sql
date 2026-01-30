-- =============================================================================
-- Add Missing Columns to Match Prisma Schema
-- =============================================================================
-- This migration syncs the database schema with the Prisma schema

-- ============= TENANTS TABLE =============
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#E11D48';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============= BUDS TABLE =============
ALTER TABLE buds ADD COLUMN IF NOT EXISTS description TEXT;

-- ============= PROJECTS TABLE =============
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id INTEGER;
-- Note: If adding FK constraint, ensure departments table exists first

-- ============= DEPARTMENTS TABLE =============
-- Create if doesn't exist
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bud_id INTEGER REFERENCES buds(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    manager_id INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_bud_id ON departments(bud_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);

-- ============= JOB TYPES TABLE =============
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS color_theme VARCHAR(50);
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- ============= JOBS TABLE =============
-- Make sure the table has all required columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS close_requested_by INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_by INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_approved_levels JSONB DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_files JSONB DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS headline VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sub_headline VARCHAR(255);

-- ============= MEDIA FILES TABLE =============
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(1000);
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- ============= HOLIDAYS TABLE =============
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- ============= AUDIT LOGS TABLE =============
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER,
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- ============= NOTIFICATIONS TABLE =============
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- ============= JOB TYPE ITEMS TABLE =============
CREATE TABLE IF NOT EXISTS job_type_items (
    id SERIAL PRIMARY KEY,
    job_type_id INTEGER NOT NULL REFERENCES job_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    default_size VARCHAR(100),
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_type_items_job_type_id ON job_type_items(job_type_id);

-- ============= DESIGN JOB ITEMS TABLE =============
CREATE TABLE IF NOT EXISTS design_job_items (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES design_jobs(id) ON DELETE CASCADE,
    job_type_item_id INTEGER REFERENCES job_type_items(id),
    name VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_design_job_items_job_id ON design_job_items(job_id);

-- ============= INDEXES FOR PERFORMANCE =============
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_buds_tenant_id ON buds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
