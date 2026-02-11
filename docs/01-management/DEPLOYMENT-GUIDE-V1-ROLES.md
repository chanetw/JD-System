# Deployment Guide: V2→V1 Role Migration

## Overview
This guide covers deploying the V2→V1 role name migration (SuperAdmin→Admin, OrgAdmin→Requester, TeamLead→Approver, Member→Assignee).

**Commit:** `2dd68ed` - Migrate Role Names V2→V1

---

## Phase 1: Pre-Deployment Checklist ✅

- [x] Code changes committed (40 files modified)
- [x] Database migration completed (all role names normalized to V1 PascalCase)
- [x] Backend enum updated: `enum RoleName { ADMIN, REQUESTER, APPROVER, ASSIGNEE }`
- [x] Frontend types updated: `type RoleName = 'Admin' | 'Requester' | 'Approver' | 'Assignee'`
- [x] Permission utilities updated with V1 labels and backward-compatible V2 mappings
- [x] All middleware updated to use V1 role names
- [x] All controllers and routes updated to use V1 role names

---

## Phase 2: Deployment Steps

### Step 1: Deploy Backend
```bash
# 1.1 Pull latest changes
cd backend
git pull origin main

# 1.2 Install dependencies (if needed)
npm install

# 1.3 Build TypeScript (if applicable)
npm run build  # or tsc

# 1.4 Start backend service
npm start
# OR if using PM2/other process manager
pm2 restart api-server
```

### Step 2: Deploy Frontend
```bash
# 2.1 Pull latest changes
cd frontend
git pull origin main

# 2.2 Install dependencies (if needed)
npm install

# 2.3 Build frontend
npm run build

# 2.4 Deploy built files to web server
# Copy dist/ to production directory
cp -r dist/* /var/www/dj-system/
# OR restart frontend service
npm start  # for dev server
```

### Step 3: Verify Backend is Running
```bash
# Check if backend is responding
curl -X GET http://localhost:5000/api/v2/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## Phase 3: Force Logout All Users

**Important:** Old JWT tokens contain V2 role names (SuperAdmin, OrgAdmin, etc.) and will not work with the new V1 role check logic. Users MUST re-login.

### Option A: User-Side Logout (Recommended - Graceful)
All existing sessions will automatically lose access when their tokens expire or when they hit a role-check endpoint.

**Frontend Actions:**
1. Display banner: "System updated. Please refresh and login again."
2. Clear localStorage: `localStorage.clear()`
3. Redirect to login page

**Client-Side Code (already in place):**
```javascript
// Clear auth store on login page load
localStorage.removeItem('auth_token');
localStorage.removeItem('user_data');
// User will automatically be redirected to login
```

### Option B: Server-Side Logout (Force All Users)
Create an admin endpoint to invalidate all sessions (optional):

```bash
# API Endpoint (would need to implement)
POST /api/v2/admin/logout-all-users

# Response:
{
  "success": true,
  "message": "All users logged out",
  "affectedUsers": 28
}
```

---

## Phase 4: Verification Tests

### Test 1: Backend Endpoints Return V1 Role Names
```bash
# Login as different users and verify token contains V1 role names
curl -X POST http://localhost:5000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"..."}'

# Response should have: "roleName": "Admin" (NOT "SuperAdmin")
```

### Test 2: Role-Based Access Control

**Admin Role Test:**
```bash
# Should have access to admin routes
curl -X GET http://localhost:5000/api/v2/admin/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Expected: 200 OK with user list

# Should have access to organizations
curl -X GET http://localhost:5000/api/v2/admin/organizations \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Expected: 200 OK
```

**Requester Role Test:**
```bash
# Should have access to user routes
curl -X GET http://localhost:5000/api/v2/users \
  -H "Authorization: Bearer <REQUESTER_TOKEN>"
# Expected: 200 OK (scoped to their organization)

# Should NOT have access to organizations endpoint
curl -X GET http://localhost:5000/api/v2/admin/organizations \
  -H "Authorization: Bearer <REQUESTER_TOKEN>"
# Expected: 403 Forbidden
```

**Approver Role Test:**
```bash
# Should have access to user list
curl -X GET http://localhost:5000/api/v2/users \
  -H "Authorization: Bearer <APPROVER_TOKEN>"
# Expected: 200 OK

# Should NOT be able to update users (Requester+ only)
curl -X PUT http://localhost:5000/api/v2/users/123 \
  -H "Authorization: Bearer <APPROVER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"roleName":"Assignee"}'
# Expected: 403 Forbidden
```

**Assignee Role Test:**
```bash
# Should have read-only access to jobs
curl -X GET http://localhost:5000/api/v2/jobs \
  -H "Authorization: Bearer <ASSIGNEE_TOKEN>"
# Expected: 200 OK (read-only)

# Should NOT be able to create jobs
curl -X POST http://localhost:5000/api/v2/jobs \
  -H "Authorization: Bearer <ASSIGNEE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"test"}'
