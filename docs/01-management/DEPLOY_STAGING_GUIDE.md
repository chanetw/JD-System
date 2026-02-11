# 📋 Staging Deployment Guide - V1 Extended Approval Flow

**วันที่:** 2026-01-31
**สถานะ:** Ready to Deploy
**Risk Level:** MEDIUM (requires DB migration)

---

## 🎯 เป้าหมาย

Test V1 Extended Approval Flow (Job Type + Skip Approval) ใน Staging Environment ก่อน Production

---

## ⏱️ Timeline

| ขั้นตอน | เวลา | อธิบาย |
|--------|------|--------|
| **Pre-Deploy** | 15 min | Backup + Prepare |
| **Migration** | 5 min | Run forward migration |
| **Deploy** | 10 min | Code deployment |
| **Smoke Test** | 30 min | Quick sanity check |
| **Full Test** | 24-48 hrs | User acceptance testing |

---

## 📍 Pre-Deployment Checklist

```bash
# ✅ ตรวจสอบหมด
□ Backup staging database
□ นำส่วนการเปลี่ยนแปลงมาจาก main branch
□ Migration files พร้อม (016_extend_v1_remove_v2_approval_flow.sql)
□ Backend code ได้รับการอัปเดต
□ Frontend build สำเร็จ
□ Team ทุกคนแจ้งแล้ว
```

---

## 🚀 Step-by-Step Deployment

### **Step 1: Copy Production Data to Staging** (15 min)
```bash
# ที่ Server หรือ Local
# (ต้องมี access ทั้ง prod + staging databases)

# สร้าง backup
pg_dump $PROD_DATABASE_URL > /tmp/backup_before_v1_extend_$(date +%Y%m%d_%H%M%S).sql

# Copy ไป staging
psql $STAGING_DATABASE_URL < /tmp/backup_before_v1_extend_*.sql

# Verify
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) as approval_flows_count FROM approval_flows;"
```

**ผลลัพธ์คาดหวัง:**
```
approval_flows_count
--------------------
       42          (หรือจำนวนอื่นขึ้นอยู่กับข้อมูลของคุณ)
```

---

### **Step 2: Run Forward Migration** (5 min)
```bash
# ใน Staging Database
psql $STAGING_DATABASE_URL < database/migrations/manual/016_extend_v1_remove_v2_approval_flow.sql
```

**จัดดูเอกสาร:**
```
CREATE TABLE IF NOT EXISTS approval_flow_templates_archive AS
CREATE TABLE IF NOT EXISTS approval_flow_steps_archive AS
CREATE TABLE IF NOT EXISTS project_flow_assignments_archive AS
CREATE TABLE IF NOT EXISTS project_flow_approvers_archive AS
ALTER TABLE approval_flows
  ADD COLUMN IF NOT EXISTS job_type_id INTEGER REFERENCES job_types(id),
  ADD COLUMN IF NOT EXISTS skip_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_assign_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS auto_assign_user_id INTEGER;
DROP TABLE IF EXISTS project_flow_approvers CASCADE;
DROP TABLE IF EXISTS project_flow_assignments CASCADE;
DROP TABLE IF EXISTS approval_flow_steps CASCADE;
DROP TABLE IF EXISTS approval_flow_templates CASCADE;
```

**ตรวจสอบผล:**
```bash
# ✅ V1 columns เพิ่มแล้ว
psql $STAGING_DATABASE_URL -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval', 'auto_assign_type', 'auto_assign_user_id')
  ORDER BY ordinal_position;"

# Output ที่คาดหวัง:
#       column_name      | data_type
# ----------------------+-----------
#  job_type_id          | integer
#  skip_approval        | boolean
#  auto_assign_type     | character varying
#  auto_assign_user_id  | integer
```

```bash
# ✅ V2 tables ลบแล้ว (should return 0 rows)
psql $STAGING_DATABASE_URL -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('approval_flow_templates', 'approval_flow_steps',
                     'project_flow_assignments', 'project_flow_approvers');"

# Output ที่คาดหวัง: (blank/no rows)
```

