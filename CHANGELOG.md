# Changelog

## [0.6.0] - 2026-01-26
### Phase 4: Job Execution & Modular Refactor Implementation

### Breaking Changes ⚠️
- **Architecture:** Completed Modular Architecture migration (100%).
- **Cleanup:** Removed legacy `src/services` and `src/utils` folders. All codebase now uses `@shared` aliases.
- **Paths:** Updated `App.jsx` comments and internal imports to reflect `modules/shared` standard.

### Fixed
- **Approval Flow:** Fixed White Screen crash caused by undefined `roles` array in legacy user objects. Implemented safe `hasRole` check.

### Added
- **Job Execution Logic (Phase 4):**
  - **Auto-Start:** เริ่มนับเวลาทำทันทีเมื่อ Assignee เปิดดูงาน (Immediate Start).
  - **Timeout Logic:** รองรับ Business Rule "ดองงานเกิน X ชั่วโมง = เริ่มอัตโนมัติ".
  - **Complete Job:** เพิ่ม UI ส่งงานพร้อมแนบลิงก์ (Google Drive/Dropbox).
  - **API:** เพิ่ม endpoints `startJob`, `completeJob`, `checkAutoJobStart` ใน `jobService.js`.
- **User Management (Priority 5):**
  - **Feature:** Registration Approval Flow (`UserManagement.jsx`).
  - **Logic:** เพิ่มฟังก์ชันอนุมัติ/ปฏิเสธผู้สมัครใหม่ พร้อมกำหนด Role/Scope.
  - **API:** `assignUserRoles()`, `assignUserScopes()` implemented.
- **Database Migrations:**
  - `001_add_missing_columns.sql`: Fix schema consistency.
  - `002_create_user_roles_and_assignments.sql`: Support RBAC & Registration Flow.
  - Tables added: `user_registration_requests`, `password_reset_requests`.

### Changed
- **UI/UX:**
  - **JobDetail:** ปรับ Status flow (Assigned -> In Progress -> Completed).
  - **Alerts:** เพิ่ม System Alert เมื่อ Job ถูก Auto-start.

## [0.5.0] - 2026-01-26
### Released Phase 3: Real Approval Flow & Reassignment

### Added
- **Feature:** Real Approval Flow Integration
  - **Dynamic Diagram:** Visualized approval steps based on database configuration (Levels, Approvers).
  - **Sequential Logic:** Implemented multi-level approval (Level 1 -> Level 2 -> Approved) in `jobService.js`.
  - **Permission Check:** Approve/Reject buttons are only visible to authorized approvers for the current level.
- **Feature:** Job Reassignment
  - Added "Edit Assignee" button for Admin/Manager to reassign jobs even after they started.
  - Added permission check to ensure only privileged users can perform this action.

## [0.4.0] - 2026-01-26
### Refactored Reports Dashboard (UI/UX)

### Changed
- **UI Overhaul:** Refactored `Reports.jsx` to match "Rose & Clean White" design spec.
  - Updated Layout & Grid System.
  - Replaced Recharts Pie/Bar charts with custom Tailwind/SVG components for cleaner look.
- **Components:**
  - **KPI Cards:** Updated to 5 cards with Rose/Green/Blue/Purple/Yellow branding.
  - **Charts:** Implemented Progress Bar Lists and Horizontal Bars for "DJ by Status" and "Project".
  - **SLA:** Added Radial Circular Charts (SVG) for SLA Performance per Job Type.
- **Refactor:** Removed unused Recharts components to optimize bundle size locally.

## [0.3.0] - 2026-01-25
### Released Phase 3: Approval Workflow & Dynamic Diagram

### Added
- **Feature:** Dynamic Approval Flow Diagram
  - Integrated `getApprovalFlow` API into `JobDetail.jsx`.
  - Visual diagram now reflects database status (Levels, Approvers, Current Step).
- **Feature:** Real Approval Actions
  - Wired `Approve` / `Reject` buttons to real Database endpoints.
  - Implemented Sequential Logic: Level 1 -> Level 2 -> Approved (Ready for Assignee).

## [0.2.0] - 2026-01-25
### Released Phase 2: Auto-Assignment & Job Request Logic

### Added
- **Feature:** Auto-Assignment Logic
    - Created `autoAssignService.js` to automatically assign jobs based on Matrix (`project_job_assignments`).
    - Integrated auto-assignment trigger into `CreateJob.jsx` (on successful submission).
- **Feature:** Job Request UI (`CreateJob.jsx`)
    - Dynamic Job Type & Project dropdowns (fetching from DB).
    - Real-time SLA Due Date calculation using `slaCalculator.js`.
    - **UI Enhancement:** Expanded Job Items view by default (Input quantity directly).
    - Form submission connected to `jobs` table (Supabase).
- **Database:** Created migration script `02_phase2_tables.sql` adding `notifications`, `notification_logs`, and `sla_shift_logs` tables.
- **Logic:** Implemented `slaCalculator.js` utility for calculating working days (skipping weekends & holidays).

### Fixed
- **Admin UI:** Fixed `AssignmentMatrix.jsx` to load Projects/Assignees correctly in standalone mode (Admin Page).
- **Job Request:**
    - Fixed White Screen issue caused by incorrect import path in `CreateJobPage.jsx`.
    - Made "Objective" field optional as per user request.
    - **Logic:** Fixed Auto-Assignment Matrix integration to correctly key off numeric IDs.

## [0.1.0] - 2026-01-23
### Added
- Initial project structure (Modular Architecture).
- Core modules: Auth, Layout, Dashboard.
- Feature modules: Job Request, Job Management, Admin.


