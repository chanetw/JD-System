# 📋 DJ System — Job Status Flow Audit (ฉบับสมบูรณ์)

> **สร้างเมื่อ:** 2025-01-XX  
> **วัตถุประสงค์:** สรุป Flow สถานะงานทั้งหมดในระบบ ทุก Role ทุกสถานะ ทุกความเป็นไปได้  
> **ใช้เพื่อ:** ตรวจสอบความถูกต้องของระบบปัจจุบัน และวางแผนแก้ไขหากพบจุดที่ไม่ถูกต้อง

---

## 1. สถานะงานทั้งหมด (JobStatus Enum)

| # | Status | ภาษาไทย | คำอธิบาย |
|---|--------|---------|----------|
| 1 | `draft` | แบบร่าง | งานที่บันทึกไว้แต่ยังไม่ส่ง |
| 2 | `scheduled` | ตั้งเวลา | งานที่กำหนดให้ส่งในอนาคต |
| 3 | `submitted` | ส่งแล้ว | งานที่ส่งแล้ว (สถานะกลาง ก่อนเข้า pending_approval) |
| 4 | `pending_approval` | รออนุมัติ | รอผู้อนุมัติ Level 1 พิจารณา |
| 5 | `approved` | อนุมัติแล้ว | ผ่านการอนุมัติครบทุก Level แต่ยังไม่มี Assignee (รอ Manual Assign) |
| 6 | `assigned` | มอบหมายแล้ว | มี Assignee แล้ว แต่ยังไม่เริ่มทำ |
| 7 | `in_progress` | กำลังดำเนินการ | Assignee เปิดดูงานแล้ว เริ่มนับ SLA |
| 8 | `rework` | แก้ไขใหม่ | ถูกตีกลับให้แก้ไข |
| 9 | `assignee_rejected` | ผู้รับงานปฏิเสธ (Legacy) | Assignee ปฏิเสธงาน (flow เก่า — ส่งไป Approver/Requester ตัดสินใจ) |
| 10 | `rejected` | ถูกปฏิเสธ | Approver ปฏิเสธงาน หรือยืนยันการปฏิเสธของ Assignee (Final) |
| 11 | `rejected_by_assignee` | ถูกปฏิเสธโดยผู้รับงาน (Final) | Approver อนุมัติ Rejection Request ของ Assignee (flow ใหม่) |
| 12 | `cancelled` | ยกเลิก | ถูก cascade ยกเลิกจาก parent/chain job |
| 13 | `pending_rejection` | รอพิจารณาปฏิเสธ | Assignee ส่ง Rejection Request รอ Approver พิจารณา |
| 14 | `partially_completed` | เสร็จบางส่วน | Parent job ที่ child บางงานถูก reject |
| 15 | `completed` | เสร็จสมบูรณ์ | Assignee ส่งมอบงานแล้ว |
| 16 | `closed` | ปิดงาน | งานถูกปิดอย่างเป็นทางการ |

> **หมายเหตุ:** สถานะ `pending_level_N` (เช่น `pending_level_2`, `pending_level_3`) ไม่ได้อยู่ใน enum แต่ใช้เป็น string ในระบบสำหรับ multi-level approval

---

## 2. Roles ในระบบ

| Role | ภาษาไทย | สิทธิ์หลัก |
|------|---------|-----------|
| **Admin** | ผู้ดูแลระบบ | เห็นทุกอย่าง ทำได้ทุกอย่าง |
| **Requester** | ผู้เปิดงาน | สร้างงาน ติดตามงาน |
| **Approver** | ผู้อนุมัติ | อนุมัติ/ปฏิเสธงาน จัดการ Rejection Request |
| **Assignee** | ผู้รับงาน | รับงาน ทำงาน ส่งงาน ขอปฏิเสธ/ขอ Extend |

---

## 3. Sidebar เมนูตาม Role

