# 📋 DJ System - Job Flow ตาม Role

> สรุปจากการวิเคราะห์ code ทั้ง Backend และ Frontend
> วันที่: 2026-03-11

---

## 🔄 Job Status ทั้งหมดในระบบ

```
draft → pending_approval → pending_level_N → approved → assigned → in_progress → draft_review → completed → closed
                     ↓                                      ↓            ↓              ↓
                  rejected                            pending_rejection  correction    returned
                                                           ↓              ↓
                                                       cancelled        rework
```

### Status ที่เป็นไปได้:
| Status | คำอธิบาย |
|--------|----------|
| `pending_approval` | รออนุมัติ Level 1 |
| `pending_level_N` | รออนุมัติ Level N (N=2,3,...) |
| `approved` | อนุมัติแล้ว รอมอบหมาย |
| `assigned` | มอบหมายแล้ว รอเริ่มงาน |
| `in_progress` | กำลังดำเนินการ |
| `draft_review` | ส่ง Draft รอตรวจ |
| `correction` | แก้ไขตามที่ร้องขอ |
| `rework` | ทำใหม่ |
| `returned` | ส่งกลับให้แก้ไข |
| `completed` | เสร็จสมบูรณ์ |
| `closed` | ปิดงาน |
| `rejected` | ถูกปฏิเสธ (Approver) |
| `pending_rejection` | Assignee ขอปฏิเสธงาน รอ Approver พิจารณา |
| `cancelled` | ยกเลิก |
| `pending_dependency` | รอ predecessor job เสร็จก่อน (Sequential Chain) |
| `scheduled` | กำหนดเวลาไว้ล่วงหน้า |

---

## 👥 Role ที่เกี่ยวข้อง

| Role | หน้าที่ |
|------|---------|
| **Requester** | ผู้สร้างงาน |
| **Approver (Level 1-N)** | ผู้อนุมัติงาน (อาจมีหลาย Level) |
| **Assignee** | ผู้รับผิดชอบงาน (นักออกแบบ) |
| **Admin/Superadmin** | ดูแลระบบ เห็นงานทั้งหมด |

---

## 📌 1. การสร้างงาน (Create Job)

### Flow:
```
Requester กด "สร้างงาน" → POST /api/jobs
    ↓
Step 1: Validate Input (projectId, jobTypeId, subject, dueDate)
    ↓
Step 2: Get Approval Flow → หา Template ที่ match (Project + JobType)
    ↓
Step 3: Check Skip Approval
    - งาน urgent → บังคับผ่าน Approval เสมอ (isSkip = false)
    - งานปกติ → ใช้ skipApproval ตาม Template
    ↓
Step 4: Generate DJ ID (DJ-YYMMDD-XXXX)
    ↓
Step 5: Create Job
    - Skip = true → status = 'approved' → Auto-Assign → 'in_progress'
    - Skip = false → status = 'pending_approval'
    ↓
Step 6: Auto-Approve (ถ้า Requester เป็น Approver Level 1)
    ↓
Step 7: Create Activity Log
    ↓
Step 8: Notification (ยังเป็น TODO — ดูหมายเหตุด้านล่าง)
```

### แต่ละ Role เห็นอะไร:

| เหตุการณ์ | Requester | Approver 1 | Approver 2 | Assignee |
|-----------|-----------|------------|------------|----------|
| สร้างงาน (ปกติ) | ✅ เห็นทันที (My Queue, role=requester) | ✅ เห็นทันที (Approvals Queue, status=pending_approval) | ❌ ยังไม่เห็น (รอ Level 1 อนุมัติก่อน) | ❌ ยังไม่เห็น |
| สร้างงาน (Skip Approval) | ✅ เห็นทันที | ❌ ไม่ต้องอนุมัติ | ❌ ไม่ต้องอนุมัติ | ✅ เห็นทันที (ถ้า Auto-Assign) |
| สร้างงาน (Urgent) | ✅ เห็นทันที | ✅ เห็นทันที (บังคับ Approval) | ❌ รอ Level 1 | ❌ ยังไม่เห็น |

