# ระบบคิวงานและการสื่อสาร (Job Queue & Communication)

เอกสารฉบับนี้อธิบายกลไกการจัดการลำดับงาน (Job Chaining) และระบบความร่วมมือ (Collaboration Features) ภายใน DJ-System

---

## 1. ระบบคิวงานขั้นสูง (Advanced Job Queuing)

ระบบรองรับความสัมพันธ์ระหว่างงานที่ซับซ้อนเพื่อให้สอดคล้องกับกระบวนการทำงานจริง:

### 1.1 งานแบบกลุ่ม (Parent-Child Jobs)
เมื่อผู้เปิดงานเลือก Job Type ที่มี "งานย่อย" ระบบจะสร้างงานในลักษณะ Parent-Child:
- **Parent Job**: ทำหน้าที่เป็นตะกร้ารวบรวมงาน (เช่น ID: DJ-260206-0001)
- **Child Jobs**: งานปฏิบัติงานจริง (เช่น ID: DJ-260206-0001-01)
- **Status Cascade**: การอนุมัติงานแม่ (Parent) จะส่งผลต่อสถานะของงานลูก (Child) ทันที

### 1.2 งานต่อเนื่อง (Sequential Jobs / Chain)
**แหล่งที่มา**: `model Job` (field `predecessorId`)

ระบบรองรับ "เงื่อนไขการเริ่มงาน" (Start Conditions):
- งานที่ 2 จะเริ่มได้ (สถานะเปลี่ยนจาก `pending_dependency` เป็น `assigned`) ก็ต่อเมื่อ งานที่ 1 (Predecessor) มีสถานะเป็น `completed` เท่านั้น
- **Timeline Recalculation**: เมื่อวันส่งมอบงานแรกเลื่อน วันเริ่มงานถัดไปจะถูกคำนวณใหม่โดยอัตโนมัติ (Dynamic SLA)

---

## 2. ระบบบันทึกประวัติ (Activity Logs)

ทุกความเคลื่อนไหวในระบบจะถูกบันทึกไว้อย่างละเอียดเพื่อการตรวจสอบ (Audit Trail)

### 2.1 โครงสร้าง Activity Log
**แหล่งที่มา**: `model ActivityLog`

| ฟิลด์ (Field) | คำอธิบาย |
| :--- | :--- |
| **action** | ประเภทการกระทำ (เช่น `job_created`, `status_changed`, `assigned`) |
| **message** | ข้อความอธิบายที่มนุษย์อ่านเข้าใจ (เช่น "อนุมัติงานโดย Creative Lead") |
| **detail** | ข้อมูลดิบในรูปแบบ JSON (เช่น { oldStatus: 'draft', newStatus: 'pending' }) |
| **userId** | ผู้ที่กระทำการนั้นๆ |

---

## 3. ระบบการสื่อสาร (Communication)

ฝ่ายที่เกี่ยวข้องสามารถสื่อสารกันได้โดยตรงภายในหน้าดีเทลงาน:

### 3.1 การคอมเมนต์ (Job Comments)
- รองรับการสนทนาโต้ตอบระหว่าง Requester, Approver และ Assignee
- บันทึกวันเวลาและผู้เขียนอย่างชัดเจน
- ข้อมูลถูกจัดเก็บใน `model JobComment` และแสดงผลแบบ Timeline ในหน้า Job Detail (V2)

---

## 4. ระบบการส่งมอบงาน (Deliverables)

ระบบแยกไฟล์ที่ใช้ประกอบการทำงาน (Brief Files) ออกจากไฟล์งานที่เสร็จสมบูรณ์ (Deliverables):

### 4.1 การจัดการเวอร์ชัน (Versioning)
- **JobDeliverable**: เก็บไฟล์ผลงานที่ Assignee อัปโหลด
- **Final Files**: เมื่อ Requester กด "ปิดงาน" (Close Job) ไฟล์เวอร์ชันล่าสุดจะถูกทำเครื่องหมายเป็น `isFinal` และล็อกไว้ไม่ให้แก้ไข

---

## 5. ระบบแจ้งเตือน (Notifications)

ระบบใช้การแจ้งเตือนเพื่อกระตุ้นให้ Flow เดินหน้าต่อไป:
- **Trigger**: เมื่อสถานะเปลี่ยน (เช่น จาก Pending เป็น Approved)
- **Channel**: ปัจจุบันรองรับการแสดงผลในแอปฯ (In-app Notification) และระบบ Email Alert (Mock)
- **Data Source**: `model Notification` (Id, userId, message, readStatus)

---

## ไฟล์ที่เกี่ยวข้อง (Related Files)

| รายการ | เส้นทางไฟล์ (Path) |
| :--- | :--- |
| **Job API Logic** | `backend/api-server/src/routes/jobs.js` |
| **Activity/Log Service** | `backend/api-server/src/services/activityService.js` |
| **Comment Logic** | `frontend/src/modules/features/job-management/components/JobComments.jsx` |
| **Notification Store** | `frontend/src/modules/core/stores/notificationStore.js` |

---
**อัปเดตล่าสุด**: 2026-02-11
**สถานะ**: Production Ready
