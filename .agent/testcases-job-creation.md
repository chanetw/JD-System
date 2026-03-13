# 🧪 Test Cases: การสร้างงาน (Job Creation)
> ครอบคลุมทุก Flow ตาม Role และ Approval Chain Configuration

---

## 📌 Roles ในระบบ
| Role | คำอธิบาย |
|------|---------|
| `admin` | สร้างงาน, จัดการระบบ, Reset password |
| `requester` | สร้างงาน, ติดตามงาน |
| `approver` | อนุมัติ/ปฏิเสธงาน |
| `assignee` | รับงาน, ส่งมอบงาน |

---

## 📌 Job Statuses ที่เกี่ยวข้อง
| Status | ความหมาย |
|--------|---------|
| `pending_approval` | รออนุมัติ Level 1 |
| `pending_level_2` | รออนุมัติ Level 2 |
| `pending_level_3` | รออนุมัติ Level 3 |
| `approved` | อนุมัติแล้ว (รอ assign) |
| `in_progress` | กำลังทำงาน |
| `pending_dependency` | รอ predecessor งานอื่น |
| `rejected` | ถูกปฏิเสธ |

---

## 🗂️ Case Group 1: ไม่มี Approval Flow (Skip Approval)

### ✅ TC-01: Requester สร้างงาน + Skip Approval + Auto-Assign

**เงื่อนไข:**
- ApprovalFlow ของ Project นี้มี `skipApproval = true`
- มี `autoAssignUserId` กำหนดไว้ใน Flow

**Flow:**
```
Requester สร้างงาน
    ↓
ระบบตรวจสอบ ApprovalFlow → skipApproval = true
    ↓
Job Status → in_progress (ข้ามการอนุมัติ)
    ↓
Auto-Assign ให้ Assignee ที่กำหนดไว้ใน Flow
    ↓
📧 Email → Assignee (แจ้งได้รับงาน + Magic Link)
🔔 Notification → Assignee
```

**ผลที่คาดหวัง:**
- Job Status = `in_progress`
- Assignee ได้รับ Email + Notification
- ไม่มี Approval record ถูกสร้าง

---

### ✅ TC-02: Requester สร้างงาน + Skip Approval + ไม่มี Auto-Assign

**เงื่อนไข:**
- ApprovalFlow มี `skipApproval = true`
- ไม่มี `autoAssignUserId`

**Flow:**
```
Requester สร้างงาน
    ↓
ระบบตรวจสอบ ApprovalFlow → skipApproval = true
    ↓
Job Status → approved (รอ assign ด้วยมือ)
    ↓
Admin/Requester Reassign งานให้ Assignee
    ↓
📧 Email → Assignee (แจ้งได้รับงาน + Magic Link)
🔔 Notification → Assignee
```

**ผลที่คาดหวัง:**
- Job Status = `approved`
- ไม่มีใครรับงานจนกว่าจะ Reassign

---

### ✅ TC-03: Requester สร้างงาน + ไม่มี ApprovalFlow เลย

**เงื่อนไข:**
- ไม่มี ApprovalFlow ที่ match กับ Project นี้

**Flow:**
```
Requester สร้างงาน
    ↓
ระบบหา ApprovalFlow → ไม่พบ
    ↓
Job Status → pending_approval (default: ต้องอนุมัติ 1 level)
    ↓
🔔 Notification → Approver Level 1 (ถ้ากำหนดไว้)
📧 Email → Approver Level 1
```

**ผลที่คาดหวัง:**
- Job Status = `pending_approval`
- รอ Approver อนุมัติ

---

## 🗂️ Case Group 2: มี Approval Flow 1 Level

### ✅ TC-04: Requester สร้างงาน → Approver อนุมัติ → Auto-Assign

**เงื่อนไข:**
- ApprovalFlow มี 1 Level
- มี `autoAssignUserId` ใน Flow

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval
📧 Email → Approver Level 1 (Magic Link "อนุมัติทันที")
🔔 Notification → Approver Level 1
    ↓
Approver กดอนุมัติ (ผ่าน Magic Link หรือ Web)
    ↓
Job Status → in_progress (Final Approval + Auto-Assign)
📧 Email → Requester (แจ้งอนุมัติแล้ว)
📧 Email → Assignee (แจ้งได้รับงาน + Magic Link)
🔔 Notification → Requester
🔔 Notification → Assignee
```

**ผลที่คาดหวัง:**
- Job Status = `in_progress`
- Requester + Assignee ได้รับ Email + Notification

---

### ✅ TC-05: Requester สร้างงาน → Approver ปฏิเสธ

**เงื่อนไข:**
- ApprovalFlow มี 1 Level

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval
📧 Email → Approver Level 1
    ↓
Approver กด Reject พร้อมเหตุผล
    ↓
Job Status → rejected
📧 Email → Requester (แจ้งถูกปฏิเสธ + เหตุผล + Magic Link)
🔔 Notification → Requester
```

