# การวิเคราะห์: 1 โครงการ มีหลาย Approval Flow

> เอกสารนี้วิเคราะห์ความเป็นไปได้และแนวทางการออกแบบระบบที่รองรับหลาย Approval Flow ต่อ 1 โครงการ

---

## 1. Use Case ที่เป็นไปได้

| Scenario | ตัวอย่าง |
|----------|---------|
| **แยกตามประเภทงาน** | Online Artwork → Flow A (1 ระดับ), Video Production → Flow B (3 ระดับ) |
| **แยกตามมูลค่างบ** | งบ < 50K → Flow เร็ว, งบ ≥ 50K → Flow เต็มขั้นตอน |
| **แยกตาม Priority** | Urgent → Skip Level 1, Normal → Full Flow |
| **แยกตาม BUD** | BUD ขาย → Approver A, BUD การตลาด → Approver B |

---

## 2. แนวทางการออกแบบ

### Option 1: Condition-Based Flow ✅ (แนะนำ)

**แนวคิด:** โครงการมี Default Flow 1 ตัว + Conditional Flows ที่ Match ตาม Rule

```
โครงการ → Default Flow (ใช้เมื่อไม่ Match Condition ใด)
        → Conditional Flow A (Match: Job Type = Video)
        → Conditional Flow B (Match: Priority = Urgent)
```

**โครงสร้างข้อมูล:**

```json
{
  "projectId": 1,
  "projectName": "Sena Park Grand",
  "defaultFlow": {
    "levels": [
      { "level": 1, "userId": 3, "name": "คุณวิภา" }
    ],
    "defaultAssignee": { "userId": 5, "name": "กานต์" }
  },
  "conditionalFlows": [
    {
      "id": "cf-001",
      "name": "Video Production Flow",
      "priority": 1,
      "condition": { "jobTypeId": 5 },
      "flow": {
        "levels": [
          { "level": 1, "userId": 3, "name": "คุณวิภา" },
          { "level": 2, "userId": 4, "name": "ผอ.สมชาย" }
        ],
        "defaultAssignee": { "userId": 6, "name": "วิชัย Videographer" }
      }
    },
    {
      "id": "cf-002",
      "name": "Urgent Skip Flow",
      "priority": 2,
      "condition": { "priority": "urgent" },
      "flow": {
        "levels": [
          { "level": 1, "userId": 4, "name": "ผอ.สมชาย" }
        ],
        "defaultAssignee": { "userId": 5, "name": "กานต์" }
      }
    }
  ]
}
```

**ข้อดี:**
- ไม่ต้องให้ User เลือก Flow เอง (Auto-match)
- รองรับ Business Rule ซับซ้อน
- UI ยังคง "1 โครงการ = 1 หน้าจัดการ"

**ข้อเสีย:**
- Logic ซับซ้อน
- ต้องจัดลำดับ Priority ของ Condition

---

### Option 2: Multiple Named Flows

**แนวคิด:** โครงการมีหลาย Flow แยกชื่อ, User หรือ System เลือกตอนสร้างงาน

```
โครงการ → Flow "Standard" (Default)
        → Flow "Express"
        → Flow "High Value"
```

**โครงสร้างข้อมูล:**

```json
{
  "projectId": 1,
  "flows": [
    { "id": "f1", "name": "Standard", "isDefault": true, "levels": [...] },
    { "id": "f2", "name": "Express", "isDefault": false, "levels": [...] },
    { "id": "f3", "name": "High Value", "isDefault": false, "levels": [...] }
  ]
}
```

**ข้อดี:**
- เข้าใจง่าย
- Admin จัดการง่าย

**ข้อเสีย:**
- ต้องเลือก Flow ตอนสร้างงาน หรือ Auto-assign ตาม Rule
- อาจสร้าง Flow ซ้ำซ้อน

---

### Option 3: Master Template + Override

**แนวคิด:** สร้าง Global Template แล้วให้โครงการ Override เฉพาะบางส่วน

**ข้อดี:**
- ลด Redundancy (DRY Principle)
- เปลี่ยน Template ครั้งเดียว ใช้ได้หลายโครงการ

**ข้อเสีย:**
- ยากเมื่อต้อง Debug
- อาจเกิด Side Effect ไม่คาดคิด

---

## 3. ผลกระทบต่อระบบปัจจุบัน

| Component | สิ่งที่ต้องเปลี่ยน |
|-----------|-------------------|
| **Data Structure** | `approvalFlows` → เพิ่ม `conditionalFlows[]` |
| **Admin UI** | เพิ่ม Tab/Section แสดงหลาย Flow ต่อ Project |
| **CreateDJ.jsx** | Logic เลือก Flow ตาม Condition ก่อน Submit |
| **mockApi.js** | `getApprovalFlowByProject()` → `getFlowForJob(projectId, jobType, priority)` |
| **DJDetail.jsx** | แสดงว่างานนี้ใช้ Flow ไหน |

---

## 4. ขั้นตอนการพัฒนา (ถ้าเลือก Option 1)

### Phase 1: Data Model
- [ ] เพิ่ม `conditionalFlows[]` ใน `approvalFlows` schema
- [ ] สร้าง Mock Data ตัวอย่าง

### Phase 2: Admin UI
- [ ] เพิ่ม Section "Conditional Flows" ใน ApprovalFlow.jsx
- [ ] สร้าง Form เพิ่ม/แก้ไข Condition Rule
- [ ] แสดง Priority ลำดับการ Match

### Phase 3: Matching Logic
- [ ] สร้าง `matchFlowCondition(job, conditions)` function
- [ ] แก้ไข `getApprovalFlowByProject()` ใน mockApi.js
- [ ] Test กับ Job หลาย Condition

### Phase 4: Display & Feedback
- [ ] แสดง Flow ที่ใช้ใน DJDetail.jsx
- [ ] เพิ่ม Tooltip อธิบายว่าทำไมใช้ Flow นี้

---

## 5. สรุปคำแนะนำ

| ความซับซ้อนของ Business | แนะนำ |
|------------------------|-------|
| **ง่าย** (1 Flow ต่อ Project เพียงพอ) | ใช้ระบบปัจจุบัน |
| **ปานกลาง** (แยกตาม Job Type) | Option 1: Condition-Based |
| **ซับซ้อน** (แยกหลายเงื่อนไขผสม) | Option 1 + Rule Engine |

---

*เอกสารนี้สร้างเมื่อ: 18 มกราคม 2568*
