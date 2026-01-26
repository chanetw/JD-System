-- ========================================
-- Migration 005: Audit Trail Implementation
-- Purpose: Create comprehensive audit logging system
-- Date: 2026-01-26
-- ========================================

-- 1. Create Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Who performed the action
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255),
    user_ip VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,
    
    -- What was done
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'
    entity_type VARCHAR(100) NOT NULL, -- 'job', 'user', 'approval', 'attachment', etc.
    entity_id INTEGER, -- ID of the affected record
    entity_name VARCHAR(255), -- Human-readable name (e.g., job DJ_ID)
    
    -- Change details
    old_values JSONB, -- Previous state (for updates)
    new_values JSONB, -- New state (for creates/updates)
    changed_fields TEXT[], -- List of changed field names
    
    -- Context
    description TEXT, -- Human-readable description
    metadata JSONB DEFAULT '{}', -- Additional context
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Session tracking
    session_id VARCHAR(100),
    request_id VARCHAR(100)
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_created_at_tenant ON audit_logs(tenant_id, created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- ========================================
-- Audit Log Functions
-- ========================================

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_tenant_id INTEGER,
    p_user_id INTEGER,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(100),
    p_entity_id INTEGER,
    p_entity_name VARCHAR(255),
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_user_ip VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_request_id VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_audit_id INTEGER;
    v_user_email VARCHAR(255);
    v_changed_fields TEXT[];
BEGIN
    -- Get user email
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;
    
    -- Calculate changed fields (for updates)
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT array_agg(key)
        INTO v_changed_fields
        FROM (
            SELECT key FROM jsonb_each(p_new_values)
            EXCEPT
            SELECT key FROM jsonb_each(p_old_values)
            WHERE p_new_values->key = p_old_values->key
        ) changed;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        tenant_id, user_id, user_email, user_ip, user_agent,
        action, entity_type, entity_id, entity_name,
        old_values, new_values, changed_fields,
        description, metadata, session_id, request_id
    )
    VALUES (
        p_tenant_id, p_user_id, v_user_email, p_user_ip, p_user_agent,
        p_action, p_entity_type, p_entity_id, p_entity_name,
        p_old_values, p_new_values, v_changed_fields,
        p_description, p_metadata, p_session_id, p_request_id
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- Function: Auto-audit trigger for jobs table
CREATE OR REPLACE FUNCTION audit_jobs_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.requester_id,
            'CREATE',
            'job',
            NEW.id,
            NEW.dj_id,
            NULL,
            to_jsonb(NEW),
            'Job created: ' || NEW.subject
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant fields changed
        IF NEW.status != OLD.status 
           OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
           OR NEW.subject != OLD.subject
           OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                COALESCE(NEW.assignee_id, NEW.requester_id),
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'DELETE'
                    WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'RESTORE'
                    ELSE 'UPDATE'
                END,
                'job',
                NEW.id,
                NEW.dj_id,
                to_jsonb(OLD),
                to_jsonb(NEW),
                CASE 
                    WHEN NEW.status != OLD.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
                    WHEN NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN 'Assignee changed'
                    ELSE 'Job updated'
                END
            );
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM create_audit_log(
            OLD.tenant_id,
            OLD.requester_id,
            'HARD_DELETE',
            'job',
            OLD.id,
            OLD.dj_id,
            to_jsonb(OLD),
            NULL,
            'Job permanently deleted'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for jobs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        DROP TRIGGER IF EXISTS trigger_audit_jobs ON jobs;
        CREATE TRIGGER trigger_audit_jobs
            AFTER INSERT OR UPDATE OR DELETE ON jobs
            FOR EACH ROW EXECUTE FUNCTION audit_jobs_changes();
    END IF;
END $$;

-- Function: Auto-audit trigger for approvals table (ถ้ามี table)
CREATE OR REPLACE FUNCTION audit_approvals_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_dj_id VARCHAR(50);
BEGIN
    -- Get job DJ_ID for reference
    SELECT dj_id INTO v_job_dj_id FROM jobs WHERE id = COALESCE(NEW.job_id, OLD.job_id);
    
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.approver_id,
            'CREATE',
            'approval',
            NEW.id,
            v_job_dj_id,
            NULL,
            to_jsonb(NEW),
            'Approval record created for job ' || v_job_dj_id
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status != OLD.status THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                NEW.approver_id,
                NEW.status::VARCHAR,
                'approval',
                NEW.id,
                v_job_dj_id,
                to_jsonb(OLD),
                to_jsonb(NEW),
                'Job ' || v_job_dj_id || ' ' || NEW.status || ' by approver'
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for approvals (ถ้ามี table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approvals') THEN
        DROP TRIGGER IF EXISTS trigger_audit_approvals ON approvals;
        CREATE TRIGGER trigger_audit_approvals
            AFTER INSERT OR UPDATE ON approvals
            FOR EACH ROW EXECUTE FUNCTION audit_approvals_changes();
    END IF;
END $$;

-- Function: Auto-audit trigger for users table
CREATE OR REPLACE FUNCTION audit_users_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            NEW.tenant_id,
            NEW.id,
            'CREATE',
            'user',
            NEW.id,
            NEW.email,
            NULL,
            jsonb_build_object(
                'email', NEW.email,
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'is_active', NEW.is_active
            ),
            'User account created'
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_active != OLD.is_active 
           OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
            PERFORM create_audit_log(
                NEW.tenant_id,
                NEW.id,
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL THEN 'DEACTIVATE'
                    WHEN NOT NEW.is_active AND OLD.is_active THEN 'DEACTIVATE'
                    WHEN NEW.is_active AND NOT OLD.is_active THEN 'ACTIVATE'
                    ELSE 'UPDATE'
                END,
                'user',
                NEW.id,
                NEW.email,
                jsonb_build_object('is_active', OLD.is_active),
                jsonb_build_object('is_active', NEW.is_active),
                CASE 
                    WHEN NEW.deleted_at IS NOT NULL THEN 'User account deleted'
                    WHEN NOT NEW.is_active THEN 'User account deactivated'
                    ELSE 'User account activated'
                END
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for users (ถ้ามี table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS trigger_audit_users ON users;
        CREATE TRIGGER trigger_audit_users
            AFTER INSERT OR UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION audit_users_changes();
    END IF;
END $$;

-- ========================================
-- Query Functions for Audit Logs
-- ========================================

-- Function: Get audit logs for an entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
    p_entity_type VARCHAR(100),
    p_entity_id INTEGER,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    action VARCHAR(50),
    user_email VARCHAR(255),
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.user_email,
        al.description,
        al.old_values,
        al.new_values,
        al.changed_fields,
        al.created_at
    FROM audit_logs al
    WHERE al.entity_type = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function: Get user activity log
CREATE OR REPLACE FUNCTION get_user_activity(
    p_user_id INTEGER,
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    action VARCHAR(50),
    entity_type VARCHAR(100),
    entity_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_name,
        al.description,
        al.created_at
    FROM audit_logs al
    WHERE al.user_id = p_user_id
      AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function: Get tenant activity summary
CREATE OR REPLACE FUNCTION get_tenant_activity_summary(
    p_tenant_id INTEGER,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    action VARCHAR(50),
    entity_type VARCHAR(100),
    count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.created_at::DATE as date,
        al.action,
        al.entity_type,
        COUNT(*) as count
    FROM audit_logs al
    WHERE al.tenant_id = p_tenant_id
      AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY al.created_at::DATE, al.action, al.entity_type
    ORDER BY date DESC, count DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_entity_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_activity_summary TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Add RLS policy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id')::INTEGER);

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system changes';
COMMENT ON FUNCTION create_audit_log IS 'Create a new audit log entry';
COMMENT ON FUNCTION get_entity_audit_trail IS 'Get audit history for a specific entity';
COMMENT ON FUNCTION get_user_activity IS 'Get activity log for a specific user';