**ผลที่คาดหวัง:**
- Job Status = `rejected`
- Requester ได้รับ Email พร้อมเหตุผล

---

## 🗂️ Case Group 3: มี Approval Flow 2 Levels

### ✅ TC-06: 2-Level Approval → อนุมัติทั้งคู่ → Auto-Assign

**เงื่อนไข:**
- ApprovalFlow มี 2 Levels
- Level 1: Approver A
- Level 2: Approver B
- มี `autoAssignUserId`

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval (Level 1)
📧 Email → Approver A (Magic Link)
🔔 Notification → Approver A
    ↓
Approver A อนุมัติ
    ↓
Job Status → pending_level_2
📧 Email → Approver B (Magic Link)
🔔 Notification → Approver B
    ↓
Approver B อนุมัติ (Final)
    ↓
Job Status → in_progress (Auto-Assign)
📧 Email → Requester (อนุมัติแล้ว)
📧 Email → Assignee (ได้รับงาน + Magic Link)
🔔 Notification → Requester
🔔 Notification → Assignee
```

**ผลที่คาดหวัง:**
- มี 2 Approval records
- Job Status = `in_progress`

---

### ✅ TC-07: 2-Level Approval → Level 1 อนุมัติ → Level 2 ปฏิเสธ

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval
📧 Email → Approver A
    ↓
Approver A อนุมัติ
    ↓
Job Status → pending_level_2
📧 Email → Approver B
    ↓
Approver B ปฏิเสธ
    ↓
Job Status → rejected
📧 Email → Requester (แจ้งถูกปฏิเสธ + เหตุผล + Magic Link)
🔔 Notification → Requester
```

**ผลที่คาดหวัง:**
- Job Status = `rejected`
- Approval Level 1 = approved, Level 2 = rejected

---

### ✅ TC-08: 2-Level Approval → Level 1 ปฏิเสธ (ไม่ถึง Level 2)

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval
📧 Email → Approver A
    ↓
Approver A ปฏิเสธ
    ↓
Job Status → rejected (ไม่ส่งต่อ Level 2)
📧 Email → Requester
🔔 Notification → Requester
```

**ผลที่คาดหวัง:**
- Job Status = `rejected`
- Approver B ไม่ได้รับ Email/Notification

---

## 🗂️ Case Group 4: มี Approval Flow 3 Levels

### ✅ TC-09: 3-Level Approval → อนุมัติทั้งหมด

**Flow:**
```
Requester สร้างงาน
    ↓
Job Status → pending_approval (Level 1)
📧 Email → Approver A
    ↓ อนุมัติ
Job Status → pending_level_2
📧 Email → Approver B
    ↓ อนุมัติ
Job Status → pending_level_3
📧 Email → Approver C
    ↓ อนุมัติ (Final)
Job Status → in_progress
📧 Email → Requester + Assignee
🔔 Notification → Requester + Assignee
```

---

## 🗂️ Case Group 5: Predecessor / Chain Jobs

### ✅ TC-10: Final Approval + มี Predecessor (ต้องรองาน)

**เงื่อนไข:**
- งาน B มี `predecessorId` = งาน A
- งาน A ยังไม่เสร็จ

**Flow:**
```
Requester สร้างงาน B (predecessor = งาน A)
    ↓
Approval Flow ปกติ (1-3 Level)
    ↓
Final Approval ผ่าน
    ↓
Job Status → pending_dependency (ไม่ใช่ in_progress!)
    ↓
... รองาน A ให้เสร็จก่อน ...
    ↓
งาน A เสร็จสิ้น
    ↓
ระบบ Auto-check → งาน B → in_progress
```

**ผลที่คาดหวัง:**
- หลัง Final Approve: Job B Status = `pending_dependency`
- หลังงาน A เสร็จ: Job B Status = `in_progress`

---

## 🗂️ Case Group 6: Urgent Jobs

### ✅ TC-11: สร้างงาน Priority = Urgent + Specific Flow มี skipApproval

**เงื่อนไข:**
- Specific Flow (project+jobType) มี `skipApproval = true`
- Default Flow มี 2 Levels

**Flow:**
```
Requester สร้างงาน Priority = urgent
    ↓
ระบบหา Flow → Specific Flow มี skipApproval
    → ข้าม Specific Flow → ใช้ Default Flow (2 Levels)
    ↓
Job Status → pending_approval
📧 Email → Approver Level 1
```

**ผลที่คาดหวัง:**
- งาน Urgent ไม่ข้าม Default Flow
- ต้องอนุมัติตาม Default Flow ปกติ

---

## 🗂️ Case Group 7: Email + Magic Link Verification

### ✅ TC-12: Approver คลิก Magic Link → Auto Login → Approve

**Flow:**
```
Approver ได้รับ Email
    ↓
คลิกปุ่ม "🔐 อนุมัติงานทันที (ไม่ต้อง Login)"
    ↓
Browser เปิด /auth/magic-link?token=xxx
    ↓