| เมนู | เส้นทาง | Admin | Requester | Approver | Assignee |
|------|---------|:-----:|:---------:|:--------:|:--------:|
| แผงควบคุม (Dashboard) | `/` | ✅ | ✅ | ✅ | ✅ |
| สร้างงาน DJ ใหม่ | `/create` | ✅ | ✅ | ✅ | ❌ |
| รายการงาน DJ ทั้งหมด | `/jobs` | ✅ | ✅ | ✅ | ✅ |
| คิวงานรออนุมัติ | `/approvals` | ✅ | ❌ | ✅ | ❌ |
| คิวงานของฉัน (My Queue) | `/assignee/my-queue` | ✅ | ❌ | ❌ | ✅ |
| ศูนย์จัดการสื่อ (Media) | `/media-portal` | ✅ | ✅ | ✅ | ✅ |
| ข้อมูลผู้ใช้งาน | `/user-portal` | ✅ | ✅ | ✅ | ❌ |
| **Admin Section** | | | | | |
| ข้อมูลโครงสร้างองค์กร | `/admin/organization` | ✅ | ❌ | ❌ | ❌ |
| ผังการอนุมัติ (Flow) | `/admin/approval-flow` | ✅ | ❌ | ❌ | ❌ |
| จัดการผู้ใช้งาน | `/admin/users` | ✅ | ❌ | ❌ | ❌ |
| ประเภทงาน & SLA | `/admin/job-types` | ✅ | ❌ | ❌ | ❌ |
| ชิ้นงานย่อย | `/admin/job-type-items` | ✅ | ❌ | ❌ | ❌ |
| ปฏิทินวันหยุด | `/admin/holidays` | ✅ | ❌ | ❌ | ❌ |
| ตั้งค่าระบบ | `/admin/tenant-settings` | ✅ | ❌ | ❌ | ❌ |
| **Analytics Section** | | | | | |
| Dashboard ภาพรวม | `/analytics` | ✅ | ❌ | ❌ | ❌ |

---

## 4. MyQueue (Assignee) — Tab แยกตามสถานะ

| Tab | ชื่อ | สถานะที่แสดง | คำอธิบาย |
|-----|------|-------------|----------|
| `todo` | งานมาใหม่ | `assigned`, `approved`, `pending_dependency` | งานที่ได้รับมอบหมายยังไม่เริ่มทำ |
| `in_progress` | กำลังทำ | `in_progress` | งานที่เปิดดูแล้วเริ่มนับ SLA |
| `waiting` | รอตรวจ/แก้ | `correction`, `rework`, `returned`, `assignee_rejected` | งานที่ส่งแล้วรอผล หรือถูกตีกลับ |
| `done` | เสร็จแล้ว | `completed`, `closed` | งานที่ปิดสมบูรณ์ |

> **Backend Filter (Assignee default):** ซ่อนสถานะ `pending_approval`, `draft`, `scheduled`, `submitted`, และทุก `pending_level_*`

---

## 5. Flow สถานะงาน — ทุกสถานการณ์

### 5.1 🟢 Scenario A: งานปกติ — Skip Approval = true (ไม่ต้องอนุมัติ)

```
Requester สร้างงาน
    │
    ▼
[approved] ← สถานะเริ่มต้น (skip approval)
    │
    ├── ถ้ามี Auto-Assign (specific_user / dept_manager / project_assignment)
    │       │
    │       ▼
    │   [in_progress] ← Auto-assign + Auto-start ทันที
    │       │
    │       ▼ (ดู Section 5.5: Assignee ทำงาน)
    │
    └── ถ้าไม่มี Auto-Assign
            │
            ▼
        [approved] (assigneeId = null) ← รอ Admin/Manager Manual Assign
            │
            ▼ Admin มอบหมาย
        [in_progress] (assignJobManually → status = in_progress + startedAt)
```

**แต่ละ Role เห็นอะไร:**

| Role | เห็นงานนี้ที่ | Action ที่ทำได้ |
|------|-------------|---------------|
| Requester | รายการงาน DJ, Dashboard | ดูสถานะ ติดตาม |
| Admin | รายการงาน DJ, Dashboard | มอบหมาย (Manual Assign) ถ้า assignee ยังว่าง |
| Assignee | MyQueue > งานมาใหม่ (ถ้า approved + มี assigneeId) | เริ่มงาน (auto-start เมื่อเปิดดู) |

---

### 5.2 🟡 Scenario B: งานปกติ — ต้องอนุมัติ (1 Level)

