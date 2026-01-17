# DJ System (Design Job System) - Context Document

## ภาพรวมระบบ

**DJ System** คือระบบจัดการงานออกแบบ (Design Job) สำหรับทีม Marketing และ Creative ที่มี Workflow การอนุมัติ, SLA Tracking และ Notification System

---

## Development Team Roles

### 🎨 UX/UI Designer
**หน้าที่:** คุมให้ UI/UX อยู่ใน Theme ต้นแบบ (Rose/Pink)
- ยึดตาม HTML ต้นแบบ 11 หน้า
- รักษาความสอดคล้องของ Color Scheme, Typography, Spacing
- ตรวจสอบ Responsive Design
- ดูแล User Experience ให้ใช้งานง่าย

### 📋 Project Manager (PM)
**หน้าที่:** คุมการทำงานและ Timeline
- กำหนด Sprint และ Milestone
- ติดตามความคืบหน้าของแต่ละ Module
- จัดลำดับความสำคัญของ Feature
- Coordinate ระหว่างทุกบทบาท

### 📊 System Analyst (SA)
**หน้าที่:** วิเคราะห์ให้อยู่ในมาตรฐานทั่วไป
- ออกแบบ Database Schema ตามหลัก Normalization
- กำหนด API Standards (RESTful)
- วิเคราะห์ Business Rules และ Validation
- จัดทำ Technical Documentation

### 👨‍💻 Senior Programmer
**หน้าที่:** แนะนำและ Review Code
- เขียน Comment อธิบายทุกฟังก์ชัน
- ใช้ JSDoc สำหรับ Documentation
- Review Code Quality และ Best Practices
- ดูแล Code Architecture และ Pattern

---

## Architecture Concept: **Modular Architecture**

### ชื่อเรียกอื่นๆ
- **Plugin Architecture** - สถาปัตยกรรมแบบปลั๊กอิน
- **Microkernel Architecture** - สถาปัตยกรรมแบบไมโครเคอร์เนล
- **Loosely Coupled Architecture** - สถาปัตยกรรมแบบเชื่อมต่อหลวม

### หลักการสำคัญ

```
┌─────────────────────────────────────────────────────────────┐
│                     DJ System Core                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Module Controller                       │   │
│  │  - โหลด/ถอด Module อัตโนมัติ                         │   │
│  │  - จัดการ Dependencies                               │   │
│  │  - Route ไปยัง Module ที่เกี่ยวข้อง                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│     ┌────────────────────┼────────────────────┐            │
│     ▼                    ▼                    ▼            │
│ ┌─────────┐      ┌─────────────┐      ┌──────────┐        │
│ │Dashboard│      │  DJ Jobs    │      │ Approval │        │
│ │ Module  │      │   Module    │      │  Module  │        │
│ └─────────┘      └─────────────┘      └──────────┘        │
│                                                             │
│ ┌─────────┐      ┌─────────────┐      ┌──────────┐        │
│ │ Admin   │      │Media Portal │      │ Reports  │        │
│ │ Module  │      │   Module    │      │  Module  │        │
│ └─────────┘      └─────────────┘      └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### ข้อดีของ Modular Architecture
1. **เพิ่ม/ลบ Feature ได้อิสระ** - ไม่กระทบ Module อื่น
2. **ทดสอบแยกส่วน** - Unit Test แต่ละ Module ได้
3. **ทำงานพร้อมกัน** - ทีมแยกพัฒนาแต่ละ Module ได้
4. **Reusable** - นำ Module ไปใช้ในโปรเจกต์อื่นได้
5. **Maintainable** - แก้ไขง่าย ไม่ส่งผลกระทบวงกว้าง

### โครงสร้าง Module

```
modules/
├── core/                    # Core Module (ห้ามลบ)
│   ├── auth/               # Authentication
│   ├── users/              # User Management
│   └── tenants/            # Multi-tenant
│
├── features/                # Feature Modules (เพิ่ม/ลบได้)
│   ├── dashboard/          # Dashboard Feature
│   ├── jobs/               # DJ Jobs Management
│   ├── approvals/          # Approval Workflow
│   ├── media-portal/       # Media Portal
│   ├── reports/            # Reports & Analytics
│   └── user-portal/        # Self-Service Portal
│
├── admin/                   # Admin Modules
│   ├── job-types/          # Job Type & SLA
│   ├── holidays/           # Holiday Calendar
│   └── approval-flows/     # Approval Flow Config
│
└── shared/                  # Shared Components
    ├── components/         # Reusable UI Components
    ├── hooks/              # Custom Hooks
    ├── services/           # Shared Services
    └── utils/              # Utilities
