# 🎒 DJ System - Product Backlog

## 🔴 High Priority (Do Now)
- [x] **Refactor Frontend:** Move to Modular Architecture (Completed)
- [ ] **Auto-Assignment Logic:** Database Integration & Frontend UI
- [ ] **Verify Authentication Pages:** Ensure Login/Register work in new modules
- [ ] **Verify Admin Pages:** Test CRUD for Users, Organization, Job Types

### 🐛 Refactor Regression Bugs (Fix Immediately)
- [x] **[FIXED] Admin Routes Missing:** `frontend/src/modules/features/admin/index.jsx` - Wired all 10 admin routes with lazy loading.
- [x] **[FIXED] Dashboard Stats Error:** Fixed `getDashboardStats` to query 'jobs' table directly (removed 'design_jobs' reference).
- [ ] **[LOW] Notifications Table Missing:** Console warns about `public.notifications` not found. Requires DB migration if notification feature is needed.

## 🟡 Medium Priority (Next)
- [ ] **Approval Flow UI:** Fix diagram rendering in new location
- [ ] **Job Creation Form:** Re-test validation and API connection
- [ ] **SLA Widget:** Fix styles in Shared Components

## 🟢 Low Priority (Later)
- [ ] **Dark Mode Support**
- [ ] **Multi-language Support (i18n)**
