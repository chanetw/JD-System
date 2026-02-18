/**
 * Migration: Add Default CC Emails for Rejection Notifications
 *
 * Purpose:
 * - Store default CC email list for job rejection notifications
 * - Admin-configurable via Tenant Settings page
 * - Emails automatically populate in Confirm Rejection modal
 *
 * Date: 2026-02-18
 * Author: Claude Code
 */

-- Add default CC emails array field to tenants table
ALTER TABLE tenants
ADD COLUMN default_rejection_cc_emails TEXT[] DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN tenants.default_rejection_cc_emails IS 'Default CC emails for job rejection confirmation notifications (e.g., [''hr@company.com'', ''manager@company.com''])';

-- Example update (optional, for testing):
-- UPDATE tenants SET default_rejection_cc_emails = ARRAY['hr@sena.com', 'admin@sena.com'] WHERE id = 1;
