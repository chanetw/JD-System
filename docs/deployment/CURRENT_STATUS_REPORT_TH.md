# รายงานสถานะการติดตั้งระบบและสถานะการเรียกคืน (Rollback) ปัจจุบัน
**วันที่:** 30 มกราคม 2026
**สถานะ:** ⚠️ เรียกคืนระบบบางส่วน (Stable Login - ล็อกอินได้ปกติ)

---

## ภาพรวมสถานการณ์

แม้ว่าในเอกสาร `DEPLOYMENT_REPORT_2026-01-30.md` จะระบุว่าการติดตั้งระบบ "User Registration Approval Workflow" เสร็จสมบูรณ์แล้ว แต่เราพบข้อผิดพลาดร้ายแรง **500 Internal Server Error** ในระหว่างกระบวนการล็อกอิน

**สาเหตุหลัก:** ฐานข้อมูลในระบบจริง (Supabase) ยังขาดคอลัมน์ใหม่ๆ (`status`, `must_change_password`, `last_login_at` เป็นต้น) ซึ่งมีอยู่ใน Prisma Schema และลอจิกของโค้ดที่เพิ่งแก้ไขไป

## การดำเนินการแก้ปัญหาทันที (Rollback)

เพื่อคืนค่าความเสถียรของระบบและอนุญาตให้ผู้ใช้เข้าสู่ระบบได้ทันที เราได้ทำการ **เรียกคืนโค้ดชั่วคราว (Temporary Code Rollback)** ในส่วนประกอบดังต่อไปนี้:

### 1. Prisma Schema (`backend/prisma/schema.prisma`)
- **ปิดการใช้งาน (Commented Out):** ฟิลด์ `mustChangePassword`, `lastLoginAt`, `status` และฟิลด์ที่เกี่ยวข้องกับขั้นตอนการอนุมัติทั้งหมด
- **การดำเนินการ:** ทำการรีเจนเนอเรท Prisma Client ใหม่เพื่อให้สะท้อนการปิดฟิลด์เหล่านี้

### 2. ลอจิกฝั่ง Backend (`backend/api-server/src/v2/adapters/PrismaV1Adapter.js`)
- **ปิดการใช้งาน:** ลอจิกทั้งหมดที่มีการอ้างอิงถึงฟิลด์ที่ขาดหายไปในฐานข้อมูล
- **ฟังก์ชันที่ได้รับการแก้ไข:**
    - `checkUserAuthStatus`: นำการตรวจสอบ `status` และ `mustChangePassword` ออก
    - `registerPendingUser`: นำการกำหนดค่า `status` และ `approvedAt` ออก
    - `updateLastLogin`: ปิดการอัปเดต `last_login_at`
    - `approveRegistration` / `rejectRegistration`: ปิดการอัปเดตสถานะ

## สถานะระบบปัจจุบัน

- ✅ **Login API:** **ใช้งานได้ปกติ** (ไม่พบข้อผิดพลาด 500 แล้ว)
- ⚠️ **การลงทะเบียน:** การลงทะเบียนรูปแบบมาตรฐาน V1 ใช้งานได้ (ข้ามขั้นตอนการอนุมัติ)
- ❌ **ฟีเจอร์ใหม่:** ฟีเจอร์ต่อไปนี้ **ถูกปิดใช้งานชั่วคราว**:
    - ขั้นตอนการอนุมัติการลงทะเบียน (Registration Approval Workflow)
    - การบังคับเปลี่ยนรหัสผ่าน (Forced Password Change)
    - การติดตามการเข้าสู่ระบบครั้งล่าสุด (Last Login Tracking)

---

## ขั้นตอนต่อไปเพื่อฟื้นฟูฟีเจอร์ (แผนการติดตั้งใหม่)

เมื่อคุณพร้อมที่จะเปิดใช้งานฟีเจอร์เต็มรูปแบบ (ตามที่อธิบายไว้ใน `DEPLOYMENT_REPORT`) ให้ปฏิบัติตามขั้นตอนเหล่านี้อย่างเคร่งครัด:

1.  **รัน Database Migration:**
    รัน SQL script ในไฟล์ `database/migrations/manual/015_add_user_registration_status.sql` บนฐานข้อมูล Supabase ของคุณ

2.  **เปิดใช้งาน Prisma Schema:**
    แก้ไขไฟล์ `backend/prisma/schema.prisma` โดยนำ Comment ออกจากฟิลด์ทั้งหมดที่เกี่ยวข้องกับ "Registration Approval Workflow"

3.  **รีเจนเนอเรท Prisma Client:**
    รันคำสั่ง `npx prisma generate` ในโฟลเดอร์ `backend/api-server`

4.  **เปิดใช้งานลอจิกฝั่ง Backend:**
    ค้นหา Comment ที่ระบุว่า `// TEMP` ในไฟล์ `PrismaV1Adapter.js` และเปิดใช้งานลอจิกเหล่านั้นกลับมา

5.  **รีสตาร์ทเซิร์ฟเวอร์:**
    ทำการรีสตาร์ทเซิร์ฟเวอร์ API Backend

---

เอกสารฉบับนี้ถือเป็น **แหล่งข้อมูลที่ถูกต้องที่สุด (Single Source of Truth)** สำหรับสถานะของโค้ดในปัจจุบัน โดยให้ความสำคัญเหนือกว่ารายงานการติดตั้ง (Deployment Report) ฉบับก่อนหน้า จนกว่าจะมีการดำเนินการ Migration สำเร็จ
