# 📋 Tenant & Scope Refactoring Plan

**วันที่:** 2026-02-04
**สถานะ:** Draft - รอการทบทวนและอนุมัติ

---

## 🎯 วัตถุประสงค์

ปรับปรุงการใช้งาน `tenant` ให้เป็นเพียง **Company Reference** (อ้างอิงบริษัท) ไม่ใช่ **Permission Scope** (ขอบเขตสิทธิ์)

---

## 📊 สถานะปัจจุบัน (Current State)

### 1. โครงสร้าง Multi-Tenancy ปัจจุบัน

```
Tenant (บริษัท)
├── Users (พนักงาน)
├── BUDs (ฝ่าย/สายงาน)
│   └── Departments (แผนก)
│       └── Projects (โครงการ)
└── User Scope Assignments
    └── Scope Levels: "tenant", "bud", "project"
```

### 2. ตารางที่เกี่ยวข้อง

| Table | Purpose | Current Issue |
|-------|---------|---------------|
| `tenants` | บริษัท/องค์กร | ✅ ใช้งานถูกต้อง (Data Isolation) |
| `users.tenant_id` | ระบุว่า User อยู่บริษัทไหน | ✅ ใช้งานถูกต้อง |
| `user_scope_assignments` | กำหนดขอบเขตสิทธิ์ | ⚠️ มี `scope_level = 'tenant'` ซ้ำซ้อน |
| `user_roles` | บทบาทของ User | ✅ ใช้งานถูกต้อง |

### 3. ปัญหาที่พบ

#### ❌ Problem 1: Tenant Scope ซ้ำซ้อน
```sql
-- User อยู่ใน Tenant แล้ว (via users.tenant_id)
SELECT tenant_id FROM users WHERE id = 123;  -- Returns: 1

-- แต่ยังมี Scope Assignment อีก (ซ้ำซ้อน)
SELECT * FROM user_scope_assignments
WHERE user_id = 123 AND scope_level = 'tenant';
-- Returns: tenant_id = 1 อีกครั้ง
```

**สรุป:** User อยู่ใน Tenant ID = 1 อยู่แล้ว ไม่จำเป็นต้องมี Scope "tenant" อีก

#### ❌ Problem 2: ความสับสนในการใช้งาน

```javascript
// Frontend: ต้องเช็ค 2 ที่
const userTenant = user.tenant_id;           // จาก users table
const tenantScope = scopes.find(s => s.level === 'tenant'); // จาก scope_assignments
// ซ้ำซ้อน และสร้างความสับสน
```

#### ❌ Problem 3: Scope ที่ไม่มีโครงการไม่โหลดขึ้นมาใน UI

```sql
-- Query ปัจจุบัน: โหลดเฉพาะ project scopes
SELECT * FROM user_scope_assignments
WHERE user_id = 123 AND scope_level = 'project';

-- ถ้าเป็น 'tenant' หรือ 'bud' → Frontend ไม่รู้จะแสดงอะไร
```

---

## 🎨 โครงสร้างที่เหมาะสม (Target State)

### 1. แนวคิดใหม่

```
Tenant = "ฉันอยู่บริษัทไหน?" (Company Membership)
Scope  = "ฉันทำงานในโครงการไหนได้บ้าง?" (Work Authorization)
```

### 2. Scope Levels ที่เหลือ

| Scope Level | Meaning | Example |
|-------------|---------|---------|
| ~~`tenant`~~ | ❌ **ลบออก** (ซ้ำซ้อน) | - |
| `company` | ✅ ทั้งบริษัท (แทน tenant) | "สามารถทำงานทุกโครงการในบริษัท" |
| `bud` | ✅ ทั้งฝ่าย | "สามารถทำงานทุกโครงการใน BUD 1" |
| `project` | ✅ เฉพาะโครงการ | "สามารถทำงานแค่ Project A, B, C" |

### 3. ตัวอย่างการใช้งาน

```sql
-- Admin (Company-wide access)
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (1, 'admin', 'company', 1, 'Sena Development');

-- BUD Manager (BUD-wide access)
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (2, 'approver', 'bud', 5, 'BUD 1 - สายงานขาย');

-- Project Member (Project-specific access)
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (3, 'requester', 'project', 10, 'The Origin Tower');
VALUES (3, 'requester', 'project', 11, 'Park Court');
```

---

## 🛠️ Migration Plan

### Phase 1: Backend Changes (Low Risk)

#### 1.1 Update Prisma Schema

```prisma
// ไฟล์: backend/prisma/schema.prisma

model UserScopeAssignment {
  scopeLevel String @map("scope_level") @db.VarChar(50)
  // ✅ Allowed values: 'company', 'bud', 'project'
  // ❌ ห้ามใช้: 'tenant'
}
```

#### 1.2 Add Validation in Backend

```javascript
// ไฟล์: backend/api-server/src/services/userService.js

const VALID_SCOPE_LEVELS = ['company', 'bud', 'project'];

async updateUserRoles(userId, roles, context) {
  // Validate scope levels
  roles.forEach(role => {
    if (role.scopes) {
      role.scopes.forEach(scope => {
        if (!VALID_SCOPE_LEVELS.includes(scope.level)) {
          throw new Error(
            `Invalid scope level: ${scope.level}. ` +
            `Allowed values: ${VALID_SCOPE_LEVELS.join(', ')}`
          );
        }
      });
    }
  });

  // ... rest of implementation
}
```

#### 1.3 Migrate Existing Data