# Expected: 403 Forbidden
```

### Test 3: Frontend Role-Based UI

**Login as Admin:**
1. ✅ See "Manage Users" in sidebar
2. ✅ See "Manage Organizations" in sidebar
3. ✅ See "Create DJ" button on dashboard
4. ✅ Can access admin pages

**Login as Requester:**
1. ✅ See "My Queue" in sidebar
2. ✅ See "Create DJ" button on dashboard
3. ❌ Cannot access "Manage Organizations"
4. ❌ Cannot access "Manage Users" (see but can't edit)

**Login as Approver:**
1. ✅ See "Pending Approvals" in sidebar
2. ✅ See "My Queue" in sidebar
3. ❌ Cannot see "Create DJ" button
4. ❌ Cannot access admin pages

**Login as Assignee:**
1. ✅ See "My Tasks" in sidebar
2. ✅ See "My Queue" in sidebar
3. ❌ Cannot see "Create DJ" button
4. ❌ Cannot access any admin features

### Test 4: Permission Check Utilities

Frontend role label display:
```javascript
// In browser console
import { ROLE_LABELS, ROLE_V1_DISPLAY } from '@/modules/shared/utils/permission.utils'

// Check V1 names (PascalCase from DB)
console.log(ROLE_LABELS.Admin)  // "ผู้ดูแลระบบสูงสุด"
console.log(ROLE_V1_DISPLAY.Admin)  // "System Admin"

// Check backward compatibility with V2 names
console.log(ROLE_LABELS.SuperAdmin)  // "ผู้ดูแลระบบสูงสุด"
console.log(ROLE_V1_DISPLAY.SuperAdmin)  // "System Admin"
```

---

## Phase 5: Rollback Plan (If Needed)

If critical issues are found:

```bash
# Revert to previous commit
git revert 2dd68ed

# Or reset to previous version
git reset --hard 7bd1ca4

# Redeploy backend
npm start

# Redeploy frontend
npm run build
```

---

## Phase 6: Monitoring

After deployment, monitor:

1. **Backend Logs:**
   ```bash
   # Check for authentication errors
   tail -f logs/error.log | grep -i "role\|auth"
   ```

2. **User Access Issues:**
   - Monitor login failures (403 Forbidden errors)
   - Track 401 Unauthorized responses

3. **Database:**
   ```sql
   -- Verify all roles are V1 PascalCase
   SELECT DISTINCT role_name FROM user_roles;
   -- Expected: Admin, Requester, Approver, Assignee

   -- Count users by role
   SELECT role_name, COUNT(*) FROM user_roles GROUP BY role_name;
   -- Expected: Admin (5), Requester (7), Approver (5), Assignee (11)
   ```

---

## Troubleshooting

### Issue: Users see "403 Forbidden" after login
**Cause:** JWT token contains old V2 role name
**Solution:**
1. Clear browser cache/localStorage
2. Force page refresh
3. Login again

### Issue: "Role not found" errors in logs
**Cause:** Database still has mixed case role names
**Solution:** Run normalization query:
```sql
-- Convert any lowercase to PascalCase
UPDATE user_roles SET role_name = 'Admin' WHERE role_name = 'admin';
UPDATE user_roles SET role_name = 'Requester' WHERE role_name = 'requester';
UPDATE user_roles SET role_name = 'Approver' WHERE role_name = 'approver';
UPDATE user_roles SET role_name = 'Assignee' WHERE role_name = 'assignee';
```

### Issue: Frontend shows old V2 role names
**Cause:** Frontend code not reloaded
**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Clear service workers: DevTools → Application → Service Workers → Unregister
3. Clear cache: DevTools → Application → Storage → Clear Site Data

### Issue: Specific role cannot access expected resources
**Cause:** Role permissions not updated correctly
**Solution:**
1. Check backend middleware: `roleMiddleware.ts`
2. Check role definitions: `IRole.ts` → `DEFAULT_PERMISSIONS`
3. Check database: Verify role exists with correct permissions

---

## Success Criteria

After deployment, verify:
- ✅ All users can login
- ✅ JWT tokens contain V1 role names (Admin, Requester, Approver, Assignee)
- ✅ Role-based UI shows correct menu items per role
- ✅ API endpoints enforce V1 role-based access control
- ✅ No authentication errors in logs (except expected 403s)
- ✅ Database shows all roles in V1 PascalCase format
- ✅ Backward compatibility working for legacy V2 names (if applicable)

---

## Rollout Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Backend Deploy | 5-10 min | ⏳ Ready |
| Frontend Deploy | 5-10 min | ⏳ Ready |
| Verification | 10-15 min | ⏳ Ready |
| Testing | 30-60 min | ⏳ Ready |
| Monitor | Ongoing | ⏳ Ready |

**Total Time:** ~1-2 hours for full deployment + testing

---

## Support

If issues arise:
1. Check logs: `logs/error.log`, `logs/app.log`
2. Verify database: `SELECT * FROM user_roles WHERE id = <user_id>;`
3. Check JWT token: Use jwt.io to decode token and verify `roleName` field
4. Review permission utility mappings: `permission.utils.js`

---

**Last Updated:** 2024
**Version:** 1.0
**Migration Status:** Ready for Production ✅