```

### Module Registry (ทะเบียน Module)

```javascript
/**
 * @file moduleRegistry.js
 * @description ทะเบียนเก็บข้อมูล Module ทั้งหมดในระบบ
 * ใช้สำหรับโหลด/ถอด Module แบบ Dynamic
 */
const moduleRegistry = {
  dashboard: { enabled: true, path: 'features/dashboard' },
  jobs: { enabled: true, path: 'features/jobs' },
  approvals: { enabled: true, path: 'features/approvals' },
  mediaPortal: { enabled: true, path: 'features/media-portal' },
  reports: { enabled: true, path: 'features/reports' },
  userPortal: { enabled: true, path: 'features/user-portal' }
};
```

### Code Comment Standards (มาตรฐานการเขียน Comment)

> [!IMPORTANT]
> **กฎสำคัญ: ทุกฟังก์ชันต้องมี Comment จาก Senior Programmer อธิบายการทำงานเป็นภาษาไทย**
> - อธิบายทุกคำสั่งที่เขียน
> - คำภาษาอังกฤษ (Technical Terms) ต้องตีความเป็นภาษาไทยกำกับไว้
> - ใช้ JSDoc format สำหรับ Function Header
> - ใช้ inline comment สำหรับอธิบายแต่ละบรรทัด

#### ตัวอย่างการเขียน Comment ที่ถูกต้อง:

```javascript
/**
 * @function createDesignJob
 * @description สร้างงาน Design Job ใหม่ในระบบ
 * 
 * @param {Object} jobData - ข้อมูลงานที่จะสร้าง (Job Data Object)
 * @param {number} jobData.projectId - รหัสโครงการ (Project ID)
 * @param {number} jobData.jobTypeId - รหัสประเภทงาน (Job Type ID)
 * @param {string} jobData.subject - หัวข้องาน
 * @param {string} jobData.priority - ความสำคัญ ('low' = ต่ำ, 'normal' = ปกติ, 'urgent' = ด่วน)
 * @param {Object} jobData.brief - ข้อมูล Brief (รายละเอียดงาน)
 * 
 * @returns {Promise<Object>} - Promise (สัญญาที่จะคืนค่า) ของงานที่สร้างใหม่
 * @throws {ValidationError} - เกิด Error เมื่อข้อมูลไม่ผ่านการตรวจสอบ (Validation)
 * 
 * @example
 * // ตัวอย่างการเรียกใช้งาน:
 * const job = await createDesignJob({
 *   projectId: 1,
 *   jobTypeId: 1,
 *   subject: 'Banner Facebook Q1',
 *   priority: 'normal',
 *   brief: { objective: '...' }
 * });
 */
