# DJ-System Devlog

## 2026-03-06 - Dashboard Parent Job SLA/Deadline Derived Values & Sort

### 🎯 เป้าหมาย
ปรับปรุง Dashboard Parent View ให้แสดง SLA และ Deadline ที่สะท้อนความเสี่ยงจริงจาก child jobs ที่ยัง active และเพิ่มฟังก์ชันเรียงลำดับงาน

### ✨ ฟีเจอร์ที่พัฒนา

#### 1. Derived Values สำหรับ Parent Job
- **Derived SLA**: Parent แสดง SLA จากงานลูกที่ใกล้ deadline ที่สุดในกลุ่ม active
  - `Overdue +Nd` - ถ้ามีงานลูก overdue
  - `Due today` - ถ้ามีงานลูก due today
  - `Due tomorrow` - ถ้ามีงานลูก due tomorrow
  - `X days` - ถ้ามีงานลูก due ใน X วัน
  - `Completed` - ถ้างานลูกทั้งหมดจบแล้ว

- **Derived Deadline**: Parent แสดง deadline ของงานลูกที่ใกล้ที่สุดในกลุ่ม active

- **Auto-recompute**: เมื่อสถานะงานลูกเปลี่ยน Parent คำนวณใหม่ทันที

#### 2. Sort Functionality
- เพิ่ม dropdown "เรียงตาม" ใน My Queue header
- 3 โหมด:
  - **SLA น้อยไปมาก**: overdue ขึ้นก่อน
  - **งานสร้างล่าสุด**: `createdAt desc`
  - **อัปเดตล่าสุด**: `updatedAt desc` (default)

#### 3. Visual Enhancements
- SLA badges มีสีตามความเร่งด่วน:
  - 🔴 Overdue = red
  - 🟠 Due today = orange
  - 🟢 Completed = green
  - ⚪ X days = gray

### 🔧 การเปลี่ยนแปลงทางเทคนิค

#### ฟังก์ชันใหม่
```javascript
- getParentDerivedDeadline(children)
- getParentSlaPriority(children)
- getParentSlaText(children)
```

#### State ใหม่
```javascript
- sortMode: 'sla' | 'createdAt' | 'updatedAt'
```

#### Component Updates
- `filteredJobs`: เพิ่ม derived values และ sort logic
- `JobRow`: รองรับ derived SLA/Deadline display

### 📊 ตรรกะธุรกิจ
- **Terminal Statuses**: `completed`, `closed`, `cancelled` (ไม่นับเป็น active)
- **Active Children**: งานที่ยังไม่ใช่ terminal status
- **Sort Priority**: Overdue → Due soon → Completed → No deadline

### 🎯 กรณีทดสอบ
- Parent มีงานลูก 3 ตัว → แสดง derived values ถูกต้อง
- งานลูก overdue ถูกปิด → Parent recompute ใหม่ทันที
- Sort ทั้ง 3 โหมดทำงานได้
- Flat View ยังทำงานปกติ

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/features/dashboard/pages/Dashboard.jsx`
  - +405 insertions
  - -31 deletions

### 🚀 Commit
- **Hash**: `21dc7f0`
- **Message**: `feat(dashboard): Parent Job derived SLA/Deadline and Sort`

### 📝 บันทึกเพิ่มเติม
- ใช้หลักการคำนวณจาก child ที่ยัง active เท่านั้น
- Parent sort ใช้ derived values ชุดเดียวกับที่แสดงผล
- ป้องกันการตีความผิดว่า Parent มี SLA ของตัวเอง
- ทำให้ Parent View มีประโยชน์สูงในการดูความเสี่ยงรวม

---

## 2026-03-06 - Viewer Role & Profile Management

### 🎯 เป้าหมาย
เพิ่ม Viewer role และระบบจัดการโปรไฟล์ผู้ใช้ให้สมบูรณ์

### ✨ ฟีเจอร์ที่พัฒนา
- เพิ่ม Viewer role ใน permission utils
- Sidebar: เพิ่มเมนู Reports/Dashboard สำหรับ Viewer
- Backend: สร้าง PUT /api/users/me/profile endpoint
- Frontend: Profile edit modal และ role badges
- Header: แสดง role badges และปุ่มแก้โปรไฟล์

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/shared/utils/permission.utils.js`
- `frontend/src/modules/core/layout/Sidebar.jsx`
- `backend/api-server/src/routes/users.js`
- `frontend/src/modules/core/layout/Header.jsx`
- `frontend/src/modules/shared/services/modules/userService.js`

