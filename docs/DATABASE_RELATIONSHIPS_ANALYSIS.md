# 🗄️ Database Relationships Analysis

**วันที่:** 2026-02-04
**จุดประสงค์:** วิเคราะห์ความสัมพันธ์ของ Database และหาจุดที่ต้องปรับปรุง

---

## 📊 Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        TENANT                               │
│                    (Data Isolation)                         │
└───┬──────────────────┬──────────────────┬─────────────────┘
    │                  │                  │
    │                  │                  │
┌───▼────┐      ┌─────▼─────┐      ┌────▼────┐
│ USERS  │      │   BUDS    │      │  ROLES  │
│        │      │           │      │         │
└───┬────┘      └─────┬─────┘      └────┬────┘
    │                 │                  │
    │           ┌─────▼──────┐           │
    │           │ DEPARTMENTS│           │
    │           └─────┬──────┘           │
    │                 │                  │
    │           ┌─────▼─────┐            │
    │           │ PROJECTS  │            │
    │           └─────┬─────┘            │
    │                 │                  │
    ├─────────────────┴──────────────────┤
    │                                    │
┌───▼────────────────────────────────────▼───┐
│       USER_SCOPE_ASSIGNMENTS               │
│   (Permission Control - ต้องปรับปรุง)      │
└────────────────────────────────────────────┘
```

---

## 🔍 ตารางหลักและความสัมพันธ์

### 1. Core Organization Structure

#### 1.1 Tenants (บริษัท/องค์กร)
```sql
tenants
├── id (PK)
├── name          -- ชื่อบริษัท
├── code          -- รหัสบริษัท (UNIQUE)
├── subdomain     -- subdomain สำหรับ multi-tenant URL
└── is_active     -- สถานะใช้งาน

✅ Relationships (CORRECT):
└─> users            (1:N) -- บริษัท 1 มีพนักงานหลายคน
└─> buds             (1:N) -- บริษัท 1 มีหลายฝ่าย
└─> projects         (1:N) -- บริษัท 1 มีหลายโครงการ
└─> roles            (1:N) -- บริษัท 1 มีหลายบทบาท
└─> jobs             (1:N) -- บริษัท 1 มีหลายงาน
```

**📝 สรุป:** Tenant ใช้สำหรับ **Data Isolation** (แยกข้อมูลระหว่างบริษัท) ถูกต้องแล้ว

---

#### 1.2 BUDs (ฝ่าย/สายงาน)
```sql
buds
├── id (PK)
├── tenant_id (FK) --> tenants.id
├── name           -- ชื่อฝ่าย เช่น "BUD 1 - สายงานขาย"
├── code           -- รหัสฝ่าย เช่น "BUD1"
└── is_active

✅ Relationships:
└─> tenant          (N:1) -- ฝ่ายอยู่ในบริษัท 1 บริษัท
└─> departments     (1:N) -- ฝ่าย 1 มีหลายแผนก
└─> projects        (1:N) -- ฝ่าย 1 มีหลายโครงการ
```

---

#### 1.3 Departments (แผนก)
```sql
departments
├── id (PK)
├── tenant_id (FK) --> tenants.id
├── bud_id (FK)    --> buds.id         -- แผนกอยู่ในฝ่ายไหน
├── manager_id (FK) --> users.id       -- ผู้จัดการแผนก
├── name
└── code

✅ Relationships:
└─> tenant          (N:1) -- แผนกอยู่ในบริษัท 1 บริษัท
└─> bud             (N:1) -- แผนกอยู่ในฝ่าย 1 ฝ่าย
└─> manager         (N:1) -- แผนกมีผู้จัดการ 1 คน
└─> users           (1:N) -- แผนก 1 มีพนักงานหลายคน
└─> projects        (1:N) -- แผนก 1 มีหลายโครงการ
```

**⚠️ Issue:** Department → BUD relationship ควรเป็น **OPTIONAL** เพราะบางบริษัทอาจไม่มี BUD structure

---

#### 1.4 Projects (โครงการ)
```sql
projects
├── id (PK)
├── tenant_id (FK)     --> tenants.id
├── bud_id (FK)        --> buds.id
├── department_id (FK) --> departments.id  -- ⚠️ OPTIONAL
├── name
├── code
└── is_active