async function createDesignJob(jobData) {
  // ============================================
  // ขั้นตอนที่ 1: ตรวจสอบข้อมูลก่อนบันทึก (Validation)
  // ============================================
  
  // ตรวจสอบว่า projectId ต้องเป็นตัวเลขและมีค่า
  // (Required Field = ฟิลด์ที่จำเป็นต้องกรอก)
  if (!jobData.projectId) {
    throw new ValidationError('กรุณาเลือกโครงการ');
  }
  
  // ตรวจสอบ Objective ต้องมีอย่างน้อย 200 ตัวอักษร
  // (Min Length = ความยาวขั้นต่ำ)
  if (jobData.brief?.objective?.length < 200) {
    throw new ValidationError('Objective ต้องมีอย่างน้อย 200 ตัวอักษร');
  }
  
  // ============================================
  // ขั้นตอนที่ 2: สร้าง DJ ID ใหม่
  // ============================================
  
  // ดึงลำดับถัดไปจาก Database (Sequence = ลำดับ)
  const nextSequence = await getNextDJSequence();
  
  // สร้าง DJ ID ในรูปแบบ "DJ-2024-0001"
  // padStart(4, '0') = เติม 0 ข้างหน้าให้ครบ 4 หลัก
  const djId = `DJ-${new Date().getFullYear()}-${String(nextSequence).padStart(4, '0')}`;
  
  // ============================================
  // ขั้นตอนที่ 3: คำนวณ SLA Deadline
  // ============================================
  
  // ดึงจำนวนวันทำการ (Working Days) จากประเภทงาน
  const jobType = await getJobType(jobData.jobTypeId);
  
  // คำนวณวันครบกำหนด โดยนับเฉพาะวันทำการ ไม่รวมวันหยุด
  // (Deadline = กำหนดส่ง, Working Days = วันทำการ)
  const deadline = calculateDeadline(new Date(), jobType.slaWorkingDays);
  
  // ============================================
  // ขั้นตอนที่ 4: บันทึกลง Database
  // ============================================
  
  // สร้าง Object ข้อมูลงานใหม่
  // (Spread Operator "..." = คัดลอก properties ทั้งหมดจาก jobData)
  const newJob = {
    ...jobData,
    djId,
    deadline,
    status: 'draft',  // สถานะเริ่มต้นเป็น "ร่าง"
    createdAt: new Date()
  };
  
  // บันทึกลง Database และคืนค่างานที่สร้าง
  // (INSERT INTO = คำสั่ง SQL สำหรับเพิ่มข้อมูล)
  const createdJob = await db.designJobs.create(newJob);
  
  // ============================================
  // ขั้นตอนที่ 5: ส่งการแจ้งเตือน (Notification)
  // ============================================
  
  // สร้างการแจ้งเตือนให้ผู้สร้างงาน
  await createNotification({
    userId: jobData.requesterId,
    type: 'job_created',  // ประเภท = สร้างงานใหม่
    title: `สร้างงาน ${djId} สำเร็จ`,
    link: `/jobs/${createdJob.id}`
  });
  
  // คืนค่างานที่สร้างเสร็จ
  return createdJob;
}
```

#### คำศัพท์ Technical Terms ที่ต้องตีความ:

| English Term | ความหมายภาษาไทย |
|--------------|-----------------|
| async/await | การทำงานแบบไม่ประสานเวลา (รอผลลัพธ์) |
| Promise | สัญญาที่จะคืนค่าในอนาคต |
| callback | ฟังก์ชันที่เรียกกลับภายหลัง |
| state | สถานะ (ข้อมูลที่เก็บไว้) |
| props | ข้อมูลที่ส่งผ่านมาจาก Component แม่ |
| render | วาด/แสดงผล UI |
| hook | ตะขอ (ฟังก์ชันพิเศษของ React) |
| middleware | ตัวกลาง (ทำงานระหว่างทาง) |
| validation | การตรวจสอบความถูกต้อง |
| authentication | การยืนยันตัวตน (Login) |
| authorization | การอนุญาตสิทธิ์ (Permission) |
| localStorage | ที่เก็บข้อมูลบน Browser |
| API | ช่องทางเชื่อมต่อระบบ |
| endpoint | จุดปลายทางของ API |
| CRUD | Create, Read, Update, Delete |

---

## โครงสร้างไฟล์

ระบบประกอบด้วย 12 ไฟล์ที่อยู่ใน `/Users/chanetw/Documents/DJ-System/HTML Original/dj-system/`:

### ไฟล์เอกสาร
- `REQUIREMENT.md` - เอกสารข้อกำหนดและ Functional Specification

### ไฟล์ HTML (11 หน้า)
1. `01-dashboard.html` - หน้า Dashboard แสดงภาพรวมงาน
2. `02-create-dj.html` - หน้าสร้าง Design Job ใหม่
3. `03-dj-list.html` - หน้ารายการงาน DJ ทั้งหมด
4. `04-dj-detail.html` - หน้ารายละเอียดงาน DJ
5. `05-approvals-queue.html` - หน้าคิวการอนุมัติ
6. `06-admin-job-type-sla.html` - หน้าจัดการประเภทงานและ SLA
7. `07-admin-holiday.html` - หน้าจัดการวันหยุด
8. `08-admin-approval-flow.html` - หน้าตั้งค่า Approval Flow
9. `09-reports.html` - หน้ารายงาน
10. `10-media-portal.html` - หน้าคลังไฟล์งาน Design (ฟีเจอร์ใหม่)
11. `11-user-portal.html` - หน้า Self-Service Portal สำหรับผู้ใช้ (ฟีเจอร์ใหม่)

---

## บทบาทผู้ใช้งาน (Personas)

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

## สถานะงาน (Status Badges)

| Status | คำอธิบาย |
|--------|----------|
| **Draft** | งานร่าง ยังไม่ส่ง |
| **Scheduled** | Auto-submit 08:00 วันทำการถัดไป |
| **Submitted** | ส่งแล้ว รอ assign |
| **Pending Approval** | รออนุมัติ |
| **Approved** | อนุมัติแล้ว พร้อม assign |
| **Assigned** | มอบหมายแล้ว |
| **In Progress** | กำลังดำเนินการ |
| **Rework** | Requester แก้ไขแล้ว |
| **Rejected** | ถูกปฏิเสธ |
| **Completed** | เสร็จสิ้น |
| **Closed/Deleted** | ปิดงาน/ลบ |

---

## รายละเอียดหน้าจอ

### 1. Dashboard (`01-dashboard.html`)
**วัตถุประสงค์:** ภาพรวมงานของ user ตาม role + แจ้งเตือน SLA

**KPI Cards:**
- New Today (3 งาน)
- Due Tomorrow (5 งาน)
- Due Today (2 งาน)
- Overdue (1 งาน)

**My Queue Table:**
- แสดงคอลัมน์: DJ ID, Project, Job Type, Subject, Status, Deadline, SLA, Assignee, Last update, Action
- มีตัวกรองด่วน: ทั้งหมด, Due in 1 day, Overdue, Pending Approval, Scheduled
- แสดง Notifications ล่าสุด (8 รายการ)

### 2. Create DJ (`02-create-dj.html`)
**วัตถุประสงค์:** เปิดงานพร้อมตรวจครบถ้วน + กันส่งนอกเวลา + quota

**Form Sections:**
- **Section A: Job Info** - Project, BUD, Job Type, Subject, Priority
- **Section B: Brief** - Objective (≥200 chars), Headline, Sub-headline, Selling points, Price
- **Section C: Attachments** - Required files per job type, Reference URL
- **Section D: SLA Preview** - Submit date, Working day calendar, Deadline
- **Section E: Approval Flow** - Stepper แสดงผู้อนุมัติ

**Validation Rules:**
- เวลา 22:00-05:00 → ถูกบล็อก
- วันหยุด/สุดสัปดาห์ → ถูกบล็อก
- Quota > 10/project/day → ถูกบล็อก
- ถ้าถูกบล็อก → Modal ให้เลือก "Save as Draft" หรือ "Save & Auto-submit next working day 08:00"

**Completion Checklist:**
- แสดง Progress bar (66%)
- ตรวจสอบความครบถ้วนของข้อมูล

### 3. DJ List (`03-dj-list.html`)
**วัตถุประสงค์:** ค้นหา + มุมมองตาม role

**Filters:**
- Project, BUD, Job Type, Status
- Due date range, Created date range
- Assignee, Priority
- "Only scheduled (auto-submit)" checkbox

**Table Columns:**
- DJ ID, Project, Job Type, Subject, Status, Submit date, Deadline, SLA, Assignee, Approver stage, Action
- แสดง 12 รายการ พร้อม Pagination

**Features:**
- แสดงงาน Scheduled ด้วยพื้นหลังสีม่วงอ่อน
- แสดงงาน Rejected ด้วยพื้นหลังสีแดงอ่อน
- แสดงงาน Rework ด้วยพื้นหลังสีเหลืองอ่อน

### 4. DJ Detail (`04-dj-detail.html`)
**วัตถุประสงค์:** ศูนย์กลาง workflow - ทุกคนทำงานบนหน้าเดียว

**Layout (3 Columns):**
- **Left:** Brief & Metadata
- **Center:** Work Area (Preview, Deliverables, Action Buttons)
- **Right:** Timeline + Chat

**Action Buttons by Role:**
- **Marketing:** Edit Brief, Submit, Request Revision, Close Job
- **Approver:** Approve, Reject, Return for fix, Edit approver chain
- **Assignee:** Accept, Reject (with reason), Upload Draft, Submit for Review, Upload Final
- **Admin:** Assign/Reassign, Change Priority, Override SLA

**Features:**
- แสดง SLA Badge (Overdue +2 Days)
- แสดง Revision Alert
- แสดง Preview/Deliverables พร้อม Version control (v1, v2)
- Activity Timeline พร้อม Chat + @mention
- แสดง Attachments ที่แนบมา

### 5. Approvals Queue (`05-approvals-queue.html`)
**วัตถุประสงค์:** ให้หัวหน้าอนุมัติเร็ว

**Tabs:**
- Waiting Approval
- Returned/Rejected
- History

### 6. Admin: Job Type & SLA Management (`06-admin-job-type-sla.html`)
**วัตถุประสงค์:** ตั้งประเภทงาน + SLA + required attachments

**Fields:**
- Job Type name
- SLA working days
- SLA description
- Required attachment types

### 7. Admin: Holiday Calendar (`07-admin-holiday.html`)
**วัตถุประสงค์:** เพิ่ม/แก้ไขวันหยุดนักขัตฤกษ์

**Features:**
- Calendar view + List view
- Add/Edit/Delete holidays
- Import CSV

### 8. Admin: Approval Flow Config (`08-admin-approval-flow.html`)
**วัตถุประสงค์:** กำหนด approval matrix

**Rule Builder:**
- Condition: job type, project, bud, priority
- Approver steps
- Allow override toggle
- Effective date range

### 9. Reports Dashboard (`09-reports.html`)
**วัตถุประสงค์:** รายงานแยกตาม Project/BUD/Person

**Metrics:**
- Total DJ created
- On-time vs Late
- Average lead time per job type
- Reject rate + top reject reasons
- Workload by assignee
- Quota utilization

### 10. Media Portal (`10-media-portal.html`) 🆕
**วัตถุประสงค์:** คลังเก็บไฟล์งานที่เสร็จสมบูรณ์ พร้อมค้นหาและดาวน์โหลด

**Stats Cards:**
- ไฟล์ทั้งหมด: 1,247
- โครงการ: 28
- งานส่งมอบแล้ว: 856
- ดาวน์โหลด: 3,421

**Filters:**
- โครงการ, ประเภทงาน, ประเภทไฟล์, ช่วงเวลา

**Features:**
- แสดงโครงการล่าสุด (4 โครงการ) พร้อม gradient สีต่างกัน
- แสดงไฟล์ล่าสุด (10 ไฟล์) ในรูปแบบ Grid
- รองรับไฟล์หลายประเภท: JPG, PNG, PDF, AI, PSD, MP4, MOV
- Hover เพื่อดูตัวอย่างและดาวน์โหลด
- Pagination

### 11. User Portal (`11-user-portal.html`) 🆕
**วัตถุประสงค์:** Self-Service Portal สำหรับผู้ใช้

**Quick Actions:**
- สร้าง DJ ใหม่
- งานของฉัน
- SLA & ประเภทงาน
- Media Portal

**Features:**
- Hero Section พร้อม Search bar
- งานล่าสุดของฉัน (4 รายการ)
- ระยะเวลาดำเนินการ (SLA) - แสดง 4 ประเภทงาน
- Contact Info (Creative Team)
- Media โครงการของฉัน (5 ไฟล์)
- เลือกประเภทงาน (6 ประเภท)
- เคล็ดลับการเปิดงาน DJ (3 ข้อ)
---

## Mock Data

> [!IMPORTANT]
> **กฎสำคัญ: ข้อมูล Mock ทั้งหมดต้องเก็บในโฟลเดอร์ `mock-data/` เท่านั้น!**
> ห้ามสร้างไฟล์ Mock ในโฟลเดอร์อื่น

### โฟลเดอร์จัดเก็บ

```
mock-data/
├── index.js              # Export ข้อมูล Mock ทั้งหมด
├── users/users.json      # ผู้ใช้ (6 คน) + Roles (4 บทบาท)
├── projects/projects.json # โครงการ (4 โครงการ) + BUDs + Tenants
├── jobs/jobs.json        # Design Jobs (12 รายการ ครบทุกสถานะ)
├── admin/admin.json      # Job Types + Holidays + Approval Flows
├── notifications/notifications.json # แจ้งเตือน (8 รายการ)
├── approvals/approvals.json # การอนุมัติ + Activities + Comments
└── media/media.json      # ไฟล์ Media Portal (10 ไฟล์) + Stats
```

### สรุปข้อมูล Mock

| หมวดหมู่ | จำนวน |
|----------|-------|
| Users | 6 คน |
| Roles | 4 บทบาท |
| Projects | 4 โครงการ |
| BUDs | 2 หน่วยงาน |
| Job Types | 6 ประเภท |
| Holidays | 13 วัน |
| Design Jobs | 12 งาน (ครบทุกสถานะ) |
| Notifications | 8 รายการ |
| Media Files | 10 ไฟล์ |

### การใช้งาน Mock Data

```javascript
// Import จาก mock-data
import { usersData, jobsData, notificationsData } from '@/mock-data';

