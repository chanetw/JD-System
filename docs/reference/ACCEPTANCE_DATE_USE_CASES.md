# Acceptance Date - Use Cases & Flows

## 📋 Concept: Due Date Selection (Recommended)

> **Concept:** Acceptance Date = วันส่งงาน (Due Date) ที่ต้องการให้ Assignee ส่งมอบผลงาน
>
> ระบบจะคำนวณย้อนกลับเพื่อหาวันเริ่มงาน (Start Date = Due Date - SLA)

---

## 🎯 Use Case 1: สั่งงานล่วงหน้าสำหรับแคมเปญ

### **Scenario:**
Marketing ต้องการสั่งทำ Banner Web สำหรับแคมเปญ "มหกรรมลดราคา" ที่จะเริ่มวันที่ 1 มีนาคม
ต้องการให้ Designer ส่งงานภายในวันที่ 28 ก.พ. เพื่อมีเวลาเตรียมการ

### **Flow:**

```
📅 วันที่สั่งงาน (Submit Date): 17 ก.พ. 2026 (วันนี้)
📅 ประเภทงาน: Banner Web (SLA: 3 วันทำการ)
🔘 Priority: Normal

Step 1: เลือกวันส่งงาน (Due Date)
  → เปิด Calendar
  → เลือก: 28 ก.พ. 2026 (11 วันข้างหน้า)
  → เหตุผล: ต้องการให้ Designer ส่งงานภายในวันที่ 28

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date) อัตโนมัติ
  → Start Date = 28 ก.พ. - 3 วันทำการ
  → Start Date = 25 ก.พ. 2026

Step 3: Submit งาน
  → Status: submitted
  → Waiting for approval

Timeline:
  17 ก.พ. ━━━━━ [รอ] ━━━━━ 25 ก.พ. ━━━ [ทำงาน] ━━━ 28 ก.พ.
  (สั่งงาน)                  (เริ่มทำ)           (ส่งงาน)

Result: ✅ ได้งานก่อนแคมเปญเริ่ม 1 มี.ค.
```

---

## 🎯 Use Case 2: งานด่วนต้องการทันที

### **Scenario:**
เกิด Flash Sale กะทันหัน ต้องการ EDM ภายในวันที่ 19 ก.พ.

### **Flow:**

```
📅 วันที่สั่งงาน: 17 ก.พ. 2026 (เช้า 9:00)
📅 ประเภทงาน: EDM (SLA: 2 วันทำการ)
🔥 Priority: Urgent

Step 1: เลือกวันส่งงาน (Due Date)
  → เปิด Calendar
  → งานด่วน: เลือกได้ตั้งแต่ (วันนี้ + SLA) = 19 ก.พ. ✅
  → เลือก: 19 ก.พ. 2026

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date)
  → Start Date = 19 ก.พ. - 2 วันทำการ
  → Start Date = 17 ก.พ. 2026 (วันนี้เลย!)

Step 3: Approval Flow (งานด่วนต้องอนุมัติเสมอ)
  → Approver อนุมัติทันที
  → Assign ให้ Designer เริ่มทำทันที

Timeline:
  17 ก.พ. ━ [อนุมัติ] ━ [ทำงานทันที] ━━ 19 ก.พ.
  (9:00)     (เริ่มทำ)                   (ส่งงาน)

Result: ✅ ได้งานทันภายใน 2 วันทำการ
```

---

## 🎯 Use Case 3: สั่งงานหลายชิ้นพร้อมกัน (Parent-Child Jobs)

### **Scenario:**
สั่งทำชุดงานแคมเปญครบ: Key Visual → Banner Web → EDM
ต้องการให้เสร็จหมดภายในวันที่ 5 มีนาคม

### **Flow:**

