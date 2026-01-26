# Changelog - DJ System Frontend

รายการเปลี่ยนแปลงของโปรเจกต์ DJ System Frontend

## [Unreleased] (2026-01-22 to 2026-01-26)

### Added
- **Modular Architecture Setup** (2026-01-23)
  - สร้างโครงสร้างโฟลเดอร์ใหม่ `src/modules/` แบ่งเป็น 3 Layers:
    - `core/` - ระบบแกนหลัก (auth, layout, stores)
    - `features/` - ฟีเจอร์ธุรกิจ (job-request, job-management, admin)
    - `shared/` - ทรัพยากรส่วนกลาง (components, services, utils)
  - สร้าง `moduleRegistry.js` สำหรับลงทะเบียน Module แบบ Dynamic
  - เพิ่ม Path Aliases ใน `vite.config.js`: `@modules`, `@core`, `@features`, `@shared`
  - สร้าง `index.js` re-export files สำหรับทุก Layer

- **User Registration Approval Feature** (2026-01-22)
  - Pending Registrations Tab สำหรับ Admin อนุมัติคำขอสมัคร
  - Approve Modal พร้อม Role Assignment (Admin, Marketing, Approver, Assignee)
  - Scope Assignment Modal (Tenant/BUD/Project level)
  - Reject Modal พร้อมระบุเหตุผลและส่ง Email
  - Component: `UserManagement.jsx` ใน `modules/features/admin/pages/`

### Changed
- ย้าย `components/common`, `services`, `utils` ไปที่ `modules/shared/`
- ย้าย `store`, `components/layout`, `components/auth` ไปที่ `modules/core/`
- **Phase 3 Feature Migration:**
  - ย้าย `CreateDJ.jsx` → `modules/features/job-request/pages/CreateJobPage.jsx`
  - ย้าย `DJList.jsx`, `JobDetail.jsx`, `ApprovalsQueue.jsx` → `modules/features/job-management/pages/`
  - ย้าย Admin Pages ทั้งหมด → `modules/features/admin/pages/`
  - ย้าย Auth Pages (`Login`, `Register`, `etc.`) → `modules/core/auth/pages/`
  - ย้าย Portals (`UserPortal`, `MediaPortal`) → `modules/features/portals/pages/`
  - ย้าย `Dashboard` → `modules/features/dashboard/pages/`
  - อัปเดต `App.jsx` imports ให้ใช้ Module paths ใหม่ และใช้ `@core`, `@features` aliases
- **Phase 4 System Wiring (Dynamic Routing):**
  - เปิดใช้งาน `moduleRegistry.js` โหลด Modules ครบทุกฟีเจอร์
  - อัปเดต `App.jsx` ให้ Loop renders routes จาก Registry (Dynamic) เรียบร้อยแล้ว
- **Cleanup:**
  - ลบโฟลเดอร์ `src/pages`, `src/components`, `src/store`, `src/services`, `src/utils` เดิม
  - แก้ไข import paths ทั้งหมดให้ใช้ aliases ใหม่

### Database
- **Migration 001: User Registration & Password Reset**
  - สร้าง `user_registration_requests` table (email, status, rejected_reason)
  - สร้าง `password_reset_requests` table (OTP 6 หลัก, expires_at)
  - เพิ่ม columns ใน `users`: `title`, `must_change_password`, `sso_provider`, `department`
  - เพิ่ม columns ใน `jobs`: `auto_approved_levels`, `completed_by`, `final_files`
  
- **Migration 002: User Roles & Scope Assignments**
  - สร้าง `user_roles` table (multi-role support per user)
  - สร้าง `user_scope_assignments` table (Tenant/BUD/Project scope management)
  - Indexes และ Triggers สำหรับ auto-update `updated_at`

### API Functions
- **Registration Management** (`apiDatabase.js`)
  - `getPendingRegistrations()` - ดึงรายการคำขอสมัคร
  - `approveRegistration()` - อนุมัติและสร้าง User
  - `rejectRegistration()` - ปฏิเสธพร้อมระบุเหตุผล
  - `sendApprovalEmail()` - ส่ง Email อนุมัติ (Mock)
  - `sendRejectionEmail()` - ส่ง Email ปฏิเสธ (Mock)
  
- **Role & Scope Management** (`apiDatabase.js`)
  - `assignUserRoles()` - กำหนดบทบาทให้ User
  - `assignUserScope()` - กำหนด Scope/Project เดียว
  - `assignUserScopes()` - กำหนด Scopes หลายรายการ

### Breaking Changes
- ⚠️ **Import Path Changes:**
  - `@/services/*` → `@shared/services/*`
  - `@/components/common/*` → `@shared/components/*`
  - `@/utils/*` → `@shared/utils/*`
  - `@/store/*` → `@core/store/*`
  - Relative paths (`../../../../services/*`) → Aliases (`@shared/services/*`)
  
- ⚠️ **Removed Folders:**
  - `src/pages/` → ย้ายไปตาม feature modules
  - `src/components/` → ย้ายไป `modules/shared/components/`
  - `src/store/` → ย้ายไป `modules/core/store/`
  - `src/services/` → ย้ายไป `modules/shared/services/`
  - `src/utils/` → ย้ายไป `modules/shared/utils/`

### Notes
- **Modular Architecture Migration:** ✅ เสร็จสมบูรณ์
- **User Registration Approval:** ✅ เสร็จสมบูรณ์
- **Build Test:** ✅ ผ่าน (npm run build)
- **Known Issues:**
  - Email service ยังเป็น Mock (ต้องเชื่อม SendGrid/Resend)
  - Auth context ใช้ hardcoded `currentUserId = 1`
  - Large chunk warning (Reports.jsx: 363 KB) - พิจารณาใช้ code splitting
