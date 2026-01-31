# รายงานการติดตั้งระบบ: User Registration Approval Workflow
**วันที่:** 30 มกราคม 2026
**สถานะ:** ✅ การพัฒนาระบบเสร็จสมบูรณ์ พร้อมสำหรับการติดตั้ง
**ผู้จัดทำ:** Claude Code

---

## บทสรุปผู้บริหาร

ระบบขั้นตอนการอนุมัติการลงทะเบียนผู้ใช้ (User Registration Approval Workflow) ได้รับการพัฒนาเสร็จสมบูรณ์ พร้อมฟีเจอร์การสร้างรหัสผ่านอัตโนมัติและการแจ้งเตือนผ่านอีเมล ระบบใหม่นี้ไม่กำหนดให้ผู้ใช้ต้องตั้งรหัสผ่านในขณะลงทะเบียน แต่ผู้ดูแลระบบ (Admin) จะเป็นผู้อนุมัติการลงทะเบียน จากนั้นระบบจะสร้างรหัสผ่านชั่วคราวที่มีความปลอดภัยและส่งให้ผู้ใช้ผ่านทางอีเมลโดยอัตโนมัติ

**ฟีเจอร์หลัก:**
- ✅ ไม่ต้องใช้รหัสผ่านขณะลงทะเบียน
- ✅ สร้างรหัสผ่านอัตโนมัติเมื่อได้รับการอนุมัติ
- ✅ ส่งอีเมลแจ้งเตือนผู้ใช้โดยอัตโนมัติ
- ✅ บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก
- ✅ มีระบบสำรอง (Fallback) กรณีส่งอีเมลไม่สำเร็จ
- ✅ หน้าจอใช้งานภาษาไทย (V1 Register.jsx)
- ✅ แผงควบคุมการอนุมัติสำหรับ Admin พร้อมการติดตามสถานะอีเมล

---

## สรุปการดำเนินงาน

### 1. การเปลี่ยนแปลงฝั่ง Backend

#### Database Schema (Prisma)
- **ไฟล์:** `backend/prisma/schema.prisma`
- **การเปลี่ยนแปลง:** เพิ่มฟิลด์ `mustChangePassword` ในโครงสร้าง User
  ```prisma
  mustChangePassword Boolean @default(false) @map("must_change_password")
  ```

#### V2 Auth Adapter (ลอจิกหลัก)
- **ไฟล์:** `backend/api-server/src/v2/adapters/PrismaV1Adapter.js`
- **เมธอดสำคัญที่เพิ่มเข้ามา:**

| เมธอด | วัตถุประสงค์ |
|--------|---------|
| `generateRandomPassword(length)` | สร้างรหัสผ่านปลอดภัยความยาว 12 ตัวอักษร (พิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข, สัญลักษณ์) |
| `registerPendingUser(userData)` | สร้างผู้ใช้ในสถานะ PENDING (ยังไม่มีรหัสผ่าน) |
| `approveRegistration(userId, approvedById)` | สร้างรหัสผ่านชั่วคราว, ทำการ Hash, และตั้งค่า mustChangePassword=true |
| `changePassword(userId, newPassword)` | อัปเดตรหัสผ่านใหม่และล้างสถานะ mustChangePassword |

#### API Endpoints (V2)
- **ไฟล์:** `backend/api-server/src/v2/index.js`

| Endpoint | Method | วัตถุประสงค์ |
|----------|--------|---------|
| `/auth/register-request` | POST | ลงทะเบียนโดยไม่ใช้รหัสผ่าน |
| `/auth/approve-registration` | POST | อนุมัติผู้ใช้ + ส่งอีเมล |
| `/auth/reject-registration` | POST | ปฏิเสธการลงทะเบียน + ส่งอีเมล |
| `/auth/change-password` | POST | เปลี่ยนรหัสผ่านหลังจากได้รับอนุมัติ |

#### บริการอีเมล (Email Service)
- **ไฟล์:** `backend/api-server/src/services/emailService.js`
- **เมธอดใหม่:**

