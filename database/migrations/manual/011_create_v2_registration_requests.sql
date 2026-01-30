-- =============================================================================
-- V2 Registration Requests Table
-- For managing pending user registration with admin approval
-- =============================================================================

-- Registration Request Status Enum
CREATE TYPE v2_registration_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- V2 Registration Requests Table
CREATE TABLE IF NOT EXISTS v2_registration_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES v2_organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    -- Status tracking
    status v2_registration_status DEFAULT 'PENDING' NOT NULL,

    -- Admin review information
    reviewed_by_id INTEGER REFERENCES v2_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Confirmation token for email verification (optional)
    confirmation_token VARCHAR(64),
    confirmation_token_expires_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Audit trail
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_v2_registration_requests_tenant_id
    ON v2_registration_requests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_v2_registration_requests_organization_id
    ON v2_registration_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_v2_registration_requests_status
    ON v2_registration_requests(status);

CREATE INDEX IF NOT EXISTS idx_v2_registration_requests_email
    ON v2_registration_requests(email);

CREATE INDEX IF NOT EXISTS idx_v2_registration_requests_created_at
    ON v2_registration_requests(created_at DESC);

-- Unique constraint: one pending request per email per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_registration_requests_unique_pending
    ON v2_registration_requests(tenant_id, organization_id, email)
    WHERE status = 'PENDING';

-- RLS Policies (if using Supabase)
ALTER TABLE v2_registration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy for registration requests: Tenant isolation
DROP POLICY IF EXISTS v2_registration_requests_tenant_isolation ON v2_registration_requests;
CREATE POLICY v2_registration_requests_tenant_isolation ON v2_registration_requests
    FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::INTEGER, tenant_id));

-- Create updated_at trigger function (if not already exists)
CREATE OR REPLACE FUNCTION v2_update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to v2_registration_requests
DROP TRIGGER IF EXISTS v2_registration_requests_updated_at ON v2_registration_requests;
CREATE TRIGGER v2_registration_requests_updated_at
    BEFORE UPDATE ON v2_registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION v2_update_registration_requests_updated_at();

-- =============================================================================
-- Audit Log Table for Registration Actions
-- =============================================================================

CREATE TABLE IF NOT EXISTS v2_registration_audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    registration_request_id INTEGER NOT NULL REFERENCES v2_registration_requests(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES v2_users(id) ON DELETE SET NULL,

    -- Action: SUBMITTED, APPROVED, REJECTED, EXPIRED
    action VARCHAR(50) NOT NULL,

    -- Change details
    old_status v2_registration_status,
    new_status v2_registration_status,
    reason TEXT,

    -- Audit trail
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_registration_audit_logs_tenant_id
    ON v2_registration_audit_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_v2_registration_audit_logs_registration_request_id
    ON v2_registration_audit_logs(registration_request_id);

CREATE INDEX IF NOT EXISTS idx_v2_registration_audit_logs_created_at
    ON v2_registration_audit_logs(created_at DESC);

-- =============================================================================
-- Email Notification Log Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS v2_registration_email_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    registration_request_id INTEGER NOT NULL REFERENCES v2_registration_requests(id) ON DELETE CASCADE,

    -- Recipient email
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(50) NOT NULL, -- 'USER', 'ADMIN', 'ORGANIZATION'

    -- Email details
    email_type VARCHAR(50) NOT NULL, -- 'CONFIRMATION', 'APPROVAL', 'REJECTION', 'ADMIN_NOTIFICATION'
    subject VARCHAR(255) NOT NULL,

    -- Delivery status
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'SENT', -- 'SENT', 'FAILED', 'BOUNCED'
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_registration_email_logs_registration_request_id
    ON v2_registration_email_logs(registration_request_id);

CREATE INDEX IF NOT EXISTS idx_v2_registration_email_logs_delivery_status
    ON v2_registration_email_logs(delivery_status);

-- =============================================================================
-- Cleanup: Auto-expire old pending requests (7 days)
-- =============================================================================

-- Function to auto-expire old pending requests
CREATE OR REPLACE FUNCTION v2_expire_old_registration_requests()
RETURNS void AS $$
BEGIN
    UPDATE v2_registration_requests
    SET status = 'EXPIRED'
    WHERE status = 'PENDING'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: This function should be called by a scheduled task (e.g., cron job)
-- Or trigger via application code periodically

-- =============================================================================
-- Statistics View
-- =============================================================================

CREATE OR REPLACE VIEW v2_registration_statistics AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    o.id as organization_id,
    o.name as organization_name,
    COUNT(*) FILTER (WHERE rr.status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE rr.status = 'APPROVED') as approved_count,
    COUNT(*) FILTER (WHERE rr.status = 'REJECTED') as rejected_count,
    COUNT(*) FILTER (WHERE rr.status = 'EXPIRED') as expired_count,
    COUNT(*) as total_requests
FROM v2_registration_requests rr
JOIN v2_organizations o ON rr.organization_id = o.id
JOIN tenants t ON rr.tenant_id = t.id
GROUP BY t.id, t.name, o.id, o.name;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Show table structure
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'v2_registration_requests' ORDER BY ordinal_position;

-- Show pending registration counts
-- SELECT organization_id, COUNT(*) as pending_count
-- FROM v2_registration_requests
-- WHERE status = 'PENDING'
-- GROUP BY organization_id;

-- Show recent registrations
-- SELECT id, email, first_name, last_name, status, created_at
-- FROM v2_registration_requests
-- ORDER BY created_at DESC LIMIT 10;
