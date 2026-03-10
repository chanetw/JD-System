-- Add email_settings column to tenants table
-- This column will store email CC settings for different notification types

ALTER TABLE "tenants" 
ADD COLUMN IF NOT EXISTS "email_settings" JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN "tenants"."email_settings" IS 'Email CC settings for different notification types (urgentJob, urgentImpact, jobRejection, etc.)';

-- Example structure:
-- {
--   "urgentJob": {
--     "enabled": true,
--     "ccEmails": ["manager@example.com"],
--     "description": "งานด่วนที่ต้องการความสนใจจากผู้บริหาร"
--   },
--   "jobRejection": {
--     "enabled": true,
--     "ccEmails": ["hr@example.com", "admin@example.com"],
--     "description": "งานที่ถูกยกเลิก/ปฏิเสธ"
--   }
-- }
