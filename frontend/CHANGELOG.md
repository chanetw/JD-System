# Changelog - DJ System Frontend

รายการเปลี่ยนแปลงของโปรเจกต์ DJ System Frontend

## [Unreleased]

### Added
- **Modular Architecture Setup** (2026-01-23)
  - สร้างโครงสร้างโฟลเดอร์ใหม่ `src/modules/` แบ่งเป็น 3 Layers:
    - `core/` - ระบบแกนหลัก (auth, layout, stores)
    - `features/` - ฟีเจอร์ธุรกิจ (job-request, job-management, admin)
    - `shared/` - ทรัพยากรส่วนกลาง (components, services, utils)
  - สร้าง `moduleRegistry.js` สำหรับลงทะเบียน Module แบบ Dynamic
  - เพิ่ม Path Aliases ใน `vite.config.js`: `@modules`, `@core`, `@features`, `@shared`
  - สร้าง `index.js` re-export files สำหรับทุก Layer

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
  - ลบโฟลเดอร์ `src/pages`, `src/components`, `src/store` เดิม เพื่อลดความซ้ำซ้อน

### Notes
- การย้ายเสร็จสมบูรณ์ 100% (Completed)
- ระบบพร้อมใช้งานด้วย Modular Architecture เต็มรูปแบบ
