/**
 * Migration: Add Rejection Denial Workflow Fields
 *
 * Purpose:
 * - Track when Approver denies an Assignee's rejection request
 * - Enable "Deny Rejection" feature (force Assignee to continue working)
 * - Show "Extend" button hint after denial
 *
 * Date: 2026-02-18
 * Author: Claude Code
 */

-- Add rejection denial tracking fields to jobs table
ALTER TABLE jobs
ADD COLUMN rejection_denied_at TIMESTAMP,
ADD COLUMN rejection_denied_by INT REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX idx_jobs_rejection_denied_at ON jobs(rejection_denied_at);
CREATE INDEX idx_jobs_rejection_denied_by ON jobs(rejection_denied_by);

-- Comments for documentation
COMMENT ON COLUMN jobs.rejection_denied_at IS 'Timestamp when Approver denied Assignee rejection request';
COMMENT ON COLUMN jobs.rejection_denied_by IS 'User ID of Approver who denied the rejection';