```bash
# ✅ Archive tables มี (safety net)
psql $STAGING_DATABASE_URL -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE '%_archive'
  ORDER BY table_name;"

# Output ที่คาดหวัง:
#              table_name
# -----------------------------------
#  approval_flow_approvers_archive
#  approval_flow_steps_archive
#  approval_flow_templates_archive
#  project_flow_approvers_archive
#  project_flow_assignments_archive
```

---

### **Step 3: Deploy Backend Code** (5 min)
```bash
# ใน staging server
cd /path/to/DJ-System

# 1. Pull latest code
git fetch origin main
git checkout main
git reset --hard origin/main

# 2. Install dependencies
npm install  # ใน backend/api-server

# 3. Generate Prisma Client
npx prisma generate

# 4. Restart service
pm2 restart dj-system-api

# 5. Check logs
pm2 logs dj-system-api --lines 50
```

**ตรวจสอบ:**
```bash
# Backend เปิดทำงาน
curl http://staging-api.example.com/api/health

# ผลลัพธ์คาดหวัง:
# { "status": "ok", "timestamp": "2026-01-31T..." }
```

---

### **Step 4: Deploy Frontend Code** (5 min)
```bash
# ใน staging server
cd /path/to/DJ-System/frontend

# 1. Install & Build
npm install
npm run build

# 2. Deploy to CDN/Server
# (ทำตามวิธี deployment ปกติของคุณ)

# 3. Verify
# - เปิด https://staging.example.com
# - Approval Flow page ควรโหลดได้ไม่มี error
```

---

## ✅ Smoke Tests (30 min)

### Test 1: ตรวจสอบ UI ใหม่
```
1. เข้า Admin > Approval Flow ✓
2. เลือก Project ✓
3. Tab "Flow Configuration" ควรแสดง:
   - ✓ Job Type Selector (Default + job types ทั้งหมด)
   - ✓ Skip Approval Toggle
   - ✓ Auto-Assign Options (แสดงเมื่อ skipApproval=true)
4. ปิด/เปิด Skip Approval → approval steps ควรซ่อน/แสดง ✓
```

### Test 2: สร้างงาน Normal Flow (ยังคงใช้ได้เหมือนเดิม)
```bash
# API request
curl -X POST http://staging-api.example.com/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "jobTypeId": 3,
    "subject": "Test Job - Normal Flow",
    "dueDate": "2026-02-15"
  }' \
  -H "Authorization: Bearer $TOKEN"

# ผลลัพธ์คาดหวัง:
# {
#   "success": true,
#   "data": {
#     "id": 123,
#     "status": "pending_approval",  ← รอการอนุมัติ
#     "assigneeId": null
#   }
# }
```

### Test 3: สร้างงาน Skip Approval Flow
```bash
# 1. สร้าง flow ใน UI
#    - Project: "Banner Project"
#    - Job Type: "Social Media"
#    - Skip Approval: ✓ (checked)
#    - Auto-Assign Type: "dept_manager"
#    - Save

# 2. สร้างงาน
curl -X POST http://staging-api.example.com/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "jobTypeId": 5,
    "subject": "Test Job - Skip Approval",
    "dueDate": "2026-02-15"
  }' \
  -H "Authorization: Bearer $TOKEN"

# ผลลัพธ์คาดหวัง:
# {
#   "success": true,
#   "data": {
#     "id": 124,
#     "status": "assigned",  ← ส่งตรงให้ dept_manager
#     "assigneeId": 42       ← auto-assigned
#   }
# }
```

### Test 4: อนุมัติงานยังทำงาน
```bash
# สร้างงาน normal flow แล้ว
# หา approver และทำการ approve

curl -X POST http://staging-api.example.com/api/jobs/123/approve \
  -H "Content-Type: application/json" \
  -d '{"comment": "Looks good"}' \
  -H "Authorization: Bearer $APPROVER_TOKEN"

# ผลลัพธ์คาดหวัง:
# {
#   "success": true,
#   "data": {
#     "status": "approved" หรือ "pending_level_2",
#     "message": "Approved successfully"
#   }
# }
```

---

## 🧪 Full Testing (24-48 hours)