```
📅 วันที่สั่งงาน: 17 ก.พ. 2026
📦 Parent-Child Jobs:
  1. Key Visual (SLA: 5 วัน) → Sequential
  2. Banner Web (SLA: 3 วัน) → รอ Key Visual เสร็จ
  3. EDM (SLA: 2 วัน) → รอ Banner เสร็จ
🔘 Priority: Normal

Step 1: เลือกวันส่งงานสุดท้าย (Final Due Date)
  → เลือก: 5 มี.ค. 2026
  → เหตุผล: ต้องการให้ EDM เสร็จภายในวันนี้

Step 2: ระบบคำนวณ Timeline ย้อนกลับแบบต่อเนื่อง

  Job 3 (EDM):
    Due: 5 มี.ค. (เป้าหมาย)
    Start: 3 มี.ค. (5 - 2 วันทำการ)

  Job 2 (Banner Web):
    Due: 3 มี.ค. (ต้องเสร็จก่อน EDM เริ่ม)
    Start: 27 ก.พ. (3 - 3 วันทำการ)

  Job 1 (Key Visual):
    Due: 27 ก.พ. (ต้องเสร็จก่อน Banner เริ่ม)
    Start: 20 ก.พ. (27 - 5 วันทำการ)

Timeline:
  20 ก.พ. ━━━ [Key Visual] ━━━ 27 ก.พ. ━━━ [Banner] ━━━ 3 มี.ค. ━ [EDM] ━ 5 มี.ค.

Total Duration: 5 + 3 + 2 = 10 วันทำการ
First Start Date: 20 ก.พ. 2026

Result: ✅ ได้งานครบชุดตามลำดับ เสร็จทันวันที่ 5 มี.ค.
```

---

## 🎯 Use Case 4: งานปกติต้องการเร็วที่สุด

### **Scenario:**
Marketing ต้องการ Landing Page และต้องการให้เสร็จเร็วที่สุดเท่าที่จะทำได้

### **Flow:**

```
📅 วันที่สั่งงาน: 17 ก.พ. 2026 (จันทร์)
📅 ประเภทงาน: Landing Page (SLA: 7 วันทำการ)
🔘 Priority: Normal

Step 1: เลือกวันส่งงานเร็วที่สุด
  → งานปกติ: เลือกได้ตั้งแต่ (วันนี้ + SLA + 1) = 27 ก.พ.
  → เลือก: 27 ก.พ. 2026

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date)
  → Start Date = 27 ก.พ. - 7 วันทำการ
  → Start Date = 18 ก.พ. 2026 (พรุ่งนี้)

Timeline:
  17 ก.พ. ━ 18 ก.พ. ━━━━━━━ [ทำงาน] ━━━━━━━ 27 ก.พ.
  (สั่ง)   (เริ่มทำ)                         (ส่งงาน)

Result: ✅ เริ่มได้เร็วที่สุด ส่งงานภายใน SLA
```

---

## 🎯 Use Case 5: สั่งงานสำหรับอีเว้นท์เดือนหน้า

### **Scenario:**
HR ต้องการ Poster สำหรับงาน Company Outing วันที่ 15 มีนาคม
ต้องการให้ Designer ส่งงานภายในวันที่ 10 มี.ค. เพื่อมีเวลาพิมพ์

### **Flow:**

```
📅 วันที่สั่งงาน: 17 ก.พ. 2026
📅 ประเภทงาน: Poster Design (SLA: 4 วันทำการ)
🔘 Priority: Normal

Step 1: เลือกวันส่งงาน (Due Date)
  → เป้าหมาย: ต้องการงานก่อนวันที่ 10 มี.ค. (เผื่อเวลาพิมพ์)
  → เลือก: 10 มี.ค. 2026

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date)
  → Start Date = 10 มี.ค. - 4 วันทำการ
  → Start Date = 4 มี.ค. 2026 ✅

Timeline:
  17 ก.พ. ━━━ [รอ] ━━━ 4 มี.ค. ━━ [ทำงาน] ━━ 10 มี.ค. ━━━ 15 มี.ค.
  (สั่ง)                (เริ่มทำ)            (ส่งงาน)      (อีเว้นท์)

Result: ✅ ได้งานทันก่อนอีเว้นท์ 5 วัน (เผื่อเวลาพิมพ์)
```

