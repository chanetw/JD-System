# ขั้นตอนการติดตั้งระบบ (Quick Deployment Checklist)
**ฟีเจอร์:** User Registration Approval Workflow
**สถานะ:** ✅ การพัฒนเสร็จสมบูรณ์
**วันที่:** 30 มกราคม 2026

---

## 1. การเตรียมการ (ฐานข้อมูลและระบบหลังบ้าน)

- [ ] **ตรวจสอบไฟล์ `.env`**: ต้องมีค่าครบถ้วน (DATABASE_URL, JWT_SECRET, SMTP_*)
- [ ] **ตรวจสอบ Prisma Version**: ต้องใช้ **v5.22.0** เท่านั้น (ห้ามใช้ v7+ เพราะจะติดปัญหา URL ใน schema)
  - เช็คด้วยคำสั่ง: `npx prisma -v`
- [ ] **Database Migration**: รันคำสั่ง `npx prisma migrate deploy` (ถ้ามี) หรือรัน SQL ManualEditor ของ Supabase
  - **ไฟล์:** `database/migrations/manual/015_add_user_registration_status.sql`
  - **ผลลัพธ์:** เพิ่มคอลัมน์ `must_change_password` ในตาราง `users`

- [ ] **รีเจนเนอเรท Prisma Client**
  ```bash
  cd backend/api-server
  npx prisma generate
  ```

- [ ] **ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)**
  - แก้ไขไฟล์ `backend/api-server/.env`
  - `EMAIL_API_URL`: URL ของบริการส่งอีเมล
  - `EMAIL_API_KEY`: API Key ของบริการส่งอีเมล
  - `FRONTEND_URL`: URL ของเว็บไซต์หน้าบ้าน

- [ ] **ทดสอบ Backend API**
  - รันเซิร์ฟเวอร์: `npm run dev`
  - ตรวจสอบ Endpoint: `/api/v2/auth/register-request`, `/api/v2/auth/approve-registration`, `/api/v2/auth/change-password`

---

## 2. การติดตั้งและตรวจสอบระบบ

- [ ] **รันเซิร์ฟเวอร์หน้าบ้าน (Frontend)**
  ```bash
  cd frontend
  npm run dev
  ```

- [ ] **ทดสอบขั้นตอนการลงทะเบียน**
  1. เข้าหน้าเว็บ `/register`
  2. กรอกข้อมูล (ไม่ต้องมีช่องกรอกรหัสผ่าน)
  3. กดส่งข้อมูล
  4. ตรวจสอบว่ามีข้อความยืนยันการรับข้อมูลแสดงขึ้นมา

- [ ] **ทดสอบขั้นตอนการอนุมัติโดย Admin**
  1. ล็อกอินด้วยบัญชี Admin
  2. ไปที่เมนู "Pending Approvals"
  3. กดอนุมัติ (Approve) ผู้ใช้ที่ลงทะเบียนเข้ามา
  4. ตรวจสอบว่าอีเมลถูกส่งออก หรือมีรหัสผ่านชั่วคราวแสดงขึ้นมา (กรณีส่งอีเมลไม่สำเร็จ)

- [ ] **ทดสอบการล็อกอินและเปลี่ยนรหัสผ่าน**
  1. ใช้รหัสผ่านชั่วคราวล็อกอิน
  2. ระบบต้องพาส่งไปยังหน้า `/force-change-password` โดยอัตโนมัติ
  3. ตั้งรหัสผ่านใหม่
  4. เมื่อสำเร็จ ต้องสามารถเข้าสู่หน้า Dashboard ได้ตามปกติ

---

## 3. การตรวจสอบหลังการติดตั้งและความปลอดภัย

- [ ] **ตรวจสอบความถูกต้องในฐานข้อมูล**
  - ตรวจสอบว่าคอลัมน์ `must_change_password` ถูกสร้างขึ้นจริง
  - ตรวจสอบว่าสถานะผู้ใช้เปลี่ยนเป็น `APPROVED` หลังการอนุมัติ

- [ ] **ตรวจสอบการส่งอีเมล**
  - ตรวจสอบ Log ของบริการส่งอีเมลว่าไม่มีรายการล้มเหลว
  - ตรวจสอบเนื้อหาอีเมลว่าภาษาไทยแสดงผลได้ถูกต้อง

- [ ] **ตรวจสอบความเสถียร (Edge Cases)**
  - ลองลงทะเบียนด้วยอีเมลซ้ำ
  - ตรวจสอบการตั้งรหัสผ่านที่สั้นเกินไป (ต้องมีอย่างน้อย 8 ตัวอักษร)

---

## คำสั่งเรียกใช้ด่วน (Quick Commands)

```bash
# อัปเดต Prisma (รันครั้งเดียว)
cd backend/api-server && npx prisma generate

# รันระบบเพื่อพัฒนา
# Terminal 1 (Backend)
cd backend/api-server && npm run dev
# Terminal 2 (Frontend)
cd frontend && npm run dev

# ตรวจสอบโครงสร้างตาราง (SQL)
# psql -d your_db -c "\d users;"
```

---

**สรุป:** หากดำเนินการครบทุกข้อ ระบบจะพร้อมให้บริการอย่างเต็มรูปแบบ ✅
