# ระบบโครงสร้างองค์กรและมาสเตอร์ดาต้า (Organization & Master Data)

เอกสารฉบับนี้อธิบายลำดับขั้นเมทาดาต้า (Hierarchy) และข้อมูลหลัก (Master Data) ที่ใช้ในการขับเคลื่อนตรรกะทางธุรกิจของ DJ-System

---

## 1. ลำดับขั้นองค์กร (Organization Hierarchy)

ระบบถูกออกแบบให้รองรับ Multi-tenancy โดยมีการแบ่งระดับข้อมูลดังนี้:

### 1.1 ผังโครงสร้าง (Structure Diagram)
```text
Tenant (องค์กร/บริษัท)
├── Bud (ฝ่าย/ธุรกิจ - เช่น Residential 1, Commercial)
│   └── Project (โครงการ - เช่น Sena Kith, Niche Mono)
└── Department (แผนก - เช่น Marketing, Graphic, IT)
```

### 1.2 ความสัมพันธ์ทางข้อมูล (Data Relationships)
- **Tenant:** ระดับสูงสุด ข้อมูลทุกอย่างถูกแยกด้วย `tenant_id` (RLS Policy Enforcement)
- **Bud:** แบ่งตามกลุ่มธุรกิจ (Business Unit Design)
- **Project:** ผูกติดกับ Bud และสามารถผูกกับ Department ได้เพื่อระบุเจ้าของโครงการ
- **Department:** เป็นกลุ่มของ User และใช้ในการอ้างอิงลำดับการอนุมัติ (Department Manager Approval)

---

## 2. ข้อมูลประเภทงานและ SLA (Job Types & Service Level Agreement)

ประเภทงานเป็นมาสเตอร์ดาต้าที่สำคัญที่สุดในการกำหนดเส้นทางของงาน (Work Route):

### 2.1 โครงสร้าง JobType
**แหล่งที่มา**: `backend/prisma/schema.prisma` (model JobType)

```text
JobType
├─ name (ชื่อประเภทงาน - เช่น Social Media, 3D Render)
├─ slaWorkingDays (จำนวนวันทำงานที่กำหนด)
├─ icon/colorTheme (การแสดงผลใน UI)
└─ nextJobTypeId (สำหรับการร้อยต่องาน - Job Chaining)
```

### 2.2 การคำนวณวันส่งมอบ (Deadline Calculation)
เมื่อมีการสร้างงาน ระบบจะคำนวณ `dueDate` อัตโนมัติ:
`dueDate = createdAt + (JobType.slaWorkingDays) + (Holidays/Weekends)`

---

## 3. ระบบวันหยุดและปฏิทิน (Holidays)

ระบบใช้ตาราง `holidays` ในการคำนวณ SLA เพื่อให้วันกำหนดส่ง (Deadline) ตรงกับวันทำงานจริง

### 3.1 ข้อมูลวันหยุด
- **แหล่งที่มา**: `model Holiday`
- **ประเภท**: `public_holiday`, `company_holiday`
- **การใช้งาน**: Backend Service จะดึงวันหยุดในช่วงที่กำหนดมาลบออกจากจำนวนวัน SLA เพื่อเลื่อนวัน Deadline ออกไปให้ถูกต้อง

---

## 4. การมอบหมายงานรายโครงการ (Project assignments)

ระบบใช้ตาราง `ProjectJobAssignment` (หรือ `Assignment Matrix`) ในการกำหนดว่า "ในโครงการ A งานประเภท B ใครเป็นคนรับผิดชอบ?"

### 4.1 ตรรกะการจ่ายงาน (Auto-Assignment Logic)
1. ตรวจสอบที่ **Approval Flow Template** (ถ้าเจาะจงตัวบุคคล)
2. ถ้าไม่มี ให้ตรวจสอบที่ **Assignment Matrix** (ตาม Project + Job Type)
3. ถ้ายังไม่มี ให้จ่ายให้ **Department Manager** ของผู้เปิดงานเป็น Fallback

---

## 5. การจำกัดขอบเขต (Scoped Access)

ระบบใช้ **UserScopeAssignment** ในการจำกัดว่า User คนหนึ่งสามารถเห็นหรือเปิดงานในโปรเจกต์ใดได้บ้าง:
- **Requester Scope**: เห็นเฉพาะโปรเจกต์ที่ได้รับมอบหมายในหน้าสร้างงาน
- **Assignee Scope**: รับงานเฉพาะในโปรเจกต์ที่ตัวเองดูแล

---

## ไฟล์ที่เกี่ยวข้อง (Related Files)

| รายการ | เส้นทางไฟล์ (Path) |
| :--- | :--- |
| **Org Services** | `backend/api-server/src/services/adminService.js` |
| **SLA Logic** | `frontend/src/modules/shared/utils/date.utils.js` |
| **Holiday Data** | `database/migrations/009_seed_holidays_2026.sql` |
| **Schema Definitions** | `backend/prisma/schema.prisma` |

---
**อัปเดตล่าสุด**: 2026-02-11
**สถานะ**: Production Ready
