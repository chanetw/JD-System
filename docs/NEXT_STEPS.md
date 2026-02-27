# DJ System - ขั้นตอนถัดไป (Next Steps)

เอกสารสรุปสิ่งที่คุณต้องทำต่อหลังจาก Phase 3 เสร็จสมบูรณ์

---

## ✅ สิ่งที่เสร็จแล้ว (Completed)

### Phase 1: Database & Backend Core (100%)
- ✅ Database migrations (2 files):
  - `add_rejection_statuses.sql` - เพิ่ม 5 สถานะใหม่
  - `create_rejection_requests.sql` - สร้างตาราง rejection_requests
- ✅ Prisma schema อัปเดต
- ✅ Backend GET /api/jobs - Multi-role union + Parent-child filter
- ✅ Auto-approve own jobs (ตรวจสอบว่ามีอยู่แล้ว)

### Phase 2: Backend Services (100%)
- ✅ Job Chain Cancellation Service (`jobChainService.js`)
- ✅ Job Rejection Endpoints (3 endpoints ใหม่)
- ✅ Auto-close rejection timeout cron service
- ✅ Parent job closure logic (partial rejection support)

### Phase 3: Frontend (100%)
- ✅ getJobsByRole multi-role support (มีอยู่แล้ว)
- ✅ Rejection UI components (2 components):
  - `RejectionRequestModal.jsx`
  - `RejectionApprovalCard.jsx`
- ✅ Job Chain & Parent components (2 components):
  - `JobChainStatus.jsx`
  - `ParentJobChildrenList.jsx`
- ✅ JobDetail integration

---

## 🔨 สิ่งที่คุณต้องทำตอนนี้

### 1. รัน Database Migrations (สำคัญมาก!)

```bash
cd /Users/chanetw/Documents/DJ-System

# เชื่อมต่อ PostgreSQL
export DATABASE_URL="postgresql://user:password@localhost:5432/dj_system"

# หรือใช้ .env file
source backend/api-server/.env

# รัน migrations
psql $DATABASE_URL -f database/migrations/add_rejection_statuses.sql
psql $DATABASE_URL -f database/migrations/create_rejection_requests.sql
```

**ตรวจสอบความสำเร็จ**:
```bash
# เช็คว่า JobStatus enum มี status ใหม่
psql $DATABASE_URL -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus');"

# ควรเห็น:
# - rejected
# - rejected_by_assignee
# - cancelled
# - pending_rejection
# - partially_completed

# เช็คว่า rejection_requests table ถูกสร้าง
psql $DATABASE_URL -c "\d rejection_requests"
```

### 2. Generate Prisma Client

```bash
cd backend/prisma
npx prisma generate
```

**Expected Output**:
```
✔ Generated Prisma Client (X.X.X) to ./node_modules/@prisma/client
```

### 3. รีสตาร์ท Backend Server

```bash
cd backend/api-server

# Stop current server (Ctrl+C)

# Start dev server
npm run dev
```

**ตรวจสอบ logs**:
```
✓ Server running at: http://localhost:3000
✓ Socket.io ready at: ws://localhost:3000
✓ Rejection auto-close cron started  <-- ต้องเห็นบรรทัดนี้!
```

### 4. รีสตาร์ท Frontend Server

```bash
cd frontend

# Stop current server (Ctrl+C)

# Start dev server
npm run dev
```

