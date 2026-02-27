# 🔄 Workflows & Job Management

เอกสารเกี่ยวกับขั้นตอนและการไหลเวียนของงาน (Job Workflows)

## 📄 เอกสารในโฟลเดอร์นี้

### 🔹 JOB_WORKFLOW_DOCUMENTATION.md
เอกสารยาวรายละเอียดเกี่ยวกับสถานะการทำงานและขั้นตอนการไหลของงาน

**เนื้อหา:**
- Job Status Flow ทั้งหมด
- Approval Flow (การอนุมัติแบบหลายระดับ)
- Job Acceptance Flow (การรับงาน)
- Job Rejection Flow (การปฏิเสธงาน)
- Job Cancellation & Chain Logic
- Parent-Child Jobs
- Job Chaining (Sequential Jobs)
- Multi-Role Union View

### 🔹 TEST_APPROVAL_FLOW_2026_02_11.md
รายงานการทดสอบเส้นทางการอนุมัติ

**เนื้อหา:**
- สรุปผลการทดสอบ
- Test Cases ที่ผ่าน/ไม่ผ่าน
- ข้อค้นพบและคำแนะนำ

---

## 📊 Job Status Flow Overview

```
draft
  ↓ (Submit)
submitted
  ├─→ pending_approval (มี Approval Flow)
  │    ├─→ pending_level_1
  │    ├─→ pending_level_2
  │    └─→ approved
  └─→ approved (Skip Approval)
       ↓ (Assign)
      assigned
       ↓ (Accept)
      in_progress
       ├─→ rework (Ask for rework)
       ├─→ pending_rejection (Request rejection)
       ├─→ pending_close (Submit for close)
       └─→ rejected
```

---

## 🎯 สถานะหลัก

| สถานะ | คำอธิบาย | ใครสามารถเปลี่ยน |
|------|---------|-----------------|
| **draft** | ร่างงาน | Requester |
| **submitted** | ส่งงานแล้ว | Requester |
| **pending_approval** | รอการอนุมัติ | Approver |
| **approved** | อนุมัติแล้ว | Approver |
| **assigned** | มอบหมายแล้ว | Admin/Approver |
| **in_progress** | กำลังทำ | Assignee |
| **completed** | เสร็จแล้ว | Assignee/System |
| **rejected** | ปฏิเสธ | Approver/Assignee |
| **rework** | ขอแก้ไข | Requester |

---

## 🔐 Approval Flow

### ระดับการอนุมัติ
- **Level 1:** ผู้อนุมัติรั้งแรก (หัวหน้าทีม)
- **Level 2:** ผู้อนุมัติชั้นสอง (Manager)
- **Level 3+:** สามารถเพิ่มระดับได้ตามต้องการ

### การข้ามการอนุมัติ (Skip Approval)
- ประเภทงานบางประเภทสามารถข้ามการอนุมัติได้
- การตั้งค่า: Admin → Admin Panel → Approval Flows

---

## 👥 Parent-Child Jobs

**Parent Job:** งานหลัก มีไฟล์สิ่งที่ส่งมอบหลายชิ้น

**Child Jobs:** งานแต่ละชิ้นที่ตามลำดับ

**ประโยชน์:**
- จัดการงานขนาดใหญ่ได้ง่ายกว่า
- ติดตามความคืบหน้าแยกส่วน

---

## 🔗 Job Chaining

งาน A → งาน B → งาน C

**กฎ:**
- งาน Child ต้องปล่อยงาน Parent ก่อน
- ไม่สามารถเริ่มงาน B ก่อนงาน A เสร็จ
- ทำให้ workflow เป็นลำดับชั้น

---

## 🚀 ตัวอย่างการใช้งาน

### Use Case 1: โครงการแคมเปญด่วน
```
Draft → Submit → Approved (Skip) → Assigned → In Progress → Completed
```

### Use Case 2: โครงการใหญ่พร้อมอนุมัติ
```
Draft → Submit → Pending L1 → Pending L2 → Approved → Assigned → In Progress → Completed
```

### Use Case 3: งานที่ต้องแก้ไข
```
In Progress → Rework → In Progress → Completed
```

---

## 📚 อ้างอิงเพิ่มเติม

- 📖 [reference/ACCEPTANCE_DATE_USE_CASES.md](../reference/ACCEPTANCE_DATE_USE_CASES.md) - ตัวอย่างการใช้งาน Acceptance Date
- 📐 [architecture/](../architecture/) - สถาปัตยกรรมระบบ

---

**Last Updated:** 26 กุมภาพันธ์ 2026
