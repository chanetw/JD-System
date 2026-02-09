# 📋 Role Migration Plan: V2 → V1

**เป้าหมาย:** เปลี่ยน Role names จาก V2 (SuperAdmin, OrgAdmin, TeamLead, Member) กลับเป็น V1 (Admin, Requester, Approver, Assignee)

**วันที่:** 2026-02-09

---

## 1️⃣ การ Mapping Role Names

### ✅ Mapping ที่ถูกต้อง (จาก PrismaV1Adapter):

| V1 (เป้าหมาย) | V2 (ปัจจุบัน) | Permission Level |
|---------------|---------------|------------------|
| Admin         | SuperAdmin    | ระดับสูงสุด - จัดการระบบทั้งหมด |
| Requester     | OrgAdmin      | สร้างงาน + อนุมัติ |
| Approver      | TeamLead      | อนุมัติงาน |
| Assignee      | Member        | รับงานและทำงาน |

### ⚠️ ข้อควรระวัง:
- V1 มีทั้ง `'assignee'` และ `'user'` ที่ map เป็น `'Member'` ทั้งคู่
- แนะนำใช้ `'Assignee'` เป็นหลัก และเลิกใช้ `'user'`

---

## 2️⃣ ไฟล์ที่กระทบ

### Frontend (73 occurrences / 11 files):
1. `frontend/src/types/auth.types.ts` - Type definitions
2. `frontend/src/modules/core/stores/authStoreV2.ts` - Auth store (6)
3. `frontend/src/modules/core/layout/Sidebar.jsx` - Menu visibility (13)
4. `frontend/src/modules/features/admin/index.jsx` - Admin routes (8)
5. `frontend/src/modules/features/admin/pages/UserManagement.jsx` (4)
6. `frontend/src/modules/features/admin/pages/ApprovalFlow.jsx` (13)
7. `frontend/src/modules/features/admin/pages/PendingApprovals.tsx` (10)
8. `frontend/src/modules/shared/utils/permission.utils.js` (12)
9. `frontend/src/modules/shared/services/modules/adminService.js` (3)
10. `frontend/src/modules/features/dashboard/pages/Dashboard.jsx` (2)
11. `frontend/src/modules/features/assignee/index.jsx` (1)

### Backend (119 occurrences / 18 files):
1. **Core V2 System:**
   - `v2/interfaces/IRole.ts` (4) - Role enum definitions ⚠️ **Critical**
   - `v2/models/Role.model.ts` (2) - Database model
   - `v2/adapters/PrismaV1Adapter.js` (14) - Role mapping logic
   - `v2/services/AuthService.ts` (1)
   - `v2/services/UserService.ts` (1)

2. **Controllers & Routes:**
   - `v2/controllers/UserController.ts` (16)
   - `v2/controllers/AdminController.ts` (3)
   - `v2/routes/userRoutes.ts` (11)
   - `v2/routes/adminRoutes.ts` (3)

3. **Middleware:**
   - `v2/middleware/roleMiddleware.ts` (13) - Role checking
   - `v2/middleware/organizationMiddleware.ts` (5)

4. **V1 Integration:**
   - `routes/auth.js` (3)
   - `routes/users.js` (5)
   - `routes/approval-flows.js` (2)
   - `services/approvalService.js` (5)

5. **Scripts:**
   - `scripts/fix_admin_role.js` (5)

---

## 3️⃣ ความเสี่ยง (Risks)

### 🔴 ความเสี่ยงสูง:
1. **Breaking Changes:**
   - ระบบ Authentication/Authorization จะเสียทันที
   - User ที่ Login อยู่จะถูก Logout ทั้งหมด
   - Permission checking ทั้งหมดจะไม่ทำงาน

2. **Database Inconsistency:**
   - ถ้า migrate ไม่ครบ → role names ใน DB ไม่ match กับ code
   - ต้อง migrate ทั้ง `roles` table และ `user_roles` table