**Expected Output**:
```
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 🧪 การทดสอบ (Testing Checklist)

### Test 1: Multi-Role Union View

**เป้าหมาย**: User ที่มีหลาย role เห็นงานรวมกันทันที

**ขั้นตอน**:
1. Login ด้วย user ที่มี `roles = [Requester, Approver]`
2. เข้า Dashboard หรือ Jobs List
3. ✅ **ต้องเห็น**: งานที่ตัวสร้าง (Requester) + งานรออนุมัติ (Approver) ในหน้าเดียว
4. ❌ **ห้ามเห็น**: งานที่ตัวเองไม่เกี่ยวข้อง

**Debug**:
```javascript
// เปิด DevTools Console
// ดูว่า API call ส่ง multi-role หรือไม่
GET /api/jobs?role=requester,approver  // ✅ ถูกต้อง
GET /api/jobs?role=requester           // ❌ ผิด (เห็นแค่ role เดียว)
```

---

### Test 2: Auto-Approve Own Jobs

**เป้าหมาย**: User ที่เป็นทั้ง Requester และ Approver สร้างงาน → Auto-approve Level 1 ทันที

**ขั้นตอน**:
1. Login ด้วย user ที่อยู่ใน Approval Flow Level 1
2. สร้างงานใหม่ (Job Type ที่มี Approval Flow)
3. ✅ **ต้องเห็น**:
   - ถ้ามี 1 level: `status = approved` (อนุมัติเลย)
   - ถ้ามี 2+ levels: `status = pending_level_2` (ผ่าน Level 1 แล้ว)
4. เช็ค Activity Log → มี "Auto-approved Level 1"
5. เช็ค Approval Record → มี status='approved', comment='Auto-approved'

**Debug**:
```bash
# ดู logs ใน backend console
# ต้องเห็น:
[ApprovalService] autoApproveIfRequesterIsApprover: requester X is in level 1 → auto-approved
```

---

### Test 3: Parent-Child Filter

**เป้าหมาย**: Role แต่ละตัวเห็นงานตามสิทธิ์

#### Test 3.1: Requester
```
Scenario: สร้าง Parent Job พร้อม 3 Child Jobs
Expected:
  - Requester เห็นเฉพาะ Parent Job
  - กดเข้า Parent → เห็น Child Jobs list ข้างใน
  - ไม่เห็น Child Jobs แยกในรายการหลัก
```

#### Test 3.2: Assignee
```
Scenario: มอบหมาย Child Job 1 ให้ User A
Expected:
  - User A เห็นเฉพาะ Child Job 1 ที่ตัวรับผิดชอบ
  - ไม่เห็น Parent Job
  - ไม่เห็น Child Jobs อื่น
```

#### Test 3.3: Approver
```
Scenario: Child Jobs รออนุมัติ
Expected:
  - Approver เห็นเฉพาะ Child Jobs ที่รออนุมัติ
  - ไม่เห็น Parent Job (เพราะ Parent ไม่ต้องอนุมัติ)
