# 🎯 User Registration Approval Feature - Testing Guide

## 📋 Overview

Feature นี้ใช้สำหรับให้ Admin อนุมัติคำขอสมัครใช้งานจากผู้ใช้ทั่วไป โดยมี Modal เพื่อให้ Admin เลือกกำหนดบทบาท (Role) และสังกัด (Scope) ก่อนอนุมัติ

## 🚀 Prerequisites

1. Supabase database ต้องรัน migration 2 ตัว:
   - `001_add_missing_columns.sql` - เพิ่ม columns และสร้าง tables
   - `002_create_user_roles_and_assignments.sql` - สร้าง `user_roles` และ `user_scope_assignments` tables

2. Frontend dependencies:
   ```bash
   cd /Users/chanetw/Documents/DJ-System/frontend
   npm install
   ```

## 🔧 Setup

### 1. Run Migrations

เข้าไปยัง Supabase SQL Editor แล้ว copy-paste ไฟล์เหล่านี้:

**Migration 1:**
```bash
cat database/migrations/001_add_missing_columns.sql
```
รันใน Supabase SQL Editor

**Migration 2:**
```bash
cat database/migrations/002_create_user_roles_and_assignments.sql
```
รันใน Supabase SQL Editor

### 2. Verify Tables

ตรวจสอบว่า tables สร้างสำเร็จ:

```sql
-- ตรวจสอบ user_registration_requests
SELECT * FROM user_registration_requests;

-- ตรวจสอบ user_roles
SELECT * FROM user_roles;

-- ตรวจสอบ user_scope_assignments
SELECT * FROM user_scope_assignments;
```

### 3. Insert Test Data

ลงทะเบียนผู้ใช้ใหม่ผ่านหน้า Register:

```
URL: http://localhost:5173/register

ข้อมูล:
- Email: test@example.com
- ชื่อ: John
- นามสกุล: Doe
- โทรศัพท์: 0812345678
- หน่วยงาน: Marketing
- ตำแหน่ง: Manager
```

ข้อมูลนี้จะบันทึกใน `user_registration_requests` table พร้อม `status = 'pending'`

## 🧪 Test Flow

### Step 1: ดูรายการคำขอสมัคร

```
URL: http://localhost:5173/admin/user-management

1. เลือก Tab "📋 Pending Registrations"
2. ควรเห็น List ของคำขอที่ `status = 'pending'`
3. แสดง: ชื่อ, อีเมล, เบอร์โทร, หน่วยงาน, ตำแหน่ง, วันที่สมัคร
```

### Step 2: คลิก [อนุมัติ]

```
1. คลิก Button [อนุมัติ]
2. Popup Modal ปรากฏ:
   - ชื่อเรื่อง: "อนุมัติคำขอสมัคร"
   - แสดงอีเมล
```

### Step 3: เลือก Role

```
ในส่วน "เลือกบทบาท":

1. ทดสอบเลือก Role 1 ตัว:
   - ✓ Admin
   
2. ทดสอบเลือก Multiple Roles:
   - ✓ Admin
   - ✓ Approver
   
3. ทดสอบ Special Roles:
   - ✓ Marketing → ปรากฏ "เลือกโครงการ (Projects)"
   - ✓ Assignee → ปรากฏ "เลือกโครงการ (Projects)"
```

### Step 4: เลือก Scope (สำหรับ Admin/Approver)

```
ถ้าเลือก Admin หรือ Approver:

1. เลือก Scope Level:
   - ระดับบริษัท (Tenant)
   - ระดับสายงาน (BUD)
   - ระดับโครงการ (Project)

2. เลือก Scope ID:
   - List ของ Tenants/BUDs/Projects ตามที่เลือก

3. Verify:
   - Scope name ถูกบันทึก (ใช้สำหรับ user_scope_assignments)
```

### Step 5: เลือก Projects (สำหรับ Marketing/Assignee)

```
ถ้าเลือก Marketing:

1. Popup ของ "เลือกโครงการที่สร้าง DJ ได้"
2. List ของทุก Projects
3. Checkbox multiple selection
4. ควรเลือกอย่างน้อย 1 โครงการ

ถ้าเลือก Assignee:

1. Popup ของ "เลือกโครงการที่รับผิดชอบ"
2. List ของทุก Projects
3. Checkbox multiple selection
4. ควรเลือกอย่างน้อย 1 โครงการ
```

### Step 6: บันทึกอนุมัติ

```
1. คลิก "บันทึกและอนุมัติ"
2. Loading indicator ปรากฏ
3. ตรวจสอบ Backend:
   - User ใหม่ถูกสร้างใน `users` table
   - Roles ถูกบันทึกใน `user_roles` table
   - Scopes ถูกบันทึกใน `user_scope_assignments` table
   - `user_registration_requests.status` เปลี่ยนเป็น 'approved'
```

### Step 7: Verify ใน Database

