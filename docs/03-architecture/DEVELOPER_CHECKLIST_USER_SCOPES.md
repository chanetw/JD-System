# 🔍 Developer Checklist: User Scopes Not Showing

**วัตถุประสงค์:** ตรวจสอบว่าทำไม "ขอบเขตความรับผิดชอบ" ไม่แสดงใน User Management UI

**ผู้รับผิดชอบ:** Backend & Frontend Developer

---

## ✅ Checklist

### Phase 1: ตรวจสอบ Backend Response (Frontend Developer)

#### Step 1.1: เปิด User Management Page
- [ ] Navigate to: `http://localhost:5137/admin/users`
- [ ] ตรวจสอบว่า page load ถูกต้อง (ไม่มี error)

#### Step 1.2: เปิด Browser DevTools
- [ ] กด `F12` หรือ `Cmd+Option+I`
- [ ] ไปที่ Tab **"Network"**
- [ ] ตรวจสอบ checkbox **"Preserve log"** ✓

#### Step 1.3: Reload Page
- [ ] กด `Cmd+R` (Mac) หรือ `F5` (Windows)
- [ ] รอให้ page load เสร็จ

#### Step 1.4: หา Request API
- [ ] ใน Network Tab → ค้นหา request: `GET /api/users`
- [ ] คลิก request นั้น → ดู Tab **"Response"**

#### Step 1.5: ตรวจสอบ Response Structure

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "email": "admin@sena.co.th",
        "displayName": "Admin User",
        "firstName": "Admin",
        "lastName": "User",
        "department": {
          "id": 5,
          "name": "Marketing",
          "bud": {
            "id": 1,
            "name": "BUD 1"
          }
        },
        "managedDepartments": [],
        "userRoles": [
          { "roleName": "admin" }
        ],
        "scope_assignments": [              // ⚠️ CHECK THIS
          {
            "user_id": 1,
            "scope_id": 10,
            "scope_level": "project",       // Can be: "tenant", "bud", "project"
            "scope_name": "Project A",
            "role_type": "admin"
          }
        ],
        // ... other fields
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20
    }
  }
}
```

#### Step 1.6: ✅ หรือ ❌ ?

**✅ หากมี `scope_assignments` ที่มีข้อมูล:**
```json
"scope_assignments": [
  { "scope_level": "project", "scope_name": "Project A" }
]
```
→ **ไปต่อ Phase 2**

**❌ หากมี `scope_assignments` แต่เป็น array เปล่า:**
```json
"scope_assignments": []
```
→ **ไปต่อ Phase 3 (ต้องเพิ่มข้อมูล test)**

**❌ หากไม่มี field `scope_assignments` เลย:**
```json
{
  "id": 1,
  "email": "admin@sena.co.th",
  // scope_assignments ไม่มีที่นี่!
}
```
→ **Backend Issue - แจ้ง Backend Developer (Phase 4)**

---

### Phase 2: ตรวจสอบ Frontend Mapping (Frontend Developer)

**เงื่อนไข:** จากขั้น 1.6 ได้ `scope_assignments` ที่มีข้อมูล

#### Step 2.1: เปิด Browser Console
- [ ] ใน DevTools → Tab **"Console"**

#### Step 2.2: เรียก API และตรวจสอบ mapping

```javascript
// ⬇️ Copy and Paste นี้ลงใน Console:

fetch('http://localhost:3000/api/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
  }
})
.then(r => r.json())
.then(response => {
  const users = response.data.data;

  console.log('%c📊 API Response Summary', 'font-size: 16px; color: blue; font-weight: bold');
  console.log('Total users:', users.length);

  // Check scope_assignments
  const withScopes = users.filter(u => u.scope_assignments && u.scope_assignments.length > 0);
  console.log('Users with scopes:', withScopes.length);
  console.log('Users WITHOUT scopes:', users.length - withScopes.length);

  // Show sample user
  if (users.length > 0) {
    console.log('%c📋 Sample User #1', 'font-size: 14px; color: green; font-weight: bold');
    console.log(JSON.stringify(users[0], null, 2));

    if (withScopes.length > 0) {
      console.log('%c✅ Sample User WITH Scopes', 'font-size: 14px; color: green; font-weight: bold');
      console.log(JSON.stringify(withScopes[0], null, 2));
    }
  }
})
.catch(error => {
  console.error('%c❌ API Error', 'color: red; font-weight: bold');
  console.error(error);
});
```

#### Step 2.3: ตรวจสอบ Output

**✅ ถ้าเห็น:**
```
📊 API Response Summary
Total users: 10
Users with scopes: 5
Users WITHOUT scopes: 5

