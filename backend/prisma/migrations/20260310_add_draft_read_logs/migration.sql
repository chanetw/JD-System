-- Migration: Add Draft Read Logs Table
-- Description: เพิ่มตารางสำหรับบันทึกการเปิดอ่าน Draft Submission โดย Requester
-- Created: 2026-03-10

-- สร้างตาราง draft_read_logs
CREATE TABLE IF NOT EXISTS "draft_read_logs" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    
    -- Foreign Keys
    CONSTRAINT "fk_draft_read_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_draft_read_logs_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_draft_read_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- สร้าง Index เพื่อเพิ่มประสิทธิภาพ
CREATE INDEX "idx_draft_read_logs_job_id" ON "draft_read_logs"("job_id");
CREATE INDEX "idx_draft_read_logs_user_id" ON "draft_read_logs"("user_id");
CREATE INDEX "idx_draft_read_logs_tenant_id" ON "draft_read_logs"("tenant_id");
CREATE INDEX "idx_draft_read_logs_read_at" ON "draft_read_logs"("read_at");

-- สร้าง Unique Index เพื่อป้องกันการบันทึกซ้ำ (1 user อ่าน 1 job ได้หลายครั้ง แต่จะบันทึกครั้งแรกเท่านั้น)
-- หากต้องการบันทึกทุกครั้งที่เปิดอ่าน ให้ลบ index นี้ออก
CREATE UNIQUE INDEX "idx_draft_read_logs_unique_read" ON "draft_read_logs"("job_id", "user_id");

-- Comment
COMMENT ON TABLE "draft_read_logs" IS 'บันทึกการเปิดอ่าน Draft Submission โดย Requester';
COMMENT ON COLUMN "draft_read_logs"."id" IS 'Primary Key';
COMMENT ON COLUMN "draft_read_logs"."tenant_id" IS 'Tenant ID';
COMMENT ON COLUMN "draft_read_logs"."job_id" IS 'Job ID ที่ถูกเปิดอ่าน';
COMMENT ON COLUMN "draft_read_logs"."user_id" IS 'User ID ของผู้เปิดอ่าน (Requester)';
COMMENT ON COLUMN "draft_read_logs"."read_at" IS 'เวลาที่เปิดอ่าน';
COMMENT ON COLUMN "draft_read_logs"."ip_address" IS 'IP Address ของผู้เปิดอ่าน';
COMMENT ON COLUMN "draft_read_logs"."user_agent" IS 'User Agent (Browser/Device)';
