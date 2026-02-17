-- ========================================
-- Migration: Add Pending Comment Batches Table
-- Purpose: Store comment notification batches before sending
-- Created: 2026-02-17
-- ========================================

-- Create sequence for id
CREATE SEQUENCE IF NOT EXISTS pending_comment_batches_id_seq;

-- Create table
CREATE TABLE IF NOT EXISTS pending_comment_batches (
  id INT PRIMARY KEY DEFAULT nextval('pending_comment_batches_id_seq'::regclass),
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Batch tracking
  batch_key VARCHAR(255) NOT NULL UNIQUE,

  -- Batch data
  "count" INT NOT NULL DEFAULT 1,
  first_commenter VARCHAR(255),
  comments JSONB NOT NULL DEFAULT '[]',

  -- TTL (Time To Live)
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: Only 1 batch per job per user per tenant
  CONSTRAINT unique_pending_batch_per_job
    UNIQUE(tenant_id, user_id, job_id)
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- 1. Fast lookup by batch_key
CREATE INDEX IF NOT EXISTS idx_pending_batch_key
  ON pending_comment_batches(batch_key);

-- 2. Fast cleanup: find expired batches
CREATE INDEX IF NOT EXISTS idx_pending_batch_expires_at
  ON pending_comment_batches(expires_at);

-- 3. Composite index for filtering by tenant+user+job
CREATE INDEX IF NOT EXISTS idx_pending_batch_tenant_user_job
  ON pending_comment_batches(tenant_id, user_id, job_id);

-- 4. Index for tenant lookups (batch management)
CREATE INDEX IF NOT EXISTS idx_pending_batch_tenant
  ON pending_comment_batches(tenant_id);

-- 5. Index for user lookups (notification cleanup)
CREATE INDEX IF NOT EXISTS idx_pending_batch_user
  ON pending_comment_batches(user_id);

-- ========================================
-- Comments
-- ========================================
--
-- This table stores PENDING comment notifications that are waiting to be batched.
-- When a comment is posted:
--
--   1. Check if batch exists (WHERE tenant_id=X AND user_id=Y AND job_id=Z)
--   2. If EXISTS: increment count, append comment, reset expires_at
--   3. If NOT EXISTS: create new batch
--   4. Set timer (expires_at = NOW() + 30 seconds)
--   5. When timer expires: create notification in notifications table
--   6. Delete from pending_comment_batches
--
-- This prevents notification spam while keeping chat instant via Socket.io
--
-- Example flow:
--   10:00:00 - User A posts comment → Create batch (count=1, expires_at=10:00:30)
--   10:00:10 - User A posts comment → Update batch (count=2, expires_at=10:00:40)
--   10:00:40 - Timer expires → Create notification "คุณมี 2 ข้อความจาก User A"
--