```
Requester สร้างงาน
    │
    ▼
[pending_approval] ← สถานะเริ่มต้น (level 1)
    │
    ├── 🤖 Auto-Approve: ถ้า Requester เป็น Approver ของ Level 1
    │       │
    │       ▼
    │   [approved] → (ดู Auto-Assign ใน 5.1)
    │
    ├── ✅ Approver กด "Approve & Next"
    │       │
    │       ▼ (Level สุดท้าย → isFinal = true)
    │       │
    │       ├── ถ้ามี predecessorId (งานเรียงลำดับ)
    │       │       ▼
    │       │   [pending_dependency] ← รอ predecessor เสร็จก่อน
    │       │
    │       ├── ถ้ามี Auto-Assign
    │       │       ▼
    │       │   [in_progress] ← assign + start ทันที
    │       │
    │       └── ถ้าไม่มี Auto-Assign
    │               ▼
    │           [approved] (assigneeId = null) ← รอ Manual Assign
    │
    └── ❌ Approver กด "Reject / Return"
            │
            ▼
        [rejected] ← (Final) + Cascade Reject downstream jobs
```

**แต่ละ Role เห็นอะไร:**

| Role | สถานะ | เห็นที่ | Action |
|------|-------|-------|--------|
| Requester | `pending_approval` | รายการงาน DJ | ดูสถานะ รอ |
| Approver | `pending_approval` | คิวงานรออนุมัติ | **Approve & Next** หรือ **Reject / Return** |
| Assignee | - | ไม่เห็น (ถูกซ่อน) | - |

| Role | สถานะ | เห็นที่ | Action |
|------|-------|-------|--------|
| Requester | `rejected` | รายการงาน DJ | ดูเหตุผล |
| Approver | `rejected` | รายการงาน DJ | - |
| Assignee | - | ไม่เห็น | - |

---

### 5.3 🟠 Scenario C: งานปกติ — ต้องอนุมัติ (Multi-Level: 2+ Levels)

```
Requester สร้างงาน
    │
    ▼
[pending_approval] ← Level 1
    │
    ├── 🤖 Auto-Approve Level 1 (ถ้า Requester เป็น Approver)
    │       ▼
    │   [pending_level_2] ← ไปรอ Level 2
    │
    ├── ✅ Approver Level 1 กด Approve
    │       ▼
    │   [pending_level_2] ← ไปรอ Level 2
    │       │
    │       ├── ✅ Approver Level 2 กด Approve
    │       │       ▼
    │       │   [pending_level_3] (ถ้ามี) หรือ...
    │       │       ▼
    │       │   (Final Level) → เข้า Auto-Assign flow (ดู 5.1)
    │       │
    │       └── ❌ Approver Level 2 กด Reject
    │               ▼
    │           [rejected] ← (Final) + Cascade Reject
    │
    └── ❌ Approver Level 1 กด Reject
            ▼
        [rejected] ← (Final) + Cascade Reject
```

**Cascade Sequential:** เมื่อ Approve Level N → successor jobs (predecessorId) จะถูก cascade approve Level N ด้วยอัตโนมัติ

**แต่ละ Level เห็นอะไร:**

| สถานะ | Approver L1 เห็น | Approver L2 เห็น | Assignee เห็น |
|--------|:---:|:---:|:---:|
| `pending_approval` | ✅ ปุ่ม Approve/Reject | ❌ ไม่แสดงปุ่ม | ❌ ไม่เห็น |
| `pending_level_2` | ❌ ไม่แสดงปุ่ม | ✅ ปุ่ม Approve/Reject | ❌ ไม่เห็น |
| `pending_level_3` | ❌ | ❌ | ❌ |

---

### 5.4 🔴 Scenario D: งานด่วน (Urgent) — บังคับผ่าน Approval

```
Requester สร้างงาน (priority = "urgent")
    │
    ▼
[pending_approval] ← บังคับผ่าน Approval เสมอ (isSkip = false)
    │
    ▼ (เหมือน Scenario B/C ตามจำนวน Level)
```

> **กฎพิเศษ:** งาน Urgent จะถูกบังคับให้ผ่าน Approval Flow แม้ template จะตั้ง Skip Approval = true

---

### 5.5 🔵 Scenario E: Assignee ทำงาน (หลังจากได้รับมอบหมายแล้ว)