✅ Relationships:
└─> tenant          (N:1) -- โครงการอยู่ในบริษัท 1 บริษัท
└─> bud             (N:1) -- โครงการอยู่ในฝ่าย 1 ฝ่าย
└─> department      (N:1, OPTIONAL) -- โครงการอาจมีแผนกรับผิดชอบ
└─> jobs            (1:N) -- โครงการ 1 มีหลายงาน
```

**✅ Good:** `department_id` เป็น OPTIONAL (nullable) ถูกต้องแล้ว

---

### 2. User & Permission Structure

#### 2.1 Users (ผู้ใช้งาน)
```sql
users
├── id (PK)
├── tenant_id (FK)     --> tenants.id        -- ✅ พนักงานอยู่บริษัทไหน
├── department_id (FK) --> departments.id    -- ✅ พนักงานอยู่แผนกไหน
├── email              -- UNIQUE per tenant
├── password_hash
├── first_name
├── last_name
├── display_name
└── is_active

✅ Relationships:
└─> tenant          (N:1) -- พนักงานอยู่ในบริษัท 1 บริษัท
└─> department      (N:1, OPTIONAL) -- พนักงานอาจมีแผนก
└─> userRoles       (1:N) -- พนักงาน 1 คนมีหลายบทบาท
└─> scopeAssignments (1:N) -- ⚠️ ต้องปรับปรุง
└─> managedDepartments (1:N) -- พนักงาน 1 คนอาจเป็นหัวหน้าหลายแผนก
```

**📝 Key Insight:**
- `tenant_id` = "พนักงานอยู่บริษัทไหน" → **Company Membership**
- `department_id` = "พนักงานสังกัดแผนกไหน" → **Organizational Structure**
- `scopeAssignments` = "พนักงานทำงานในโครงการไหนได้บ้าง" → **Work Authorization**

---

#### 2.2 User Roles (บทบาทของผู้ใช้)
```sql
user_roles
├── id (PK)
├── tenant_id (FK)  --> tenants.id
├── user_id (FK)    --> users.id
├── role_name       -- 'admin', 'approver', 'assignee', 'requester'
├── assigned_by
└── is_active

✅ Relationships:
└─> tenant (N:1)
└─> user   (N:1)

Examples:
- User #1 → Role: 'admin'
- User #2 → Roles: ['approver', 'requester']  -- Multi-role support
```

**✅ Good:** Multi-role system ใช้งานได้ดี

---

#### 2.3 User Scope Assignments (ขอบเขตสิทธิ์) ⚠️

```sql
user_scope_assignments
├── id (PK)
├── tenant_id (FK)  --> tenants.id
├── user_id (FK)    --> users.id
├── role_type       -- 'admin', 'approver', 'assignee', 'requester'
├── scope_level     -- ⚠️ 'tenant', 'bud', 'project'
├── scope_id        -- ID ของ tenant/bud/project
├── scope_name
├── assigned_by
└── is_active

⚠️ Current Issues:
1. scope_level = 'tenant' → ซ้ำซ้อนกับ users.tenant_id
2. scope_id สำหรับ 'tenant' → เก็บ tenant_id ซ้ำอีกครั้ง
3. Frontend ไม่รู้จะแสดง 'tenant' scope อย่างไร (ไม่มี UI)
```

**🔧 Proposed Fix:**

```sql
-- เปลี่ยนจาก:
scope_level IN ('tenant', 'bud', 'project')

-- เป็น:
scope_level IN ('company', 'bud', 'project')

-- ตัวอย่าง:
-- Admin (Company-wide access)
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (1, 'admin', 'company', 1, 'Sena Development');

-- BUD Manager (BUD-wide access)
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (2, 'approver', 'bud', 5, 'BUD 1 - สายงานขาย');

