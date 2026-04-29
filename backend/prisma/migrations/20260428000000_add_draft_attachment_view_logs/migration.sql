CREATE TABLE IF NOT EXISTS "draft_attachment_view_logs" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "attachment_id" INTEGER NOT NULL,
    "viewer_user_id" INTEGER NOT NULL,
    "first_viewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "draft_attachment_view_logs_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_attachment_view_logs_job_id_fkey"
        FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_attachment_view_logs_attachment_id_fkey"
        FOREIGN KEY ("attachment_id") REFERENCES "media_files"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_attachment_view_logs_viewer_user_id_fkey"
        FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "draft_attachment_view_logs_job_attachment_viewer_key"
        UNIQUE ("job_id", "attachment_id", "viewer_user_id")
);

CREATE INDEX IF NOT EXISTS "draft_attachment_view_logs_tenant_id_idx"
    ON "draft_attachment_view_logs" ("tenant_id");

CREATE INDEX IF NOT EXISTS "draft_attachment_view_logs_job_id_idx"
    ON "draft_attachment_view_logs" ("job_id");

CREATE INDEX IF NOT EXISTS "draft_attachment_view_logs_attachment_id_idx"
    ON "draft_attachment_view_logs" ("attachment_id");

CREATE INDEX IF NOT EXISTS "draft_attachment_view_logs_viewer_user_id_idx"
    ON "draft_attachment_view_logs" ("viewer_user_id");