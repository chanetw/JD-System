-- Fix missing columns in approval_flows table
ALTER TABLE approval_flows 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update tenant_id default for existing rows if any
UPDATE approval_flows SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Alter column to remove default and make not null if desired, but keeping default 1 is safer for now if app doesn't send it always
ALTER TABLE approval_flows ALTER COLUMN tenant_id SET NOT NULL;
