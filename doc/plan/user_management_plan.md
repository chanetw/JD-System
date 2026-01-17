# User & Project Management Strategy

เอกสารนี้รวบรวมแผนและแนวทางสำหรับการจัดการผู้ใช้งาน (User Management) และการบริหารจัดการโครงการ (Project Management) ในระบบ DJ System เพื่อให้เหมาะสมกับการใช้งานจริงในองค์กร

## 1. User Acquisition (ผู้ใช้จะเข้ามาในระบบได้อย่างไร?)

สำหรับระบบภายใน (Internal Tool) ที่มีความปลอดภัยและ Workflow ชัดเจน ผมขอเสนอ **3 แนวทาง** โดยเรียงจากความเหมาะสมครับ:

### Option A: Admin Create (Manual) - **แนะนำสำหรับ Phase แรก** ⭐
ผู้ดูแลระบบ (Admin) เป็นคนสร้าง User ให้เท่านั้น
*   **Flow**: Admin ไปที่หน้า "User Management" -> กด "Create User" -> กรอก Email, Name, Role -> ระบบส่ง Email แจ้ง Password ชั่วคราว
*   **ข้อดี**: ควบคุมจำนวนและสิทธิ์ผู้ใช้ได้ 100%, ปลอดภัยสูงสุด
*   **ข้อเสีย**: เป็นภาระ Admin ต้องคอยสร้างให้

### Option B: Corporate SSO (Google Workspace / Microsoft AD) - **แนะนำสำหรับระยะยาว**
เชื่อมต่อกับอีเมลบริษัท ใครที่มีอีเมล @company.com สามารถ Login ได้เลย
*   **Flow**: User กด "Login with Google" -> ระบบตรวจสอบ Domain -> ถ้าเป็นคนในบริษัท ให้เข้าใช้งานได้ (Default Role: Requester) -> Admin มาปรับ Role ทีหลังถ้าต้องการสิทธิ์เพิ่ม
*   **ข้อดี**: สะดวก User ไม่ต้องจำ Password ใหม่, Admin ไม่เหนื่อย
*   **ข้อเสีย**: ต้องมีการ Config Cloud Platform (GCP/Azure)

### Option C: Invite Link
Admin สร้าง Link กลาง ส่งให้ใน LINE Group ทีม
*   **Flow**: User กด Link -> กรอกชื่อ/รหัสตั้งเอง -> Admin กดยืนยัน (Approve) ก่อนเข้าใช้งาน
*   **ข้อดี**: สะดวกกว่า Option A นิดหน่อย
*   **ข้อเสีย**: อาจมีคนนอกหลุดเข้ามาถ้า Link หลุด

---

## 2. Role Management (การจัดการสิทธิ์)

ระบบควรแบ่ง Role ให้ชัดเจนและแก้ไขได้โดย Admin:

| Role | สิทธิ์การใช้งาน | ผู้ใช้งาน |
| :--- | :--- | :--- |
| **Admin** | ทำได้ทุกอย่าง (จัดการ User, Project, Master Data, ดู Report) | IT / System Admin |
| **Approver** | อนุมัติงาน (Approve/Reject), ดู Dashboard ภาพรวม | Manager / Director |
| **Requester** | สร้างงาน (Create Job), ติดตามสถานะ, แก้ไขงานตัวเอง | Marketing / Sale |
| **Designer (Assignee)** | รับงาน, อัปเดตสถานะงาน, ส่งงาน | Graphic Designer |

*   **Note**: 1 User ควรมีได้หลาย Role (เช่น เป็นทั้ง Approver และ Requester ในเวลาเดียวกัน)

---

## 3. Project Management (การจัดการโครงการ)

Project เป็นหัวใจสำคัญในการแยกงบประมาณและทีมงาน ควรให้ **Admin หรือ Manager** เป็นคนจัดการเท่านั้น (User ทั่วไปห้ามแก้)

### ฟีเจอร์ที่ควรมี (CRUD)
1.  **Create**: สร้าง Project ใหม่ (ต้องระบุ Name, Code, BUD ที่สังกัด)
2.  **Edit**: แก้ไขชื่อ หรือย้าย BUD (เช่น กรณี Re-org องค์กร)
3.  **Disable (Soft Delete)**: ปิด Project ที่จบไปแล้วไม่ให้เลือกในหน้า Create Job แต่ข้อมูลเก่ายังอยู่เพื่อดู Report

### โครงสร้างข้อมูล Project
```json
{
  "id": "PROJ-001",
  "name": "Sena Park Grand",
  "code": "SPG",
  "bud": "BUD 1 (Sale)",
  "status": "Active", // หรือ Inactive
  "managerId": "USER-123" // คนรับผิดชอบ Project (Option)
}
```

---

## สรุปแผนการพัฒนา (Action Plan)

1.  **User**: ใช้ **Option A (Admin Create)** ก่อนในเวอร์ชั่นแรก เพราะง่ายและควบคุมได้
2.  **Project**: ทำหน้า **Admin > Project Management** ให้ Admin สามารถ Add/Edit/Disable Project ได้
3.  **Role**: ทำหน้า **Admin > User Management** ให้ Admin สามารถเปลี่ยน Role ของ User ได้ (เช่น เลื่อนขั้นจาก Designer -> Approver)
