# คู่มือการเชื่อมต่อระบบผู้ใช้งานกลาง (Central User System Integration)

เอกสารฉบับนี้อธิบายวิธีการเปลี่ยนระบบจัดการผู้ใช้งาน (User Management) จากปัจจุบันที่เป็น **Mock Data (ภายใน)** ให้ไปเชื่อมต่อกับ **ระบบผู้ใช้งานกลาง (External Central System/AD)** ขององค์กร โดยไม่กระทบกับหน้าจอ (UI) ที่พัฒนาไปแล้ว

---

## 1. แนวคิดการออกแบบ (Architecture Concept)

ระบบ DJ System ถูกออกแบบด้วย **Service Layer Pattern** ซึ่งแยกส่วนการทำงานเป็นชั้นๆ เพื่อความยืดหยุ่น:

```
[ UI Layer (หน้าบ้าน) ]  <-- เรียกใช้คำสั่ง (เช่น getUsers)
       |
       v
[ Service Layer (ตัวกลาง) ] <-- จุดที่ต้องแก้ไขเมื่อเปลี่ยนระบบ
       |
       v
[ Data Source (แหล่งข้อมูล) ] <-- เปลี่ยนจาก Mock เป็นระบบจริง
```

*   **UI Layer (หน้าบ้าน)**:
    *   ไฟล์: `UserManagement.jsx`, `Sidebar.jsx`
    *   หน้าที่: แสดงผลอย่างเดียว **ไม่รู้ว่าข้อมูลมาจากไหน** แค่เรียกใช้ function กลาง
*   **Service Layer (ตัวกลาง)**:
    *   ไฟล์ปัจจุบัน: `src/services/mockApi.js`
    *   หน้าที่: เป็น "ล่าม" แปลงคำสั่งจาก UI ไปดึงข้อมูลจริง (ปัจจุบันดึงจาก Mock, อนาคตดึงจาก Central API)

---

## 2. ขั้นตอนการเปลี่ยนไปใช้ระบบกลาง (Migration Steps)

เมื่อต้องการเชื่อมต่อกับระบบจริง ให้ทำตามขั้นตอนดังนี้:

### Step 1: สร้าง Service ใหม่สำหรับระบบจริง
สร้างไฟล์ใหม่ชื่อ `src/services/userApiService.js` และสร้างฟังก์ชันที่มี **ชื่อเหมือนกับใน mockApi.js** (เช่น `getUsers`, `createUser`)

**ตัวอย่างโค้ด `src/services/userApiService.js`:**

```javascript
import axios from 'axios'; // ใช้ Library ยิง API

const CENTRAL_API_URL = "https://central-user.sena.co.th/api";

// 1. ฟังก์ชันดึงรายชื่อผู้ใช้ (ต้องชื่อเดียวกับ mockApi)
export const getUsers = async () => {
    try {
        // ยิงไปขอข้อมูลจากระบบกลาง
        const response = await axios.get(`${CENTRAL_API_URL}/users`);
        
        // สำคัญ! API ตอบกลับมายังไง เราต้องแปลง (Map) ให้ตรงกับ Format ที่ DJ System รู้จัก
        return response.data.map(externalUser => ({
            id: externalUser.emp_id,            // แปลง Employee ID -> id
            name: externalUser.full_name_th,    // แปลงชื่อไทย -> name
            email: externalUser.email_address,  // แปลงอีเมล -> email
            roles: mapRoles(externalUser.dept), // แปลงแผนก -> Role ในระบบเรา
            scopeLevel: 'BUD',                  // กำหนด Default Scope
            isActive: externalUser.status === 'Active'
        }));
    } catch (error) {
        console.error("Load users failed", error);
        return [];
    }
};

// Helper: แปลงชื่อแผนกเป็น Role
const mapRoles = (department) => {
    if (department === 'IT System') return ['Admin'];
    if (department === 'Sales') return ['Requester'];
    return ['Viewer'];
}
```

### Step 2: สลับ Service ในหน้าจอ UI
ไปที่ไฟล์ UI (เช่น `src/pages/admin/UserManagement.jsx`) แล้วเปลี่ยนบรรทัด import:

```javascript
// ❌ เดิม (ใช้ Mock)
import { getUsers, createUser } from '@/services/mockApi';

// ✅ ใหม่ (เปลี่ยนไปใช้ไฟล์ใหม่ที่เราสร้าง)
import { getUsers, createUser } from '@/services/userApiService';
```

---

## 3. โครงสร้างข้อมูลที่ระบบต้องการ (Data Contract)

เพื่อให้หน้าจอ UI ทำงานได้ถูกต้อง ข้อมูลที่ส่งกลับมาจาก Service ต้องมีหน้าตาแบบนี้ (JSON Format):