---

## 2026-03-06 - Dashboard Parent View Toggle

### 🎯 เป้าหมาย
เพิ่มปุ่มสลับมุมมองระหว่าง Flat List และ Parent-Child Hierarchy

### ✨ ฟีเจอร์ที่พัฒนา
- Toggle button: 📋 Flat View / 🗂️ Parent View
- Parent View แสดงงานแบบ accordion
- ซ่อน Parent ที่มี Child เดียว
- แสดง Child Jobs ใต้ Parent

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/features/dashboard/pages/Dashboard.jsx`

---

## 2026-03-06 - แก้ไข Drill-down Panel Status Labels

### 🎯 เป้าหมาย
ปรับสถานะที่แสดงในรายการจาก banner 3 อันให้เป็นภาษาอังกฤษล้วน และใช้ work status แทน approval status

### ✨ ฟีเจอร์ที่แก้ไข
- **PanelJobRow Component**: เปลี่ยนสถานะจากไทยอังกฤษผสมเป็นอังกฤษล้วน
- **Status Labels ที่ปรับ**:
  - `รออนุมัติ` → `Pending Approval`
  - `อนุมัติแล้ว` → `Approved`
  - `มอบหมายแล้ว` → `Assigned`
  - `กำลังดำเนินการ` → `In Progress`
  - `เสร็จแล้ว` → `Completed`
  - `ถูกปฏิเสธ` → `Rejected`
  - และอื่นๆ

- **ข้อความอื่นที่ปรับ**:
  - `ยังไม่มอบหมาย` → `Unassigned`
  - `(+N วัน)` → `(+Nd)`

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/features/dashboard/pages/Dashboard.jsx`
  - +12 insertions
  - -12 deletions

### 🚀 Commit
- **Hash**: `7b30363`
- **Message**: `แก้ไข: ปรับสถานะใน drill-down panel เป็นภาษาอังกฤษล้วน`

### 📝 บันทึกเพิ่มเติม
- ทำให้ drill-down panel สอดคล้องกับมาตรฐานภาษาอังกฤษ
- ไม่สับสนกันระหว่างสถานะอนุมัติและสถานะงาน
- ใช้ work status ที่เข้าใจง่ายและสม่ำเสมอกับระบบอื่นๆ

---

## 2026-03-05 - Initial Dashboard Parent View

### 🎯 เป้าหมาย
วางรากฐานสำหรับ Parent View ใน Dashboard