---

## 🎯 Use Case 6: สั่งงานวันศุกร์สำหรับวันจันทร์

### **Scenario:**
Marketing สั่งงาน Social Media Post วันศุกร์ ต้องการให้ส่งงานวันอังคาร

### **Flow:**

```
📅 วันที่สั่งงาน: 21 ก.พ. 2026 (ศุกร์)
📅 ประเภทงาน: Social Media Post (SLA: 1 วันทำการ)
🔘 Priority: Normal

Step 1: เลือกวันส่งงาน (Due Date)
  → ข้ามสุดสัปดาห์ (เสาร์-อาทิตย์)
  → เลือก: 25 ก.พ. 2026 (อังคาร)

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date)
  → Start Date = 25 ก.พ. - 1 วันทำการ
  → Start Date = 24 ก.พ. 2026 (จันทร์)

Calendar View:
  ศ  อา  จ  อ  พ
  21 22  23 24 25
  📝 🚫 🚫 ✅ 📅
  สั่ง    เริ่ม ส่ง

Result: ✅ งานเสร็จวันอังคาร ไม่กระทบวันหยุด
```

---

## 🎯 Use Case 7: งานด่วนแต่ยังมีเวลา

### **Scenario:**
Flash Sale แต่ Designer ยุ่งวันนี้ ต้องการให้ส่งงานวันที่ 20 ก.พ.

### **Flow:**

```
📅 วันที่สั่งงาน: 17 ก.พ. 2026
📅 ประเภทงาน: Flash Sale Banner (SLA: 1 วันทำการ)
🔥 Priority: Urgent

Step 1: เลือกวันส่งงาน (Due Date)
  → แม้เป็นงานด่วน แต่เลือกได้ยืดหยุ่น
  → เลือก: 20 ก.พ. 2026 (ให้เวลามากขึ้น)

Step 2: ระบบคำนวณวันเริ่มงาน (Start Date)
  → Start Date = 20 ก.พ. - 1 วันทำการ
  → Start Date = 19 ก.พ. 2026

Timeline:
  17 ก.พ. ━━ 19 ก.พ. ━ [ทำ] ━ 20 ก.พ.
  (สั่ง)     (เริ่มทำ)     (ส่งงาน)

Result: ✅ ได้งานวันที่ 20 Designer มีเวลาทำงานคุณภาพมากขึ้น
```

---

## 📊 Summary: Validation Rules

### **งานปกติ (Normal/Low Priority):**
```javascript
// Due Date (วันส่งงาน) ต้องเลือกหลัง (วันนี้ + SLA + 1)
minDueDate = today + SLA + 1 day
maxDueDate = unlimited (ไม่จำกัด)

// ตัวอย่าง: วันนี้ 17 ก.พ., SLA 2 วัน
// minDueDate = 17 + 2 + 1 = 20 ก.พ.

// Calendar:
// 17-19 ก.พ. = 🚫 เลือกไม่ได้ (ไม่เพียงพอสำหรับ SLA)
// 20 ก.พ.+ = ✅ เลือกได้
```

### **งานด่วน (Urgent Priority):**
```javascript
// Due Date (วันส่งงาน) ต้องเลือกหลัง (วันนี้ + SLA)
minDueDate = today + SLA
maxDueDate = unlimited (ไม่จำกัด)

// ตัวอย่าง: วันนี้ 17 ก.พ., SLA 2 วัน
// minDueDate = 17 + 2 = 19 ก.พ.

// Calendar:
// 17-18 ก.พ. = 🚫 เลือกไม่ได้
// 19 ก.พ.+ = ✅ เลือกได้
```

---

## 🎨 UI Components

### **Priority Info Bar:**
```
┌────────────────────────────────────────────────┐
│ 📅 เลือกวันส่งงาน (Due Date)                  │
│                                                 │
│ 📅 งานปกติ: เลือกได้ตั้งแต่ (วันนี้+SLA+1)    │
│ หรือ                                           │
│ 🔥 งานด่วน: เลือกได้ตั้งแต่ (วันนี้+SLA)      │
└────────────────────────────────────────────────┘
```

