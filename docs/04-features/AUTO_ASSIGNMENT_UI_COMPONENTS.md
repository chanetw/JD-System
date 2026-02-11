# 🎨 Auto-Assignment UI Components & User List Loading

**Purpose:** ตรวจสอบและ Debug การไม่โหลด user list ในส่วนต่างๆ ของ auto-assignment
**Last Updated:** 2026-02-04

---

## 🗺️ Component Map

### **1. Approval Flow Admin Page**
- **File:** `/frontend/src/modules/features/admin/pages/ApprovalFlow.jsx`
- **Size:** 26,927 tokens (very large component)
- **Purpose:** Main UI for setting up approval workflows + auto-assignment

#### Key Sections:
```
┌─────────────────────────────────────────┐
│ Approval Flow Management                │
├─────────────────────────────────────────┤
│ 1. Project Selector                     │
│ 2. Job Type Selector                    │
│ 3. [NEW] Responsible Team Section ← NEW │
│    ├─ Requesters (Who can request?)     │
│    ├─ Approvers (Who approves?)         │
│    └─ Assignees (Who does the work?) ⭐ │
│ 4. Skip Approval Checkbox               │
│ 5. Job Type Assignment Matrix ↓↓↓       │
└─────────────────────────────────────────┘
```

#### Assignee Loading Code:
```javascript
// File: ApprovalFlow.jsx, lines 192-241
useEffect(() => {
    if (selectedProject && allUsers.length > 0) {
        // Filter Assignees by role + scope
        const asgs = allUsers.filter(u => {
            if (!hasRole(u, 'assignee')) return false;
            return canBeAssignedInBud(u, budId, projectId);
        });

        setResponsibleTeam({
            requesters: reqs,
            approvers: apps,
            assignees: asgs  // ← Key state
        });
    }
}, [selectedProject, allUsers]);
```

#### Team Lead Dropdown (lines 1121-1129):
```jsx
<select
    value={teamLeadId || ''}
    onChange={(e) => setTeamLeadId(e.target.value ? parseInt(e.target.value) : null)}
    className="w-full px-3 py-2 border border-blue-200..."
>
    <option value="">-- กรุณาเลือก Team Lead --</option>
    {responsibleTeam.assignees.map(user => (  // ← If empty, dropdown blank
        <option key={user.id} value={user.id}>
            {user.displayName || user.display_name} ({user.email})
        </option>
    ))}
</select>
```

**If Dropdown is Empty:**
- ❌ `responsibleTeam.assignees` is `[]`
- ❌ This means `allUsers` either empty or none have role='assignee'

---

### **2. Assignment Matrix Component**
- **File:** `/frontend/src/modules/features/admin/pages/AssignmentMatrix.jsx`
- **Purpose:** Set default assignee per job type per project
- **Received Props:**
  - `projectId`: which project
  - `assignees`: list of assignees from parent (ApprovalFlow)

#### Assignee Dropdown Code (lines 196-224):
```jsx
jobTypes.map(type => {
    const current = matrix.find(m => m.jobTypeId === type.id);
    return (
        <select
            className="block w-full pl-3 pr-10 py-2..."
            value={current?.assigneeId || ''}
            onChange={(e) => handleAssigneeChange(type.id, e.target.value)}
        >
            <option value="">-- ไม่ระบุ (ปล่อยว่าง) --</option>
            {activeAssignees.map(u => (  // ← Key line
                <option key={u.id} value={u.id}>
                    {u.displayName || u.name || u.email}
                </option>
            ))}
        </select>
    );
})
```

**If Dropdown is Empty:**
- ❌ `activeAssignees` is `[]`
- ❌ Usually because props `assignees` is empty from parent

---

## 🔍 Debugging Checklist

### **Phase 1: Check API Response** (Browser DevTools)

```
1. Open: http://localhost:5137/admin/approval-flow
2. Press F12 → Network Tab
3. Reload page
4. Find: GET /api/users
5. Check Response Tab:
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "email": "user1@example.com",
        "userRoles": [
          { "roleName": "assignee" }
        ],
        "displayName": "User One",
        ...
      },
      // ... more users
    ]
  }
}
```

**If you see:**
- ✅ Multiple users with `"roleName": "assignee"` → Go to Phase 2
- ❌ Empty array `[]` → No users in database, add them in User Management
- ❌ No `userRoles` field → Backend not returning roles, check backend code
- ❌ Status 401/403 → Auth issue, check token

---

### **Phase 2: Check Frontend State** (Browser Console)

```javascript
// Paste ลงใน Browser Console while on Approval Flow page:

// Get the select element
const teamLeadSelect = document.querySelector('select[value*="Team"]') ||
                       document.querySelector('select');

// Check if it has options
console.log('=== ASSIGNMENT MATRIX DEBUG ===');
console.log('Select element found:', !!teamLeadSelect);

if (teamLeadSelect) {
  const options = teamLeadSelect.querySelectorAll('option');
  console.log('Total options:', options.length);
  console.log('First 3 options:');
  Array.from(options).slice(0, 3).forEach(opt => {
    console.log('  -', opt.value, ':', opt.textContent);
  });
}

// Check window state (if component exposed)
console.log('Window.__state:', window.__ADMIN_STATE || 'Not exposed');
```