-- Project Member
INSERT INTO user_scope_assignments (user_id, role_type, scope_level, scope_id, scope_name)
VALUES (3, 'requester', 'project', 10, 'The Origin Tower');
```

---

## 🔍 Foreign Key Analysis

### Critical Foreign Keys (ห้ามลบ)

| Table | Column | References | Cascade | Purpose |
|-------|--------|------------|---------|---------|
| `users` | `tenant_id` | `tenants.id` | CASCADE | Data isolation |
| `buds` | `tenant_id` | `tenants.id` | CASCADE | Data isolation |
| `projects` | `tenant_id` | `tenants.id` | CASCADE | Data isolation |
| `projects` | `bud_id` | `buds.id` | RESTRICT | Prevent orphan projects |
| `user_roles` | `user_id` | `users.id` | CASCADE | Auto cleanup |
| `user_scope_assignments` | `user_id` | `users.id` | CASCADE | Auto cleanup |

### Optional Foreign Keys (ควรเป็น nullable)

| Table | Column | References | Reason |
|-------|--------|------------|---------|
| `users` | `department_id` | `departments.id` | ไม่ใช่ทุกคนต้องมีแผนก |
| `projects` | `department_id` | `departments.id` | บางโครงการไม่สังกัดแผนก |
| `departments` | `manager_id` | `users.id` | บางแผนกอาจยังไม่มีหัวหน้า |
| `departments` | `bud_id` | `buds.id` | ⚠️ ควร nullable (บางบริษัทไม่มี BUD) |

**⚠️ Issue Found:**
```sql
-- ปัจจุบัน: departments.bud_id is NOT NULL
-- ควรเป็น: departments.bud_id NULL (OPTIONAL)

ALTER TABLE departments
ALTER COLUMN bud_id DROP NOT NULL;
```

---

## 📈 Data Flow Analysis

### Scenario 1: Admin จัดการ User Scope

```
1. Admin Login → tenant_id = 1
2. Admin เลือก User → user_id = 123
3. Admin กำหนดขอบเขต:
   └─> Option A: Company-wide (ทั้งบริษัท)
       └─> INSERT scope_level = 'company', scope_id = 1
   └─> Option B: BUD-wide (ทั้งฝ่าย)
       └─> INSERT scope_level = 'bud', scope_id = 5
   └─> Option C: Project-specific
       └─> INSERT scope_level = 'project', scope_id = [10, 11, 12]
```

### Scenario 2: User Login & Access Check

```
1. User Login → Load user.tenant_id = 1
2. Load Roles → user_roles WHERE user_id = 123
3. Load Scopes → user_scope_assignments WHERE user_id = 123
4. Determine Access:
   IF scope_level = 'company'
      → Access ALL projects in tenant_id = 1
   ELSE IF scope_level = 'bud'
      → Access ALL projects WHERE bud_id = scope_id
   ELSE IF scope_level = 'project'
      → Access ONLY projects WHERE project_id IN (scope_ids)
```

**✅ Clear and Logical**

---

## 🎯 Recommendations

### 1. เร่งด่วน (High Priority)

#### ✅ Fix 1: เปลี่ยน 'tenant' → 'company'
```sql
-- Migration: 017_migrate_tenant_to_company_scope.sql
UPDATE user_scope_assignments
SET scope_level = 'company'
WHERE scope_level = 'tenant';

ALTER TABLE user_scope_assignments
ADD CONSTRAINT check_scope_level
CHECK (scope_level IN ('company', 'bud', 'project'));
```

#### ✅ Fix 2: ทำให้ departments.bud_id เป็น OPTIONAL
```sql
-- Migration: 018_make_department_bud_optional.sql
ALTER TABLE departments
ALTER COLUMN bud_id DROP NOT NULL;
```

### 2. ปานกลาง (Medium Priority)

#### ⚠️ Consider: เพิ่ม Composite Index
```sql
-- เพิ่ม performance สำหรับ scope queries
CREATE INDEX idx_user_scopes_lookup
ON user_scope_assignments (user_id, tenant_id, scope_level, is_active);

