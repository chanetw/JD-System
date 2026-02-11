# DJ System (Design Job System) - Functional Specification

## Overview
ระบบจัดการงานออกแบบ (Design Job) สำหรับทีม Marketing และ Creative พร้อม Workflow อนุมัติ, SLA Tracking, และ Notification System

---

## A) Personas & Key Roles

### 1. Marketing (Requester)
- เปิดงาน DJ, แก้ brief, แนบไฟล์
- ตอบแชท, ส่งอนุมัติ, ยืนยันส่งงาน

### 2. Approver (Head/Manager/BUD Head)
- อนุมัติ/ตีกลับ/ปรับผู้อนุมัติ

### 3. Assignee (Graphic/Web/Workflow)
- รับงาน, ดู brief, แชท
- Reject พร้อมเหตุผล, ส่งงาน

### 4. Admin
- จัดการประเภทงาน + SLA
- วันหยุด, Approval flow config
- สิทธิ์, รายงาน

---

## B) Global UI Components

### 1. Top Bar
- Search DJ ID/Subject
- Notification bell (badge count)
- Role switch (สำหรับ demo)
- Profile menu

### 2. Status Badges
| Status | Description |
|--------|-------------|
| Draft | งานร่าง ยังไม่ส่ง |
| Scheduled | Auto-submit 08:00 วันทำการถัดไป |
| Submitted | ส่งแล้ว รอ assign |
| Pending Approval | รออนุมัติ |
| Approved | อนุมัติแล้ว พร้อม assign |
| Assigned | มอบหมายแล้ว |
| In Progress | กำลังดำเนินการ |
| Rework | Requester แก้ไขแล้ว |
| Rejected | ถูกปฏิเสธ |
| Completed | เสร็จสิ้น |
| Closed/Deleted | ปิดงาน/ลบ |

### 3. SLA Widget
- แสดง "SLA: X Working Days"
- แสดง "Submit Date / Calculated Deadline"
- Countdown: "D-3 / Due today / Overdue"
- Tooltip อธิบาย working day logic + วันหยุดที่ถูกตัดออก

### 4. Right Panel: Activity Timeline
- Log: create, submit, approve, assign, upload, edit brief, reject, chat
- Comment/Chat + @mention

---

## C) Screens

### 1. Dashboard
**Purpose:** ภาพรวมงานของ user ตาม role + แจ้งเตือน SLA

**KPI Cards:**
- New Today
- Due Tomorrow
- Due Today
- Overdue

**My Queue Table Columns:**
DJ ID | Project | Job Type | Subject | Status | Deadline | SLA | Assignee | Last update | Action

### 2. Create DJ (Job Submission)
**Purpose:** เปิดงานพร้อมตรวจครบถ้วน + กันส่งนอกเวลา + quota

**Form Sections:**
- Section A: Job Info (Project, BUD, Job Type, Subject, Priority)
- Section B: Brief (Objective >= 200 chars, Headline, Sub-headline, Selling points, Price)
- Section C: Attachments (Required per job type, Reference URL)
- Section D: SLA Preview (Submit date, Working day calendar, Deadline)
- Section E: Approval Flow (Stepper)

**Validation Rules:**
- Time 22:00-05:00 → blocked
- Weekend/Holiday → blocked
- Quota > 10/project/day → blocked
- If blocked → Modal with "Save as Draft" or "Save & Auto-submit next working day 08:00"

### 3. DJ List
**Purpose:** ค้นหา + มุมมองตาม role

**Filters:**
- Project, BUD, Job Type, Status
- Due date range, Created date range
- Assignee, Priority
- "Only scheduled (auto-submit)"

**Table Columns:**
DJ ID | Project | Job Type | Subject | Status | Submit date | Deadline | SLA | Assignee | Approver stage | Action

### 4. DJ Detail
**Purpose:** ศูนย์กลาง workflow - ทุกคนทำงานบนหน้าเดียว

**Layout (3 Columns):**
- Left: Brief & Metadata
- Center: Work Area (Preview, Deliverables, Action Buttons)
- Right: Timeline + Chat

**Action Buttons by Role:**
- Marketing: Edit Brief, Submit, Request Revision, Close Job
- Approver: Approve, Reject, Return for fix, Edit approver chain
- Assignee: Accept, Reject (with reason), Upload Draft, Submit for Review, Upload Final
- Admin: Assign/Reassign, Change Priority, Override SLA

### 5. Approvals Queue
**Purpose:** ให้หัวหน้าอนุมัติเร็ว

**Tabs:**
- Waiting Approval
- Returned/Rejected
- History

### 6. Admin: Job Type & SLA Management
**Purpose:** ตั้งประเภทงาน + SLA + required attachments

**Fields:**
- Job Type name
- SLA working days
- SLA description
- Required attachment types

### 7. Admin: Holiday Calendar
**Purpose:** เพิ่ม/แก้ไขวันหยุดนักขัตฤกษ์

**Features:**
- Calendar view + List view
- Add/Edit/Delete holidays
- Import CSV

### 8. Admin: Approval Flow Config
**Purpose:** กำหนด approval matrix

**Rule Builder:**
- Condition: job type, project, bud, priority
- Approver steps
- Allow override toggle
- Effective date range

### 9. Reports Dashboard
**Purpose:** รายงานแยกตาม Project/BUD/Person

**Metrics:**
- Total DJ created
- On-time vs Late
- Average lead time per job type
- Reject rate + top reject reasons
- Workload by assignee
- Quota utilization

---

## D) Mock Data

### Job Types (6 types)
1. Online Artwork - 7 working days
2. Print Artwork - 10 working days
3. Video Production - 15 working days
4. Social Media Content - 3 working days
5. Website Banner - 5 working days
6. Event Material - 7 working days

### DJ Records (12+ items)
Various statuses including 2 Scheduled (auto-submit 08:00)

---

## E) Technical Stack
- HTML5 + TailwindCSS (CDN)
- Sarabun Thai Font (Google Fonts)
- Heroicons (inline SVG)
- Rose/Pink color theme