### **Calendar:**
```
        ก.พ. 2569 (SLA: 2 วันทำการ)
   อา  จ   อ   พ   พฤ  ศ   ส
   -   -   -   -   -   -   15
   16  17  18  19  20  21  22
       🟢  🚫  🚫  ✅  ✅  ✅
   23  24  25  26  27  28  29

Legend:
🟢 = วันนี้ (17 ก.พ.)
🚫 = เลือกไม่ได้ (ไม่เพียงพอสำหรับ SLA)
✅ = เลือกได้ (20+)
📅 = วันที่เลือกแล้ว
```

### **Selected Date Card:**
```
┌────────────────────────────────────────────────┐
│ วันส่งงาน (Due Date): 28 ก.พ. 2569            │
│ SLA: 3 วันทำการ                                │
│ ────────────────────────────────               │
│ วันเริ่มงาน (Start Date): 25 ก.พ. 2569        │
│ (คำนวณโดยอัตโนมัติ)                           │
└────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Code

```javascript
// คำนวณ Min Due Date
let minDueDate;
if (priority === 'Urgent') {
    // งานด่วน: Due Date ≥ วันนี้ + SLA
    minDueDate = addWorkDays(today, jobType.sla, holidays);
} else {
    // งานปกติ: Due Date ≥ วันนี้ + SLA + 1
    const urgentMinDate = addWorkDays(today, jobType.sla, holidays);
    minDueDate = new Date(urgentMinDate);
    minDueDate.setDate(minDueDate.getDate() + 1);
    minDueDate.setHours(0, 0, 0, 0);
}

// เมื่อผู้ใช้เลือก Due Date แล้ว คำนวณย้อนกลับหา Start Date
const startDate = subtractWorkDays(new Date(selectedDueDate), jobType.sla, holidays);

// Note: ต้องมีฟังก์ชัน subtractWorkDays() สำหรับคำนวณย้อนกลับ
```

---

## ✅ Benefits of Due Date Selection

| Benefit | Description |
|---------|-------------|
| 🎯 **Goal-Oriented** | ผู้ใช้คิดในแง่เป้าหมาย (ต้องการงานเมื่อไหร่) |
| 📅 **Clear Deadline** | ชัดเจนว่าต้องส่งงานวันไหน |
| 💡 **Natural Workflow** | สอดคล้องกับการวางแผนจริง (ใช้งานวันไหน) |
| ⚡ **SLA Protection** | ระบบป้องกันไม่ให้เลือกวันที่ไม่สมเหตุสมผล |
| 🎨 **Intuitive** | ผู้ใช้เข้าใจง่าย: เลือกวันที่ต้องการได้งาน |

---

## 🚀 Implementation Changes Required

### **1. Field Name Changes:**
- `acceptanceDate` → `dueDate`
- UI text: "วันรับงาน" → "วันส่งงาน (Due Date)"

### **2. Calculation Logic:**
- เดิม: Due Date = Acceptance Date + SLA (forward)
- ใหม่: Start Date = Due Date - SLA (backward)

### **3. Validation Rules:**
- Normal: minDueDate = today + SLA + 1
- Urgent: minDueDate = today + SLA

### **4. Display Changes:**
- Card แสดง Due Date เป็นหลัก
- Start Date คำนวณและแสดงเป็นข้อมูลเสริม

---

## 🚀 Next Steps

1. **Update AcceptanceDatePicker.jsx** - เปลี่ยน calculation logic
2. **Update CreateJobPage.jsx** - เปลี่ยน field name และ UI text
3. **Add subtractWorkDays() utility** - ฟังก์ชันคำนวณย้อนกลับ
4. **Test with real use cases** from this document
5. **Update database schema** if needed

---

**Last Updated:** 17 ก.พ. 2026
**Author:** Claude Code
**Status:** ✅ Documentation Updated - Ready for Implementation