### ✨ ฟีเจอร์ที่พัฒนา
- เพิ่ม viewMode state
- เพิ่ม expandedRows state
- พื้นฐานการแสดง Parent-Child ใน Dashboard

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/features/dashboard/pages/Dashboard.jsx`

---

## 2026-03-09 - แก้ไข Media Portal ไม่แสดงผลการส่งมอบงาน

### 🎯 เป้าหมาย
แก้ไขปัญหา Media Portal ไม่แสดงผลงานที่ส่งมอบแล้ว (Final Links) เนื่องจาก Frontend ไม่ได้เรียก Backend API ที่มี logic insert ข้อมูลเข้า `mediaFile` table

### 🔍 สาเหตุที่พบ
1. **Frontend ใช้ Supabase โดยตรง**: `jobService.completeJob()` เรียก `finishJob()` ที่ใช้ Supabase แทน Backend API
2. **Backend มี logic อยู่แล้ว**: `approvalService.completeJob()` มี logic insert `mediaFile` อยู่แล้วแต่ไม่ถูกเรียกใช้
3. **Foreign Key Constraint ผิด**: ตาราง `media_files` มี FK ชี้ไปที่ `design_jobs` แทน `jobs`
4. **งานเก่าไม่มีใน mediaFile**: งานที่ส่งมอบก่อนหน้านี้ยังไม่ถูก sync เข้า `mediaFile`

### ✨ การแก้ไข

#### 1. แก้ไข Frontend API Service
- **ไฟล์**: `frontend/src/modules/shared/services/modules/jobService.js`
- **เปลี่ยน**: `completeJob()` จากเรียก `finishJob()` (Supabase) เป็นเรียก Backend API `/jobs/:id/complete`
- **ผลลัพธ์**: ทุกการส่งมอบงานจะผ่าน Backend API ที่มี logic insert `mediaFile`

```javascript
completeJob: async (jobId, data) => {
    const response = await httpClient.post(`/jobs/${jobId}/complete`, {
        note: data?.note || '',
        attachments: data?.attachments || []
    });
    return response.data;
}
```

#### 2. แก้ไข Foreign Key Constraint
- **ปัญหา**: `media_files.job_id` FK ชี้ไปที่ `design_jobs` (ตารางเก่า)
- **แก้ไข**: Drop constraint เก่าและสร้างใหม่ชี้ไปที่ `jobs` table
- **SQL**:
```sql
ALTER TABLE media_files DROP CONSTRAINT media_files_job_id_fkey;
ALTER TABLE media_files ADD CONSTRAINT media_files_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
```

#### 3. Sync งานเก่า
- **สร้าง Script**: `backend/api-server/scripts/sync_completed_jobs_to_media.mjs`
- **ฟังก์ชัน**: ดึงงานที่ `status = completed` และมี `finalFiles` แล้ว insert เข้า `mediaFile`
- **ผลลัพธ์**: Sync สำเร็จ 3 งาน

### 📊 ผลลัพธ์
- ✅ งานใหม่ที่ส่งมอบจะถูก insert เข้า `mediaFile` อัตโนมัติ
- ✅ งานเก่า 3 งานถูก sync เข้า `mediaFile` แล้ว
- ✅ Media Portal แสดงผลงานที่ส่งมอบแล้วถูกต้อง
- ✅ Foreign Key Constraint ถูกต้อง

### 📁 ไฟล์ที่เปลี่ยนแปลง
- `frontend/src/modules/shared/services/modules/jobService.js` (+15, -3)
- `backend/api-server/scripts/sync_completed_jobs_to_media.mjs` (new file)

### 🔧 Database Migration
- แก้ไข Foreign Key: `media_files_job_id_fkey` จาก `design_jobs` → `jobs`

### 📝 บันทึกเพิ่มเติม
- Backend route `/jobs/:id/complete` เรียก `approvalService.completeJob()` ถูกต้องอยู่แล้ว
- Frontend ส่ง `attachments` format ถูกต้อง: `[{ name: 'Final Link', url: finalLink }]`
- Logic insert `mediaFile` ใน `approvalService.completeJob()` ทำงานถูกต้อง (บรรทัด 1038-1060)

---

### 1. [Development] ปรับปรุงดีไซน์ Media Card และแก้ปัญหาการแสดงผลไฟล์ของ Admin (11:00 - 11:23)
<details>
<summary>🔍 <b>คลิกดูรายละเอียด</b> (UI, Trello Style, Bug Fix, MediaFile)</summary>

🔴 **Request:** 
- ปรับหน้าตา Media โครงการของฉันให้เป็นรูปแบบการ์ดแบบ Trello
- แก้ปัญหาที่ Admin มองไม่เห็นไฟล์งานที่ส่งมอบแล้วใน Media Portal

✅ **Action:**
*   เขียนคอมโพเนนต์ `MediaCard` ใหม่ใน `UserPortal.jsx` และ `MediaPortal.jsx` ให้มีดีไซน์แบบหัวสี (Color bars), แสดงชื่องานชัดเจน และมีปุ่ม Link
*   แก้ไขบั๊กในหน้า Backend ฝั่ง `approvalService.js` โดยเพิ่มให้ระบบบันทึก `attachments` (Final Link) ลงในฐานข้อมูล `MediaFile` ขณะกด "ส่งมอบงาน" เพื่อให้แอดมินสามารถดูผลงานย้อนหลังได้
*   รันสคริปต์ `sync_media.mjs` (ชั่วคราว) เพื่อดึงลิงก์เก่า ๆ กลับมาแสดงผลให้ถูกต้อง

📂 **Files Modified:**
- `frontend/src/modules/features/portals/pages/UserPortal.jsx`
- `frontend/src/modules/features/portals/pages/MediaPortal.jsx`
- `backend/api-server/src/services/approvalService.js`

⏱️ **เวลาที่ใช้:** 23 นาที

</details>
