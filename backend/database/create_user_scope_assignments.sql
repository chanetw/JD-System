CREATE TABLE IF NOT EXISTS user_scope_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role_type VARCHAR(100) NOT NULL,
    scope_level VARCHAR(50) NOT NULL,
    scope_id INTEGER,
    scope_name VARCHAR(255),
    assigned_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_scope_user_id ON user_scope_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scope_tenant_id ON user_scope_assignments(tenant_id);
