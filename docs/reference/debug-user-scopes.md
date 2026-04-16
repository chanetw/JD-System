# 🔍 Debug: User Scopes Not Showing

## วิธีตรวจสอบ

### 1. เช็ค Backend Response (Browser DevTools)

1. เปิด User Management Page
2. กด F12 → Network Tab
3. Reload หน้า
4. หา Request: `GET /api/users`
5. ดู Response:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "email": "user@example.com",
        "displayName": "John Doe",
        "scope_assignments": [    // ⬅️ ตรวจสอบตรงนี้
          {
            "user_id": 1,
            "scope_id": 10,
            "scope_level": "project",
            "scope_name": "Project A",
            "role_type": "requester"
          }
        ],
        "userRoles": [
          { "roleName": "requester" }
        ],
        "department": {
          "id": 5,
          "name": "Marketing",
          "bud": {
            "id": 1,
            "name": "BUD 1"
          }
        },
        "managedDepartments": []
      }
    ],
    "pagination": { ... }
  }
}
```

### ⚠️ สิ่งที่ต้องเช็ค:

- ✅ `scope_assignments` มีหรือไม่?
- ✅ เป็น Array หรือไม่?
- ✅ มีข้อมูลข้างในหรือเป็น `[]` เปล่า?

---

## 📊 กรณีที่เป็นไปได้

### กรณีที่ 1: `scope_assignments` = `[]` (Array เปล่า)

**สาเหตุ:** User ยังไม่ได้กำหนด Scope

```json
{
  "id": 1,
  "scope_assignments": []  // ⬅️ ไม่มีข้อมูล
}
```

**วิธีแก้:**
1. ไป Edit User
2. เลือก Role → กำหนด Scope
3. บันทึก
4. Reload หน้า

---

### กรณีที่ 2: `scope_assignments` ไม่มีเลย (undefined)

**สาเหตุ:** Backend ไม่ได้ส่งข้อมูล

```json
{
  "id": 1,
  // ⬅️ ไม่มี scope_assignments field
}
```

**วิธีแก้:**
ตรวจสอบ Backend UserService.getUsers() ว่า select scopeAssignments หรือไม่

---

### กรณีที่ 3: Backend Error

```json
{
  "success": false,
  "error": "...",
  "message": "..."
}
```

**วิธีแก้:**
1. ดู Backend Console Log
2. ตรวจสอบ Database Connection
3. ตรวจสอบ RLS Policies

---

## 🧪 Test Query บน Database โดยตรง

### Query 1: เช็คว่ามี Scope Assignments หรือไม่

ให้ Run command นี้เพื่อเช็คข้อมูลใน Database:

\`\`\`bash
cd /Users/chanetw/Documents/DJ-System/backend/api-server
node --input-type=module << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScopes() {
  try {
    // 1. Count total users
    const userCount = await prisma.user.count({
      where: { isActive: true }
    });
    console.log('📊 Total Active Users:', userCount);

    // 2. Count users with scopes
    const usersWithScopes = await prisma.userScopeAssignment.groupBy({
      by: ['userId'],
      where: { isActive: true }
    });
    console.log('📊 Users with Scopes:', usersWithScopes.length);

    // 3. Get sample scope data
    const sampleScopes = await prisma.userScopeAssignment.findMany({
      where: { isActive: true },
      take: 10,
      include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        }
      }
    });

    console.log('\n📋 Sample Scope Assignments:');
    sampleScopes.forEach(scope => {
      console.log({
        user: scope.user.email,
        roleType: scope.roleType,
        scopeLevel: scope.scopeLevel,
        scopeName: scope.scopeName
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScopes();
EOF
\`\`\`

---

## 🔧 Quick Fix: สร้างข้อมูล Test

ถ้าพบว่า **ไม่มี Scope Assignments ใน Database**:

### วิธีที่ 1: ใช้ UI (User Management)

1. ไปที่ User Management
2. คลิก "แก้ไข" User ใด User หนึ่ง
3. เลือก Role (เช่น "Requester")
4. กำหนด Scope:
   - เลือก Level: "เฉพาะโครงการ"
   - เลือกโครงการที่ต้องการ
5. บันทึก

### วิธีที่ 2: Insert ข้อมูล Test ด้วย SQL

\`\`\`bash
cd /Users/chanetw/Documents/DJ-System/backend/api-server
node --input-type=module << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestScopes() {
  try {
    // 1. Find first active user
    const user = await prisma.user.findFirst({
      where: { isActive: true }
    });

    if (!user) {
      console.log('❌ No active users found');
      return;
    }

    // 2. Find first project
    const project = await prisma.project.findFirst({
      where: { isActive: true }
    });

    if (!project) {
      console.log('❌ No active projects found');
      return;
    }

    // 3. Create scope assignment
    const scope = await prisma.userScopeAssignment.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        roleType: 'requester',
        scopeLevel: 'project',
        scopeId: project.id,
        scopeName: project.name,
        assignedBy: user.id,
        isActive: true
      }
    });

    console.log('✅ Test scope created:');
    console.log({
      user: user.email,
      project: project.name,
      scope: scope.scopeLevel
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestScopes();
EOF
\`\`\`

---

## 📋 Checklist การตรวจสอบ

- [ ] **Backend Response**: เช็ค Network Tab ว่า `/api/users` ส่ง `scope_assignments` มาหรือไม่
- [ ] **Database**: เช็คว่ามีข้อมูลใน `user_scope_assignments` table หรือไม่
- [ ] **Frontend Mapping**: เช็ค Console Log ว่า `assignedScopes` ถูก map ถูกต้องหรือไม่
- [ ] **UI Rendering**: เช็คว่า UserManagement.jsx render scope badges หรือไม่

---

## 🎯 สรุป

**ปัญหาส่วนใหญ่คือ:** ไม่มีข้อมูล Scope ใน Database

**วิธีแก้:**
1. เช็ค Backend Response ก่อน (Network Tab)
2. ถ้าไม่มี `scope_assignments` → เพิ่มข้อมูล test
3. ถ้ามีแต่ยังไม่แสดง → Debug Frontend mapping

**Next Step:**
ให้ลอง Run Query ตรวจสอบข้อมูลใน Database ก่อนครับ
