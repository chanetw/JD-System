# Testing Checklist: V1 Role Migration

## Quick Test (5 minutes)

- [ ] **Backend Running?**
  ```bash
  curl http://localhost:5000/api/v2/health
  ```
  Expected: `{"status":"ok"}`

- [ ] **Database Role Names OK?**
  ```sql
  SELECT DISTINCT role_name FROM user_roles;
  ```
  Expected: Admin, Requester, Approver, Assignee (all PascalCase)

- [ ] **Login Test**
  - [ ] Admin user can login
  - [ ] Requester user can login
  - [ ] Approver user can login
  - [ ] Assignee user can login

---

## Frontend Role-Based UI Tests (10 minutes)

### Admin Login
- [ ] See sidebar: Manage Users ✅
- [ ] See sidebar: Manage Organizations ✅
- [ ] See "Create DJ" button on dashboard ✅
- [ ] Can access admin pages ✅

### Requester Login
- [ ] See sidebar: My Queue ✅
- [ ] See "Create DJ" button on dashboard ✅
- [ ] Can create new DJ ✅
- [ ] Cannot access admin pages ❌

### Approver Login
- [ ] See sidebar: Pending Approvals ✅
- [ ] See sidebar: My Queue ✅
- [ ] Cannot see "Create DJ" button ❌
- [ ] Cannot access admin pages ❌

### Assignee Login
- [ ] See sidebar: My Tasks ✅
- [ ] See sidebar: My Queue ✅
- [ ] Cannot see "Create DJ" button ❌
- [ ] Cannot access admin features ❌

---

## Backend Authorization Tests (15 minutes)

### Admin Endpoints
```bash
# Get admin users (Admin only)
curl -X GET http://localhost:5000/api/v2/admin/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Expected: 200 OK

# Get organizations (Admin only)
curl -X GET http://localhost:5000/api/v2/admin/organizations \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
# Expected: 200 OK
```

### Requester Endpoints
```bash
# Create user (Requester+)
curl -X POST http://localhost:5000/api/v2/users \
  -H "Authorization: Bearer <REQUESTER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","roleName":"Assignee"}'
# Expected: 201 Created OR 200 OK

# List users (Approver+)
curl -X GET http://localhost:5000/api/v2/users \
  -H "Authorization: Bearer <REQUESTER_TOKEN>"
# Expected: 200 OK
```

### Approver Endpoints
```bash
# List users (Approver+)
curl -X GET http://localhost:5000/api/v2/users \
  -H "Authorization: Bearer <APPROVER_TOKEN>"
# Expected: 200 OK

# Should NOT update users (Requester+ only)
curl -X PUT http://localhost:5000/api/v2/users/1 \
  -H "Authorization: Bearer <APPROVER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"roleName":"Assignee"}'
# Expected: 403 Forbidden
```

### Assignee Endpoints
```bash
# Read-only access
curl -X GET http://localhost:5000/api/v2/jobs \
  -H "Authorization: Bearer <ASSIGNEE_TOKEN>"
# Expected: 200 OK

# Cannot create (403)
curl -X POST http://localhost:5000/api/v2/jobs \
  -H "Authorization: Bearer <ASSIGNEE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"test"}'
# Expected: 403 Forbidden
```

---

## Permission Check Tests (5 minutes)

### Frontend Permission Utils
```javascript
// In browser console
import {
  ROLE_LABELS,
  ROLE_V1_DISPLAY,
  ROLE_V2_BADGE_COLORS,
  hasRolePermission
} from '@/modules/shared/utils/permission.utils'

// V1 PascalCase names
console.log(ROLE_LABELS.Admin)  // "ผู้ดูแลระบบสูงสุด"
console.log(ROLE_V1_DISPLAY.Admin)  // "System Admin"

// V2 backward compatibility
console.log(ROLE_LABELS.SuperAdmin)  // "ผู้ดูแลระบบสูงสุด"
console.log(ROLE_V1_DISPLAY.SuperAdmin)  // "System Admin"

// Badge colors
console.log(ROLE_V2_BADGE_COLORS.Admin)  // "bg-purple-100 text-purple-800"

// Permission checks
console.log(hasRolePermission('Admin', 'users', 'delete'))  // true
console.log(hasRolePermission('Assignee', 'users', 'delete'))  // false
```