// หรือ Import แยก
import usersData from '@/mock-data/users/users.json';
```

---

## Technical Stack (HTML Prototype)

- **HTML5** + **TailwindCSS** (CDN)
- **Sarabun Thai Font** (Google Fonts)
- **Heroicons** (inline SVG)
- **Rose/Pink color theme** (สีหลักของระบบ)

---

## Full-Stack Tech Stack (Production)

### Frontend
- **React 18** + **Vite** - Build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling (ยึดตาม HTML ต้นแบบ)
- **Zustand** - State management
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **React Query** - Server state caching

### Backend
- **Node.js 18+** + **Express.js** - Web framework
- **Sequelize ORM** - Database ORM
- **MySQL 8.0** - Relational database
- **JWT** - Authentication
- **Socket.io** - Real-time server
- **Multer** - File upload (Local Storage)
- **Nodemailer** - Email notification (SMTP)
- **Node-cron** - Scheduled jobs (SLA check, Auto-submit)

### Infrastructure
- **VPS** - Deployment server
- **Nginx** - Reverse proxy
- **PM2** - Process manager
- **Local Storage** - File storage (ไฟล์สูงสุด 10GB)

---

## System Configuration

| Setting | Value |
|---------|-------|
| **File Storage** | Local Storage |
| **Email Service** | SMTP |
| **Deployment** | VPS |
| **Multi-Tenant** | ✅ รองรับ (tenant_id ในทุกตาราง) |
| **Max Users** | ~500 คน |
| **Max File Size** | 10 GB |

### Multi-Tenant Impact
- เพิ่มตาราง `tenants` สำหรับเก็บข้อมูลบริษัท
- เพิ่มคอลัมน์ `tenant_id` ในตารางหลัก (users, projects, design_jobs, etc.)
- Subdomain routing: `company1.dj-system.com`, `company2.dj-system.com`
- แยก File Storage ตาม tenant

---

## Database Schema (17 Tables)

### Core Tables
| Table | Description |
|-------|-------------|
| `tenants` | ข้อมูลบริษัท (Multi-tenant) |
| `users` | ผู้ใช้งาน |
| `roles` | บทบาท (marketing, approver, assignee, admin) |
| `user_roles` | ความสัมพันธ์ User-Role |
| `buds` | Business Unit Divisions |
| `projects` | โครงการ |

### Job Management
| Table | Description |
|-------|-------------|
| `job_types` | ประเภทงาน + SLA |
| `design_jobs` | งาน Design Job หลัก |
| `job_briefs` | Brief ของงาน |
| `job_attachments` | ไฟล์แนบ |
| `job_deliverables` | ไฟล์ส่งมอบ (versioned) |

### Workflow & Activities
| Table | Description |
|-------|-------------|
| `approval_flows` | กระบวนการอนุมัติ |
| `approvals` | การอนุมัติแต่ละขั้นตอน |
| `job_activities` | Activity Log / Timeline |
| `job_comments` | Comments / Chat |
| `notifications` | การแจ้งเตือน |
| `holidays` | วันหยุดนักขัตฤกษ์ |
| `media_files` | คลังไฟล์ Media Portal |

---

## API Structure (40+ Endpoints)

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน

### Design Jobs
- `GET /api/jobs` - รายการงาน (with filters)
- `GET /api/jobs/:id` - รายละเอียดงาน
- `POST /api/jobs` - สร้างงานใหม่
- `PUT /api/jobs/:id` - แก้ไขงาน
- `POST /api/jobs/:id/submit` - ส่งงาน
- `POST /api/jobs/:id/approve` - อนุมัติ
- `POST /api/jobs/:id/reject` - ปฏิเสธ
- `POST /api/jobs/:id/assign` - มอบหมาย

### Files
- `POST /api/jobs/:id/attachments` - อัพโหลดไฟล์แนบ
- `POST /api/jobs/:id/deliverables` - อัพโหลดไฟล์ส่งมอบ
- `GET /api/files/:id/download` - ดาวน์โหลด

### Comments & Activities
- `GET /api/jobs/:id/activities` - Timeline
- `POST /api/jobs/:id/comments` - เพิ่ม Comment

### Admin
- `CRUD /api/admin/job-types` - จัดการประเภทงาน
- `CRUD /api/admin/holidays` - จัดการวันหยุด
- `CRUD /api/admin/approval-flows` - จัดการ Approval Flow

### Reports
- `GET /api/reports/dashboard` - Dashboard KPIs
- `GET /api/reports/jobs` - รายงานงาน

---

## WebSocket Events (Real-time)

### Server → Client
- `notification:new` - การแจ้งเตือนใหม่
- `job:updated` - งานถูกอัปเดต
- `comment:added` - มี Comment ใหม่
- `job:assigned` - งานถูก Assign

---

## Project Structure

```
DJ-System/
├── frontend/                 # React Application
│   ├── design-reference/    # HTML ต้นแบบ UI/UX
│   └── src/
│       ├── components/      # Reusable Components
│       ├── pages/           # 11 หน้า
│       ├── services/        # API Services
│       ├── store/           # State Management
│       └── utils/           # Utilities
│
├── backend/                  # Node.js API Server
│   └── src/
│       ├── controllers/     # Route Controllers
│       ├── models/          # Sequelize Models
│       ├── routes/          # API Routes
│       ├── middlewares/     # Auth, Upload, etc.
│       ├── services/        # Business Logic
│       └── sockets/         # Socket.io Handlers
│
├── database/
│   ├── schema.sql           # Database Schema
│   ├── migrations/          # Migrations
│   └── seeders/             # Seed Data
│
├── uploads/                  # Local File Storage
│   └── {tenant_id}/         # Files by tenant
│
└── docs/                     # Documentation
```

---

## Workflow Diagram

```
┌─────────┐   Submit   ┌─────────────────┐   Approve   ┌──────────┐
│  Draft  │───────────▶│ Pending Approval│────────────▶│ Approved │
└─────────┘            └─────────────────┘             └──────────┘
     │                        │                              │
     │ (Outside hours)        │ Reject                       │ Assign
     ▼                        ▼                              ▼
