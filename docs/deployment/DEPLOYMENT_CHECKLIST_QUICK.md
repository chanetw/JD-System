# User Registration Approval Workflow - Quick Deployment Checklist

**Status:** ✅ Implementation Complete
**Date:** January 30, 2026

---

## Pre-Deployment (1. Database & Backend)

- [ ] **Run Database Migration**
  ```bash
  # Execute on Supabase Dashboard
  # File: database/migrations/manual/015_add_user_registration_status.sql
  # Adds: must_change_password column to users table
  ```

- [ ] **Regenerate Prisma Client**
  ```bash
  cd backend/api-server
  npx prisma generate
  ```

- [ ] **Set Backend Environment Variables**
  ```bash
  # backend/api-server/.env
  EMAIL_API_URL=<your-email-service-url>
  EMAIL_API_KEY=<your-email-service-key>
  FRONTEND_URL=https://your-domain.com
  ```

- [ ] **Test Backend API**
  ```bash
  cd backend/api-server
  npm run dev
  # Test endpoints:
  # POST /api/v2/auth/register-request
  # POST /api/v2/auth/approve-registration
  # POST /api/v2/auth/change-password
  ```

---

## Deployment (2. Frontend & Verification)

- [ ] **Start Frontend Dev Server**
  ```bash
  cd frontend
  npm run dev
  ```

- [ ] **Test User Registration Flow**
  1. Visit http://localhost:5173/register
  2. Fill form (no password field should be visible)
  3. Submit
  4. Verify success message shows

- [ ] **Test Admin Approval Flow**
  1. Login as admin
  2. Go to Pending Approvals
  3. Approve a registration
  4. Verify email sent or fallback password shown

- [ ] **Test Login + Password Change**
  1. Try login with temp password
  2. Should redirect to /force-change-password
  3. Enter new password
  4. Should redirect to dashboard
  5. Login with new password should work

---

## Post-Deployment (3. Monitoring & Verification)

- [ ] **Verify Database**
  ```sql
  -- Check column exists
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'must_change_password';

  -- Check test user has column set
  SELECT id, email, must_change_password FROM users LIMIT 1;
  ```

- [ ] **Monitor Email Service**
  - Check email delivery logs
  - Verify no spam/bounces
  - Test with multiple email addresses

- [ ] **Check Browser Console**
  - No JavaScript errors
  - No API 404 errors
  - No CORS issues

- [ ] **Test Edge Cases**
  - Register with duplicate email
  - Very long names
  - Special characters
  - Email with + signs

---

## Files Changed Summary

**Backend:**
- ✅ `backend/api-server/src/v2/adapters/PrismaV1Adapter.js` - Password generation logic
- ✅ `backend/api-server/src/v2/index.js` - New API endpoints
- ✅ `backend/api-server/src/services/emailService.js` - Email sending
- ✅ `backend/prisma/schema.prisma` - Added field
- ✅ `database/migrations/manual/015_add_user_registration_status.sql` - Migration

**Frontend:**
- ✅ `frontend/src/modules/core/auth/pages/Register.jsx` - Registration form
- ✅ `frontend/src/modules/core/auth-v2/pages/Login.tsx` - Login redirect logic
- ✅ `frontend/src/modules/core/auth-v2/pages/ForceChangePassword.tsx` - Password change page
- ✅ `frontend/src/App.jsx` - Added route
- ✅ `frontend/src/types/auth.types.ts` - Added type
- ✅ `frontend/src/modules/features/admin/pages/PendingApprovals.tsx` - Admin panel

**Documentation:**
- ✅ `USER_REGISTRATION_APPROVAL_WORKFLOW.md` - Full guide
- ✅ `DEPLOYMENT_REPORT_2026-01-30.md` - This report

---

## Troubleshooting Quick Links

**Email not sending?**
→ Check `EMAIL_API_KEY` and service status

**Password page not showing?**
→ Check `must_change_password` in database

**API 404 errors?**
→ Run `npx prisma generate` in backend/api-server

**Can't login?**
→ Check temporary password in PendingApprovals modal

---

## Quick Commands

```bash
# One-time setup (Run once)
cd backend/api-server && npx prisma generate

# Development servers
cd backend/api-server && npm run dev    # Terminal 1
cd frontend && npm run dev              # Terminal 2

# Production build
cd frontend && npm run build

# Check database migration
psql -d your_db -c "\d users;" | grep must_change_password

# Check Prisma client generation
ls backend/api-server/node_modules/.prisma/client/
```

---

## Success Criteria ✅

- [ ] Users can register without entering password
- [ ] Admin can approve registrations
- [ ] Email sent to user with temporary password
- [ ] User can login with temporary password
- [ ] System forces password change on first login
- [ ] User can set permanent password
- [ ] User can login with permanent password
- [ ] No JavaScript errors in console
- [ ] Approval workflow works end-to-end
- [ ] Email fallback works if email service fails

---

## Rollback (If Needed)

```bash
# Disable endpoints temporarily
# File: backend/api-server/src/v2/index.js
# Comment out: router.post('/auth/approve-registration', ...)

# Revert database changes (keep column, just set defaults)
UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL;

# Redeploy previous backend version
```

---

## Support Resources

📄 **Full Documentation:** `DEPLOYMENT_REPORT_2026-01-30.md`
📋 **Workflow Guide:** `USER_REGISTRATION_APPROVAL_WORKFLOW.md`
🏗️ **API Reference:** `docs/03-architecture/API_SPEC.md`
🗄️ **Database Schema:** `docs/03-architecture/DATABASE_SCHEMA.md`

---

**Last Updated:** January 30, 2026
**Ready to Deploy:** ✅ YES