```json
{
  "id": "1001",                 // รหัสอ้างอิง (ห้ามซ้ำ)
  "name": "สมชาย ใจดี",          // ชื่อ-สกุล
  "email": "somchai@sena.co.th", // อีเมล
  "roles": ["admin", "requester"], // Array ของ Role (ตัวพิมพ์เล็กแนะนำ: admin, marketing, approver, assignee)
  "scopeLevel": "BUD",          // ระดับสิทธิ์: "Tenant", "BUD", "Project"
  "scopeId": "BUD-01",          // รหัสสังกัด (ต้องตรงกับ ID ในระบบ Master Data)
  "isActive": true              // สถานะ
}
```

---

## 4. Checklist ก่อนขึ้นระบบจริง

1.  **Role Mapping**: ชื่อ Role ในระบบกลาง กับระบบ DJ อาจไม่เหมือนกัน ต้องเขียน Logic แปลงค่าเสมอ
2.  **Authentication Token**: การยิง API จริงต้องมีการแนบ Token (เช่น `Authorization: Bearer xyz...`) ให้เพิ่มใน `axios.defaults.headers` หรือ Auth Interceptor

---

## 5. กรณีมี Database ของตัวเองแต่ใช้ระบบ Login กลาง (Hybrid Model)

ในกรณีที่ DJ System มีฐานข้อมูล (Database) จริงแล้ว แต่ต้องเชื่อมต่อกับระบบ User กลาง (เช่น AD/LDAP หรือ Central HR API) แนะนำให้ใช้โมเดล **"Sync & Extension"** ครับ

### 5.1 ทำไมต้องมี Database ของตัวเอง ทั้งที่มีระบบกลาง?
ระบบกลาง usually เก็บแค่ข้อมูลพื้นฐาน (รหัสพนักงาน, ชื่อ, แผนก) แต่ระบบ DJ ต้องการข้อมูลเฉพาะที่ระบบกลางไม่มี เช่น:
*   ใครคือ Admin ของระบบ DJ?
*   ใครเป็นคนดูแล Project "Sena Park Grand"?
*   ประวัติการอนุมัติงาน (Audit Log) ต้องผูกกับ User ID

### 5.2 หลักการทำงาน (Workflow)

1.  **ตาราง Users ใน DJ Database**:
    ให้เก็บข้อมูล 2 ส่วนผสมกัน:
    *   **Synced Data (ห้ามแก้ไขเอง)**: `emp_id`, `email`, `fullname`, `department` (ดึงมาจากระบบกลาง)
    *   **Local Data (จัดการเอง)**: `role` (Admin/Approver), `scope_access` (รายชื่อโครงการที่ดูแล)

2.  **กระบวนการ Login (Authentication Flow)**:
    *   **Step 1**: User กรอก User/Pass -> ระบบ DJ ส่งไปตรวจสอบที่ **API ระบบกลาง**
    *   **Step 2 (ถ้าผ่าน)**: ระบบ DJ เอา `emp_id` ที่ได้มาค้นหาใน Database ของตัวเอง
        *   **Case A (มีข้อมูลแล้ว)**: Login สำเร็จ + ดึง Role/Scope จาก Database ตัวเองไปใช้งาน
        *   **Case B (พนักงานใหม่)**: ระบบ DJ สร้าง User ใน Database ให้อัตโนมัติ (**Auto-provisioning**) โดยดึงชื่อ/แผนกจากระบบกลางมาบันทึก แล้วตั้ง Role เริ่มต้นเป็น "General User"

3.  **กระบวนการ Sync (Synchronization Strategy)**:
    ป้องกันกรณีพนักงานลาออก แต่ในระบบ DJ ยังใช้งานได้อยู่
    *   **Login-Time Sync**: ทุกครั้งที่ Login สำเร็จ ให้อัปเดตชื่อ/แผนกใน Database ให้เป็นปัจจุบันเสมอ
    *   **Background Job (Midnight Sync)**: สร้าง Script รันทุกคืน เพื่อดึงรายชื่อพนักงานทั้งหมดจากระบบกลาง
        *   ถ้าพบพนักงานสถานะ **Resigned** -> อัปเดตใน DJ Database ให้ `is_active = false` ทันที

### 5.3 ตัวอย่าง Code Flow (Pseudo Code)

```javascript
// ตัวอย่าง Login Function (Hybrid)
export const loginHybrid = async (username, password) => {
    // 1. ตรวจสอบรหัสผ่านกับระบบกลาง
    const centralUser = await centralApi.authenticate(username, password);
    if (!centralUser) throw new Error("Login Failed");

    // 2. ค้นหาใน DB ของเรา
    let localUser = await db.users.findByEmpId(centralUser.emp_id);

    // 3. ถ้าไม่มี -> สร้างใหม่ (Auto-provision)
    if (!localUser) {
        localUser = await db.users.create({
            empId: centralUser.emp_id,
            name: centralUser.full_name, // Sync ชื่อ
            role: 'User',               // Default Role
            isActive: true
        });
    } else {
        // 4. ถ้ามี -> อัปเดตข้อมูลล่าสุด (Sync)
        await db.users.update(localUser.id, {
            name: centralUser.full_name,
            department: centralUser.department
        });
    }

    // 5. Return ข้อมูลจาก DB เรา (ที่มี Role/Scope ครบถ้วน)
    return localUser; 
};
```