```
[assigned] หรือ [approved] (มี assigneeId)
    │
    ▼ Assignee เปิดดูงาน (JobDetail page)
    │  → Auto-Start: api.startJob(jobId, 'view')
    ▼
[in_progress] ← เริ่มนับ SLA
    │
    ├── ✅ Assignee กด "ส่งงาน" (Complete)
    │       │
    │       ▼
    │   [completed] ← completedAt = now, completedBy = userId
    │       │
    │       ├── แจ้ง Requester (Notification)
    │       ├── Trigger successor jobs (auto-start pending_dependency → assigned)
    │       └── ตรวจสอบ Parent Job Closure (ถ้าเป็น child)
    │
    ├── ❌ Assignee กด "ปฏิเสธงาน" (Legacy Flow)
    │       │
    │       ▼
    │   [assignee_rejected] ← rejectionSource = 'assignee'
    │       │
    │       ▼ (ดู Section 5.6)
    │
    ├── 📝 Assignee กด "ขอปฏิเสธงาน" (New Rejection Request Flow)
    │       │
    │       ▼
    │   [pending_rejection] ← สร้าง RejectionRequest record
    │       │
    │       ▼ (ดู Section 5.7)
    │
    └── 🔄 Assignee ขอ Extend Deadline
            │
            ▼
        [in_progress] ← (สถานะไม่เปลี่ยน แค่ขยาย dueDate)
```

**แต่ละ Role เห็นอะไร:**

| Role | สถานะ `in_progress` | Action |
|------|---------------------|--------|
| Assignee | MyQueue > กำลังทำ | **ส่งงาน**, **ปฏิเสธงาน**, **ขอ Extend** (ถ้า rejectionDeniedAt) |
| Requester | รายการงาน DJ | ดูสถานะ |
| Approver | รายการงาน DJ | ดูสถานะ |

---

### 5.6 🔴 Scenario F: Assignee ปฏิเสธงาน (Legacy — `assignee_rejected`)

```
[in_progress] หรือ [assigned]
    │
    ▼ Assignee กด "ปฏิเสธงาน" + ระบุเหตุผล
    │  → rejectJobByAssignee()
    ▼
[assignee_rejected]
    │
    ├── ✅ Approver/Requester กด "ยืนยันปฏิเสธงาน" (Confirm)
    │       │ → confirmAssigneeRejection()
    │       ▼
    │   [rejected] ← (Final) + แจ้ง Requester + Email
    │
    └── ❌ Approver/Requester กด "ไม่อนุมัติคำขอ (ให้ทำต่อ)" (Deny)
            │ → denyAssigneeRejection()
            ▼
        [in_progress] ← กลับไปทำต่อ + set rejectionDeniedAt
            │
            └── UI แสดงปุ่ม "ขอ Extend งาน" เพิ่มเติม
```

**แต่ละ Role เห็นอะไร:**

| Role | สถานะ `assignee_rejected` | Action |
|------|---------------------------|--------|
| Assignee | MyQueue > รอตรวจ/แก้ | รอผลการพิจารณา |
| Approver | รายการงาน DJ / คิวอนุมัติ | **ยืนยันปฏิเสธ** / **ไม่อนุมัติคำขอ** |
| Requester | รายการงาน DJ | **ยืนยันปฏิเสธ** / **ไม่อนุมัติคำขอ** (ถ้าไม่มี Approver) |
| Admin | ทุกที่ | **ยืนยันปฏิเสธ** / **ไม่อนุมัติคำขอ** |

---

### 5.7 🟣 Scenario G: Assignee ขอปฏิเสธงาน (New — Rejection Request)

```
[in_progress] หรือ [assigned] หรือ [rework]
    │
    ▼ Assignee กด "ขอปฏิเสธงาน" (Request Rejection)
    │  → POST /:id/request-rejection
    ▼
[pending_rejection] ← สร้าง RejectionRequest (autoCloseAt = 24h)
    │
    ├── ✅ Approver กด "อนุมัติ" (Approve Rejection Request)
    │       │ → POST /rejection-requests/:id/approve
    │       ▼
    │   [rejected_by_assignee] ← (Final)
    │       │
    │       ├── Cancel chained jobs (children + downstream)
    │       └── ตรวจสอบ Parent Job Closure
    │
    ├── ❌ Approver กด "ไม่อนุมัติ" (Deny Rejection Request)
    │       │ → POST /rejection-requests/:id/deny
    │       ▼
    │   [in_progress] ← กลับไปทำต่อ + แนะนำ Extend
    │
    └── ⏰ Auto-close (24h ไม่มีใครตอบ)
            ▼
        [rejected_by_assignee] ← (auto-approved)
```

**แต่ละ Role เห็นอะไร:**

