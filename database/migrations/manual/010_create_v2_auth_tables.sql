-- =============================================================================
-- V2 Authentication System Tables
-- Clean-room implementation separate from existing auth system
-- =============================================================================

-- V2 Organizations Table
-- Organizations are nested under tenants for multi-tenancy support
CREATE TABLE IF NOT EXISTS v2_organizations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Create indexes for v2_organizations
CREATE INDEX IF NOT EXISTS idx_v2_organizations_tenant_id ON v2_organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_v2_organizations_slug ON v2_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_v2_organizations_is_active ON v2_organizations(is_active);

-- V2 Roles Table (RBAC)
-- Predefined roles with JSON permissions
CREATE TABLE IF NOT EXISTS v2_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- V2 Users Table
-- Users belong to an organization and have a role
CREATE TABLE IF NOT EXISTS v2_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES v2_organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES v2_roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Create indexes for v2_users
CREATE INDEX IF NOT EXISTS idx_v2_users_tenant_id ON v2_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_v2_users_organization_id ON v2_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_v2_users_role_id ON v2_users(role_id);
CREATE INDEX IF NOT EXISTS idx_v2_users_email ON v2_users(email);
CREATE INDEX IF NOT EXISTS idx_v2_users_is_active ON v2_users(is_active);

-- V2 Password Reset Tokens Table
-- Secure token-based password reset with expiry
CREATE TABLE IF NOT EXISTS v2_password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for v2_password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_v2_password_reset_tokens_user_id ON v2_password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_v2_password_reset_tokens_token ON v2_password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_v2_password_reset_tokens_expires_at ON v2_password_reset_tokens(expires_at);

-- =============================================================================
-- Seed Default Roles with RBAC Permissions
-- =============================================================================

INSERT INTO v2_roles (name, display_name, permissions, description) VALUES
(
    'SuperAdmin',
    'Super Administrator',
    '{
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "organizations": {"create": true, "read": true, "update": true, "delete": true},
        "jobs": {"create": true, "read": true, "update": true, "delete": true, "approve": true},
        "reports": {"view": true, "export": true},
        "settings": {"manage": true}
    }',
    'System-wide access to all resources and settings'
),
(
    'OrgAdmin',
    'Organization Admin',
    '{
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "organizations": {"create": false, "read": true, "update": true, "delete": false},
        "jobs": {"create": true, "read": true, "update": true, "delete": true, "approve": true},
        "reports": {"view": true, "export": true},
        "settings": {"manage": false}
    }',
    'Organization-level admin with full access within their organization'
),
(
    'TeamLead',
    'Team Lead',
    '{
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "organizations": {"create": false, "read": true, "update": false, "delete": false},
        "jobs": {"create": true, "read": true, "update": true, "delete": false, "approve": false},
        "reports": {"view": true, "export": false},
        "settings": {"manage": false}
    }',
    'Team lead with access to view team members and manage team jobs'
),
(
    'Member',
    'Member',
    '{
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "organizations": {"create": false, "read": true, "update": false, "delete": false},
        "jobs": {"create": true, "read": true, "update": true, "delete": false, "approve": false},
        "reports": {"view": false, "export": false},
        "settings": {"manage": false}
    }',
    'Basic member with access to create and manage own jobs'
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================================================
-- Create Updated At Trigger Function (if not exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION v2_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to v2 tables
DROP TRIGGER IF EXISTS v2_organizations_updated_at ON v2_organizations;
CREATE TRIGGER v2_organizations_updated_at
    BEFORE UPDATE ON v2_organizations
    FOR EACH ROW
    EXECUTE FUNCTION v2_update_updated_at_column();

DROP TRIGGER IF EXISTS v2_roles_updated_at ON v2_roles;
CREATE TRIGGER v2_roles_updated_at
    BEFORE UPDATE ON v2_roles
    FOR EACH ROW
    EXECUTE FUNCTION v2_update_updated_at_column();

DROP TRIGGER IF EXISTS v2_users_updated_at ON v2_users;
CREATE TRIGGER v2_users_updated_at
    BEFORE UPDATE ON v2_users
    FOR EACH ROW
    EXECUTE FUNCTION v2_update_updated_at_column();

-- =============================================================================
-- RLS Policies for V2 Tables (Optional - for Supabase)
-- =============================================================================

-- Enable RLS on v2 tables
ALTER TABLE v2_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy for v2_organizations: Tenant isolation
DROP POLICY IF EXISTS v2_organizations_tenant_isolation ON v2_organizations;
CREATE POLICY v2_organizations_tenant_isolation ON v2_organizations
    FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::INTEGER, tenant_id));

-- RLS Policy for v2_users: Tenant isolation
DROP POLICY IF EXISTS v2_users_tenant_isolation ON v2_users;
CREATE POLICY v2_users_tenant_isolation ON v2_users
    FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::INTEGER, tenant_id));

-- RLS Policy for v2_password_reset_tokens: User-based access
DROP POLICY IF EXISTS v2_password_reset_tokens_access ON v2_password_reset_tokens;
CREATE POLICY v2_password_reset_tokens_access ON v2_password_reset_tokens
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM v2_users
            WHERE tenant_id = COALESCE(current_setting('app.tenant_id', true)::INTEGER, tenant_id)
        )
    );

-- =============================================================================
-- Seed Sample Organization (for testing)
-- =============================================================================

-- Insert a sample organization for tenant_id = 1 (if tenant exists)
INSERT INTO v2_organizations (tenant_id, name, slug, settings, is_active)
SELECT 1, 'Default Organization', 'default-org', '{"theme": "light", "language": "th"}', true
WHERE EXISTS (SELECT 1 FROM tenants WHERE id = 1)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify roles are seeded
-- SELECT * FROM v2_roles ORDER BY id;

-- Verify tables are created
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'v2_%';