### Notification & Email:
| เหตุการณ์ | ใครได้รับ | ช่องทาง | Status |
|-----------|----------|---------|--------|
| สร้างงาน (pending_approval) | Approver | ❌ **ยังไม่ส่ง** (TODO ใน code) | `// Step 9: TODO` |
| สร้างงาน (Skip + Auto-Assign) | Assignee | ❌ **ยังไม่ส่ง** (TODO ใน code) | `// Step 9: TODO` |

> ⚠️ **หมายเหตุ**: `POST /api/jobs` (Step 9) มี comment `// TODO: แจ้งเตือนผู้ที่เกี่ยวข้อง` — ยังไม่ได้ implement notification ตอนสร้างงาน
> แต่ถ้าใช้ `POST /api/approvals/request` แยก จะส่ง notification + email ให้ Approver

---

## 📌 2. การอนุมัติงาน (Approve)

### Flow:
```
Approver กด "อนุมัติ" → POST /api/jobs/:id/approve (Web)
                      → POST /api/approvals/approve (Email Link)
    ↓
approvalService.approveJobViaWeb()
    ↓
ตรวจสอบ: user เป็น approver ของ current level หรือไม่
    ↓
อัปเดต Approval record → status = 'approved'
    ↓
ตรวจสอบ: อนุมัติครบทุก Level หรือยัง?
    - ยังไม่ครบ → status = 'pending_level_N+1'
    - ครบแล้ว → status = 'approved' → Auto-Assign → 'in_progress'
    ↓
(ถ้า Urgent) → Trigger reschedule งานอื่นที่ assignee เดียวกัน
```

### แต่ละ Role เห็นอะไร:

| เหตุการณ์ | Requester | Approver 1 | Approver 2 | Assignee |
|-----------|-----------|------------|------------|----------|
| Approver 1 อนุมัติ (มี Level 2) | ✅ เห็น status เปลี่ยน | ✅ เห็น (history) | ✅ เห็นแล้ว (status=pending_level_2) | ❌ ยังไม่เห็น |
| Approver 2 อนุมัติ (Level สุดท้าย) | ✅ เห็น status=approved | ✅ เห็น (history) | ✅ เห็น (history) | ✅ เห็น (ถ้า Auto-Assign) |

### Notification & Email:
| เหตุการณ์ | ใครได้รับ | ช่องทาง |
|-----------|----------|---------|
| อนุมัติผ่าน Email Link | **Requester** → "งานได้รับการอนุมัติ" | ✅ In-app + Email |
| อนุมัติผ่าน Email Link | **Assignee** → "ได้รับมอบหมายงานใหม่" | ✅ In-app + Email (ถ้ามี assignee) |
| อนุมัติผ่าน Web | ❌ **ไม่ส่ง notification** (ใช้แค่ approvalService result) | ❌ ไม่ส่ง |

> ⚠️ **หมายเหตุ**: `POST /api/jobs/:id/approve` (Web Action) **ไม่ได้ส่ง notification/email** หลัง approve สำเร็จ
> แต่ `POST /api/approvals/approve` (Email Link) **ส่ง notification + email** ให้ Requester และ Assignee

---

## 📌 3. การปฏิเสธงาน (Reject)

### 3a. Approver ปฏิเสธ

```
Approver กด "ปฏิเสธ" → POST /api/jobs/:id/reject (Web)
                      → POST /api/approvals/reject (Email Link)
    ↓
approvalService.rejectJobViaWeb()
    ↓
อัปเดต Job → status = 'rejected'
    ↓
Cancel chained/child jobs (ถ้ามี)
```