| Role | สถานะ `pending_rejection` | Action |
|------|---------------------------|--------|
| Assignee | MyQueue (ยังอยู่ในสถานะทำงาน) | รอผลพิจารณา |
| Approver | คิวอนุมัติ / JobDetail | **อนุมัติคำขอปฏิเสธ** / **ไม่อนุมัติ** |
| Requester | รายการงาน DJ | ดูสถานะ (ถ้าเป็น fallback approver อาจเห็นปุ่ม) |

---

### 5.8 🔗 Scenario H: งานเรียงลำดับ (Sequential / Chain Jobs)

```
งาน A (predecessor)  →  งาน B (successor: predecessorId = A.id)
    │                       │
    ▼                       ▼
[pending_approval]      [pending_approval]
    │                       │
    ▼ Approve L1            ▼ Cascade Approve L1
[pending_level_2]       [pending_level_2] (ถ้ามี L2)
    │                       │            หรือ [pending_dependency]
    ▼ Approve L2            ▼ 
[approved → in_progress]  [pending_dependency] ← รอ A เสร็จ
    │
    ▼ A เสร็จ (completed)
    │  → jobService.onJobCompleted()
    │  → Auto-start successor
    ▼
                        [assigned] ← B พร้อมทำ (dueDate คำนวณใหม่จาก SLA)
```

**กฎ:**
- เมื่อ Approve ที่ Level N → successor ถูก cascade approve Level N ด้วย
- เมื่อ predecessor complete → successor เปลี่ยนจาก `pending_dependency` → `assigned`
- เมื่อ predecessor ถูก reject → successor ถูก cascade reject ด้วย

---

### 5.9 👨‍👩‍👧‍👦 Scenario I: งาน Parent-Child

```
Parent Job
    │
    ├── Child Job A (jobTypeId = 1)
    ├── Child Job B (jobTypeId = 2)
    └── Child Job C (jobTypeId = 3)
```

**สร้างงาน:**
- POST `/api/jobs/parent-child` → สร้าง Parent + Children ใน Transaction
- Parent: `isParent = true`, สถานะ `pending_approval`
- Children: `parentJobId = parent.id`, สถานะ `pending_approval`

**Cascade Approval:**
- เมื่อ Parent ถูก Approve (final) → Children ทั้งหมดถูก batch update เป็น `approved`
- แต่ละ Child จะถูก Auto-Assign ตาม flow config ของ jobType นั้นๆ

**Parent Closure:**
- เมื่อ Child ทุกตัวเป็น `completed`/`rejected_by_assignee`/`cancelled` → ตรวจสอบปิด Parent
- ถ้า Child ทุกตัว completed → Parent = `completed`
- ถ้า Child บางตัว rejected → Parent = `partially_completed`

---

### 5.10 📋 Scenario J: Manual Assignment (Admin/Manager)

```
[approved] (assigneeId = null)
    │
    ▼ Admin/Manager เลือกผู้รับงานจาก dropdown
    │  → assignJobManually()
    ▼
[in_progress] ← assignedAt + startedAt = now
```

**UI (JobActionPanel):**
- แสดง Panel "ต้องมอบหมายงาน (Pending Assignment)" เมื่อ `assigneeId = null` + `isAdmin || isDeptManager`
- Dropdown แสดงเฉพาะ user ที่มี role: `assignee`, `senior_designer`, `creative`

---

### 5.11 🔄 Scenario K: Reassignment (เปลี่ยนผู้รับงาน)

```
[in_progress] หรือ [assigned]
    │
    ▼ Admin/Manager กด "Reassign" + เลือกคนใหม่
    │  → POST /:id/reassign
    ▼
[in_progress] ← assigneeId = newAssigneeId (สถานะไม่เปลี่ยน)
```

---

### 5.12 🕐 Scenario L: Extend Deadline

```
[in_progress]
    │
    ▼ Assignee กด "ขอ Extend งาน" + ระบุจำนวนวันและเหตุผล
    │  → POST /:id/extend
    ▼
[in_progress] ← dueDate ถูกขยาย, extensionCount++
```

> **เงื่อนไข:** ปุ่ม Extend จะแสดงเฉพาะเมื่อ `rejectionDeniedAt` มีค่า (หลังจากคำขอปฏิเสธถูก Deny)

---

## 6. JobActionPanel — ปุ่ม Action แยกตามสถานะและ Role

### 6.1 renderApprovalActions() — ปุ่มอนุมัติ