3. **Session/Token Issues:**
   - JWT tokens ที่มี role names เก่าจะไม่ valid
   - ต้อง force logout ทุกคน

### 🟡 ความเสี่ยงปานกลาง:
1. **Frontend Permission Logic:**
   - Sidebar menu visibility อาจไม่ถูกต้อง
   - Protected routes อาจบล็อกผู้ใช้ที่ถูกต้อง

2. **Approval Flow Logic:**
   - ตรวจสอบว่า approver checking ยังทำงานถูกต้อง
   - Job assignment logic ต้องใช้ role ที่ถูก

3. **Testing Coverage:**
   - ต้อง test ทุก role ใหม่หลัง migrate
   - Integration tests อาจ fail

### 🟢 ความเสี่ยงต่ำ:
1. **Display Names:**
   - แค่เปลี่ยนชื่อแสดงผล ไม่กระทบ logic
   - UI labels อาจต้องปรับ

---

## 4️⃣ ผลกระทบ (Impacts)

### Database:
- ✅ **ไม่ต้องเปลี่ยน Schema** (ใช้ string-based roles อยู่แล้ว)
- ⚠️ **ต้อง UPDATE data:**
  ```sql
  UPDATE user_roles SET roleName = 'Admin' WHERE roleName = 'SuperAdmin';
  UPDATE user_roles SET roleName = 'Requester' WHERE roleName = 'OrgAdmin';
  UPDATE user_roles SET roleName = 'Approver' WHERE roleName = 'TeamLead';
  UPDATE user_roles SET roleName = 'Assignee' WHERE roleName = 'Member';
  ```

### Backend API:
- ✅ **PrismaV1Adapter** มี mapping อยู่แล้ว → แค่ **กลับทิศทาง**
- ⚠️ **Response Format:** API ที่ส่ง `roleName` กลับไปจะเปลี่ยน
- ⚠️ **Middleware:** Role checking ต้องใช้ชื่อใหม่

### Frontend:
- ⚠️ **Permission Checking:** ทุกที่ที่เช็ค `user.roleName === 'SuperAdmin'`
- ⚠️ **Protected Routes:** `roles: ['SuperAdmin']` → `roles: ['Admin']`
- ⚠️ **Conditional Rendering:** `if (isSuperAdmin)` → ต้องเปลี่ยน

### Authentication:
- ⚠️ **JWT Tokens:** ต้อง force logout ทุกคน
- ⚠️ **Session Management:** Clear sessions

---

## 5️⃣ แผนการ Migration

### Phase 1: Preparation (ก่อน Migrate)
- [ ] Backup Database ทั้งหมด
- [ ] สร้าง test environment
- [ ] เขียน rollback script
- [ ] แจ้งผู้ใช้ล่วงหน้า (downtime)

### Phase 2: Database Migration
```sql
-- Backup
CREATE TABLE user_roles_backup AS SELECT * FROM user_roles;

-- Migrate (column name is: role_name in snake_case)
UPDATE user_roles SET role_name = 'Admin' WHERE role_name = 'SuperAdmin';
UPDATE user_roles SET role_name = 'Requester' WHERE role_name = 'OrgAdmin';
UPDATE user_roles SET role_name = 'Approver' WHERE role_name = 'TeamLead';
UPDATE user_roles SET role_name = 'Assignee' WHERE role_name = 'Member';

-- Verify
SELECT role_name, COUNT(*) FROM user_roles GROUP BY role_name;
```

### Phase 3: Backend Code Migration
1. **แก้ IRole.ts enum:**
   ```typescript
   export enum RoleName {
     ADMIN = 'Admin',
     REQUESTER = 'Requester',
     APPROVER = 'Approver',
     ASSIGNEE = 'Assignee',
   }
   ```

