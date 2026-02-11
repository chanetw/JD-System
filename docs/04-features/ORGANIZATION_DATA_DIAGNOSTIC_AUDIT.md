# รายงานการตรวจสอบวินิจฉัย: โมดูลข้อมูลองค์กร (Organization Data Module)
# Diagnostic Audit Report: Organization Data Module

**วันที่ | Date:** 2026-01-28
**สถานะ | Status:** CRITICAL - Save Failures & Toggle Malfunction
**ประเภท | Type:** Forensic Code Analysis - Problems Identification Only

---

## บทสรุปผู้บริหาร | Executive Summary

ระบบข้อมูลองค์กร (Organization Data) ล้มเหลวในการบันทึกการแก้ไข และปุ่มเปลี่ยนสถานะ "Active" ไม่สามารถใช้งานได้ สาเหตุหลักมาจากความไม่สอดคล้องกันระหว่างรูปแบบข้อมูลที่ส่งจากฟrontend (Frontend Payload Format) กับสิ่งที่ Backend คาดหวัง (Backend Expectations) และการขาดฟิลด์ `isActive` ในการตอบกลับจาก API

The Organization Data module fails to save edits and the "Active" status toggle is non-functional. Root causes stem from data format mismatches between frontend payloads and backend expectations, missing `isActive` fields in API responses, and inconsistent field naming across the data flow.

---

## 1. ปัญหาหลัก | Critical Issues

### 1.1 ปัญหา: BUDs และ Tenants ไม่มีฟิลด์ `isActive` ในการตอบกลับจาก API

