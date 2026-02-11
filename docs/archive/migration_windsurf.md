# แผนการส่งมอบงานและย้ายระบบ (Migration & Handover Plan)

เอกสารนี้รวบรวมข้อมูลสำคัญ สถาปัตยกรรม และขั้นตอนการติดตั้ง สำหรับทีมพัฒนาใหม่ที่จะมารับช่วงต่อระบบ DJ System เพื่อให้การส่งมอบงานเป็นไปอย่างราบรื่น

## 1. ภาพรวมโปรเจกต์ (Project Overview)
ระบบ **DJ System** (Design Job Management System) เป็นเว็บแอปพลิเคชันสำหรับบริหารจัดการงานออกแบบภายในองค์กร โดยมีสถาปัตยกรรมที่เน้นความยืดหยุ่นและการขยายตัวได้ง่าย (Modular Architecture)

### Tech Stackป-
- **Frontend**: React 18, Vite, TailwindCSS (v4), Zustand, React Router v7
- **Backend**: Node.js, Express, Socket.io (Real-time events)
- **Database**: MySQL, Prisma (Schema Management)
- **Docs**: Markdown-based documentation

## 2. โครงสร้างโปรเจกต์ (Project Structure)

```text
DJ-System/
├── frontend/                   # ส่วนหน้าบ้าน (React Application)
│   ├── src/
│   │   ├── modules/            # หัวใจของระบบ Modular
│   │   │   ├── core/           # ระบบพื้นฐาน (ห้ามลบ) เช่น Auth, Users
│   │   │   ├── features/       # ฟีเจอร์ต่างๆ (Plugin) เช่น Job Request, Dashboard
│   │   │   ├── admin/          # ส่วนจัดการระบบ
│   │   │   └── shared/         # Utilities ที่ใช้ร่วมกัน
│   │   └── moduleRegistry.js   # ไฟล์ลงทะเบียน Module (สำคัญมาก)
├── backend/                    # ส่วนหลังบ้าน (API Server)
│   ├── api-server/             # Express App หลัก
│   └── prisma/                 # Database Schema
├── database/                   # SQL Scripts และ Migration files
├── docs/                       # เอกสาร Requirement และ Architecture
└── .agent/workflows/           # Workflow การทำงานของ AI Agent
```

## 3. กฎระเบียบและสถาปัตยกรรม (Architecture & Rules)

### 3.1 Modular Architecture (สำคัญที่สุด)
ระบบ Frontend ถูกออกแบบให้เป็น **Modular Monolith** การพัฒนา Feature ใหม่ **ต้อง** ทำตามกฎนี้อย่างเคร่งครัด:

1.  **Isolation**: สร้าง Feature ใหม่เป็นโฟลเดอร์ใน `frontend/src/modules/features/` เสมอ ห้ามเขียนปนกับ Core
2.  **Registration**: เมื่อสร้าง Module ใหม่ ต้องนำไปลงทะเบียนใน `frontend/src/moduleRegistry.js` เพื่อให้ Routing ทำงาน
3.  **No Direct Import**: ห้าม Import ข้าม Module โดยตรง ให้ใช้ Shared Service หรือ Event Bus
4.  **Thai Comments**: Code ต้องมี Comment อธิบายฟังก์ชั่นเป็นภาษาไทยอย่างละเอียด (Parameter, Return)

### 3.2 Database & Schema
- ใช้ **Prisma** ในการจัดการ Schema (`backend/prisma/schema.prisma`)
- แต่ในปัจจุบันมีการใช้ไฟล์ SQL ดิบในการขึ้นระบบด้วย ให้ตรวจสอบไฟล์ใน `database/ALL_IN_ONE.sql` หรือ `database/schema.sql` เป็นหลักสำหรับการ Restore ครั้งแรก

## 4. ขั้นตอนการติดตั้ง (Installation & Setup)

### Prerequisites
- Node.js (v18 ขึ้นไป)
- MySQL (v8.0 ขึ้นไป)

### Step 1: Clone & Prepare Database
1. สร้าง Database ชื่อ `dj_system` ใน MySQL Local ของคุณ
2. Import ข้อมูลและโครงสร้างจาก `database/ALL_IN_ONE.sql` (ถ้ามี) หรือ `database/schema.sql`

### Step 2: Backend Setup
```bash
cd backend/api-server
npm install
```
สร้างไฟล์ `.env` ใน `backend/api-server/` โดยมีค่า config ดังนี้:
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="mysql://root:password@localhost:3306/dj_system"
JWT_SECRET="your-secret-key"
```
รัน Server:
```bash
npm run dev
# หรือ
node src/index.js
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
เปิด Browser ไปที่ `http://localhost:5173`

## 5. กระบวนการทำงาน (Workflows & Roles)

ในโปรเจกต์นี้มีการกำหนด Role ของ AI Agent และทีมงานไว้ผ่าน Workflow files ซึ่งทีมใหม่สามารถนำไปปรับใช้ได้:

- **/call-BA**: เรียก Business Analyst เพื่อเก็บ Requirement เพิ่มเติม
- **/call-SA**: เรียก System Analyst เพื่อแปลง Requirement เป็น Technical Design
- **/call-senior-dev**: ขอคำปรึกษาเรื่องโครงสร้าง Code หรือ Logic ซับซ้อน
- **/sec-log**: ให้เลขาบันทึก DevLog (ประวัติการพัฒนา)

ไฟล์ Workflow เหล่านี้อยู่ที่ `.agent/workflows/` สามารถเปิดดูเพื่อทำความเข้าใจกระบวนการทำงานเดิมได้

## 6. สิ่งที่ต้องทำต่อ (Next Steps)

1.  **ตรวจสอบ Migration**: ตรวจสอบว่า Database Schema ใน `database/` ตรงกับ `backend/prisma/schema.prisma` หรือไม่ หากไม่ตรงให้ยึด SQL ล่าสุดที่ใช้งานได้จริง
2.  **Module Registry Check**: ตรวจสอบ `frontend/src/moduleRegistry.js` ว่า Module ทั้งหมด (Job Request, Approval, Admin, etc.) ถูก Enable และทำงานถูกต้อง
3.  **Environment Variables**: ตรวจสอบและตั้งค่า Key ต่างๆ เช่น Google Maps API (ถ้ามีใช้ใน Modules View) หรือ Email Service

---
*เอกสารฉบับนี้จัดทำขึ้นเพื่อการส่งมอบงาน (Handover) ให้กับทีมพัฒนาใหม่*
*Last Updated: 28 Jan 2026*