```sql
-- Migration Script: database/migrations/manual/017_migrate_tenant_to_company_scope.sql

BEGIN;

-- 1. Update 'tenant' scope_level to 'company'
UPDATE user_scope_assignments
SET scope_level = 'company',
    scope_name = t.name
FROM tenants t
WHERE user_scope_assignments.scope_level = 'tenant'
  AND user_scope_assignments.scope_id = t.id;

-- 2. Verify migration
SELECT
    COUNT(*) as old_tenant_scopes
FROM user_scope_assignments
WHERE scope_level = 'tenant';
-- Should return 0

-- 3. Add constraint to prevent 'tenant' in future
ALTER TABLE user_scope_assignments
ADD CONSTRAINT check_scope_level
CHECK (scope_level IN ('company', 'bud', 'project'));

COMMIT;
```

---

### Phase 2: Frontend Changes (Medium Risk)

#### 2.1 Update adminService.js

```javascript
// ไฟล์: frontend/src/modules/shared/services/modules/adminService.js

getUsers: async () => {
  // ... existing code ...

  scopeAssignments.forEach(scope => {
    const scopeObj = {
      id: scope.scope_id,
      name: scope.scope_name,
      level: scope.scope_level
    };

    // ✅ รองรับ 'company' แทน 'tenant'
    if (scope.scope_level === 'company') {
      companyScopes.push(scopeObj);
    } else if (scope.scope_level === 'bud') {
      budScopes.push(scopeObj);
    } else if (scope.scope_level === 'project') {
      projectScopes.push(scopeObj);
    }
  });

  return {
    // ...
    assignedScopes: {
      company: companyScopes,  // ✅ เปลี่ยนจาก 'tenants'
      buds: budScopes,
      projects: projectScopes
    }
  };
}
```

#### 2.2 Update UserManagement.jsx

```javascript
// ไฟล์: frontend/src/modules/features/admin/pages/UserManagement.jsx

{/* Company Scope Badge */}
{user.assignedScopes?.company?.map(c => (
  <span key={`company-${c.id}`} className="...">
    🏢 {c.name}
  </span>
))}
```

#### 2.3 Update ScopeConfigPanel Component

```javascript
// ไฟล์: frontend/src/modules/shared/components/ScopeConfigPanel.jsx

const SCOPE_LEVELS = [
  { value: 'company', label: 'ทั้งบริษัท', icon: '🏢', color: 'purple' },
  { value: 'bud', label: 'ทั้งฝ่าย (BUD)', icon: '💼', color: 'cyan' },
  { value: 'project', label: 'เฉพาะโครงการ', icon: '🏗️', color: 'blue' }
];
```

---

### Phase 3: Testing & Rollback Plan

#### 3.1 Testing Checklist

- [ ] **Unit Tests**
  - [ ] `userService.updateUserRoles()` rejects 'tenant' scope
  - [ ] `userService.getUserWithRoles()` returns 'company' scopes correctly

- [ ] **Integration Tests**
  - [ ] User Management: Create user with company scope
  - [ ] User Management: Edit user and change from project → company scope
  - [ ] User Management: Display scopes correctly in table

- [ ] **E2E Tests**
  - [ ] Login as Admin → Assign company scope to user
  - [ ] Login as assigned user → Verify access to all projects
  - [ ] Login as BUD-scoped user → Verify access to BUD projects only

#### 3.2 Rollback Plan

```sql
-- Rollback Script: database/migrations/manual/017_rollback_company_to_tenant.sql

BEGIN;

-- 1. Revert 'company' back to 'tenant'
UPDATE user_scope_assignments
SET scope_level = 'tenant'
WHERE scope_level = 'company';

-- 2. Drop constraint
ALTER TABLE user_scope_assignments
DROP CONSTRAINT IF EXISTS check_scope_level;

COMMIT;
```

---

## ⚠️ Risk Assessment

### High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Existing users lose access** | 🔴 Critical | Backup database before migration |
| **Frontend breaks during deployment** | 🟡 High | Deploy backend first, then frontend |
| **Scope validation too strict** | 🟡 High | Add comprehensive error messages |

### Low Risk Areas

| Area | Reason |
|------|--------|
| Database migration | Simple UPDATE query, reversible |
| Prisma schema change | Only enum validation, no structure change |
| Backend validation | Early rejection prevents bad data |

---

## 📅 Execution Timeline

### Week 1: Preparation
- [x] Document current state
- [ ] Review with team
- [ ] Create comprehensive test data
- [ ] Setup staging environment

### Week 2: Implementation
- [ ] **Day 1-2:** Backend changes + migration script
- [ ] **Day 3:** Test migration on staging
- [ ] **Day 4-5:** Frontend changes
- [ ] **Day 6:** Integration testing

### Week 3: Deployment
- [ ] **Day 1:** Deploy to UAT
- [ ] **Day 2-3:** UAT testing by users
- [ ] **Day 4:** Fix issues found in UAT
- [ ] **Day 5:** Production deployment (low-traffic time)

---

## ✅ Success Criteria

1. ✅ No 'tenant' scope_level exists in database
2. ✅ All existing users maintain their access levels
3. ✅ User Management UI displays scopes correctly
4. ✅ New scope assignments use 'company', 'bud', or 'project'
5. ✅ Performance impact < 5% (scope queries remain fast)

---

## 🤝 Approval Required

**ผู้ทบทวน:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] Database Administrator

**Approved By:** ___________________
**Date:** ___________________

---

## 📝 Notes

### Why NOT use 'tenant' as scope?

1. **Redundancy:** User already has `tenant_id` in users table
2. **Confusion:** Mixing data isolation (tenant_id) with permissions (scopes)
3. **Complexity:** Need to check 2 places for same information

### Why USE 'company' instead?

1. **Clear intent:** "company scope" = access to all company resources
2. **Semantic clarity:** Matches user mental model
3. **Future-proof:** Can add multi-company users in future if needed

---

**Last Updated:** 2026-02-04
**Version:** 1.0
