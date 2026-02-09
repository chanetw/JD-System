# คู่มือการทำงาน Sequential Jobs (Job Chaining)

**เวอร์ชัน:** 1.0
**วันที่อัปเดต:** 2026-02-09
**สถานะ:** ✅ Single-Level Implementation (ปลอดภัย)

---

## 📋 สารบัญ

1. [ความเข้าใจพื้นฐาน](#ความเข้าใจพื้นฐาน)
2. [ตัวอย่างสถานการณ์ 9 แบบ](#ตัวอย่างสถานการณ์-9-แบบ)
3. [วิธีการตั้งค่า Chaining](#วิธีการตั้งค่า-chaining)
4. [Safeguards และข้อควรระวัง](#safeguards-และข้อควรระวัง)
5. [Planning การปรับปรุงในอนาคต](#planning-การปรับปรุงในอนาคต)

---

## ความเข้าใจพื้นฐาน

### โครงสร้าง Single-Level Chaining

```
สมมติการตั้งค่า:
┌─ Social Media (Type ID: 1)
│  └─ nextJobTypeId = 2 (Banner Web)
│
├─ Banner Web (Type ID: 2)
│  └─ nextJobTypeId = null (ไม่มีงานต่อ)
│
└─ Print Ad (Type ID: 3)
   └─ nextJobTypeId = null
```

### วิธีการทำงาน

```
User สร้าง Job ของ type "Social Media" (ID: 1)
           ↓
System ตรวจสอบ Social Media.nextJobTypeId = 2?
           ↓
พบว่ามี → Auto-create Job ของ type "Banner Web"
           ↓
System ตรวจสอบ Banner Web.nextJobTypeId = ?
           ↓
ไม่มี (null) → STOP ✓
```

### ผลลัพธ์ในฐานข้อมูล

```
Database:
├─ Job #1 (Social Media)
│  ├─ type_id: 1
│  ├─ parent_job_id: null
│  └─ status: 'active'
│
└─ Job #2 (Banner Web)
   ├─ type_id: 2
   ├─ parent_job_id: 1 ← linked to Job #1
   └─ status: 'active'
```

---

## ตัวอย่างสถานการณ์ 9 แบบ

### ✅ Scenario 1: Basic Single Chain (Social → Banner)

**ตั้งค่า:**
- Social Media (ID: 1) → nextJobTypeId = 2
- Banner Web (ID: 2) → nextJobTypeId = null

**ผู้ใช้สร้าง:** Job ของ type "Social Media"

**ผลลัพธ์:**
```
┌─ Job #1 (Social Media) ← ผู้ใช้สร้าง
├─ Job #2 (Banner Web) ← Auto-create
└─ Total: 2 jobs

Parent-Child Link:
Job #1 (parent) → Job #2 (child)
```

**UI แสดง:**
```
[Job List]
├─ Job #1: Social Media
│  └─ Child: Job #2 - Banner Web
│     Status: ✓ Created automatically
```

**เหมาะสำหรับ:** Workflow 2-step ธรรมดา

---

### ✅ Scenario 2: Double Chain Setup (Social → Banner → Print)

**ตั้งค่า:**
- Social Media (ID: 1) → nextJobTypeId = 2
- Banner Web (ID: 2) → nextJobTypeId = 3 ⭐ NEW!
- Print Ad (ID: 3) → nextJobTypeId = null

**ผู้ใช้สร้าง:** Job ของ type "Social Media"

**ผลลัพธ์:**
```
┌─ Job #1 (Social Media) ← ผู้ใช้สร้าง
├─ Job #2 (Banner Web) ← Auto-create
└─ ❌ Job #3 (Print Ad) ← NOT auto-created!
   (Single-level only, ไม่ follow B's chain)

Total: 2 jobs (ไม่ครบ)
```

**ผู้ใช้ต้องทำอย่างไร:**

```
Option A: สร้าง Print Ad เป็น standalone
├─ Job #1 (Social)
│  └─ Child: Job #2 (Banner)
└─ Job #3 (Print) ← Separate

Option B: สร้าง Print Ad เป็น child ของ Banner
├─ Job #1 (Social)
│  └─ Child: Job #2 (Banner)
│     └─ Child: Job #3 (Print) ← Manual link
```

**⚠️ ข้อควรระวัง:** เนื่องจากเป็น Single-Level ไม่สามารถ auto-create 3 steps พร้อมกัน ผู้ใช้ต้อง manual สร้าง step สุดท้าย

---

### ✅ Scenario 3: Reuse Chaining (Email → Banner + Social → Banner)

**ตั้งค่า:**
- Social Media (ID: 1) → nextJobTypeId = 2
- Banner Web (ID: 2) → nextJobTypeId = 3
- Print Ad (ID: 3) → nextJobTypeId = null
- Email (ID: 4) → nextJobTypeId = 2 ⭐ Email also chains to Banner!

**ผู้ใช้ทำตามลำดับ:**

```
Step 1: สร้าง Job ของ type "Social Media"
        ├─ Job #1 (Social) ← User create
        └─ Job #2 (Banner) ← Auto-create

Step 2: สร้าง Job ของ type "Email"
        ├─ Job #4 (Email) ← User create
        └─ Job #3 (Banner) ← Auto-create (NEW instance!)
```

**ผลลัพธ์ในฐานข้อมูล:**
```
├─ Job #1 (Social) parent_job_id=null
├─ Job #2 (Banner) parent_job_id=1 ← Child of Social
├─ Job #4 (Email) parent_job_id=null
├─ Job #3 (Banner) parent_job_id=4 ← Child of Email
└─ ❌ Job #5 (Print) ← Never created!
```

**สำคัญ:** ทั้ง Social และ Email จะ auto-create Banner ของตัวเอง เนื่องจาก Single-Level จะไม่ follow ต่อ Print

---

### ✅ Scenario 4: Independent Job (ไม่มี Chain)

**ตั้งค่า:**
- Video Clip (ID: 5) → nextJobTypeId = null ← No chain

**ผู้ใช้สร้าง:** Job ของ type "Video Clip"

**ผลลัพธ์:**
```
┌─ Job #1 (Video Clip) ← User create
└─ ❌ No auto-create ← Video has no nextJobTypeId

Total: 1 job (standalone)
```

**เหมาะสำหรับ:** งานเดี่ยวที่ไม่ต้องเชื่อมโยงกับงานอื่น

---

### ✅ Scenario 5: Manual Child Creation

**ตั้งค่า:**
- Social Media (ID: 1) → nextJobTypeId = 2
- Banner Web (ID: 2) → nextJobTypeId = null

**ผู้ใช้ทำตามลำดับ:**

```
Step 1: สร้าง Job "Social Media"
        ├─ Job #1 (Social) ← User
        └─ Job #2 (Banner) ← Auto-create

Step 2: ผู้ใช้ manual เพิ่ม child เพิ่มเติม
        สร้าง Job #3 (Print) ด้วย parentJobId = Job #1
```

**ผลลัพธ์:**
```
┌─ Job #1 (Social Media)
├─ Job #2 (Banner) ← Auto-create (1st child)
└─ Job #3 (Print) ← Manual add (2nd child)

Total: 1 parent + 2 children
```

**ประโยชน์:** ยืดหยุ่น สามารถ add children ได้มากกว่า 1 jobs

---

### ✅ Scenario 6: Create Child First, Then Parent (Reverse Order)

**ตั้งค่า:**
- Social Media (ID: 1) → nextJobTypeId = 2
- Banner Web (ID: 2) → nextJobTypeId = null

**ผู้ใช้ทำตามลำดับ:**

```
Step 1: สร้าง Job "Banner Web" เป็น standalone
        └─ Job #1 (Banner) ← User, parentJobId=null

Step 2: สร้าง Job "Social Media"
        ├─ Job #2 (Social) ← User
        └─ Job #3 (Banner) ← Auto-create (NEW instance!)
```

**ผลลัพธ์:**
```
├─ Job #1 (Banner) ← Standalone
├─ Job #2 (Social)
└─ Job #3 (Banner) ← Different Banner instance!

สำคัญ: Chaining ALWAYS creates NEW jobs
       ไม่ link กับ existing jobs
```

---

### ✅ Scenario 7: Circular Reference Detection (PREVENTED)

**ตั้งค่า (Invalid!):**
```
Social Media (ID: 1) → nextJobTypeId = 2
Banner Web (ID: 2) → nextJobTypeId = 1 ❌ CIRCULAR!
```

**ผู้ใช้พยายาม:** สร้าง Job ของ type "Social"

**ปัจจุบัน (Single-Level):**
```
┌─ Job #1 (Social)
└─ Job #2 (Banner) ← Auto-create
   └─ STOP ✓ (Single-level, ไม่ follow B's chain)

ผลลัพธ์: ปลอดภัย! ไม่เกิด circular loop
```

**ข้อดี:** Single-Level Design ป้องกัน circular โดยธรรมชาติ!

---

### ✅ Scenario 8: Config Change (Change Chain Settings)

**เริ่มต้น:**
- Social Media → nextJobTypeId = 2

**Existing Jobs:**
```
├─ Job #1 (Social)
└─ Job #2 (Banner) ← Child
```

**ผู้ใช้เปลี่ยน:** Social Media → nextJobTypeId = null (remove chain)

**ผลลัพธ์:**
```
Existing jobs:
├─ Job #1 (Social) ← ยังมี
└─ Job #2 (Banner) ← ยังมี (unchanged)

Future jobs:
- สร้าง Job ใหม่ของ type Social → NO auto-create
  ✓ Backward compatible!
```

**สำคัญ:** การเปลี่ยน config ไม่กระทบ existing jobs

---

### ✅ Scenario 9: Delete Parent Job (Decision Needed)

**Existing:**
```
├─ Job #1 (Social) ← Parent
└─ Job #2 (Banner) ← Child
```

**ผู้ใช้ delete:** Job #1 (Social)

**ตัวเลือก (ขึ้นอยู่กับ config):**

```
Option A: Orphan (ปัจจุบัน)
└─ Job #2 (Banner) ← ยังมี แต่ parent_job_id=null

Option B: Cascade Delete
├─ Job #1 → DELETE
└─ Job #2 → DELETE (ตาม parent)

Option C: Prevent Delete
❌ Error: "Cannot delete job with children"
```

**ต้องตัดสินใจ:** ควรเป็น Option A หรือ B?

---

## วิธีการตั้งค่า Chaining

### 1️⃣ ใน Admin Panel (Frontend)

**หน้า:** Admin → Job Types SLA Management

```
[Job Type Edit Form]
┌─ Name: Social Media
├─ Description: ...
├─ SLA Days: 3
├─ Icon: social (dropdown)
├─ Attachments: [Logo, Size Spec, ...]
│
└─ ⭐ Auto-Chain Settings:
   ├─ Label: "Next Job Type (Sequential)"
   ├─ Dropdown: [Select None / Banner Web / Print Ad / ...]
   └─ Visual: "When this job is created, automatically create: Banner Web"
```

### 2️⃣ ในฐานข้อมูล (Backend)

**Table:** `job_types`

```sql
SELECT
  id,
  name,
  next_job_type_id  ← This field controls chaining
FROM job_types
WHERE id = 1;

-- Result:
id | name         | next_job_type_id
1  | Social Media | 2
```

### 3️⃣ ใน API

**GET /api/job-types**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Social Media",
      "sla": 3,
      "icon": "social",
      "nextJobTypeId": 2,  ← Shows the chain
      "items": [...]
    }
  ]
}
```

**PUT /api/job-types/1**

```json
{
  "name": "Social Media",
  "sla": 3,
  "icon": "social",
  "nextJobTypeId": 2  ← Update chain here
}
```

---

## Safeguards และข้อควรระวัง

### ✅ Built-in Protections

| ความเสี่ยง | Single-Level | ป้องกัน |
|----------|------------|--------|
| Circular Loop | ❌ Prevented | Single-level ไม่ follow chain ต่อ |
| Data Explosion | ✅ Limited | Max 2 jobs (parent + 1 child) |
| Deep Chain | ✅ Safe | Can't go deeper than 2 |
| Self-Chain | ✅ Safe | A→A impossible with single-level |
| Performance | ✅ Good | Only 1 recursive call |

### ⚠️ User Awareness Needed

| Issue | Solution |
|-------|----------|
| "ทำไมไม่ auto-create Print?" | Explain Single-Level (need manual Step 3) |
| "Create Banner มีหลายตัว?" | Yes, each parent creates own Banner |
| "ลบ parent ลบ child ด้วยไหม?" | Clarify deletion policy in UI |

### 📋 Checklist ก่อนใช้งาน

```
☑ Setup nextJobTypeId values in all job types
☑ Test with 2-step chain (A→B)
☑ Test reuse scenarios (F→B when B already created)
☑ Test manual child creation
☑ Document in training materials
☑ Train support team on limitations
```

---

## Planning การปรับปรุงในอนาคต

### 🔄 Future Phase: Full Transitive (Optional)

**ถ้าในอนาคต ต้องการ A→B→C auto-create ทั้ง 3:**

```
Current (Single-Level):
A → B → STOP

Requested (Full Transitive + Safeguards):
A → B → C → D (follow until no more chains)
   BUT with limits:
   ├─ MAX_CHAIN_DEPTH = 5
   ├─ Circular Detection
   └─ Visual Preview before create
```

**Effort:** ~2-3 วัน (เมื่อพร้อม)

### 📚 Documentation to Update When Upgrading

```
IF upgrading to Full Transitive:
├─ Update this guide (Section 2)
├─ Update API docs
├─ Update UI help text
├─ Add circular detection warning in admin panel
└─ Retrain users
```

---

## สรุปข้อมูล

| ลักษณะ | ค่า |
|------|-----|
| **Chaining Type** | Single-Level (ปลอดภัย) |
| **Max Jobs per Create** | 2 (parent + 1 child) |
| **Circular Risk** | 🟢 None |
| **Data Explosion Risk** | 🟢 None |
| **User Control** | 🟢 High |
| **Implementation** | ✅ Done |
| **Configuration** | Admin Panel → Job Types |
| **Field Name** | `nextJobTypeId` |

---

## ติดต่อสำหรับคำถาม

```
📧 Technical Issues: Backend team
📞 User Issues: Support team
📋 Enhancement Request: Product team
```

---

**เวอร์ชัน:** 1.0
**อัปเดตล่าสุด:** 2026-02-09
**สถานะ:** ✅ Approved & Implemented
