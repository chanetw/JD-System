-- Revert request-based rejection workflow schema
-- Keep local environments free to postpone applying this migration.

DROP INDEX IF EXISTS "idx_auto_close";
DROP INDEX IF EXISTS "rejection_requests_tenant_id_idx";
DROP INDEX IF EXISTS "rejection_requests_status_idx";
DROP INDEX IF EXISTS "rejection_requests_requested_by_idx";
DROP INDEX IF EXISTS "rejection_requests_job_id_idx";

ALTER TABLE IF EXISTS "rejection_requests"
    DROP CONSTRAINT IF EXISTS "rejection_requests_job_id_fkey";

ALTER TABLE IF EXISTS "rejection_requests"
    DROP CONSTRAINT IF EXISTS "rejection_requests_requested_by_fkey";

ALTER TABLE IF EXISTS "rejection_requests"
    DROP CONSTRAINT IF EXISTS "rejection_requests_approved_by_fkey";

ALTER TABLE IF EXISTS "rejection_requests"
    DROP CONSTRAINT IF EXISTS "rejection_requests_tenant_id_fkey";

DROP TABLE IF EXISTS "rejection_requests";