📋 Sample User #1
{
  "id": 1,
  "email": "admin@sena.co.th",
  "assignedScopes": {
    "tenants": [],
    "buds": [],
    "projects": [
      { "id": 10, "name": "Project A", "level": "project" }
    ]
  }
  ...
}
```

→ **Frontend mapping ทำงานถูกต้อง ✅**
→ **ปัญหาอยู่ที่ UI Rendering - ไปต่อ Step 2.4**

**❌ ถ้าเห็น:**
```
scope_assignments: undefined
```

→ **Frontend mapping ผิด - แจ้ง Frontend Developer**

#### Step 2.4: ตรวจสอบ UI Rendering

ใน Console ให้ run:

```javascript
// Check if assignedScopes is in the UI
const adminServiceResponse = window.__DEBUG_ADMIN_SERVICE || {};
console.log('adminService.getUsers() output:', adminServiceResponse);

// Check if UserManagement component is rendering scopes
const scopeBadges = document.querySelectorAll('[class*="scope"]');
console.log('Found scope elements in DOM:', scopeBadges.length);

// Check table cells
const tableCells = document.querySelectorAll('td');
console.log('Total table cells:', tableCells.length);
tableCells.forEach((cell, i) => {
  if (cell.textContent.includes('project') || cell.textContent.includes('Project')) {
    console.log('Found scope-like text in cell', i, ':', cell.textContent.substring(0, 50));
  }
});
```

**ผลที่ต้องการ:**
- ✅ `scopeBadges.length > 0` → scope elements render ได้
- ✅ Table cells มีข้อมูลโครงการ

---

### Phase 3: เพิ่ม Test Data (Backend Developer)

**เงื่อนไข:** จากขั้น 1.6 ได้ `scope_assignments: []` (array เปล่า)

#### Step 3.1: ตรวจสอบจำนวน Users ที่มี Scope

ใน Backend Terminal:

```bash
cd backend/api-server

# ตัวอย่าง: ใช้ Prisma CLI
npx prisma studio

# หรือ run query ด้วย script
node --input-type=module << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const count = await prisma.userScopeAssignment.count();
console.log('Total scope assignments in DB:', count);

const sample = await prisma.userScopeAssignment.findFirst();
console.log('Sample scope:', sample);

await prisma.$disconnect();
EOF
```

**ผลที่คาดหวัง:**
```
Total scope assignments in DB: 0   // ❌ ไม่มีข้อมูล
```

#### Step 3.2: สร้าง Test Data

**วิธีที่ 1: ใช้ UI (แนะนำ)**

1. ไปที่ User Management page
2. คลิก **"แก้ไข"** ที่ user ใดก็ได้
3. ใน Modal:
   - เลือก **"Role"** → เช่น "Requester"
   - เลือก **"Scope Level"** → "เฉพาะโครงการ"
   - เลือก **"Projects"** → เลือกอย่างน้อย 1 โครงการ
4. คลิก **"บันทึก"**
5. Reload page → ดู Network response อีกครั้ง

**วิธีที่ 2: ใช้ SQL Query (Fast)**

```sql
-- แทน VALUES ด้วยค่าจริงจาก database
INSERT INTO user_scope_assignments (
  tenant_id,
  user_id,
  role_type,
  scope_level,
  scope_id,
  scope_name,
  assigned_by,
  is_active
) VALUES
  (1, 1, 'admin', 'project', 10, 'Project A', 1, true),
  (1, 2, 'requester', 'project', 10, 'Project A', 1, true),
  (1, 2, 'requester', 'project', 11, 'Project B', 1, true);

-- Verify
SELECT * FROM user_scope_assignments
WHERE is_active = true
LIMIT 5;
```

#### Step 3.3: ทดสอบใหม่

1. Reload User Management page
2. ตรวจสอบ Network Tab → `/api/users` response
3. ดู scope_assignments มีข้อมูลแล้ว ✅

---

### Phase 4: ตรวจสอบ Backend (Backend Developer)

**เงื่อนไข:** จากขั้น 1.6 ไม่มี field `scope_assignments` เลย

#### Step 4.1: ตรวจสอบ UserService.getUsers()

ตรวจสอบไฟล์: `backend/api-server/src/services/userService.js`

ดูว่า function `getUsers()` มี select scopeAssignments หรือไม่:

```javascript
// ไฟล์: src/services/userService.js, ประมาณ line 172-219

