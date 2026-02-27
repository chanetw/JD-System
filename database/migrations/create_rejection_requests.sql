-- Migration: Create rejection_requests table
-- Date: 2026-02-25
-- Description: Table for tracking job rejection requests from assignees

-- Create rejection_requests table
CREATE TABLE IF NOT EXISTS "rejection_requests" (
  "id" SERIAL PRIMARY KEY,
  "jobId" INTEGER NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  "requestedBy" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',

  -- Approval flow info
  "approverLevel" INTEGER,
  "approverIds" INTEGER[] NOT NULL DEFAULT '{}',
  "approvalLogic" TEXT, -- 'ALL' or 'ANY'

  -- Approval result
  "approvedBy" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "approvedAt" TIMESTAMP,

  -- Auto-close timeout
  "autoCloseAt" TIMESTAMP,
  "autoCloseEnabled" BOOLEAN NOT NULL DEFAULT false,

  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "tenantId" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_rejection_requests_jobId" ON "rejection_requests"("jobId");
CREATE INDEX IF NOT EXISTS "idx_rejection_requests_requestedBy" ON "rejection_requests"("requestedBy");
CREATE INDEX IF NOT EXISTS "idx_rejection_requests_status" ON "rejection_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_rejection_requests_tenantId" ON "rejection_requests"("tenantId");

-- Index for auto-close scheduler (finds pending requests past autoCloseAt)
CREATE INDEX IF NOT EXISTS "idx_rejection_requests_autoClose"
  ON "rejection_requests"("autoCloseAt", "status")
  WHERE "autoCloseEnabled" = true AND "status" = 'pending';

-- Add constraint for status values
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_status_check"
  CHECK ("status" IN ('pending', 'approved', 'denied', 'auto_approved'));

-- Add constraint for approvalLogic values
ALTER TABLE "rejection_requests" ADD CONSTRAINT "rejection_requests_logic_check"
  CHECK ("approvalLogic" IS NULL OR "approvalLogic" IN ('ALL', 'ANY'));

-- Comments
COMMENT ON TABLE "rejection_requests" IS 'Tracks job rejection requests from assignees requiring approver approval';
COMMENT ON COLUMN "rejection_requests"."status" IS 'pending = waiting approval, approved = approved by approver, denied = denied by approver, auto_approved = auto-approved after timeout';
COMMENT ON COLUMN "rejection_requests"."approverLevel" IS 'Approval flow level (1, 2, 3, etc) or NULL if no approval flow';
COMMENT ON COLUMN "rejection_requests"."approverIds" IS 'Array of user IDs who can approve this rejection request';
COMMENT ON COLUMN "rejection_requests"."approvalLogic" IS 'ALL = all approvers must approve, ANY = any approver can approve';
COMMENT ON COLUMN "rejection_requests"."autoCloseAt" IS 'Timestamp when request will be auto-approved if no response (24h default)';
COMMENT ON COLUMN "rejection_requests"."autoCloseEnabled" IS 'Whether auto-close is enabled for this request';
