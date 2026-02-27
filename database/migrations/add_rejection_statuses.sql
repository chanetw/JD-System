-- Migration: Add new job statuses for rejection workflow
-- Date: 2026-02-25
-- Description: Adds rejection-related statuses and cancellationReason field

-- Add new job statuses for rejection workflow
-- Note: PostgreSQL ENUM values cannot be added in a transaction, so we use ALTER TYPE
DO $$
BEGIN
  -- Add 'rejected' status (Approver rejected)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
    ALTER TYPE "JobStatus" ADD VALUE 'rejected';
  END IF;

  -- Add 'rejected_by_assignee' status (Assignee rejected, approved by Approver)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected_by_assignee' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
    ALTER TYPE "JobStatus" ADD VALUE 'rejected_by_assignee';
  END IF;

  -- Add 'cancelled' status (Cancelled due to parent/chain rejection)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
    ALTER TYPE "JobStatus" ADD VALUE 'cancelled';
  END IF;

  -- Add 'pending_rejection' status (Assignee requested rejection, waiting approval)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_rejection' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
    ALTER TYPE "JobStatus" ADD VALUE 'pending_rejection';
  END IF;

  -- Add 'partially_completed' status (Parent job completed with some children rejected)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partially_completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')) THEN
    ALTER TYPE "JobStatus" ADD VALUE 'partially_completed';
  END IF;
END $$;

-- Add cancellationReason field to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- Add indexes for new statuses (improves query performance)
CREATE INDEX IF NOT EXISTS "idx_jobs_status_rejection"
  ON "jobs"("status")
  WHERE "status" IN ('rejected', 'rejected_by_assignee', 'cancelled', 'pending_rejection');

-- Add index for cancelled jobs with reason
CREATE INDEX IF NOT EXISTS "idx_jobs_cancellation_reason"
  ON "jobs"("cancellationReason")
  WHERE "cancellationReason" IS NOT NULL;

-- Add comment
COMMENT ON COLUMN "jobs"."cancellationReason" IS 'Reason for job cancellation (e.g., parent job rejected, previous job in chain failed)';