### Checklist
```
□ สร้างงาน Normal Approval → ต้อง pending_approval
□ สร้างงาน Skip Approval → ต้อง assigned ทันที
□ Approve งาน Level 1 → เปลี่ยน status ถูกต้อง
□ Approve งาน Level 2+ → final status = approved
□ Job Type selector ทำงาน
□ Auto-assign dept_manager ทำงาน
□ Auto-assign specific_user ทำงาน
□ Flow default (jobTypeId=NULL) ยังใช้งานได้
□ ไม่มี V2 routes error (404 /api/approval-flow-templates)
□ Error logs clean (ไม่มี "undefined", "V2", "template")
□ Performance OK (response < 1s)
```

### Browser Console Check
```javascript
// ใน DevTools Console
// ไม่ควรมี error เหล่านี้:
// ❌ Cannot read property 'flowTemplates'
// ❌ approval-flow-templates not found
// ❌ getFlowAssignmentV2 is not a function
```

---

## ❌ Rollback (ถ้าพบ Issue)

**ถ้า staging test ไม่ผ่าน:**

```bash
# 1. Rollback Database
psql $STAGING_DATABASE_URL < database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql

# 2. Verify rollback
psql $STAGING_DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('approval_flow_templates', 'approval_flow_steps');"

# Output ที่คาดหวัง:
#        table_name
# ----------------------
#  approval_flow_templates
#  approval_flow_steps
```

```bash
# 3. Verify V1 extensions removed
psql $STAGING_DATABASE_URL -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'approval_flows'
  AND column_name IN ('job_type_id', 'skip_approval');"

# Output ที่คาดหวัย: (empty - no rows)
```

```bash
# 4. Revert code
git revert <commit-hash>
pm2 restart dj-system-api
```

---

## 📊 Success Criteria

### ✅ GO to Production ถ้า:
- [x] All smoke tests passed
- [x] Full testing 24+ hrs with no critical issues
- [x] V1 columns exist and work
- [x] V2 tables gone
- [x] No 404 errors for V2 routes
- [x] Performance baseline unchanged
- [x] Rollback tested and verified

### ❌ NO-GO ถ้า:
- [ ] Job creation > 10% failure rate
- [ ] Database errors > 5/hour
- [ ] V2 table restoration failed
- [ ] Approval flow > 20% slower
- [ ] Critical data loss

---

## 📞 Contacts & Escalation

| Role | Action |
|------|--------|
| **DBA** | Backup + Migration + Monitor |
| **Backend Lead** | Code review + API testing |
| **Frontend Lead** | UI testing + Browser compatibility |
| **Tech Lead** | GO/NO-GO decision |
| **Product Owner** | Stakeholder notification |

---

## 📝 Log Locations

```bash
# Backend logs
pm2 logs dj-system-api --lines 100

# Database logs (PostgreSQL)
tail -f /var/log/postgresql/postgresql.log

# Frontend console
DevTools → Console tab
```

---

## 🔄 Deployment Timeline

```
Day 1 (Friday)
├─ 10:00 - Pre-deploy check
├─ 10:15 - Backup + Migration
├─ 10:30 - Deploy backend
├─ 10:45 - Deploy frontend
└─ 11:00 - Smoke tests

Day 2-3 (Weekend)
└─ Continuous testing + Monitoring

Day 4 (Monday)
├─ Final verification
└─ GO decision
```

---

## 💾 Files for Reference

| ไฟล์ | วัตถุประสงค์ |
|------|------------|
| `database/migrations/manual/016_extend_v1_remove_v2_approval_flow.sql` | Forward migration |
| `database/migrations/manual/016_ROLLBACK_extend_v1_remove_v2.sql` | Rollback script |
| `backend/prisma/schema.prisma` | Updated schema |
| `backend/api-server/src/services/approvalService.js` | Updated service |
| `backend/api-server/src/routes/jobs.js` | Updated routes |
| `frontend/src/modules/features/admin/pages/ApprovalFlow.jsx` | Updated UI |

---

## ✍️ Sign-off

```
Prepared by: Claude Code
Date: 2026-01-31
Status: Ready for Staging Deployment
Next: Execute steps above
```

**Ready ทำได้ เริ่มตั้งแต่ Step 1 เลย!** 🚀
