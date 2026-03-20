# Production Database Fixes — 20 มีนาคม 2026

แก้ปัญหา API Error 500 ทั้งหมด  — รวม SQL ไว้ในไฟล์เดียว copy-paste รันจบ

---

## สรุปปัญหา

| # | Error | สาเหตุ |
|---|-------|--------|
| 1 | `holidays` 500 | column `type` ไม่มีใน table |
| 2 | `user-requests/count` 500 | table `user_requests` ไม่มีเลย |
| 3 | `draft-read-logs/:jobId` 500 | table `draft_read_logs` ไม่มีเลย |

---

## ขั้นตอนที่ 1 — Backup ก่อนทำ

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## ขั้นตอนที่ 2 — รัน SQL แก้ทั้งหมด (ไฟล์เดียว)

บันทึก SQL ด้านล่างเป็นไฟล์ `production_fix.sql` แล้วรัน:

```bash
psql $DATABASE_URL -f production_fix.sql
```

**เนื้อหา `production_fix.sql`:**

```sql
-- =============================================================
-- DJ System — Production Fix (20 มีนาคม 2026)
-- แก้ทั้ง 3 จุด: holidays.type, user_requests, draft_read_logs
-- ปลอดภัยรันซ้ำได้ (IF NOT EXISTS / IF NOT EXISTS ทุกคำสั่ง)
-- =============================================================

BEGIN;

-- ----- Fix 1: holidays — เพิ่ม column "type" -----
ALTER TABLE "holidays"
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) NOT NULL DEFAULT 'government';

-- ----- Fix 2: user_requests — สร้างตารางใหม่ -----
CREATE TABLE IF NOT EXISTS "user_requests" (
    "id"              SERIAL        NOT NULL,
    "tenant_id"       INTEGER       NOT NULL,
    "user_id"         INTEGER       NOT NULL,
    "category"        VARCHAR(50)   NOT NULL,
    "subject"         VARCHAR(255)  NOT NULL,
    "message"         TEXT          NOT NULL,
    "status"          VARCHAR(20)   NOT NULL DEFAULT 'pending',
    "resolved_by"     INTEGER,
    "resolved_at"     TIMESTAMPTZ,
    "admin_note"      TEXT,
    "rejected_reason" TEXT,
    "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_requests_tenant_id_idx"
  ON "user_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "user_requests_user_id_idx"
  ON "user_requests"("user_id");
CREATE INDEX IF NOT EXISTS "user_requests_status_idx"
  ON "user_requests"("status");
CREATE INDEX IF NOT EXISTS "user_requests_tenant_id_status_idx"
  ON "user_requests"("tenant_id","status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_requests_tenant_id_fkey') THEN
    ALTER TABLE "user_requests"
      ADD CONSTRAINT "user_requests_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_requests_user_id_fkey') THEN
    ALTER TABLE "user_requests"
      ADD CONSTRAINT "user_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ----- Fix 3: draft_read_logs — สร้างตารางใหม่ -----
CREATE TABLE IF NOT EXISTS "draft_read_logs" (
    "id"         SERIAL      NOT NULL,
    "tenant_id"  INTEGER     NOT NULL,
    "job_id"     INTEGER     NOT NULL,
    "user_id"    INTEGER     NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "read_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draft_read_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "draft_read_logs_job_user_unique" UNIQUE ("job_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "draft_read_logs_tenant_id_idx"
  ON "draft_read_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "draft_read_logs_job_id_idx"
  ON "draft_read_logs"("job_id");
CREATE INDEX IF NOT EXISTS "draft_read_logs_user_id_idx"
  ON "draft_read_logs"("user_id");

COMMIT;

-- =============================================================
-- ตรวจสอบผล (Verify)
-- =============================================================

-- ต้องเห็น 1 row (column_name = 'type')
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'holidays' AND column_name = 'type';

-- ต้องไม่ error (ได้ count = 0)
SELECT COUNT(*) AS user_requests_count FROM "user_requests";

-- ต้องไม่ error (ได้ count = 0)
SELECT COUNT(*) AS draft_read_logs_count FROM "draft_read_logs";
```

---

## ขั้นตอนที่ 3 — Restart Backend

```bash
# Docker
docker compose restart backend
# หรือ docker compose -f docker-compose.prod.yml restart backend

# Non-Docker
pm2 restart dj-backend
# หรือ
systemctl restart dj-backend
```

---

## ข้อควรระวัง

| ความเสี่ยง | รายละเอียด | วิธีป้องกัน |
|-----------|-----------|------------|
| **Table lock** | `ALTER TABLE holidays` ล็อคตารางชั่วคราว | ข้อมูลน้อย (<1,000 rows) ล็อคไม่นาน แต่หลีกเลี่ยงช่วง traffic สูง |
| **FK ล้มเหลว** | FK อ้างอิง `tenants` และ `users` | ต้องมีตาราง tenants/users อยู่ก่อน (ถ้าเป็น schema ปกติจะมีอยู่แล้ว) |
| **Backend cache** | Prisma cache schema เก่า | **ต้อง restart backend** หลังรัน SQL เสมอ |
| **สิทธิ์ DB** | ALTER/CREATE ต้องการ DDL privilege | ใช้ postgres superuser หรือ owner ของ schema |
| **Transaction** | SQL ทั้งหมดอยู่ใน `BEGIN...COMMIT` | ถ้ามีจุดใดจุดหนึ่ง error จะ rollback ทั้งหมด ไม่มี state ค้าง |

---

## ผลลัพธ์ที่คาดหวังหลังรัน

```
ALTER TABLE        ← holidays.type เพิ่มสำเร็จ
CREATE TABLE       ← user_requests สร้างสำเร็จ
CREATE INDEX (×4)  ← indexes ครบ
DO                 ← FK tenants สำเร็จ
DO                 ← FK users สำเร็จ
CREATE TABLE       ← draft_read_logs สร้างสำเร็จ
CREATE INDEX (×3)  ← indexes ครบ
COMMIT             ← ทุกอย่างถูก commit

 column_name | data_type         | column_default
-------------+-------------------+------------------
 type        | character varying | 'government'...

 user_requests_count
---------------------
                   0

 draft_read_logs_count
-----------------------
                     0
```

ถ้าเห็นผลลัพธ์ตามนี้ = แก้ครบ ไม่มี error เหลือ

