# Job Detail Page Feature & UI Plan
(วางแผนปรับปรุงหน้ารายละเอียดงานให้สอดคล้องกับหน้าสร้างงาน)

## 1. Overview
ปรับปรุงหน้า `JobDetail` ให้แสดงข้อมูลครบถ้วนตามที่ User กรอกเข้ามาในหน้า `CreateDJ` และรองรับโครงสร้างงานแบบ Parent-Child อย่างสมบูรณ์ พร้อมแก้ไขระบบ Comments ที่ใช้งานไม่ได้

## 2. Core Features & UI Structure

### 2.1 Header & Status Section
**Goal:** ให้ผู้ใช้รู้ทันทีว่างานนี้คืออะไร สถานะเป็นอย่างไร และใครรับผิดชอบ
- **Breadcrumb:** `Home > Jobs > [DJ-ID] Subject` (ถ้าเป็น Child Job: `Home > Jobs > [Parent DJ-ID] > [Child DJ-ID]`)
- **Main Title:** `[DJ-ID] Subject`
- **Status Badge:** ใช้สีและข้อความที่สื่อความหมายชัดเจน (Draft, Pending Approval, Assigned, In Progress, Completed)
- **Primary Actions (ขวาบน):**
  - **Requester:** Edit (ถ้ายังไม่ start), Cancel
  - **Manager/Admin:** Approve, Reject, Re-assign
  - **Assignee:** Start Job, Submit Work
  - **Global:** Print / Export PDF (Future)

### 2.2 Parent-Child Navigation (New)
**Goal:** จัดการงานที่มีหลายชิ้นย่อยได้ง่าย
- **Scenario A: ดูที่ Parent Job**
  - แสดง Tab "Overview" และ "Sub-Jobs List"
  - **Sub-Jobs List:** ตารางแสดงลูกข่ายทั้งหมด (Subject, Job Type, Assignee, Status, Deadline)
  - **Aggregate Progress:** Progress bar รวม (เช่น "3/5 jobs completed")
- **Scenario B: ดูที่ Child Job**
  - มี Banner ด้านบน: "งานนี้เป็นส่วนหนึ่งของโปรเจกต์ [Link to Parent]"
  - ปุ่มกดกลับไปดูภาพรวมได้ทันที

### 2.3 Brief Information Module (Consistency with Create DJ)
**Goal:** แสดงข้อมูล Brief หลักให้ครบถ้วนตามที่ผู้ใช้กรอก (Subject, Objective, Brief Link)

แบ่งเป็น 2 ส่วนหลัก:
1.  **Core Brief:**
    - **Objective & Details:** เนื้อหาบรีฟหลัก (วัตถุประสงค์และรายละเอียดงาน)
    - **Brief Link:** แสดงเป็น Link Card ที่เด่นชัด (เหมือนหน้า Create) เพื่อให้กดไปดูรายละเอียดฉบับเต็มได้ง่าย
2.  **Job Spec & Files:**
    - **Job Type:** ประเภทงาน
    - **Sub-Items:** รายการชิ้นงานย่อย (ถ้ามี)
    - **Attachments:** ไฟล์แนบประกอบบรีฟ (แยกจากไฟล์ส่งงาน)

### 2.4 Timeline & SLA Visualization
**Goal:** ให้เห็นภาพรวมเรื่องเวลา
- **SLA Progress:** หลอดสี (เขียว/เหลือง/แดง) เทียบเวลาที่ใช้ไป vs เวลาที่เหลือ
- **Key Dates:** Created -> Approved -> Started -> Due Date -> Completed
- **Shift Notification:** แจ้งเตือนถ้ามีการเลื่อน Due Date (จากเคสงานด่วนแทรก)

### 2.5 Communication & History
**Goal:** พื้นที่พูดคุยและตรวจสอบย้อนหลัง
- **Comments Tab:**
  - *Fix:* ต้องแก้ Backend Error 500 (สร้างตาราง `job_comments`)
  - รองรับการ Mention (@user) และแนบรูป
- **Activity Log Tab:** ประวัติการแก้ไขสถานะ ใครทำอะไร เมื่อไหร่

### 2.6 Deliverables Section (ส่วนส่งงาน)
**Goal:** พื้นที่สำหรับ Graphic ส่งงานและ Requester มารับงาน
- **Final Files:** Link หรือไฟล์ที่อัปโหลด
- **Display:**
  - **External Links:** แสดงเป็น Link Card พร้อม Icon (เช่น Google Drive, Dropbox)
  - **Direct Uploads:** (Future/Disabled) รองรับการแสดง Thumbnail หากเปิดใช้งานในอนาคต
- **Actions:** Requester กด "Accept" หรือ "Request Revision" ตรงนี้

## 3. Implementation Steps

### Phase 1: Fix & Foundation (Critical)
1.  **Database Migration:** สร้างตารางที่ขาดหาย (`job_comments`, `job_activities`)
2.  **API Update:** ตรวจสอบ Endpoint `/api/jobs/:id` ให้คืนค่าข้อมูล Brief ครบถ้วน (รวม Headline, Selling Points)

### Phase 2: UI Overhaul
1.  **Refactor JobDetail.jsx:** แยก Component ย่อย (`BriefInfo`, `SubJobList`, `ActionPanel`)
2.  **Implement Parent/Child View:** เพิ่ม Logic ตรวจสอบ `isParent` เพื่อสลับ Layout
3.  **Enhance Brief Display:** จัดรูปแบบการแสดงผล Brief Link และ Objective ให้สวยงาม อ่านง่าย

### Phase 3: Interactive Features
1.  **Comments System:** เชื่อมต่อ API Comments, UI Chat
2.  **Activity Log:** ดึงและแสดงข้อมูล Audit Log

---

## 4. Technical Tasks Checklist

### Backend
- [ ] Create Migration for `job_comments` table
- [ ] Create Migration for `job_activities` table
- [ ] Update `getJobById` service to include new Brief fields in query

### Frontend
- [ ] Update `JobDetail` layout to use Grid/Tabs
- [ ] Create `ChildJobTable` component for Parent view
- [ ] Update `httpClient` to handle error gracefully
- [ ] Implement Brief Link Card component