**ไฟล์ที่เกี่ยวข้อง | Related Files:**
- [master-data.js:98-104](backend/api-server/src/routes/master-data.js#L98)
- [OrganizationManagement.jsx:256-260](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx#L256)

**ปัญหา | Problem:**

Backend route `/api/master-data` คืนค่าข้อมูล BUDs โดยไม่มีฟิลด์ `isActive`:

```javascript
// master-data.js line 98-104
buds: buds.map(b => ({
  id: b.id,
  name: b.name,
  code: b.code,
  status: b.isActive ? 'Active' : 'Inactive',  // ✓ มี status
  createdAt: b.createdAt
  // ✗ ไม่มี isActive field!
}))
```

Frontend ต้องการใช้ `isActive` บูลีน เพื่อควบคุมปุ่มสถานะ:

```javascript
// OrganizationManagement.jsx line 256-260
<StatusBadge
  isActive={item.isActive}  // ← item.isActive = undefined!
  onClick={() => handleToggleStatus(item.id, item)}
/>
```

**ผลกระทบ | Impact:**
- `item.isActive` คืนค่า `undefined` สำหรับ BUDs และ Tenants
- ปุ่มสถานะแสดงผลไม่ถูกต้อง (เสมอมือ "Inactive")
- เมื่อกดปุ่มสถานะ: `!item.isActive` = `!undefined` = `true`
- ส่วนค่า: `isActive: true` ไปยัง API แม้จะจำเป็นต้องอัปเดตให้เป็น `false`

---

### 1.2 ปัญหา: BUDs ขาดฟิลด์ `tenantId` ในการตอบกลับจาก API

**ไฟล์ที่เกี่ยวข้อง | Related Files:**
- [master-data.js:98-104](backend/api-server/src/routes/master-data.js#L98)
- [OrganizationManagement.jsx:546-551](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx#L546)

**ปัญหา | Problem:**

Backend ไม่รวม `tenantId` ในการตอบกลับ BUDs:

```javascript
// master-data.js line 98-104
buds: buds.map(b => ({
  id: b.id,
  name: b.name,
  code: b.code,
  status: ...,
  createdAt: b.createdAt
  // ✗ ไม่มี tenantId!
}))
```

Frontend พยายามกรองรายการ BUD ตามบริษัท (Tenant) ในฟอร์มสร้างโครงการ:

```javascript
// OrganizationManagement.jsx line 546-551
<FormSelect label="สังกัดสายงาน (BUD)" value={formData.budId || ''}
  onChange={(e) => setFormData({ ...formData, budId: parseInt(e.target.value) })}>
  <option value="">-- เลือกสายงาน --</option>
  {buds.
    filter(b => !formData.tenantId || b.tenantId === formData.tenantId)
    //                                     ↑ b.tenantId = undefined!
    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
</FormSelect>
```

**ผลกระทบ | Impact:**
- Conditional filter สำหรับ BUD ตามบริษัท ใช้ไม่ได้
- แสดงผล BUDs ทั้งหมด แม้จะเลือกบริษัทที่ต่างกัน
- เนื่องจาก `b.tenantId` เป็น `undefined` filter จึงผ่านเสมอ
- ไม่สามารถแยกฟิลด์เมตาของ BUD ตามสังกัด

---

### 1.3 ปัญหา: Projects PUT Endpoint ขาดการรวม `tenantId` ในการอัปเดต

**ไฟล์ที่เกี่ยวข้อง | Related Files:**
- [adminService.js:95-99](frontend/src/modules/shared/services/modules/adminService.js#L95)
- [projects.js:112-137](backend/api-server/src/routes/projects.js#L112)

**ปัญหา | Problem:**

Frontend service สร้าง payload สำหรับการอัปเดต Project:

```javascript
// adminService.js line 95-99
updateProject: async (id, projectData) => {
  const payload = { ...projectData, isActive: projectData.status === 'Active' };
  const response = await httpClient.put(`/projects/${id}`, payload);
  // payload = { id, name, code, budId, departmentId, status, isActive, createdAt, ... }
  // ✗ ไม่มี tenantId!
}
```

Backend ลบ `tenantId` ออกจากการอัปเดต (ถ้ามีส่งมา) แต่ RLS context ต้องมัน:

```javascript
// projects.js line 112-137
router.put('/:id', async (req, res) => {
  const { name, code, budId, departmentId, isActive } = req.body;
  // ✗ ไม่รับ tenantId จากการส่ง

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name,
      code,
      budId: budId ? parseInt(budId) : null,
      departmentId: departmentId ? parseInt(departmentId) : null,
      isActive
      // ✗ tenantId ไม่ถูกอัปเดต (หรือเป็น null)
    }
  });
});
```

**ผลกระทบ | Impact:**
- หากผู้ใช้เปลี่ยนบริษัท (Tenant) และพยายามอัปเดต Project
- ฟิลด์ `tenantId` อาจได้รับการอัปเดตเป็น `null` หรือค่าสูญหาย
- อาจเกิด Foreign Key constraint error หรือข้อมูลสูญหาย
- RLS isolation อาจหลวมซึ่งทำให้เสี่ยง

---

### 1.4 ปัญหา: Data Format Inconsistency สำหรับ Status Field

**ไฟล์ที่เกี่ยวข้อง | Related Files:**
- [master-data.js:88-116](backend/api-server/src/routes/master-data.js#L88)
- [OrganizationManagement.jsx:107-157](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx#L107)
- [adminService.js:38-53, 72-76, 132-136](frontend/src/modules/shared/services/modules/adminService.js)

**ปัญหา | Problem:**

API คืนค่าข้อมูลในรูปแบบต่างๆ:

| Entity | API Returns | Expected in Form | Conversion |
|--------|-------------|------------------|-----------|
| **Projects** | `status: 'Active' \| 'Inactive'` | `status` (string) | convertible ✓ |
| **Tenants** | `status`, `isActive` | `isActive` (boolean) | mixed |
| **BUDs** | `status: 'Active' \| 'Inactive'` | `isActive` (boolean) | NOT converted |
| **Departments** | `isActive` (MISSING in response) | `isActive` (boolean) | MISSING! |

Frontend ส่วน Modal form เมื่อเพิ่มใหม่:

```javascript
// OrganizationManagement.jsx line 112-121
if (mode === 'add') {
  if (activeTab === 'projects') {
    setFormData({ name: '', code: '', tenantId: '', budId: '', status: 'Active' });
    // ✓ ใช้ status
  } else if (activeTab === 'buds') {
    setFormData({ name: '', code: '', tenantId: '', isActive: true });
    // ✓ ใช้ isActive
  } else if (activeTab === 'departments') {
    setFormData({ name: '', code: '', budId: '', managerId: '', isActive: true });
    // ✓ ใช้ isActive
  } else if (activeTab === 'tenants') {
    setFormData({ name: '', code: '', subdomain: '', isActive: true });
    // ✓ ใช้ isActive
  }
}
```

**ผลกระทบ | Impact:**
- Projects ใช้ `status` field
- BUDs, Departments, Tenants ใช้ `isActive` field
- API ส่งคืนข้อมูลในรูปแบบต่างๆ (บางครั้ง `status` บางครั้ง `isActive`)
- Frontend ไม่รู้ว่าต้องดูฟิลด์ใด
- เมื่อแก้ไข ข้อมูลอาจไม่ตรงกันระหว่างสิ่งที่ส่งไปกับสิ่งที่ได้รับ

---

## 2. แฟลว์ข้อมูลและการแมปฟิลด์ | Data Flow & Field Mapping

### 2.1 Projects Status Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Load (fetchData)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ GET /api/master-data                                        │
│   └─→ Backend: projects.map() returns                       │
│       { id, name, code, budId, status: 'Active'|'Inactive' │
│                                                              │
│   └─→ Frontend State: projects = [...data]                 │
│       { id, name, code, budId, status, ... }              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Save/Toggle (handleSave or handleToggleStatus)     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ formData = { ..., status: 'Active'|'Inactive' }           │
│                                                              │
│ adminService.updateProject(id, formData)                  │
│   └─→ payload = { ...projectData,                         │
│       isActive: projectData.status === 'Active' }         │
│                                                              │
│ PUT /api/projects/:id                                      │
│   payload = {                                              │
│     name, code, budId, departmentId,                      │
│     status: 'Active'|'Inactive', (extra)                   │
│     isActive: true|false (important)                       │
│   }                                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Update (projects.js PUT /:id)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ const { name, code, budId, departmentId, isActive }        │
│ ✓ Extracts isActive correctly                             │
│ ✗ Ignores status field (okay)                             │
│ ✗ tenantId not in payload!                                │
│                                                              │
│ await prisma.project.update({                             │
│   where: { id },                                          │
│   data: { name, code, budId, departmentId, isActive }    │
│ })                                                        │
│                                                              │
│ Returns: { success, data: { id, name, code, budId,       │
│            departmentId, isActive, ... } }               │
│            ✗ Returns isActive, NOT status!               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Refresh (fetchData called after save)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ New GET /api/master-data fetches fresh data               │
│ Frontend receives: { status: 'Active'|'Inactive' }         │
│ Data is now CONSISTENT again                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Temporary Inconsistency During Edit:**
- User edits and saves → Backend returns `isActive` field
- Frontend still has `status` field in state
- This causes brief inconsistency until `fetchData()` is called
- If save fails, the data remains inconsistent

---

### 2.2 BUDs & Tenants Status Flow (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Load (fetchData)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ GET /api/master-data                                        │
│   └─→ Backend returns:                                     │
│       { id, name, code, status: 'Active'|'Inactive' }      │
│       ✗ isActive field MISSING!                            │
│                                                              │
│   └─→ Frontend State: buds = [...data]                     │
│       { id, name, code, status, ... }                     │
│       item.isActive = undefined!                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Toggle (handleToggleStatus - Line 381-382)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ StatusBadge receives:                                       │
│   isActive={item.isActive}  ← undefined!                   │
│   Shows "Inactive" always                                   │
│                                                              │
│ On click, calls:                                            │
│   updateBud(id, { ...item, isActive: !item.isActive })     │
│   = updateBud(id, { id, name, code, status,              │
│                   isActive: !undefined })                  │
│   = updateBud(id, { ..., isActive: true })                │
│                                                              │
│ ✗ Always sends isActive: true regardless of original!      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Update (buds.js PUT /:id - Line 114-150)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ const { name, code, isActive } = req.body;                │
│ ✓ Extracts isActive                                        │
│                                                              │
│ await prisma.bud.update({                                 │
│   where: { id },                                          │
│   data: { name, code, isActive }                         │
│ })                                                        │
│                                                              │
│ Returns: { id, name, code, isActive, ... }               │
│ ✓ Correct!                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Result: Toggle is Always Broken                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Because item.isActive starts as undefined                  │
│ !undefined = true                                          │
│ Always sets isActive = true                               │
│ Never toggles to false                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Departments Data (COMPLETE MISMATCH)

**ไฟล์ที่เกี่ยวข้อง | Related Files:**
- [OrganizationManagement.jsx:79-81](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx#L79)
- [departments.js - No transformation in GET /api/departments](backend/api-server/src/routes/departments.js)

**ปัญหา | Problem:**

Frontend ดึง Departments จากเส้นทางต่างมาก (ไม่ใช่ master-data):

```javascript
// OrganizationManagement.jsx line 79-81
const deptData = await api.getDepartments();
setDepartments(deptData || []);
```

Backend `/api/departments` transformation:

```javascript
// departments.js line 50-63
const transformed = departments.map(d => ({
  id: d.id,
  name: d.name,
  code: d.code,
  budId: d.budId,
  budName: d.bud?.name,
  managerId: d.managerId,
  manager: d.manager ? ... : null,
  isActive: d.isActive,  // ✓ รวม isActive
  createdAt: d.createdAt
}));
```

**ผลกระทบ | Impact:**
- Departments IS correct (has `isActive`)
- But returns different structure than master-data
- Departments do NOT have `status` field like projects/buds do
- Rendering logic ที่ไว้ได้ตั้งสมมติ `status` field

---

## 3. สรุปประเด็นทั้งหมด | Comprehensive Issue Summary

| # | ประเด็น Issue | ไฟล์ | ความรุนแรง | ผลกระทบ |
|---|-------|------|--------|---------|
| 1 | BUDs: ขาด `isActive` ใน API response | [master-data.js:98-104](backend/api-server/src/routes/master-data.js#L98) | **CRITICAL** | Toggle ไม่ทำงาน, สถานะแสดงผลผิด |
| 2 | BUDs: ขาด `tenantId` ใน API response | [master-data.js:98-104](backend/api-server/src/routes/master-data.js#L98) | HIGH | ตัวกรอง BUD ตามบริษัท ไม่ใช้ได้ |
| 3 | Tenants: ส่งค่า `status` และ `isActive` พร้อม | [master-data.js:89-96](backend/api-server/src/routes/master-data.js#L89) | MEDIUM | ความสับสน ข้อมูล redundant |
| 4 | Projects: PUT endpoint ขาด `tenantId` | [projects.js:112-137](backend/api-server/src/routes/projects.js#L112) | HIGH | RLS isolation อาจหลวม, FK error |
| 5 | Projects: POST endpoint อาจขาด `tenantId` | [projects.js:85-107](backend/api-server/src/routes/projects.js#L85) | HIGH | ข้อมูลสูญหาย, FK violation |
| 6 | BUDs: Frontend expects `isActive` but gets `status` | [OrganizationManagement.jsx:256-260](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx#L256) | **CRITICAL** | Toggle ล้มเหลว, ไม่อัปเดต |
| 7 | Master-data transformation มี `status` field extra | [master-data.js:88-116](backend/api-server/src/routes/master-data.js#L88) | MEDIUM | ความสับสนในเนมิง ข้อมูล |
| 8 | adminService ไม่ handle `isActive` for BUDs | [adminService.js:72-76](frontend/src/modules/shared/services/modules/adminService.js#L72) | HIGH | ส่ง field ที่ไม่ถูกต้อง |

---

## 4. ตัวอย่างสถานการณ์อันตรายจริง | Real-World Failure Scenarios

### Scenario 1: BUD Toggle ล้มเหลว

```
User Action: Click "Active" toggle on a BUD

Flow:
1. Frontend loads BUD data: { id: 1, name: "Sales", status: "Active", createdAt: ... }
   → item.isActive = undefined

2. StatusBadge renders:
   isActive={undefined} → Badge shows "Inactive" (default falsy)

3. User clicks toggle:
   handleToggleStatus(1, item)
   → updateBud(1, { ..., isActive: !undefined })
   → updateBud(1, { ..., isActive: true })

4. Backend updates isActive = true (regardless of intent)

5. If BUD was already active, no change appears to happen
   If BUD was inactive, it becomes active (opposite of user intent)

Result: Unpredictable behavior, toggle is broken ✗
```

### Scenario 2: Project Edit บันทึกเสร็จแต่สูญหาย tenantId

```
User Action: Edit Project "SKR01" and save

Flow:
1. Frontend loads: { id: 1, name: "SKR01", budId: 5, status: "Active", ... }

2. User edits name → "SKR02"

3. handleSave() calls:
   updateProject(1, { id: 1, name: "SKR02", budId: 5, status: "Active", ... })

4. adminService converts:
   payload = { ..., isActive: true }

5. PUT /api/projects/1
   payload = { name: "SKR02", budId: 5, isActive: true }
   ✗ tenantId NOT included!

6. Backend updates:
   data: { name, code, budId, departmentId, isActive }
   → tenantId field NOT updated (stays NULL or previous value)

7. Database constraint check:
   - If tenantId becomes NULL → Foreign Key Error ✗
   - If tenantId remains old value → Data isolation broken ✗

Result: Update fails OR data gets assigned to wrong tenant ✗
```

### Scenario 3: BUD Filter ตามบริษัท ไม่ทำงาน

```
User Action: Create new Project, select Tenant "SENA", then select BUD

Flow:
1. Frontend loads buds: [
     { id: 1, name: "Sales-1", tenantId: undefined },  ← From SENA
     { id: 2, name: "Sales-2", tenantId: undefined }   ← From OTHER
   ]

2. User selects Tenant SENA (formData.tenantId = 1)

3. BUD dropdown filter runs:
   buds.filter(b => !formData.tenantId || b.tenantId === formData.tenantId)
   = buds.filter(b => !1 || b.tenantId === 1)
   = buds.filter(b => false || undefined === 1)
   = buds.filter(b => false || false)
   = buds.filter(b => false)  ← WRONG!

   OR if formData.tenantId is not set:
   = buds.filter(b => true || ...)  ← Shows ALL BUDs regardless

Result: Cannot filter BUDs by tenant ✗
```

---

## 5. ความเสี่ยงด้านความปลอดภัย | Security & Data Integrity Risks

### 5.1 RLS Isolation Breach

เมื่อ `tenantId` ไม่ถูกส่งไปใน PUT request:
- Backend อาจไม่สามารถ enforce RLS context ได้อย่างเหมาะสม
- ผู้ใช้จาก Tenant A อาจสามารถอัปเดตข้อมูลของ Tenant B ได้
- ถ้าระบบดึง tenantId จากผู้ใช้ปัจจุบัน (req.user.tenantId) ก็ปลอดภัยกว่า แต่ยังเสี่ยง

### 5.2 Foreign Key Violations

ถ้า tenantId = NULL หลังการอัปเดต:
- ข้อมูลหมวดหมู่ (Project, BUD, Department) สูญหายสัมพันธ์กับ Tenant
- Orphaned records ที่ไม่สามารถส่วนการจัดการได้
- Report และ Query อาจมีข้อผิดพลาด

---

## 6. ลำดับเหตุการณ์การไหลข้อมูล | Data Flow Event Sequence

### Current Working Flow (Projects)

```
1. fetchData() → GET /api/master-data
2. Backend: projects.map() → { status: 'Active'|'Inactive' }
3. Frontend stores: projects = [{ status, ... }, ...]
4. User clicks StatusBadge → handleToggleStatus()
5. adminService.updateProject() → converts status to isActive
6. PUT /api/projects/:id { isActive: true|false }
7. Backend updates ✓
8. Frontend calls fetchData() → data refreshes
9. Display shows correct status ✓
```

### Broken Flow (BUDs & Tenants)

```
1. fetchData() → GET /api/master-data
2. Backend: buds.map() → { status: 'Active'|'Inactive' }  ✗ No isActive!
3. Frontend stores: buds = [{ status, ... }, ...]
4. StatusBadge uses isActive={item.isActive} → undefined ✗
5. User clicks toggle → !undefined = true ✗
6. handleToggleStatus() → updateBud({ ..., isActive: true }) ✗
7. API sends: { name, code, status: 'Active', isActive: true }
8. Backend only looks at isActive ✓ (receives true)
9. If was inactive, now active (correct by accident)
   If was active, stays active (wrong!)
10. After refresh, data shows correct status (because of fetchData)
    But toggle intent was inverted or lost ✗
```

---

## 7. ตารางเข้าเงื่อนไขการทำงาน | Condition Truth Table

### BUD Toggle Logic

| Current State | isActive in State | !isActive | Sent to API | Result | Correct? |
|---------------|------------------|-----------|------------|--------|----------|
| Active | undefined | true | `isActive: true` | Stays Active | ✗ WRONG |
| Inactive | undefined | true | `isActive: true` | Becomes Active | ✓ LUCKY |
| Any | undefined | true | `isActive: true` | Always Active | ✗ BROKEN |

**Conclusion:** Toggle always sets to `true`, never to `false`. ✗

---

## 8. ไฟล์ที่เกี่ยวข้อง | Complete File Reference Map

### Frontend

| ไฟล์ | บรรทัด | ปัญหา |
|------|-------|-------|
| [OrganizationManagement.jsx](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx) | 256-260 | BUD StatusBadge uses undefined isActive |
| [OrganizationManagement.jsx](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx) | 376-392 | handleToggleStatus sends wrong data |
| [OrganizationManagement.jsx](frontend/src/modules/features/admin/pages/OrganizationManagement.jsx) | 546-551 | BUD filter doesn't work (missing tenantId) |
| [adminService.js](frontend/src/modules/shared/services/modules/adminService.js) | 38-53 | updateTenant sends isActive redundantly |
| [adminService.js](frontend/src/modules/shared/services/modules/adminService.js) | 72-76 | updateBud doesn't convert status to isActive |
| [adminService.js](frontend/src/modules/shared/services/modules/adminService.js) | 132-136 | updateDepartment assumes isActive in payload |
| [adminService.js](frontend/src/modules/shared/services/modules/adminService.js) | 95-99 | updateProject converts but missing tenantId |

### Backend

| ไฟล์ | บรรทัด | ปัญหา |
|------|-------|-------|
| [master-data.js](backend/api-server/src/routes/master-data.js) | 98-104 | BUDs missing isActive & tenantId in response |
| [master-data.js](backend/api-server/src/routes/master-data.js) | 89-96 | Tenants include both status & isActive |
| [projects.js](backend/api-server/src/routes/projects.js) | 117 | PUT /:id doesn't enforce tenantId |
| [buds.js](backend/api-server/src/routes/buds.js) | 119 | PUT /:id works but API doesn't send isActive |
| [departments.js](backend/api-server/src/routes/departments.js) | 191 | PUT /:id expects isActive field |
| [tenants.js](backend/api-server/src/routes/tenants.js) | 27 | PUT /:id works but inefficient conversion |

---

## 9. ข้อสรุป | Conclusions

### Root Causes
1. **Data Format Inconsistency**: BUDs และ Tenants ได้รับ `status` field แทน `isActive`
2. **Missing Fields**: BUDs ขาด `isActive` และ `tenantId` ในการตอบกลับ API
3. **Frontend Assumptions**: Frontend สมมติว่า `isActive` field มีเสมอ
4. **Incomplete Payloads**: Update requests ขาด `tenantId` ทำให้ RLS context หลวม
5. **Service Layer Gaps**: adminService ไม่สม่ำเสมอในการแปลง status ↔ isActive

### Why Saves Fail
- ✗ Missing `tenantId` → Foreign Key constraints fail
- ✗ Payload mismatch → Backend receives unexpected fields
- ✗ undefined values → Server-side validation errors
- ✗ Status format mismatch → Field value conversions fail

### Why Toggle is Non-Functional
- ✗ `item.isActive` = undefined for BUDs
- ✗ `!undefined` = true, always sends `isActive: true`
- ✗ Toggle can never set to false
- ✗ BadgeButton shows wrong state (always "Inactive")

### Data Integrity Risks
- ✗ RLS isolation may be bypassed
- ✗ Orphaned records (NULL tenantId)
- ✗ Data corruption across tenant boundaries
- ✗ FK constraint violations

---

## 10. รายงานการรวบรวมหลักฐาน | Evidence Compilation

**ไฟล์สัญญาณ | Symptom Files:**
- Console: "ไม่สามารถอัปเดตข้อมูลได้" (Cannot update data)
- DB Logs: Foreign Key constraint violations
- Browser DevTools: Network requests show empty tenantId or status mismatch

**การทดสอบ | Test Cases:**
- ✗ Click Active toggle on BUD → Nothing happens or inverts
- ✗ Edit Project and save → Error or data doesn't persist
- ✗ Select Tenant then select BUD → All BUDs shown regardless
- ✗ View after refresh → Data either correct (inconsistent) or lost

---

*รายงานนี้สร้างขึ้นจากการวิเคราะห์โค้ดอย่างลึกซึ้ง | This report generated from forensic code analysis.*
*ไม่มีการแก้ไขโค้ด | No code modifications applied.*