async getUsers(tenantId, options = {}) {
  // ...
  const result = await this.paginate('user', {
    // ...
    select: {
      // ... other fields ...

      // ⚠️ ต้องมี section นี้:
      scopeAssignments: {
        where: { isActive: true },
        select: {
          id: true,
          scopeId: true,
          scopeLevel: true,
          scopeName: true,
          roleType: true
        }
      }
    }
  });

  // ⚠️ ต้องมี mapping นี้:
  if (result.data && result.data.length > 0) {
    result.data.forEach(user => {
      user.scope_assignments = (user.scopeAssignments || []).map(s => ({
        user_id: user.id,
        scope_id: s.scopeId,
        scope_level: s.scopeLevel,
        scope_name: s.scopeName,
        role_type: s.roleType
      }));
      delete user.scopeAssignments;
    });
  }

  return result;
}
```

#### Step 4.2: ✅ หรือ ❌ ?

**✅ ถ้าหา `scopeAssignments` select ได้:**
→ Backend ถูกต้อง → กลับไป Phase 1-2 ตรวจสอบใหม่

**❌ ถ้าหา `scopeAssignments` ไม่เจอ:**
→ **ต้องเพิ่มเข้าไป!**

#### Step 4.3: แก้ไข UserService.getUsers()

ดู file: `backend/api-server/src/services/userService.js` ที่ line ~208

เพิ่มส่วนนี้ (ถ้ายังไม่มี):

```javascript
// Add this to the select object:
scopeAssignments: {
  where: { isActive: true },
  select: {
    id: true,
    scopeId: true,
    scopeLevel: true,
    scopeName: true,
    roleType: true
  }
}
```

และเพิ่มการ map ใน result processing (ประมาณ line 222-233):

```javascript
// Map scopeAssignments to snake_case for frontend compatibility
if (result.data && result.data.length > 0) {
  result.data.forEach(user => {
    user.scope_assignments = (user.scopeAssignments || []).map(s => ({
      user_id: user.id,
      scope_id: s.scopeId,
      scope_level: s.scopeLevel,
      scope_name: s.scopeName,
      role_type: s.roleType
    }));
    delete user.scopeAssignments;
  });
}
```

#### Step 4.4: Restart Backend
```bash
# ใน Terminal ที่รัน backend:
# กด Ctrl+C เพื่อหยุด
# แล้ว run ใหม่
npm run dev
```

#### Step 4.5: ทดสอบอีกครั้ง
- Reload User Management page
- เช็ค Network Tab → `/api/users` response
- ตรวจสอบว่ามี `scope_assignments` แล้ว ✅

---

## 📋 Summary Checklist

**ทำการตรวจสอบตามลำดับนี้:**

- [ ] **Phase 1:** ตรวจสอบ Backend Response (Network Tab)
  - [ ] เห็น `scope_assignments` field หรือไม่?
  - [ ] มีข้อมูลข้างในหรือเป็น `[]`?

- [ ] **Phase 2:** ตรวจสอบ Frontend Mapping (Console)
  - [ ] `assignedScopes` map ถูกต้องหรือไม่?
  - [ ] Data render ใน UI หรือไม่?

- [ ] **Phase 3:** เพิ่ม Test Data (ถ้า scope_assignments เปล่า)
  - [ ] สร้างข้อมูล test scope
  - [ ] ทดสอบใหม่

- [ ] **Phase 4:** แก้ไข Backend (ถ้าไม่มี field scope_assignments)
  - [ ] เพิ่ม scopeAssignments ใน select
  - [ ] เพิ่ม mapping logic
  - [ ] Restart backend

---

## 🎯 Expected Result

เมื่อทำครบทั้ง 4 phases:

**User Management page จะแสดง:**

```
┌─────────────────────────────────────────────────────┐
│ User Management                                     │
├─────────────────────────────────────────────────────┤
│ พนักงาน    │ แผนก  │ ขอบเขตความรับผิดชอบ (Scope)   │
├─────────────────────────────────────────────────────┤
│ John Doe  │ ICT   │ 🏗️ Project A               │
│           │       │ 🏗️ Project B               │
│ Jane Roe  │ Acc   │ 🏗️ Project C               │
│ Admin U.  │ -     │ 🏢 Sena Development        │
└─────────────────────────────────────────────────────┘
```

---

## 📞 ถ้ามีปัญหา

**บอก:**
1. ✅ Scope ที่พบ (tenant/bud/project)
2. ✅ จำนวนข้อมูล scope_assignments
3. ✅ ขั้นตอนที่ติด
4. ✅ Error message (ถ้ามี)

---

**Last Updated:** 2026-02-04
**Status:** Ready for Developer Testing
