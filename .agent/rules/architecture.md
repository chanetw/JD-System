---
trigger: always_on
---

# Architecture: Modular & Plug-n-Play

## Concept
ใช้สถาปัตยกรรมแบบ **Modular Architecture (Plugin Style)** เพื่อให้ระบบมีความยืดหยุ่นสูงสุด สามารถเพิ่มหรือลดฟีเจอร์ได้โดยไม่กระทบต่อระบบหลัก

## Structure
แยกฟีเจอร์ต่างๆ ออกเป็นโฟลเดอร์อิสระภายใน `modules/` ดังนี้:

```text
src/
  ├── modules/
  │   ├── core/         # (ห้ามลบ) ระบบพื้นฐาน เช่น Auth, Users
  │   ├── features/     # (Plugin) ฟีเจอร์เสริม เช่น Dashboard, Jobs
  │   ├── admin/        # (Admin) เครื่องมือจัดการระบบ
  │   └── shared/       # (Common) Utility ต่างๆ ที่ใช้ร่วมกัน
  └── moduleRegistry.js # จุดลงทะเบียน Module ทั้งหมด
```

## Rules
1.  **Isolation:** แต่ละ Module ใน `features/` ต้องทำงานได้ด้วยตัวเอง (Self-contained)
2.  **Registration:** เมื่อสร้าง Module ใหม่ ต้องทำการลงทะเบียนใน `src/moduleRegistry.js` เสมอ เพื่อให้ระบบโหลดแบบ Dynamic
3.  **Communication:** ห้าม Import ข้าม Module โดยตรง ให้ใช้ Event Bus หรือ Shared Service จาก `shared/` แทน
4.  **Plug & Play:** การลบโฟลเดอร์ Module หนึ่งออก ต้องไม่ทำให้ระบบล่ม (Build Break)
5. ห้ามอัพขึ้น git เองต้องให้ผมบอกเท่านั้น
6. Walkthrough ทำเป็นภาษาไทย
7. Implementation Plan ทำเป็นภาษาไทย

## Module Registry Pattern
ใช้ `moduleRegistry.js` เป็นตัวกลางในการ Config ว่าจะเปิด/ปิด Module ใดบ้าง และโหลด Route/Menu ของ Module นั้นๆ เข้าสู่ระบบหลัก