| เงื่อนไข | ปุ่มที่แสดง |
|----------|-----------|
| `currentLevel > 0 && currentLevel < 999` + user อยู่ใน `flowSnapshot.levels[currentLevel].approvers` | **Approve & Next** + **Reject / Return** |
| Admin + isPending | **Approve & Next** + **Reject / Return** |

### 6.2 renderManualAssignment() — มอบหมายงาน

| เงื่อนไข | ปุ่มที่แสดง |
|----------|-----------|
| `assigneeId = null` + `isAdmin \|\| isDeptManager` | Dropdown เลือกผู้รับงาน + **มอบหมาย** |

### 6.3 renderAssigneeActions() — Assignee ทำงาน

| เงื่อนไข | ปุ่มที่แสดง |
|----------|-----------|
| `jobRole = 'assignee'` หรือ `'admin'` + สถานะ `assigned`, `in_progress`, `rework`, `approved` | **ส่งงาน** + **ปฏิเสธงาน** |
| เพิ่มเติม: `rejectionDeniedAt` มีค่า | **ขอ Extend งาน** |

### 6.4 renderAssigneeRejectionConfirm() — พิจารณาคำขอปฏิเสธ (Legacy)

| เงื่อนไข | ปุ่มที่แสดง |
|----------|-----------|
| `status = 'assignee_rejected'` + `isAdmin \|\| isApprover \|\| isRequester` | **ยืนยันปฏิเสธงาน** + **ไม่อนุมัติคำขอ (ให้ทำต่อ)** |

### 6.5 renderCloseActions() — ยืนยันปิดงาน

| เงื่อนไข | ปุ่มที่แสดง |
|----------|-----------|
| `status = 'pending_close'` | **ยืนยันปิดงาน** + **ขอให้แก้ไข** |

> **หมายเหตุ:** สถานะ `pending_close` มี UI อยู่แล้วแต่ **ปัจจุบันยังไม่ได้ใช้งาน** — งานจะเข้า `completed` ทันทีเมื่อ Assignee ส่งงาน

---

## 7. Notification Flow

| Event | แจ้งใคร | ช่องทาง |
|-------|--------|---------|
| งานสร้างใหม่ (pending_approval) | Approver (TODO) | - |
| อนุมัติ + Auto-Assign | Assignee | In-App Notification |
| อนุมัติ + ไม่มี Assignee | Admin ทั้งหมด | Email + In-App |
| งาน Complete | Requester | In-App Notification |
| Assignee ปฏิเสธ (Legacy) | Approver → Requester (fallback) | In-App + Email |
| Assignee Rejection Request | Approver (from flow) → Requester (fallback) | TODO |
| Denial of Rejection | Assignee | In-App + Email |
| Cascade Reject | Assignee ของงาน downstream | In-App |
| Successor Auto-Start | Assignee ของ successor | chain notification |

---

## 8. Flow Diagram (สรุป)

```
                    สร้างงาน
                        │
              ┌─────────┴──────────┐
              │                    │
         Skip Approval        Need Approval
              │                    │
              ▼                    ▼
          [approved]       [pending_approval]
              │                    │
              │          ┌─────────┼──────────┐
              │          │         │          │
              │     Auto-Approve  Approve    Reject
              │          │         │          │
              │          ▼         ▼          ▼
              │    [pending_level_2]     [rejected]
              │    หรือ [approved]          (END)
              │          │
              └────┬─────┘
                   │
          ┌────────┴─────────┐
          │                  │
     Has Auto-Assign    No Auto-Assign
          │                  │
          ▼                  ▼
    [in_progress]       [approved]
          │              (assigneeId=null)
          │                  │
          │            Admin Manual Assign
          │                  │
          ▼                  ▼
    [in_progress] ←──────────┘
          │
    ┌─────┼──────────────────┐
    │     │                  │
 Complete  Reject         Request Rejection
    │     │                  │
    ▼     ▼                  ▼
[completed] [assignee_    [pending_rejection]
    │     rejected]          │
    │     │            ┌─────┴─────┐
    │     │         Approve     Deny
    │     │            │          │
    │     ▼            ▼          ▼
    │  Confirm/Deny  [rejected_  [in_progress]
    │     │        by_assignee]
    │     │            (END)
    │  ┌──┴──┐
    │  │     │
    │  ▼     ▼
    │ [rejected] [in_progress]
    │  (END)   + Extend option
    │
    ▼
  Trigger Successors
  Check Parent Closure
    (END)
```

