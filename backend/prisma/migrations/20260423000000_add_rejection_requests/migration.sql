-- CreateTable rejection_requests (if not exists)
-- ใช้สำหรับ Assignee ขอปฏิเสธงาน และรอ Approver อนุมัติ

CREATE TABLE IF NOT EXISTS "rejection_requests" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approver_level" INTEGER,
    "approver_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "approval_logic" VARCHAR(10),
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ,
    "auto_close_at" TIMESTAMPTZ,
    "auto_close_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "rejection_requests_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys (IF NOT EXISTS workaround via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rejection_requests_job_id_fkey'
    ) THEN
        ALTER TABLE "rejection_requests"
            ADD CONSTRAINT "rejection_requests_job_id_fkey"
            FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rejection_requests_requested_by_fkey'
    ) THEN
        ALTER TABLE "rejection_requests"
            ADD CONSTRAINT "rejection_requests_requested_by_fkey"
            FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rejection_requests_approved_by_fkey'
    ) THEN
        ALTER TABLE "rejection_requests"
            ADD CONSTRAINT "rejection_requests_approved_by_fkey"
            FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rejection_requests_tenant_id_fkey'
    ) THEN
        ALTER TABLE "rejection_requests"
            ADD CONSTRAINT "rejection_requests_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "rejection_requests_job_id_idx" ON "rejection_requests"("job_id");
CREATE INDEX IF NOT EXISTS "rejection_requests_requested_by_idx" ON "rejection_requests"("requested_by");
CREATE INDEX IF NOT EXISTS "rejection_requests_status_idx" ON "rejection_requests"("status");
CREATE INDEX IF NOT EXISTS "rejection_requests_tenant_id_idx" ON "rejection_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_auto_close" ON "rejection_requests"("auto_close_at", "status");

-- Add pending_rejection to jobs status (jobs.status is VARCHAR so no enum change needed)
-- Just ensure the column can store the value (it's VARCHAR(50) so OK)