| เมธอด | วัตถุประสงค์ |
|--------|---------|
| `notifyRegistrationApproved(data)` | ส่งอีเมลอนุมัติพร้อมรหัสผ่านชั่วคราว |
| `notifyRegistrationRejected(data)` | ส่งอีเมลแจ้งการปฏิเสธ |

---

## ขั้นตอนการติดตั้งที่ค้างอยู่ (Pending Deployment Tasks)

### ⚠️ สำคัญมาก - ต้องดำเนินการก่อนเปิดใช้งานจริง

#### งานที่ 1: Database Migration
**สถานะ:** ⚠️ ยังไม่ได้รัน
**ไฟล์:** `database/migrations/manual/015_add_user_registration_status.sql`
**การดำเนินการ:** รันไฟล์นี้บนระบบฐานข้อมูล Supabase

#### งานที่ 2: รีเจนเนอเรท Prisma Client
**สถานะ:** ⚠️ ยังไม่ได้รัน
**ตำแหน่ง:** Backend API Server

```bash
cd backend/api-server
npx prisma generate
```

#### งานที่ 3: ตั้งค่า Environment Variables (ตัวแปรสภาพแวดล้อม)

**ตำแหน่ง:** ไฟล์ .env ในโฟลเดอร์ Backend

```env
# การตั้งค่าอีเมล
EMAIL_API_URL=<your-email-service-url>
EMAIL_API_KEY=<your-email-service-key>

# การตั้งค่า Frontend (สำหรับใช้ในอีเมลอนุมัติ)
FRONTEND_URL=https://your-domain.com
LOGIN_URL=https://your-domain.com/login
```

---

## รายละเอียดทางเทคนิค

### อัลกอริทึมการสร้างรหัสผ่าน
- ความยาว 12 ตัวอักษร
- ประกอบด้วย: ตัวอักษรพิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข, สัญลักษณ์พิเศษ (@#$%&*)
- หลีกเลี่ยงตัวอักษรที่สับสนได้ง่าย: i, l, o, 0, O

### วงจรชีวิตของรหัสผ่านชั่วคราว
1. สร้างขึ้นเมื่อ Admin อนุมัติการลงทะเบียน
2. ทำการ Hash ด้วย bcrypt (10 rounds)
3. เก็บลงฐานข้อมูล (เฉพาะค่า Hash เท่านั้น)
4. ส่งให้ผู้ใช้ผ่านอีเมล (ข้อความปกติในอีเมล)
5. ผู้ใช้ล็อกอินด้วยรหัสผ่านชั่วคราว
6. ระบบตรวจพบ `mustChangePassword = true`
7. บังคับเปลี่ยนรหัสผ่านในหน้า `/force-change-password`
8. เมื่อเปลี่ยนรหัสผ่านสำเร็จ ค่า `mustChangePassword` จะถูกล้างออก

---

## แผนการเรียกคืนระบบ (Rollback Plan)

หากพบปัญหาหลังการติดตั้ง:

1. **ปิดระบบการอนุมัติชั่วคราว:** ปิด Endpoint `/auth/approve-registration`
2. **กู้คืนฐานข้อมูล:** ยังคงเก็บคอลัมน์ `must_change_password` ไว้ได้ (ไม่มีผลกระทบหากไม่ใช้งาน) และเรียกคืนโค้ด Backend เป็นเวอร์ชันก่อนหน้า
3. **การกู้คืนบัญชีผู้ใช้:** สำหรับผู้ใช้ที่ติดปัญหา ให้ตั้งค่า `must_change_password = false` ด้วยตนเองในฐานข้อมูล

---

เอกสารนี้จัดทำขึ้นเพื่อสรุปสถานะการพัฒนา ณ วันที่ 30 มกราคม 2026 ระบบพร้อมสำหรับการติดตั้งเมื่อดำเนินการตามขั้นตอนที่ระบุในส่วน "Pending Deployment Tasks" แล้ว