### Auth Store Hooks
```javascript
// In component
import { useIsSuperAdmin, useIsOrgAdmin, useIsTeamLead } from '@/modules/core/stores/authStoreV2'

const isSuperAdmin = useIsSuperAdmin()  // Check if role === 'Admin'
const isOrgAdmin = useIsOrgAdmin()  // Check if role === 'Admin' || 'Requester'
const isTeamLead = useIsTeamLead()  // Check if role === 'Admin' || 'Requester' || 'Approver'
```

---

## Database Verification (5 minutes)

```sql
-- Check all roles are V1 PascalCase
SELECT DISTINCT role_name FROM user_roles ORDER BY role_name;
-- Expected result:
-- Admin
-- Approver
-- Assignee
-- Requester

-- Count users per role
SELECT role_name, COUNT(*) as user_count FROM user_roles GROUP BY role_name ORDER BY role_name;
-- Expected: Admin (5), Approver (5), Assignee (11), Requester (7)

-- Check JWT tokens contain V1 role names
SELECT id, email, role_name FROM users LIMIT 5;
-- Expected: All role_name values should be PascalCase

-- Verify role permissions are correct
SELECT name, permissions FROM "Role" WHERE name IN ('Admin', 'Requester', 'Approver', 'Assignee');
-- Expected: 4 rows with correct permission structures
```

---

## Migration Verification

- [ ] **All 40 files committed and pushed**
  ```bash
  git log --oneline -1
  # Should show: "2dd68ed Migrate Role Names V2→V1..."
  ```

- [ ] **Backend changes applied**
  - [ ] IRole.ts enum has V1 names ✅
  - [ ] Middleware checks V1 roles ✅
  - [ ] Controllers use V1 role names ✅

- [ ] **Frontend changes applied**
  - [ ] auth.types.ts has V1 RoleName ✅
  - [ ] authStoreV2.ts hooks check V1 names ✅
  - [ ] UI components show correct menus ✅

- [ ] **Database migrated**
  - [ ] All role_names are PascalCase ✅
  - [ ] User counts: Admin (5), Requester (7), Approver (5), Assignee (11) ✅

---

## Failure Recovery

If tests fail at any point:

1. **Check logs:**
   ```bash
   tail -50 logs/error.log
   tail -50 logs/app.log
   ```

2. **Verify role in database:**
   ```sql
   SELECT role_name FROM users WHERE email = 'test@test.com';
   SELECT * FROM "Role" WHERE name = 'Admin';
   ```

3. **Check JWT token (use jwt.io):**
   - Decode token and verify `roleName` field exists
   - Verify `roleName` value is V1 PascalCase

4. **Clear cache if needed:**
   - Browser: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. **Re-login:**
   - Clear localStorage: `localStorage.clear()`
   - Refresh page and login again

---

## Success Indicators ✅

After all tests pass:
- ✅ Users can login with new V1 role system
- ✅ JWT tokens contain V1 role names (Admin, Requester, Approver, Assignee)
- ✅ Frontend UI shows correct role-based menu items
- ✅ Backend API enforces V1 role-based access control
- ✅ No "403 Forbidden" or "401 Unauthorized" errors for valid users
- ✅ Database shows all roles in V1 PascalCase format
- ✅ Backward compatibility maintained for display purposes

---

## Test Results

Document test results here:

| Test | Status | Notes |
|------|--------|-------|
| Backend Health | ⏳ | |
| Admin Login | ⏳ | |
| Requester Login | ⏳ | |
| Approver Login | ⏳ | |
| Assignee Login | ⏳ | |
| Admin UI Menu | ⏳ | |
| Requester UI Menu | ⏳ | |
| API Authorization | ⏳ | |
| Permission Utils | ⏳ | |
| Database Roles | ⏳ | |

---

**Date Tested:** ___________
**Tester:** ___________
**Result:** ⏳ Pending / ✅ Pass / ❌ Fail
