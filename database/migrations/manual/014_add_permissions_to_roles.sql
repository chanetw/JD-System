-- =============================================================================
-- Add Permissions Column to Roles Table for V2 Compatibility
-- =============================================================================
-- This migration adds JSON permissions support to the existing roles table
-- to support V2 auth system RBAC while maintaining V1 compatibility

-- Add permissions JSONB column if it doesn't exist
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "read": true,
  "create": false,
  "update": false,
  "delete": false
}';

-- Set permissions for existing system roles (if they exist)
UPDATE roles SET permissions = '{
  "read": true,
  "create": true,
  "update": true,
  "delete": true
}' WHERE name = 'SuperAdmin' OR display_name LIKE '%Super%Admin%';

UPDATE roles SET permissions = '{
  "read": true,
  "create": true,
  "update": true,
  "delete": false
}' WHERE name = 'OrgAdmin' OR display_name LIKE '%Organization%Admin%';

UPDATE roles SET permissions = '{
  "read": true,
  "create": true,
  "update": true,
  "delete": false
}' WHERE name = 'TeamLead' OR display_name LIKE '%Team%Lead%';

UPDATE roles SET permissions = '{
  "read": true,
  "create": true,
  "update": false,
  "delete": false
}' WHERE name = 'Member' OR display_name LIKE '%Team%Member%';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON roles USING GIN(permissions);

-- Verification query (uncomment to run manually):
-- SELECT id, name, display_name, permissions FROM roles;