2. **แก้ PrismaV1Adapter - ลบ mapping (ไม่ต้องแปลงแล้ว):**
   ```javascript
   // เดิม: แปลง V1 → V2
   // ใหม่: ส่งตรงเลย (เพราะ DB ใช้ V1 อยู่แล้ว)
   const roleName = primaryRole?.roleName || 'Assignee';
   ```

3. **แก้ Middleware:**
   - `roleMiddleware.ts` - เปลี่ยน role checking
   - `organizationMiddleware.ts` - เปลี่ยน role references

### Phase 4: Frontend Code Migration
1. **แก้ auth.types.ts:**
   ```typescript
   export type RoleName = 'Admin' | 'Requester' | 'Approver' | 'Assignee';
   ```

2. **แก้ Sidebar.jsx:**
   ```javascript
   const isSuperAdmin = user?.roleName === 'Admin';
   const canCreateJob = ['Admin', 'Requester', 'Approver'].includes(user?.roleName);
   ```

3. **แก้ Admin routes:**
   ```javascript
   roles: ['Admin']  // แทน ['SuperAdmin']
   ```

4. **แก้ Permission utils:**
   - Replace ทุก occurrence

### Phase 5: Testing
- [ ] Test Login/Logout
- [ ] Test Permission ทุก role
- [ ] Test Approval flow
- [ ] Test Job assignment
- [ ] Test Admin pages
- [ ] Test User Portal

### Phase 6: Deployment
- [ ] Schedule downtime
- [ ] Deploy backend
- [ ] Run migration
- [ ] Deploy frontend
- [ ] Force logout all users
- [ ] Monitor logs

---

## 6️⃣ Rollback Plan

หาก migration ล้มเหลว:

### Database Rollback:
```sql
-- Restore from backup
DELETE FROM user_roles;
INSERT INTO user_roles SELECT * FROM user_roles_backup;
```

### Code Rollback:
```bash
git revert <migration-commit>
git push
```

---

## 7️⃣ Timeline Estimate

- **Preparation:** 1-2 hours
- **Code Migration:** 3-4 hours
- **Testing:** 2-3 hours
- **Deployment:** 1 hour
- **Total:** **7-10 hours**

**แนะนำ:** ทำใน **off-hours** หรือ **weekend**

---

## 8️⃣ Checklist สำหรับการ Execute

### ก่อน Migrate:
- [ ] Backup database
- [ ] Create rollback script
- [ ] Notify users
- [ ] Setup test environment

### ระหว่าง Migrate:
- [ ] Run database migration
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Clear sessions/tokens

### หลัง Migrate:
- [ ] Verify database
- [ ] Test all roles
- [ ] Monitor error logs
- [ ] Check user feedback

---

## 9️⃣ คำแนะนำ

### ✅ ควรทำ:
1. **Backup ทุกอย่างก่อน**
2. **Test ใน staging environment ก่อน**
3. **เขียน script automate migration**
4. **แจ้ง downtime ล่วงหน้า**
5. **เตรียม rollback plan**

### ❌ ไม่ควรทำ:
1. **Migrate ใน production ทันที**
2. **Migrate ทีละส่วน (อาจเกิด inconsistency)**
3. **ลืม force logout users**
4. **ลืม backup**

---

## 🎯 สรุป

### ความเป็นไปได้:
✅ **ทำได้!** แต่ต้องวางแผนดี

### ความซับซ้อน:
🟡 **Medium-High** (กระทบหลายส่วน)

### เวลาที่ต้องใช้:
⏱️ **7-10 ชั่วโมง** (รวม testing)

### ความเสี่ยง:
🔴 **High** (ถ้าไม่ระวัง) → 🟢 **Low** (ถ้าทำตาม plan)

---

**คำแนะนำสุดท้าย:** ถ้าระบบยังไม่ไป production และยังไม่มีผู้ใช้จริง → **ทำเลยตอนนี้**
ถ้ามีผู้ใช้จริงแล้ว → **วางแผน downtime และ test ให้ดีก่อน**