```sql
-- ตรวจสอบ User ที่สร้างใหม่
SELECT * FROM users WHERE email = 'test@example.com';

-- ตรวจสอบ Roles
SELECT * FROM user_roles WHERE user_id = <new_user_id>;

-- ตรวจสอบ Scopes
SELECT * FROM user_scope_assignments WHERE user_id = <new_user_id>;

-- ตรวจสอบ Registration Status
SELECT * FROM user_registration_requests WHERE email = 'test@example.com';
```

## ❌ Test Reject Flow

### Step 1: คลิก [ปฏิเสธ]

```
1. คลิก Button [ปฏิเสธ]
2. Modal Reject ปรากฏ:
   - ชื่อเรื่อง: "ปฏิเสธคำขอสมัคร"
   - Textarea สำหรับ "เหตุผลการปฏิเสธ"
```

### Step 2: กรอกเหตุผล

```
1. กรอกเหตุผล: "ไม่มีตำแหน่งว่าง"
2. คลิก "ยืนยัน"
```

### Step 3: Verify ใน Database

```sql
-- ตรวจสอบ Rejection
SELECT * FROM user_registration_requests 
WHERE email = 'test@example.com' 
AND status = 'rejected';

-- ควรเห็น:
-- - status = 'rejected'
-- - rejected_reason = 'ไม่มีตำแหน่งว่าง'
-- - approved_by = <admin_user_id>
```

## 🐛 Expected Issues & Troubleshooting

### Issue 1: Migration Fails

**Error:** `relation "user_roles" does not exist`

**Solution:**
- ตรวจสอบว่า migration 002 รันสำเร็จ
- Run: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_roles', 'user_scope_assignments');`
- ถ้าไม่มี ให้รัน migration ใหม่

### Issue 2: Roles ไม่บันทึก

**Error:** User สร้างแล้ว แต่ `user_roles` เป็น empty

**Solution:**
- ตรวจสอบ Browser Console สำหรับ error messages
- ตรวจสอบ `apiDatabase.assignUserRoles()` ว่าทำงาน
- ตรวจสอบ Supabase RLS policies บน `user_roles` table

### Issue 3: Email ไม่ส่ง

**Current Status:** `sendApprovalEmail()` เป็น mock (console.log only)

**Solution:** ต้องเชื่อมต่อ Email Service (SendGrid, Resend, etc.)

## 📊 Test Checklist

- [ ] Migration 001 รันสำเร็จ
- [ ] Migration 002 รันสำเร็จ
- [ ] สมัครผู้ใช้ใหม่ผ่านหน้า Register
- [ ] ดูรายการ Pending Registrations
- [ ] เลือก Role 1 ตัว → อนุมัติสำเร็จ
- [ ] เลือก Multiple Roles → อนุมัติสำเร็จ
- [ ] เลือก Marketing + Projects → อนุมัติสำเร็จ
- [ ] เลือก Assignee + Projects → อนุมัติสำเร็จ
- [ ] User ถูกบันทึกใน `users` table
- [ ] Roles ถูกบันทึกใน `user_roles` table
- [ ] Scopes ถูกบันทึกใน `user_scope_assignments` table
- [ ] Status เปลี่ยนเป็น 'approved'
- [ ] ปฏิเสธ + กรอกเหตุผล → บันทึกสำเร็จ
- [ ] Status เปลี่ยนเป็น 'rejected'

## 🔗 Files Involved

```
/database/migrations/
  ├── 001_add_missing_columns.sql
  └── 002_create_user_roles_and_assignments.sql

/frontend/src/
  ├── pages/admin/UserManagementNew.jsx (Main component)
  ├── pages/Register.jsx (Registration form)
  ├── services/apiDatabase.js (API functions)
  └── App.jsx (Routes)
```

## 📝 API Functions Reference

### 1. `getPendingRegistrations(status = 'all')`
- ดึงรายการคำขอสมัคร
- Parameter: 'pending', 'approved', 'rejected', 'all'
- Return: Array ของ registration objects

### 2. `assignUserRoles(userId, tenantId, roles, assignedBy)`
- กำหนดบทบาทให้ User
- Parameter: userId, tenantId, ['admin', 'marketing'], adminUserId
- Return: Array ของ role records

### 3. `assignUserScopes(userId, tenantId, scopeAssignments, assignedBy)`
- กำหนด Scopes หลายรายการ
- scopeAssignments: `[{ scopeLevel, scopeId, scopeName, roleType }, ...]`
- roleType: 'approver_scope', 'marketing_allowed', 'assignee_assigned'

### 4. `rejectRegistration(registrationId, reason, adminUserId)`
- ปฏิเสธคำขอสมัคร
- บันทึก reason และอัปเดต status

## 🎉 Success Criteria

✅ Feature ถือว่าสำเร็จเมื่อ:
1. User สร้างได้พร้อม Roles และ Scopes
2. Roles บันทึกใน `user_roles` table ถูกต้อง
3. Scopes บันทึกใน `user_scope_assignments` table ถูกต้อง
4. Status เปลี่ยนจาก 'pending' → 'approved'
5. สามารถปฏิเสธ + บันทึก reason ได้
6. Frontend ไม่ error

---

*หมายเหตุ: Email service ยังเป็น mock ใน `sendApprovalEmail()` และ `sendRejectionEmail()`*