Frontend ส่ง token ไป /api/magic-link/verify
    ↓
Backend ตรวจสอบ token (valid, ไม่หมดอายุ, ยังไม่ถูกใช้)
    ↓
Backend คืน access_token + user + target_url
    ↓
Frontend บันทึก token ลง localStorage
    ↓
Redirect ไปหน้างาน /jobs/:id
    ↓
Approver กดอนุมัติจากหน้า Job Detail
```

**ผลที่คาดหวัง:**
- Token ถูก mark `used = true` หลังใช้แล้ว
- ครั้งที่ 2 คลิก Link เดิม → Error "Token already used"
- Token หมดอายุ (24h) → Error "Token expired"

---

### ✅ TC-13: Magic Link Token หมดอายุ

**Flow:**
```
Token ถูกสร้างเมื่อ 25 ชั่วโมงที่แล้ว
    ↓
Approver คลิก Magic Link
    ↓
Frontend เปิด /auth/magic-link?token=xxx
    ↓
Backend ตรวจสอบ → expires_at < now()
    ↓
Error: "Magic Link หมดอายุแล้ว"
    ↓
Frontend แสดงหน้า Error พร้อมปุ่ม "ไปหน้า Login"
```

**ผลที่คาดหวัง:**
- แสดง Error message ภาษาไทย
- มีปุ่ม redirect ไปหน้า Login

---

## 🗂️ Case Group 8: Edge Cases

### ✅ TC-14: Requester สร้างงานโดยตัวเองอยู่ใน Approval Flow

**เงื่อนไข:**
- Requester เป็นหนึ่งใน Approver Level 1 ด้วย

**ผลที่คาดหวัง:**
- ระบบ Auto-Approve Level ที่ Requester เป็น Approver
- ข้ามไป Level ถัดไปโดยอัตโนมัติ

---

### ✅ TC-15: Admin สร้างงาน (ในนาม Requester อื่น)

**เงื่อนไข:**
- Admin สร้างงานให้ Requester
- Flow ปกติตาม Project

**ผลที่คาดหวัง:**
- Email/Notification ส่งตาม `requesterId` (ไม่ใช่ Admin)
- Flow ปกติไม่เปลี่ยนแปลง

---

### ✅ TC-16: สร้างงานแล้ว Assignee ปฏิเสธ (Assignee Reject)

**Flow:**
```
งาน → in_progress
    ↓
Assignee กด "ปฏิเสธงาน" พร้อมเหตุผล
    ↓
Job Status → assignee_rejected
📧 Email → Approver/Requester (Magic Link)
🔔 Notification → Approver/Requester
    ↓
Approver เห็นด้วย (Confirm Rejection)
    ↓
Job Status → rejected
    ↓
[หรือ] Approver ไม่เห็นด้วย (Deny Rejection)
    ↓
Job Status → in_progress (กลับไปทำต่อ)
📧 Email → Assignee (Magic Link)
🔔 Notification → Assignee
```

---

### ✅ TC-17: Assignee ขอ Extend Deadline

**Flow:**
```
งาน → in_progress
    ↓
Assignee ขอขยายเวลา + เหตุผล
    ↓
📧 Email → Requester (Magic Link "ดูรายละเอียด")
🔔 Notification → Requester
    ↓
[ปัจจุบัน] Extend อัตโนมัติ ไม่ต้องรออนุมัติ
```

---

## 📊 สรุป Email ที่จะได้รับตาม Event

| Event | ผู้รับ Email |
|-------|------------|
| สร้างงาน (มี Flow) | Approver Level 1 |
| สร้างงาน (Skip/No Flow) | Assignee |
| Approve non-final | Approver Level ถัดไป |
| Approve final | Requester + Assignee |
| Reject | Requester |
| Reassign | Assignee ใหม่ |
| Extend Deadline | Requester |
| Request Rejection | Approver(s) |
| Approve Rejection Request | Requester + Assignee |
| Deny Rejection Request | Assignee |
| Complete Job | Requester |
| Magic Link Verify | — (ไม่มี email ส่งออก) |

---

## 🔍 สิ่งที่ต้องตรวจสอบระหว่างทดสอบ

1. **Database** `magic_link_tokens` table:
   - Token ถูกสร้างเมื่อมีการส่ง Email
   - `used = true` หลังคลิก Magic Link
   - `expires_at` ถูกต้อง (24 ชั่วโมงจากเวลาสร้าง)

2. **Email**:
   - ปุ่มมี Rose Theme สวยงาม
   - Magic Link ใน Email ทำงานได้จริง
   - Subject Line ถูกต้องตาม Event

3. **Notification (In-App)**:
   - กระดิ่งใน Header แสดงตัวเลข Unread
   - คลิกแล้ว Mark as Read

4. **Redirect หลัง Magic Link**:
   - ไปถูกหน้า (Job Detail)
   - Login State ถูกต้อง (ชื่อ User ถูกต้อง)