```

---

### Test 4: Rejection Request Workflow (ใหม่!)

**เป้าหมาย**: Assignee ขอปฏิเสธ → Approver ตอบกลับ

#### Test 4.1: Assignee Request Rejection

**ขั้นตอน**:
1. Login เป็น Assignee
2. เลือกงาน `status = in_progress`
3. กด "ขอปฏิเสธงาน" (ปุ่มใหม่ใน JobDetail)
4. กรอกเหตุผล → ส่งคำขอ

**Expected**:
```
✅ Alert: "ส่งคำขอปฏิเสธเรียบร้อย"
✅ Job status → pending_rejection
✅ เห็น message: "หาก Approver ไม่ตอบกลับภายใน 24 ชม. ระบบจะอนุมัติอัตโนมัติ"
```

**Debug**:
```sql
-- เช็ค rejection_request ถูกสร้าง
SELECT * FROM rejection_requests WHERE "jobId" = <jobId>;
-- ต้องเห็น: status='pending', autoCloseAt = now + 24h
```

#### Test 4.2: Approver Approve Rejection

**ขั้นตอน**:
1. Login เป็น Approver
2. เข้า JobDetail ของงานที่มี `status = pending_rejection`
3. เห็น `RejectionApprovalCard` (กล่องสีส้ม)
4. กด "อนุมัติคำขอปฏิเสธ"

**Expected**:
```
✅ Alert: "อนุมัติคำขอปฏิเสธเรียบร้อย"
✅ Job status → rejected_by_assignee
✅ ถ้างานมี Chain/Children → ยกเลิกอัตโนมัติ
✅ rejection_request.status → approved
```

#### Test 4.3: Approver Deny Rejection

**ขั้นตอน**:
1. Login เป็น Approver
2. เข้า JobDetail → เห็น `RejectionApprovalCard`
3. กด "ไม่อนุมัติ (สั่งให้ทำงานต่อ)"
4. กรอกเหตุผล → ยืนยัน

**Expected**:
```
✅ Alert: "ไม่อนุมัติคำขอปฏิเสธ - Assignee ต้องทำงานต่อ"
✅ Job status → in_progress (กลับไปทำต่อ)
✅ rejection_request.status → denied
✅ Assignee ได้รับแจ้งเตือน + เหตุผล
```

#### Test 4.4: Auto-Close (24 Hours)

**ขั้นตอน**:
1. สร้าง rejection_request (ตาม Test 4.1)
2. รอ 24 ชั่วโมง หรือ **ปรับเวลาในฐานข้อมูล** เพื่อทดสอบ:
   ```sql
   UPDATE rejection_requests
   SET "autoCloseAt" = NOW() - INTERVAL '1 hour'
   WHERE "status" = 'pending';
   ```
3. รอ Cron รัน (ทุก 60 นาที) หรือ **รัน manual**:
   ```bash
   # TODO: สร้าง test script
   node backend/api-server/test-rejection-cron.js
   ```

**Expected**:
```
✅ rejection_request.status → auto_approved
✅ Job status → rejected_by_assignee
✅ Activity Log: "ระบบอนุมัติคำขอปฏิเสธอัตโนมัติ"
✅ ยกเลิง Chain/Children อัตโนมัติ
```

---

### Test 5: Job Chain Cancellation

**เป้าหมาย**: งาน Chain ยกเลิกต่อเนื่องเมื่องานก่อนหน้าถูกปฏิเสธ

**ขั้นตอน**:
1. สร้างงาน Chain: A → B → C
2. ให้ Approver ปฏิเสธงาน B

**Expected**:
```
✅ B status → rejected
✅ C status → cancelled (อัตโนมัติ)
✅ C.cancellationReason = "Previous job (B) was rejected"
✅ Activity Log บน C: "งานถูกยกเลิกเนื่องจากงานก่อนหน้าถูกปฏิเสธ"
```

---

### Test 6: Parent Job Closure (Partial Completion)

**เป้าหมาย**: Parent Job อัปเดตสถานะตาม Child Jobs

**ขั้นตอน**:
1. สร้าง Parent Job พร้อม 3 Child Jobs
2. ให้ 2 Child Jobs เสร็จ (completed)
3. ให้ 1 Child Job ปฏิเสธ (rejected_by_assignee)

**Expected**:
```
✅ Parent status → partially_completed
✅ Activity Log บน Parent: "Parent job partially completed: บาง child jobs ถูกปฏิเสธ"
✅ stats: { completed: 2, rejected: 1, total: 3 }
```

**Test Case 2**:
```
ทุก Child Jobs → completed
Expected: Parent status → completed
```

**Test Case 3**:
```
ทุก Child Jobs → rejected
Expected: Parent status → rejected
```

---

### Test 7: Job Chain Status Component

**เป้าหมาย**: แสดง Chain A → B → C ในหน้า JobDetail

**ขั้นตอน**:
1. สร้างงาน Chain: A → B → C
2. เข้า JobDetail ของงาน B

**Expected**:
```
✅ เห็น JobChainStatus component (กล่องสีม่วง)
✅ แสดง: [A] → [B (ปัจจุบัน)] → [C]
✅ แสดงสถานะของแต่ละงาน
✅ แสดง "📍 งานกลางสายงาน"
```

---

### Test 8: Parent Job Children List Component

**เป้าหมาย**: แสดงรายการ Child Jobs พร้อมสถิติ

**ขั้นตอน**:
1. สร้าง Parent Job พร้อม 5 Child Jobs
2. เข้า JobDetail ของ Parent Job

**Expected**:
```
✅ เห็น ParentJobChildrenList component
✅ แสดงสถิติ: เสร็จแล้ว X งาน, กำลังทำ Y งาน, รอดำเนินการ Z งาน
✅ Progress bar แสดง % ความสำเร็จ
✅ แสดงรายการ Child Jobs ทั้งหมดพร้อมสถานะ
✅ คลิกที่ Child → ไปหน้า JobDetail ของ Child นั้น
```

---

## 🐛 การ Debug (Troubleshooting)

### ปัญหา: Cron Service ไม่ทำงาน

**อาการ**: Rejection request ไม่ auto-approve หลังผ่าน 24 ชั่วโมง

**วิธีแก้**:
```bash
# 1. ตรวจสอบ backend logs เมื่อเริ่ม server
# ต้องเห็น: "✓ Rejection auto-close cron started"

# 2. ตรวจสอบว่า cron กำลังรัน
# ใน backend logs ควรเห็นทุก 60 นาที:
# [RejectionAutoClose] No expired rejection requests found
# หรือ
# [RejectionAutoClose] Found X expired rejection requests

