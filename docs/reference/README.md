# 📖 Reference & Troubleshooting

เอกสารอ้างอิง กรณีการใช้งาน และแนวทางการแก้ปัญหา

## 📄 เอกสารในโฟลเดอร์นี้

### 🔹 ACCEPTANCE_DATE_USE_CASES.md
ตัวอย่างและ Use Cases สำหรับการเลือกวันส่งงาน

**เนื้อหา:**
- Concept: Acceptance Date / Due Date
- Use Case 1: สั่งงานล่วงหน้าสำหรับแคมเปญ
- Use Case 2: งานด่วนต้องการทันที
- Timeline และการคำนวณวันเริ่มงาน

### 🔹 debug-user-scopes.md
แนวทางการแก้ปัญหา เมื่อ User Scopes ไม่แสดง

**เนื้อหา:**
- วิธีตรวจสอบ Backend Response
- กรณีที่เป็นไปได้และวิธีแก้ไข
- Test Query บนฐานข้อมูล
- Quick Fix: สร้างข้อมูล Test

### 🔹 verify_migration.md
รายงานตรวจสอบการ migrate ฐานข้อมูล

**เนื้อหา:**
- สรุปผลการตรวจสอบ (7/7 ผ่าน)
- รายละเอียดผลการทดสอบแต่ละหัวข้อ
- ข้อมูล Sample และการตรวจสอบ Data Integrity

---

## 🔧 Troubleshooting Guide

### ปัญหา: User Scopes ไม่แสดง
👉 ดู [debug-user-scopes.md](./debug-user-scopes.md)

**ขั้นตอนแก้ไข:**
1. เช็ค Backend Response ใน DevTools
2. ตรวจสอบ Database หากไม่มีข้อมูล
3. สร้างข้อมูล Test ตามคำแนะนำ

### ปัญหา: Database Migration เพี้ยน
👉 ดู [verify_migration.md](./verify_migration.md)

**ขั้นตอนแก้ไข:**
1. ตรวจสอบสถานะ Migration
2. รัน Verification Script
3. ติดตามตาม Checklist

### ปัญหา: Acceptance Date ไม่คำนวณถูก
👉 ดู [ACCEPTANCE_DATE_USE_CASES.md](./ACCEPTANCE_DATE_USE_CASES.md)

**ตรวจสอบ:**
- SLA ตั้งถูกหรือไม่
- วันทำการ (Working Days) คำนวณถูกหรือไม่
- Holiday settings ถูกต้องหรือไม่

---

## 💡 Tips & Best Practices

### เมื่อสร้างงานใหม่
- ✅ เลือก Job Type ที่ถูกต้อง
- ✅ ตั้ง Acceptance Date ตามความต้องการ
- ✅ ตรวจสอบ SLA Preview ก่อน Submit

### เมื่ออนุมัติงาน
- ✅ ตรวจสอบข้อกำหนด (Brief) อย่างละเอียด
- ✅ เลือก Assignee ที่เหมาะสม
- ✅ ตั้งระดับ Priority ให้ชัดเจน

### เมื่อจัดการผู้ใช้
- ✅ กำหนด Role ให้ครบถ้วน
- ✅ ตั้ง Scope ให้เฉพาะเจาะจง
- ✅ ตรวจสอบ Scopes ว่าแสดงผลแล้ว

---

## 📊 Database Tables สำคัญ

| ตาราง | ความหมาย |
|------|----------|
| `users` | ข้อมูลผู้ใช้งาน |
| `user_roles` | การกำหนด Role ให้ผู้ใช้ |
| `user_scope_assignments` | การกำหนด Scope ให้ผู้ใช้ |
| `jobs` | งาน Design Job หลัก |
| `job_types` | ประเภทงาน |
| `approval_flows` | เทมเพลตการอนุมัติ |
| `approvals` | การอนุมัติจริงของแต่ละงาน |
| `holidays` | วันหยุด |

---

## 🔗 Quick Links

- [🛠️ guides/development.md](../guides/development.md) - คู่มือการพัฒนา
- [🔄 workflows/](../workflows/) - ขั้นตอนการไหลของงาน
- [🗄️ ../database/migrations/](../../database/migrations/) - Database Migrations

---

**Last Updated:** 26 กุมภาพันธ์ 2026
