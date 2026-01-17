# DJ System - Design Job Management System

ระบบจัดการงานออกแบบ (Design Job) สำหรับทีม Marketing และ Creative พร้อม Workflow การอนุมัติ, SLA Tracking และ Notification System

## 🚀 Tech Stack

### Frontend
- **React 18** + **Vite** - Fast build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **React Query** - Server state management

### Backend
- **Node.js** + **Express** - Web framework
- **Sequelize ORM** - Database ORM
- **MySQL** - Relational database
- **JWT** - Authentication
- **Socket.io** - Real-time server
- **Multer** - File upload
- **AWS SDK** - Cloud storage (optional)

## 📁 Project Structure

```
DJ-System/
├── frontend/                 # React Application
│   ├── design-reference/    # HTML ต้นแบบ UI/UX
│   └── src/                 # Source code (จะสร้างในขั้นตอนถัดไป)
├── backend/                  # Node.js API Server (จะสร้างในขั้นตอนถัดไป)
├── database/
│   ├── schema.sql           # ✅ Database Schema
│   ├── migrations/          # Database Migrations
│   └── seeders/             # Seed Data
└── docs/                     # Documentation
```

## 📋 Features

### Core Features
- ✅ **Dashboard** - ภาพรวมงาน DJ พร้อม KPI Cards
- ✅ **Create DJ** - สร้างงานพร้อม Validation และ SLA Preview
- ✅ **DJ List** - รายการงานพร้อม Filters และ Search
- ✅ **DJ Detail** - รายละเอียดงานพร้อม Timeline และ Chat
- ✅ **Approval Queue** - คิวการอนุมัติ
- ✅ **Media Portal** - คลังไฟล์งาน Design
- ✅ **User Portal** - Self-Service Portal
- ✅ **Admin Panels** - จัดการ Job Types, Holidays, Approval Flows
- ✅ **Reports** - รายงานและสถิติ

### Advanced Features
- 🔔 **Real-time Notifications** - แจ้งเตือนแบบ Real-time
- 📁 **File Upload & Storage** - อัพโหลดและจัดเก็บไฟล์
- ⏰ **SLA Tracking** - ติดตาม SLA และ Countdown
- 🔄 **Auto-Submit Scheduling** - ตั้งเวลาส่งงานอัตโนมัติ
- 💬 **Chat & Comments** - แชทและ Comment พร้อม @mention
- 📊 **Activity Timeline** - ติดตามประวัติการทำงาน

## 🎨 UI/UX Design Reference

ไฟล์ HTML ต้นแบบอยู่ที่: `frontend/design-reference/`

### หน้าจอทั้งหมด (11 หน้า)
1. `01-dashboard.html` - Dashboard
2. `02-create-dj.html` - Create DJ
3. `03-dj-list.html` - DJ List
4. `04-dj-detail.html` - DJ Detail
5. `05-approvals-queue.html` - Approvals Queue
6. `06-admin-job-type-sla.html` - Admin: Job Types & SLA
7. `07-admin-holiday.html` - Admin: Holidays
8. `08-admin-approval-flow.html` - Admin: Approval Flows
9. `09-reports.html` - Reports
10. `10-media-portal.html` - Media Portal
11. `11-user-portal.html` - User Portal

## 🗄️ Database Schema

Database Schema อยู่ที่: `database/schema.sql`

### ตารางหลัก (17 ตาราง)
1. **users** - ผู้ใช้งาน
2. **roles** - บทบาท
3. **user_roles** - ความสัมพันธ์ User-Role
4. **buds** - Business Unit Divisions
5. **projects** - โครงการ
6. **job_types** - ประเภทงาน
7. **design_jobs** - งาน Design Job หลัก
8. **job_briefs** - Brief ของงาน
9. **job_attachments** - ไฟล์แนบ
10. **job_deliverables** - ไฟล์ส่งมอบ
11. **approval_flows** - กระบวนการอนุมัติ
12. **approvals** - การอนุมัติ
13. **job_activities** - Activity Log
14. **job_comments** - Comments/Chat
15. **notifications** - การแจ้งเตือน
16. **holidays** - วันหยุด
17. **media_files** - Media Portal

## 📝 Next Steps

### Phase 1: Backend Setup (ขั้นตอนถัดไป)
1. ตั้งค่า Node.js + Express Server
2. สร้าง Database Models (Sequelize)
3. พัฒนา Authentication (JWT)
4. สร้าง REST API Endpoints
5. ติดตั้ง Socket.io
6. ติดตั้ง File Upload (Multer)

### Phase 2: Frontend Setup
1. ตั้งค่า React + Vite Project
2. ติดตั้ง TailwindCSS
3. สร้าง Component Architecture
4. ดึง UI/UX จากไฟล์ HTML ต้นแบบ
5. สร้าง State Management
6. สร้าง API Integration Layer

### Phase 3: Feature Implementation
1. Dashboard & KPI Cards
2. Create DJ Form
3. DJ List & Filters
4. DJ Detail & Timeline
5. Approval Workflow
6. Admin Panels
7. Media Portal
8. Reports

## 📚 Documentation

- [Context Document](../brain/context.md) - ภาพรวมระบบ
- [Task List](../brain/task.md) - รายการงาน
- [Implementation Plan](../brain/implementation_plan.md) - แผนการพัฒนา
- [Database Schema](database/schema.sql) - โครงสร้างฐานข้อมูล

## 🔧 Development

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm หรือ yarn

### Installation (จะมีในขั้นตอนถัดไป)
```bash
# Clone repository
git clone <repository-url>

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install

# Setup Database
mysql -u root -p < database/schema.sql
```

### Environment Variables
```env
# Backend (.env)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=dj_system
DATABASE_USER=root
DATABASE_PASSWORD=your_password

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

AWS_ACCESS_KEY_ID=your_aws_key (optional)
AWS_SECRET_ACCESS_KEY=your_aws_secret (optional)
AWS_S3_BUCKET=your_bucket_name (optional)
```

## 👥 User Roles

1. **Marketing (Requester)** - เปิดงาน DJ, แก้ brief, แนบไฟล์
2. **Approver (Head/Manager)** - อนุมัติ/ตีกลับ/ปรับผู้อนุมัติ
3. **Assignee (Graphic/Web)** - รับงาน, ดู brief, แชท, ส่งงาน
4. **Admin** - จัดการระบบ, SLA, วันหยุด, Approval flow

## 📊 Job Status Flow

```
Draft → Scheduled → Submitted → Pending Approval → Approved 
  → Assigned → In Progress → Completed
  
  ↓ (Alternative paths)
Rejected / Rework / Closed
```

## 🎨 Color Theme

- **Primary:** Rose-500 (#F43F5E)
- **Background:** Gray-50, White
- **Status Colors:**
  - Blue: In Progress
  - Amber: Pending Approval
  - Green: Completed
  - Red: Overdue/Rejected
  - Violet: Scheduled

## 📄 License

Copyright © 2024 SENA Development PCL

---

**Status:** 🚧 In Planning Phase

**Last Updated:** 2026-01-15