┌───────────┐           ┌──────────┐               ┌──────────────┐
│ Scheduled │           │ Rejected │               │   Assigned   │
└───────────┘           └──────────┘               └──────────────┘
                                                          │
                                                          │ Accept
                                                          ▼
┌───────────┐   Request   ┌─────────────┐          ┌─────────────┐
│  Rework   │◀───────────│  Completed  │◀─────────│ In Progress │
└───────────┘   Revision  └─────────────┘   Done   └─────────────┘
```

---

## SLA Calculation Rules

1. **Working Days Only** - นับเฉพาะวันจันทร์-ศุกร์
2. **Exclude Holidays** - ตัดวันหยุดนักขัตฤกษ์ออก
3. **Deadline = Submit Date + SLA Working Days**
4. **Countdown Display:**
   - `D-5` = เหลือ 5 วัน
   - `Due Today` = ครบกำหนดวันนี้
   - `Overdue +2` = เลยกำหนด 2 วัน

---

## Global UI Components

### 1. Top Bar
- Search DJ ID/Subject
- Notification bell (badge count: 8)
- Role switch (สำหรับ demo): Marketing, Approver, Assignee, Admin
- Profile menu

### 2. Sidebar (หน้า Dashboard และหน้าอื่นๆ)
- Logo + ชื่อระบบ
- Navigation menu:
  - Dashboard
  - Create DJ
  - DJ List
  - Approvals Queue
  - Media Portal 🆕
  - User Portal 🆕
  - **Admin Section:**
    - Job Type & SLA
    - Holiday Calendar
    - Approval Flow
    - Reports
- Back to Home link
- User profile (ล่างสุด)

### 3. SLA Widget
- แสดง "SLA: X Working Days"
- แสดง "Submit Date / Calculated Deadline"
- Countdown: "D-3 / Due today / Overdue"
- Tooltip อธิบาย working day logic + วันหยุดที่ถูกตัดออก

### 4. Activity Timeline (ใน DJ Detail)
- Log: create, submit, approve, assign, upload, edit brief, reject, chat
- Comment/Chat + @mention
- แสดงเวลาและผู้ทำ

---

## ฟีเจอร์พิเศษ

### 1. Auto-Submit Scheduling
- ถ้าส่งงานนอกเวลา (22:00-05:00) หรือวันหยุด
- ระบบจะแสดง Modal ให้เลือก:
  - Save & Auto-submit next working day 08:00
  - Save as Draft

### 2. SLA Calculation
- คำนวณจากวันทำการ (Working Days)
- ตัดวันหยุดนักขัตฤกษ์ออก
- แสดง Countdown: D-X, Due Today, Overdue +X

### 3. Validation
- Objective ต้องมีอย่างน้อย 200 ตัวอักษร
- Required attachments ตาม Job Type
- Quota limit: 10 งาน/โครงการ/วัน

### 4. Notification System
- แจ้งเตือน SLA Overdue
- แจ้งเตือนข้อความใหม่
- แจ้งเตือนการ Assign งาน
- แจ้งเตือนงาน Scheduled

### 5. Media Portal Features 🆕
- ค้นหาไฟล์ตามโครงการ, ประเภทงาน, ประเภทไฟล์
- แสดงตัวอย่างไฟล์ (Preview)
- ดาวน์โหลดไฟล์
- แสดงสถิติการใช้งาน

### 6. User Portal Features 🆕
- Self-Service สำหรับผู้ใช้ทั่วไป
- Quick Actions เข้าถึงฟีเจอร์หลักได้ง่าย
- แสดง SLA ของแต่ละประเภทงาน
- เคล็ดลับการเปิดงาน DJ

---

## Color Scheme

### สีหลัก (Rose/Pink Theme)
- **Primary:** Rose-500 (#F43F5E), Rose-600, Rose-900
- **Background:** Gray-50, White
- **Text:** Gray-900, Gray-700, Gray-500
- **Status Colors:**
  - Blue: In Progress
  - Amber: Pending Approval
  - Green: Completed, Approved
  - Red: Overdue, Rejected
  - Yellow: Rework
  - Violet: Scheduled
  - Gray: Draft
  - Cyan: Assigned

---

## คำถามที่ควรถามผู้ใช้

1. **คุณต้องการพัฒนาระบบนี้เป็น Full-Stack Application หรือไม่?**
   - Frontend Framework: React, Vue, Next.js?
   - Backend: Node.js, Python, PHP?
   - Database: PostgreSQL, MySQL, MongoDB?

2. **คุณต้องการเพิ่มฟีเจอร์อะไรเพิ่มเติมหรือไม่?**
   - Real-time Notification
   - Email Notification
   - File Upload & Storage
   - User Authentication & Authorization
   - API Integration

3. **คุณต้องการปรับแต่ง UI/UX อะไรหรือไม่?**
   - เปลี่ยนสีธีม
   - เพิ่ม Dark Mode
   - Responsive Design สำหรับ Mobile
   - Animation & Transition

4. **คุณต้องการเพิ่ม Business Logic อะไรหรือไม่?**
   - SLA Auto-calculation
   - Approval Workflow Engine
   - Notification Rules
   - Report Generation

---

## สรุป

ระบบ DJ System เป็นระบบจัดการงานออกแบบที่ครบครัน มีทั้ง:
- ✅ Workflow การอนุมัติที่ชัดเจน
- ✅ SLA Tracking และ Countdown
- ✅ Notification System
- ✅ Media Portal สำหรับจัดเก็บไฟล์
- ✅ User Portal สำหรับ Self-Service
- ✅ Admin Panel สำหรับจัดการระบบ
- ✅ Reporting Dashboard

ระบบออกแบบมาให้ใช้งานง่าย มี UI/UX ที่สวยงาม และรองรับการทำงานของทุก Role (Marketing, Approver, Assignee, Admin)