| เหตุการณ์ | Requester | Approver | Assignee |
|-----------|-----------|----------|----------|
| Approver ปฏิเสธ | ✅ เห็น status=rejected | ✅ เห็น (history) | ❌ ไม่เกี่ยว (ยังไม่มี assignee) |

### Notification (Reject):
| ช่องทาง | Email Link | Web Action |
|---------|-----------|------------|
| Requester → "งานถูกปฏิเสธ" | ✅ In-app + Email | ❌ ไม่ส่ง |
| Cascade reject (downstream jobs) | ✅ In-app (assignee ของงานที่ถูก cancel) | ✅ In-app |

### 3b. Assignee ขอปฏิเสธงาน

```
Assignee กด "ขอปฏิเสธ" → POST /api/jobs/:id/request-rejection
    ↓
สร้าง rejection_request record (status=pending)
    ↓
Job → status = 'pending_rejection'
    ↓
Auto-close ใน 1 วันทำงาน (ถ้า Approver ไม่ตอบ)
```

| เหตุการณ์ | Requester | Approver | Assignee |
|-----------|-----------|----------|----------|
| Assignee ขอปฏิเสธ | ✅ เห็น status=pending_rejection | ✅ เห็น (Approvals Queue) | ✅ เห็น status เปลี่ยน |

### Notification (Request Rejection):
> ⚠️ **TODO ใน code**: `// TODO: Send notification to approvers (via Socket.io or email)` — ยังไม่ส่ง notification

---

## 📌 4. การส่งงาน Draft (Submit Draft)

### Flow:
```
Assignee กด "ส่ง Draft" → POST /api/jobs/:id/submit-draft
    ↓
ตรวจสอบ: status ต้องเป็น assigned/in_progress/correction/rework/returned/draft_review
    ↓
Job → status = 'draft_review', draftCount++
    ↓
Notify Requester + Approvers (In-app + Email)
```

| เหตุการณ์ | Requester | Approver | Assignee |
|-----------|-----------|----------|----------|
| ส่ง Draft | ✅ เห็น status=draft_review | ✅ เห็น (ถ้าเป็น approver ของงาน) | ✅ เห็น status เปลี่ยน |

### Notification & Email:
| ใครได้รับ | ช่องทาง |
|----------|---------|
| **Requester** → "Draft งาน DJ-xxx ส่งมาแล้ว" | ✅ In-app Notification |
| **Approvers** (ทุก Level จาก flowSnapshot) | ✅ In-app Notification |
| **Requester + Approvers** → Email | ✅ Email (HTML) พร้อมลิงก์ Draft |

> ✅ **Submit Draft เป็น action ที่ส่ง notification ครบที่สุด** — ทั้ง In-app และ Email

---

## 📌 5. การจบงาน (Complete)

### Flow:
```
Assignee กด "จบงาน" → POST /api/jobs/:id/complete
    ↓
approvalService.completeJob()
    ↓
Job → status = 'completed', completedAt = now
    ↓
Trigger Job Chain: Auto-start successor jobs (ถ้ามี)
    ↓
Check Parent Job Closure (ถ้าเป็น child job)
```

| เหตุการณ์ | Requester | Approver | Assignee |
|-----------|-----------|----------|----------|
| จบงาน | ✅ เห็น status=completed | ✅ เห็น (history) | ✅ เห็น status เปลี่ยน |

### Notification (Complete):
| ใครได้รับ | ช่องทาง |
|----------|---------|
| Next job in chain (assignee) | ✅ In-app (chainService.notifyNextJob) |

---

## 📌 6. การเริ่มงาน (Start)

```
Assignee กด "เริ่มงาน" → POST /api/jobs/:id/start
    ↓
Job → status = 'in_progress', startedAt = now
```

| เหตุการณ์ | Requester | Approver | Assignee |
|-----------|-----------|----------|----------|
| เริ่มงาน | ✅ เห็น status เปลี่ยน | ✅ เห็น (history) | ✅ เห็น |

### Notification: ❌ ไม่ส่ง