**Expected Output:**
```
=== ASSIGNMENT MATRIX DEBUG ===
Select element found: true
Total options: 11           // ← 1 placeholder + 10 users
First 3 options:
  -  : -- กรุณาเลือก Team Lead --
  - 1 : User One (user1@example.com)
  - 2 : User Two (user2@example.com)
```

**If shows:**
- ❌ `Total options: 1` (only placeholder) → Users not loaded, check Phase 3
- ✅ Multiple options → Frontend working, check Phase 4

---

### **Phase 3: Check Backend Data Fetch**

**Location:** `/frontend/src/modules/shared/services/modules/adminService.js` (lines 126-178)

```javascript
const loadData = async () => {
    setIsLoading(true);
    try {
        let usersData = [];

        try {
            usersData = await api.getUsers() || [];  // ← Key line
            console.log('[DEBUG] Users loaded:', usersData.length);
        } catch (e) {
            console.warn('Failed to fetch users:', e);
            // Silently fails! ⚠️
        }

        setAllUsers(usersData);  // ← If empty, nothing loads

    } catch (error) {
        console.error('Error in loadData:', error);
    }
};
```

**Debug by adding logs:**

If you have access to frontend code, add this to check:

```javascript
// In ApprovalFlow.jsx, add near line 126:
useEffect(() => {
    console.log('[DEBUG] allUsers:', allUsers.length);
    console.log('[DEBUG] assignees in users:',
      allUsers.filter(u => u.userRoles?.some(r => r.roleName === 'assignee')).length
    );
}, [allUsers]);
```

---

### **Phase 4: Check Database Directly**

```sql
-- 1. Count users with assignee role
SELECT COUNT(DISTINCT user_id)
FROM user_roles
WHERE role_name = 'assignee' AND is_active = true;

-- 2. Get sample assignees
SELECT u.id, u.email, u.display_name, ur.role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role_name = 'assignee'
  AND u.is_active = true
  AND ur.is_active = true
LIMIT 5;

-- 3. Check all roles in database
SELECT DISTINCT role_name, COUNT(*) as count
FROM user_roles
WHERE is_active = true
GROUP BY role_name;
```

---

## 🔧 Common Issues & Solutions

### **Issue 1: Dropdown Empty but API Returns Users**

**Symptom:**
- ✅ Network tab shows `/api/users` returns data with assignees
- ❌ But dropdown still empty

**Root Cause:** Frontend filtering removes all users

**Solution:**
Check the filter logic in ApprovalFlow.jsx (lines 192-241):
```javascript
// Might be filtering OUT all assignees due to scope check
const asgs = allUsers.filter(u => {
    if (!hasRole(u, 'assignee')) return false;  // ← might be true
    return canBeAssignedInBud(u, budId, projectId);  // ← might be false
});
```

**Fix:**
- ✅ Make sure `hasRole(u, 'assignee')` returns true
- ✅ Make sure `canBeAssignedInBud()` doesn't filter everyone

---

### **Issue 2: API Returns Empty Array**

**Symptom:**
- ❌ Network tab shows `/api/users` returns `data: []`

**Root Cause:** Either no users in DB or RLS policy blocking

**Solution:**

1. Check Database:
```sql
SELECT COUNT(*) FROM users WHERE is_active = true;
```

2. If > 0 users but API still returns `[]`:
   - ❌ RLS Policy blocking
   - ✅ Check Supabase Row Level Security policies

3. If 0 users:
   - ❌ No users in database at all
   - ✅ Add users in User Management page

---

### **Issue 3: API Error (401/403/500)**

**Symptom:**
- ❌ Network tab shows error status code

**Solution:**
1. **401 Unauthorized:** Token expired
   - ✅ Re-login

2. **403 Forbidden:** User doesn't have permission
   - ✅ Confirm logged-in user has admin role
   - ✅ Check RLS policies

3. **500 Server Error:** Backend crash
   - ✅ Check backend console
   - ✅ Report to Backend Dev

---

## 📋 Self-Service Debugging Guide

**If user list not showing:**

1. ✅ Check Phase 1: Network Tab (API response)
   - Are users returned? Is role field present?

2. ✅ Check Phase 2: Browser Console (frontend state)
   - Are options in the select element?

3. ✅ Check Phase 3: Code (data loading)
   - Is `allUsers` being set?
   - Is filter removing users?

4. ✅ Check Phase 4: Database (data source)
   - Do assignee users exist?
   - Are they marked active?

5. ✅ If all checks pass → Report to Backend Dev with:
   - Screenshot of Network response
   - Screenshot of Database query result
   - Backend logs when calling `/api/users`

---

## 🚀 Quick Links

- [ApprovalFlow Component](frontend/src/modules/features/admin/pages/ApprovalFlow.jsx)
- [AssignmentMatrix Component](frontend/src/modules/features/admin/pages/AssignmentMatrix.jsx)
- [AdminService API Layer](frontend/src/modules/shared/services/modules/adminService.js)
- [Backend User Routes](backend/api-server/src/routes/users.js)

---

**Status:** Ready for Dev Team Debugging
**For Issues:** Create GitHub issue or contact Backend Dev