---

## 9. ⚠️ จุดที่อาจต้องตรวจสอบ/ปรับปรุง

### 9.1 ปัญหาที่พบจาก Code Review

| # | ประเด็น | รายละเอียด | ระดับ |
|---|---------|-----------|-------|
| 1 | **สถานะซ้ำซ้อน: `assignee_rejected` vs `rejected_by_assignee`** | มี 2 สถานะที่ทำหน้าที่คล้ายกัน — `assignee_rejected` (Legacy flow ใน approvalService) และ `rejected_by_assignee` (New Rejection Request flow ใน routes) | 🔴 สูง |
| 2 | **`pending_close` มี UI แต่ไม่มี Backend route ที่สร้างสถานะนี้** | JobActionPanel มี `renderCloseActions()` สำหรับ `pending_close` แต่ `completeJob()` เปลี่ยนตรงเป็น `completed` | 🟡 ปานกลาง |
| 3 | **`rework` ไม่มี route ที่สร้างสถานะนี้** | `rework` อยู่ใน Enum และ UI รองรับ แต่ไม่พบ route หรือ service ที่เปลี่ยนสถานะงานเป็น `rework` | 🔴 สูง |
| 4 | **`correction` และ `returned` ไม่มี route** | MyQueue แสดงสถานะเหล่านี้ในแท็บ "รอตรวจ/แก้" แต่ไม่มี backend route ที่สร้างสถานะเหล่านี้ | 🔴 สูง |
| 5 | **`updateJobStatusAfterApproval` (email flow) overwrite เป็น `in_progress` ทุกครั้ง** | บรรทัด 417-421: เมื่อ `newStatus = 'approved'` จะถูก override เป็น `in_progress` โดยไม่ตรวจสอบว่ามี assignee หรือไม่ | 🟡 ปานกลาง |
| 6 | **`pending_level_N` ไม่อยู่ใน Prisma Enum** | ใช้เป็น string โดยตรง ไม่ได้อยู่ใน `JobStatus` enum ของ Prisma — อาจมีปัญหากับ validation | 🟡 ปานกลาง |
| 7 | **Notification สำหรับ `pending_approval` ยังเป็น TODO** | Approver ไม่ได้รับแจ้งเตือนเมื่อมีงานรออนุมัติ | 🟡 ปานกลาง |
| 8 | **`autoAssignJob` (ตัวเก่า line 1418) มี bug: `jobTypeId: jobId`** | ใน query condition ใช้ `jobTypeId: jobId` แทน `jobTypeId: job.jobTypeId` | 🔴 สูง |
| 9 | **`submitted` ไม่มี flow ที่ใช้** | อยู่ใน enum แต่ไม่เห็นว่ามี route ไหนสร้างสถานะนี้ | 🟡 ปานกลาง |
| 10 | **`scheduled` ไม่มี flow ที่ใช้** | อยู่ใน enum แต่ไม่เห็น scheduler ที่จะเปลี่ยนจาก scheduled → pending_approval | 🟡 ปานกลาง |

### 9.2 ข้อเสนอปรับปรุง

| # | ข้อเสนอ | สถานะ | ผลกระทบ |
|---|---------|--------|---------|
| A | **รวม `assignee_rejected` กับ `rejected_by_assignee` เป็นตัวเดียว** | Backlog | ลดความซ้ำซ้อน ง่ายต่อการดูแล |
| B | **สร้าง route สำหรับ `rework`** | Backlog | Requester/Approver กดตีกลับงาน → เปลี่ยนเป็น `rework` |
| C | **สร้าง route สำหรับ `correction`/`returned`** | Backlog | หรือลบออกจาก UI ถ้าไม่ต้องการใช้ |
| D | **แก้ `updateJobStatusAfterApproval`** | Backlog | ตรวจสอบ assigneeId ก่อน override เป็น `in_progress` |
| E | **เพิ่ม Notification เมื่อมีงานรออนุมัติ** | Backlog | แจ้ง Approver ทาง In-App + Email |
| F | **ตัดสินใจเรื่อง `pending_close`** | ✅ **ปิดใช้งาน** | ไม่ใช้งาน ส่งงาน = completed ทันที |
| G | **แยกสถานะ `approved` กับ `in_progress`** | Backlog | ลบ auto-start ให้ Assignee กด "เริ่มงาน" เอง |
| H | **เพิ่ม Notification เมื่องานอนุมัติแล้วไม่มี assignee** | Backlog | แจ้ง Admin ทาง In-App + Email |