# 3. ทดสอบ manual trigger (สร้าง test script)
cd backend/api-server
node -e "
  const cron = require('./src/services/rejectionAutoCloseCron.js');
  cron.manualTrigger().then(() => console.log('Done'));
"
```

---

### ปัญหา: Prisma Client Error

**อาการ**: `Error: Cannot find module '@prisma/client'` หรือ `Unknown argument 'rejectionRequests'`

**วิธีแก้**:
```bash
cd backend/prisma
npx prisma generate

# ถ้ายังไม่ได้
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

---

### ปัญหา: Frontend Components ไม่แสดง

**อาการ**: JobChainStatus หรือ ParentJobChildrenList ไม่แสดง

**วิธีแก้**:
1. เปิด DevTools Console → ดู errors
2. ตรวจสอบ job data:
   ```javascript
   // ใน JobDetail.jsx
   console.log('Job data:', job);
   // JobChainStatus ต้องการ: previousJobId หรือ nextJobId
   // ParentJobChildrenList ต้องการ: isParent=true && childJobs.length > 0
   ```

---

## 📋 Manual Testing Script

สร้างไฟล์ test script สำหรับทดสอบ:

```bash
# backend/api-server/test-rejection-workflow.sh
#!/bin/bash

echo "🧪 Testing Rejection Workflow..."

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"assignee@test.com","password":"password"}' \
  | jq -r '.data.accessToken')

# Create rejection request
curl -X POST http://localhost:3000/api/jobs/123/request-rejection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"ไม่มีเวลาเพียงพอ"}'

echo "✅ Rejection request created"

# Check status
curl -s http://localhost:3000/api/jobs/123 \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.status'

echo "Expected: pending_rejection"
```

---

## 📚 เอกสารเพิ่มเติม

ฉันได้สร้างเอกสารสรุป Workflow ทั้งหมดไว้ที่:

📄 **[JOB_WORKFLOW_DOCUMENTATION.md](./JOB_WORKFLOW_DOCUMENTATION.md)**

เอกสารนี้ครอบคลุม:
- Job Status Flow ทั้งหมด
- Approval Flow (หลายระดับ, Auto-approve, Skip approval)
- Job Acceptance & Assignee Actions
- Job Rejection (ทั้งระบบเดิมและใหม่)
- Job Cancellation & Chain Logic
- Parent-Child Jobs
- Job Chaining (Sequential)
- Multi-Role Union View
- API Endpoints ทั้งหมด
- Best Practices & Troubleshooting

---

## 🎯 สรุป: สิ่งที่คุณควรทำตอนนี้

### ลำดับความสำคัญ:

1. **สำคัญมาก** (ทำเลย!):
   - ✅ รัน migrations (2 ไฟล์)
   - ✅ Generate Prisma client
   - ✅ รีสตาร์ท Backend + Frontend

2. **สำคัญ** (ทำหลังจาก 1):
   - 🧪 Test Multi-Role Union View
   - 🧪 Test Auto-Approve Own Jobs
   - 🧪 Test Parent-Child Filter

3. **ค่อยทำได้** (หลังจาก 2 ใช้งานได้):
   - 🧪 Test Rejection Request Workflow
   - 🧪 Test Job Chain Cancellation
   - 🧪 Test Parent Job Closure

4. **ทำเมื่อมีเวลา**:
   - 📝 เขียน Unit Tests
   - 📝 เขียน Integration Tests
   - 📝 สร้าง Test Scripts อัตโนมัติ

---

## 🆘 ติดปัญหา?

ถ้าเจอปัญหาระหว่างทดสอบ:

1. ✅ **ดู Backend Logs ก่อน** - error messages มักบอกปัญหาชัดเจน
2. ✅ **ดู Frontend Console** - ตรวจสอบ API calls และ errors
3. ✅ **ตรวจสอบ Database** - ใช้ psql หรือ Prisma Studio
4. ✅ **อ่านเอกสาร** - ดู [JOB_WORKFLOW_DOCUMENTATION.md](./JOB_WORKFLOW_DOCUMENTATION.md)

---

**มีปัญหาหรือข้อสงสัย?**
ให้บันทึกข้อความ error ทั้งหมดและสอบถามได้เลย! 🚀

**เอกสารนี้สร้างโดย**: Claude Sonnet 4.5
**วันที่**: 26 กุมภาพันธ์ 2026