---

## 📌 7. การย้ายงาน (Reassign)

```
Owner/Admin กด "ย้ายงาน" → POST /api/jobs/:id/reassign
    ↓
Job → assigneeId = newAssigneeId
```

### Notification: ❌ ไม่ส่ง (เฉพาะ Activity Log)

---

## 📌 8. การยกเลิกงาน (Cancel)

> ⚠️ **ไม่มี explicit cancel route** — การยกเลิกเกิดจาก:
> 1. Approver reject → status = 'rejected'
> 2. Assignee request-rejection → approved → status = 'cancelled'
> 3. Chain cancellation → downstream jobs ถูก cancel อัตโนมัติ

---

## 🔔 สรุป Notification & Email Matrix

| Action | ใครได้ In-app | ใครได้ Email | สถานะ |
|--------|-------------|-------------|-------|
| สร้างงาน (pending_approval) | ❌ ไม่มี | ❌ ไม่มี | ⚠️ TODO |
| สร้างงาน (Auto-Assign) | ❌ ไม่มี | ❌ ไม่มี | ⚠️ TODO |
| อนุมัติ (Email Link) | Requester, Assignee | Requester, Assignee | ✅ ทำงานแล้ว |
| อนุมัติ (Web) | ❌ ไม่มี | ❌ ไม่มี | ⚠️ ไม่ส่ง |
| ปฏิเสธ (Email Link) | Requester | Requester | ✅ ทำงานแล้ว |
| ปฏิเสธ (Web) | ❌ ไม่มี | ❌ ไม่มี | ⚠️ ไม่ส่ง |
| Assignee ขอปฏิเสธ | ❌ ไม่มี | ❌ ไม่มี | ⚠️ TODO |
| ส่ง Draft | Requester, Approvers | Requester, Approvers | ✅ ทำงานแล้ว |
| จบงาน | Next chain assignee | ❌ ไม่มี | ⚠️ บางส่วน |
| เริ่มงาน | ❌ ไม่มี | ❌ ไม่มี | ❌ ไม่ส่ง |
| ย้ายงาน | ❌ ไม่มี | ❌ ไม่มี | ❌ ไม่ส่ง |
| Cascade reject | Downstream assignees | ❌ ไม่มี | ✅ In-app เท่านั้น |

---

## 👁️ Dashboard Visibility (GET /api/jobs)

### Query Logic ตาม Role:

| Role | Where Condition | เห็นงานไหน |
|------|----------------|-----------|
| `requester` | `requesterId = userId` | งานที่ตัวเองสร้าง (ทั้งหมด) |
| `assignee` | `assigneeId = userId, isParent=false` | งานที่ตัวเองรับผิดชอบ (เฉพาะ child/single, ไม่รวม parent) |
| `approver` | Complex logic: ตรวจ approval flow ของแต่ละ project+jobType | งานที่ตัวเองเป็น approver (current level + history) |
| `admin` | `{}` (ไม่มี filter เพิ่ม) | งานทั้งหมดใน tenant |

### Multi-Role Query:
- Frontend ส่ง `role=requester,approver` (comma-separated)
- Backend สร้าง `OR` condition → Prisma query เดียว (ไม่ duplicate)
- ⚠️ **แต่ lazy load (infinite scroll) อาจทำให้เกิด duplicate** — ดู bug fix ด้านล่าง

---

## 🐛 Known Bug: Dashboard Duplicate Key

**อาการ**: React warning `Encountered two children with the same key` ที่ Dashboard.jsx:811

**สาเหตุ**: Lazy load append ที่ `fetchQueueJobs`:
```javascript
setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
```
ถ้าระหว่าง page 1 กับ page 2 มีงานเพิ่ม/เปลี่ยน status → skip-based pagination อาจส่ง job ซ้ำ

**แก้ไข**: Deduplicate ด้วย `Map` ก่อน set state — ดู commit ที่แก้ไข
