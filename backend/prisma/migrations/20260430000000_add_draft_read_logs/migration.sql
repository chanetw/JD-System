CREATE TABLE IF NOT EXISTS "draft_read_logs" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "read_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "draft_read_logs_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_read_logs_job_id_fkey"
        FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_read_logs_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_read_logs_job_user_key"
        UNIQUE ("job_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "draft_read_logs_tenant_id_idx"
    ON "draft_read_logs" ("tenant_id");

CREATE INDEX IF NOT EXISTS "draft_read_logs_job_id_idx"
    ON "draft_read_logs" ("job_id");

CREATE INDEX IF NOT EXISTS "draft_read_logs_user_id_idx"
    ON "draft_read_logs" ("user_id");
