-- AlterTable: Add "type" column to holidays (used by raw SQL in holidays route)
ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) NOT NULL DEFAULT 'government';

-- CreateTable: user_requests (UserRequest model)
CREATE TABLE IF NOT EXISTS "user_requests" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMPTZ,
    "admin_note" TEXT,
    "rejected_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_requests_tenant_id_idx" ON "user_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "user_requests_user_id_idx" ON "user_requests"("user_id");
CREATE INDEX IF NOT EXISTS "user_requests_status_idx" ON "user_requests"("status");
CREATE INDEX IF NOT EXISTS "user_requests_tenant_id_status_idx" ON "user_requests"("tenant_id", "status");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_requests_tenant_id_fkey') THEN
        ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_requests_user_id_fkey') THEN
        ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
