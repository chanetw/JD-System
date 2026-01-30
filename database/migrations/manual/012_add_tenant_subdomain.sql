-- =============================================================================
-- Add subdomain column to tenants table
-- =============================================================================

-- Add subdomain column if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- Add any default values if needed (optional - adjust as needed)
-- UPDATE tenants SET subdomain = LOWER(REPLACE(code, '-', '')) WHERE subdomain IS NULL;

-- Add color and logo columns that might be needed for multi-tenant UI
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#E11D48';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