-- เพิ่ม performance สำหรับ project filtering
CREATE INDEX idx_projects_multi_lookup
ON projects (tenant_id, bud_id, is_active);
```

### 3. ระยะยาว (Low Priority)

#### 💡 Idea: เพิ่ม scope caching
```sql
-- Table: user_scope_cache (for performance)
CREATE TABLE user_scope_cache (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  accessible_project_ids INTEGER[],  -- Array of project IDs
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger: Auto-update cache when scopes change
CREATE OR REPLACE FUNCTION refresh_scope_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate cache when scope changes
  DELETE FROM user_scope_cache WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_scope_cache
AFTER INSERT OR UPDATE OR DELETE ON user_scope_assignments
FOR EACH ROW EXECUTE FUNCTION refresh_scope_cache();
```

---

## ✅ Health Check Queries

### Check 1: หา Orphan Records
```sql
-- Users without tenant
SELECT id, email FROM users WHERE tenant_id NOT IN (SELECT id FROM tenants);
-- Expected: 0 rows

-- Projects without BUD
SELECT id, name FROM projects WHERE bud_id NOT IN (SELECT id FROM buds);
-- Expected: 0 rows

-- Scopes with invalid level
SELECT id, user_id, scope_level FROM user_scope_assignments
WHERE scope_level NOT IN ('tenant', 'bud', 'project');
-- Expected: 0 rows
```

### Check 2: หา Duplicate Scopes
```sql
-- Users with duplicate tenant scopes
SELECT user_id, COUNT(*) as count
FROM user_scope_assignments
WHERE scope_level = 'tenant'
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (shouldn't have duplicate company scopes)
```

### Check 3: Verify Scope Coverage
```sql
-- Users without ANY scopes (potential issue)
SELECT u.id, u.email, COUNT(usa.id) as scope_count
FROM users u
LEFT JOIN user_scope_assignments usa ON u.id = usa.user_id AND usa.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.email
HAVING COUNT(usa.id) = 0;
-- If returns rows → Users ต้องได้รับการกำหนด scope
```

---

## 📊 Current Data Statistics (ต้องเช็ค Production)

```sql
-- Run this on production to see current state
SELECT
  'Total Users' as metric,
  COUNT(*) as count
FROM users
WHERE is_active = true

UNION ALL

SELECT
  'Users with Scopes',
  COUNT(DISTINCT user_id)
FROM user_scope_assignments
WHERE is_active = true

UNION ALL

SELECT
  'Tenant Scopes',
  COUNT(*)
FROM user_scope_assignments
WHERE scope_level = 'tenant' AND is_active = true

UNION ALL

SELECT
  'BUD Scopes',
  COUNT(*)
FROM user_scope_assignments
WHERE scope_level = 'bud' AND is_active = true

UNION ALL

SELECT
  'Project Scopes',
  COUNT(*)
FROM user_scope_assignments
WHERE scope_level = 'project' AND is_active = true;
```

---

## 🎯 สรุปและข้อเสนอแนะ

### ✅ ส่วนที่ดีอยู่แล้ว
1. Multi-tenant structure ออกแบบดี (Data Isolation ชัดเจน)
2. Cascade Delete ตั้งไว้ถูกต้อง
3. Multi-role system ใช้งานได้ดี

### ⚠️ ส่วนที่ต้องปรับปรุง
1. **Scope Level ซ้ำซ้อน:** 'tenant' ควรเปลี่ยนเป็น 'company'
2. **departments.bud_id ควร nullable:** รองรับบริษัทที่ไม่มี BUD structure
3. **ขาด Index:** ควรเพิ่ม composite index สำหรับ scope queries

### 🚀 ขั้นตอนถัดไป
1. ✅ Review เอกสาร TENANT_SCOPE_REFACTORING_PLAN.md
2. ⏳ Run health check queries on production
3. ⏳ Approve migration plan
4. ⏳ Execute migration on staging
5. ⏳ Test thoroughly
6. ⏳ Deploy to production

---

**Last Updated:** 2026-02-04
**Reviewed By:** _________________
**Status:** Draft - Pending Review