### 9.3 ✅ ตัดสินใจแล้ว (ปิดใช้งาน)

| # | สถานะ | การดำเนินการ |
|---|--------|---------------|
| F | `pending_close` | **ปิดใช้งาน** — ส่งงานถือว่าปิดงานแล้ว (`completed` ทันที) |

### 9.4 📋 สถานะงานที่ถูกต้อง (อัปเดตล่าสุด)

| สถานะในระบบ | แสดงใน DJ List | ความหมาย | ใครทำอะไร |
|--------------|----------------|----------|-----------|
| `pending_approval` | "รออนุมัติ" | รอ Approver พิจารณา | Approver อนุมัติ/ปฏิเสธ |
| `approved` | "ยังไม่มอบหมาย" | อนุมัติแล้ว รอมอบหมาย | 📢 Admin แจ้งเตือน |
| `assigned` | "ได้รับมอบหมาย" | มอบหมายแล้ว แต่ยังไม่เริ่ม | Assignee เปิดดู |
| `in_progress` | "กำลังดำเนินการ" | เริ่มทำจริงแล้ว | Assignee ทำงาน |
| `completed` | "เสร็จสมบูรณ์" | ส่งมอบแล้ว | Requester ตรวจสอบ |
| `rejected` | "ถูกปฏิเสธ" | ถูกปฏิเสธ | - |

> **หมายเหตุ:** ปิดใช้งาน `pending_close` และ `renderCloseActions()` แต่ยังคงไว้ใน code เพื่ออนาคต |

---

## 10. API Endpoints สรุป

| Method | Path | Action | ใครเรียก |
|--------|------|--------|---------|
| POST | `/api/jobs` | สร้างงาน (Single) | Requester, Admin |
| POST | `/api/jobs/parent-child` | สร้างงาน Parent-Child | Requester, Admin |
| GET | `/api/jobs/:id` | ดูรายละเอียดงาน | ทุก Role |
| POST | `/api/jobs/:id/approve` | อนุมัติงาน | Approver, Admin |
| POST | `/api/jobs/:id/reject` | ปฏิเสธงาน | Approver, Admin |
| POST | `/api/jobs/:id/complete` | ส่งมอบงาน | Assignee |
| POST | `/api/jobs/:id/reject-by-assignee` | Assignee ปฏิเสธ (Legacy) | Assignee |
| POST | `/api/jobs/:id/confirm-assignee-rejection` | ยืนยันปฏิเสธ (Legacy) | Approver, Requester |
| POST | `/api/jobs/:id/deny-assignee-rejection` | ไม่อนุมัติคำขอปฏิเสธ (Legacy) | Approver, Requester |
| POST | `/api/jobs/:id/request-rejection` | ขอปฏิเสธงาน (New) | Assignee |
| POST | `/api/jobs/rejection-requests/:id/approve` | อนุมัติ Rejection Request | Approver |
| POST | `/api/jobs/rejection-requests/:id/deny` | ไม่อนุมัติ Rejection Request | Approver |
| POST | `/api/jobs/:id/reassign` | เปลี่ยนผู้รับงาน | Admin, Manager |
| POST | `/api/jobs/:id/extend` | ขอขยาย Deadline | Assignee |
| GET | `/api/jobs/:id/sla-info` | ดูข้อมูล SLA | ทุก Role |

---

> **เอกสารนี้สร้างจากการวิเคราะห์ source code จริง** ไม่ใช่ assumption  
> ไฟล์หลักที่ใช้อ้างอิง:
> - `backend/prisma/schema.prisma` (JobStatus enum)
> - `backend/api-server/src/routes/jobs.js` (API routes)
> - `backend/api-server/src/services/approvalService.js` (Business logic)
> - `backend/api-server/src/services/jobService.js` (Chain/successor logic)
> - `frontend/src/modules/core/layout/Sidebar.jsx` (Menu visibility)
> - `frontend/src/modules/features/job-management/components/JobActionPanel.jsx` (Action buttons)
> - `frontend/src/modules/features/assignee/pages/MyQueue.jsx` (Assignee queue tabs)
> - `frontend/src/modules/features/job-management/pages/JobDetail.jsx` (Auto-start logic)
> - `frontend/src/modules/shared/utils/permission.utils.js` (Role checking)
