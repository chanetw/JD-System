# แผนการตรวจสอบปัญหา Role Permissions & Job Detail Access

**วันที่สร้าง:** 2026-02-17
**ปัญหา:** บาง Role ไม่สามารถเข้าดู Job Detail ของ Parent/Child jobs และปุ่ม Actions (Approve, Start Work, Submit) ไม่แสดงผล

---

## 📋 สรุปปัญหาที่พบ

### ปัญหาหลัก:
1. **บาง Role หางานไม่เจอ** - ไม่แสดงในรายการงาน (Job List)
2. **เข้าดู Job Detail ไม่ได้** - ได้รับข้อความ "คุณไม่มีสิทธิ์ดูงานนี้" (403 Forbidden)
3. **ปุ่ม Actions ไม่แสดง** - ปุ่ม Approve, Start Work, Submit ไม่ปรากฏแม้มีสิทธิ์

### ผลกระทบ:
- **Approver**: ไม่เห็นงานที่ต้องอนุมัติ
- **Assignee**: ไม่เห็นงานที่ได้รับมอบหมาย หรือเห็นแต่ไม่มีปุ่ม Start/Submit
- **Requester**: อาจไม่เห็น Parent/Child jobs ที่ตัวเองสร้าง

---

## 🔍 สาเหตุที่เป็นไปได้

### 1. **Backend Permission Check (GET /api/jobs/:id)**
**ไฟล์:** [backend/api-server/src/routes/jobs.js:697-735](../backend/api-server/src/routes/jobs.js)

**Logic ปัจจุบัน:**
```javascript
let hasAccess = job.requesterId === req.user.userId ||
  job.assigneeId === req.user.userId ||
  normalizedRoles.includes('admin') ||
  normalizedRoles.includes('manager');

// Check if user is an approver for this job's project via approval_flows
if (!hasAccess && normalizedRoles.includes('approver')) {
  // ตรวจสอบ approval_flows ว่า user อยู่ใน approverSteps หรือไม่
}
```

**ปัญหาที่อาจเกิด:**
- ❌ **Role name case mismatch**: Backend ใช้ `normalizedRoles.includes('admin')` (lowercase) แต่ V1 database อาจส่งมาเป็น `"Admin"` (PascalCase)
- ❌ **Approver ไม่อยู่ใน approval_flows**: ถ้า Approver ไม่ได้ถูกเพิ่มใน approval flow ของ project นั้น จะไม่มีสิทธิ์ดู
- ❌ **Parent/Child job visibility**: Parent job อาจมี requester แต่ Child job มี requester คนอื่น → requester ของ Parent ไม่เห็น Child

### 2. **Frontend Permission Check (JobActionPanel.jsx)**
**ไฟล์:** [frontend/src/modules/features/job-management/components/JobActionPanel.jsx](../frontend/src/modules/features/job-management/components/JobActionPanel.jsx)

**Logic ปัจจุบัน:**
```javascript
// Line 20-27: Role normalization
const rawRoles = currentUser?.roles;
const normalizedRoles = rawRoles?.map(r => {
  const normalized = (typeof r === 'string' ? r : r?.roleName || r?.name || '').toLowerCase();
  return normalized;
}) || [];
const isAdmin = normalizedRoles.includes('admin');
```

**ปัญหาที่อาจเกิด:**
- ❌ **Role format ไม่ตรง**: currentUser.roles อาจเป็น `string[]` หรือ `object[]` ขึ้นอยู่กับ auth version
  - V1 auth: `roles: ["Admin", "Requester"]`
  - V2 auth: `roles: [{name: "Admin", isActive: true, scopes: [...]}]`
- ❌ **Approval button logic**: ตรวจสอบว่า user อยู่ใน `job.flowSnapshot.levels[currentLevel].approvers` หรือไม่
  - ถ้า flowSnapshot ไม่ถูกโหลดมา → ปุ่ม Approve จะไม่แสดง

### 3. **Job List Filtering (GET /api/jobs)**
**ไฟล์:** [backend/api-server/src/routes/jobs.js:37-150](../backend/api-server/src/routes/jobs.js)

**Logic ปัจจุบัน:**
```javascript
switch (role.toLowerCase()) {
  case 'requester':
    where.requesterId = userId;
    break;
  case 'assignee':
    where.assigneeId = userId;
    break;
  case 'approver': {
    // ค้นหา approval_flows ที่ user เป็น approver
    // สร้าง OR conditions ตาม projectId + status
    where.OR = orConditions;
    break;
  }
}
```

**ปัญหาที่อาจเกิด:**
- ❌ **Requester ไม่เห็น Child jobs**: ถ้า Child job มี requester คนอื่น (อัตโนมัติจาก chaining system)
- ❌ **Assignee ไม่เห็น Parent jobs**: Parent job อาจยังไม่มี assignee แต่ Child jobs มี → Assignee เห็นแต่ Child ไม่เห็น Parent
- ❌ **Approver ไม่เห็นงานถ้าไม่ได้อยู่ใน approval_flows**: Query ใช้ `orConditions.length === 0` → return empty array

### 4. **Role Data Format Issues**
**ปัญหา:** V1 auth และ V2 auth ส่ง role data ในรูปแบบต่างกัน

**V1 Format (PrismaV1Adapter):**
```javascript
// Backend: req.user.roles = ["Admin", "Requester"] (string array)
// Frontend: user.roles = ["Admin", "Requester"]
```

**V2 Format (Native):**
```javascript
// Backend: req.user.roles = [{name: "Admin", isActive: true}]
// Frontend: user.roles = [{name: "Admin", isActive: true, scopes: [...]}]
```

**ผลกระทบ:**
- Frontend permission utils ใช้ `hasRole(user, 'Admin')` → ตรวจสอบทั้ง string array และ object array
- Backend ใช้ `normalizedRoles.includes('admin')` → ต้อง lowercase
- **Risk**: ถ้า backend ได้รับ role เป็น PascalCase จาก V1 (`"Admin"`) แต่เช็คด้วย `includes('admin')` → จะไม่ match

---

## 📊 Matrix การเข้าถึงงานตาม Role (Expected Behavior)

| Role | ดูงานที่สร้างเอง | ดูงานที่ได้รับมอบหมาย | ดูงานที่ต้องอนุมัติ | ดูงาน Parent/Child | ปุ่ม Approve | ปุ่ม Start/Submit |
|------|-----------------|---------------------|-------------------|------------------|-------------|-----------------|
| **Admin** | ✅ ทั้งหมด | ✅ ทั้งหมด | ✅ ทั้งหมด | ✅ ทั้งหมด | ✅ | ✅ |
| **Requester** | ✅ งานที่สร้าง | ❌ | ❌ | ⚠️ Parent เห็น, Child อาจไม่เห็น | ❌ | ❌ |
| **Approver** | ❌ | ❌ | ✅ ที่อยู่ใน flow | ⚠️ ขึ้นอยู่กับ flow | ✅ ถ้าเป็น level ปัจจุบัน | ❌ |
| **Assignee** | ❌ | ✅ ที่ได้รับมอบหมาย | ❌ | ⚠️ Child เห็น, Parent อาจไม่เห็น | ❌ | ✅ |

**Legend:**
- ✅ = ควรมีสิทธิ์
- ❌ = ไม่ควรมีสิทธิ์
- ⚠️ = ปัญหาอาจเกิดขึ้นที่นี่

---

## 🔧 แผนการตรวจสอบแบบละเอียด

### Phase 1: ตรวจสอบ Backend Permission Logic

#### Test Case 1.1: GET /api/jobs/:id - Role Name Case Sensitivity
**วิธีทดสอบ:**
1. ใช้ Postman/cURL เรียก GET `/api/jobs/:id` พร้อม JWT token
2. ดูค่า `req.user.roles` ที่ middleware ส่งมา
3. ตรวจสอบว่า roles เป็น `["Admin"]` หรือ `["admin"]`

**Expected:**
- Backend ควร normalize roles เป็น lowercase ก่อนเช็ค
- **แก้ไข:** เพิ่ม normalization ใน `authenticateToken` middleware

**ไฟล์:** `backend/api-server/src/routes/auth.js` (middleware)

#### Test Case 1.2: Approver Access Check
**วิธีทดสอบ:**
1. สร้าง Approver user ที่อยู่ใน approval_flows
2. พยายามเข้า GET `/api/jobs/:id` ที่ Approver ควรมีสิทธิ์ดู
3. ดู log ว่า query approval_flows พบ user หรือไม่

**Expected:**
- Query `approverSteps` ต้องพบ `userId` ตรงกับ `req.user.userId`
- hasAccess = true

**Debug:**
```javascript
// เพิ่ม log ใน jobs.js:708-727
console.log('[Approver Check] flows:', approverFlows.length);
console.log('[Approver Check] req.user.userId:', req.user.userId);
```

#### Test Case 1.3: Parent/Child Job Access
**วิธีทดสอบ:**
1. สร้าง Parent job (requester = User A)
2. Parent job สร้าง Child jobs (system auto-assign requester = User A?)
3. Login เป็น User A
4. เรียก GET `/api/jobs/:childJobId`

**Expected:**
- User A ควรเห็น Child job เพราะเป็น requester
- **ถ้าไม่เห็น:** Child job อาจมี requesterId แตกต่างจาก Parent

**แก้ไข:**
- เพิ่ม logic: ถ้าดู Child job, ให้เช็ค `parentJob.requesterId` ด้วย

---

### Phase 2: ตรวจสอบ Frontend Button Rendering

#### Test Case 2.1: Approve Button Visibility
**วิธีทดสอบ:**
1. Login เป็น Approver
2. เปิด Job Detail ที่ status = `pending_approval`
3. ตรวจสอบว่า `job.flowSnapshot` โหลดมาหรือไม่ (ดูใน React DevTools)

**Expected:**
- `job.flowSnapshot.levels[0].approvers` ต้องมี user.id อยู่
- `renderApprovalActions()` return ปุ่ม Approve

**Debug:**
```javascript
// เพิ่ม console.log ใน JobActionPanel.jsx:30-43
console.log('[Approve Check] currentUser:', currentUser?.id);
console.log('[Approve Check] flowSnapshot:', job.flowSnapshot);
console.log('[Approve Check] canApprove:', canApprove);
```

#### Test Case 2.2: Start/Submit Button Visibility
**วิธีทดสอบ:**
1. Login เป็น Assignee
2. เปิด Job Detail ที่ assigneeId = user.id, status = `assigned`
3. ตรวจสอบว่าปุ่ม "เริ่มงาน" แสดงหรือไม่

**Expected:**
- `renderAssigneeActions()` return ปุ่ม Start Job
- ถ้า status = `in_progress` → ปุ่ม Complete Job

**Debug:**
```javascript
// เพิ่ม console.log ใน JobActionPanel.jsx:195-229
console.log('[Assignee Check] job.status:', job.status);
console.log('[Assignee Check] job.assigneeId:', job.assigneeId);
console.log('[Assignee Check] currentUser.id:', currentUser?.id);
```

---

### Phase 3: ตรวจสอบ Job List Filtering

#### Test Case 3.1: Requester Job List
**วิธีทดสอบ:**
1. Login เป็น Requester
2. เรียก GET `/api/jobs?role=requester`
3. ตรวจสอบว่าเห็น Parent jobs และ Child jobs หรือไม่

**Expected:**
- เห็น Parent jobs ที่สร้างเอง
- เห็น Child jobs ที่สร้างจาก Parent (ถ้า requesterId เหมือนกัน)

**Debug:**
```sql
-- ตรวจสอบ requesterId ของ Child jobs
SELECT id, djId, subject, requesterId, parentJobId, isParent
FROM jobs
WHERE parentJobId IS NOT NULL;
```

#### Test Case 3.2: Approver Job List
**วิธีทดสอบ:**
1. Login เป็น Approver
2. เรียก GET `/api/jobs?role=approver`
3. ตรวจสอบว่า `orConditions.length > 0`

**Expected:**
- ถ้า Approver ไม่อยู่ใน approval_flows → `orConditions = []` → empty list
- **แก้ไข:** แสดง error message ให้ user ทราบ

**Debug:**
```javascript
// ดู log ใน jobs.js:98-114
console.log('[Approver Query] orConditions:', orConditions);
```

---

### Phase 4: ตรวจสอบ Role Data Format

#### Test Case 4.1: V1 vs V2 Auth Format
**วิธีทดสอบ:**
1. Login ผ่าน V2 auth (POST `/api/v2/auth/login`)
2. ตรวจสอบ `req.user.roles` ใน backend log
3. ตรวจสอบ `user.roles` ใน frontend (React DevTools → authStoreV2)

**Expected:**
- **Backend:** `req.user.roles = ["Admin"]` (V1 format จาก PrismaV1Adapter)
- **Frontend:** `user.roles = [{name: "Admin", isActive: true, scopes: [...]}]` (V2 format)

**ปัญหาถ้าพบ:**
- Backend อาจได้ V2 format → `normalizedRoles.includes('admin')` จะไม่ match
- **แก้ไข:** ปรับ normalization logic

---

## 🛠️ การแก้ไขที่แนะนำ

### Fix 1: Backend Role Normalization (High Priority)
**ไฟล์:** `backend/api-server/src/routes/auth.js`

**ปัญหา:** Backend ใช้ `normalizedRoles.includes('admin')` แต่ roles อาจเป็น PascalCase

**แก้ไข:**
```javascript
// ใน authenticateToken middleware
const userRoles = req.user.roles || [];
req.user.normalizedRoles = userRoles.map(r => {
  if (typeof r === 'string') return r.toLowerCase();
  return (r?.roleName || r?.name || '').toLowerCase();
});
```

**แล้วใช้:**
```javascript
// ใน jobs.js:702-705
let hasAccess = job.requesterId === req.user.userId ||
  job.assigneeId === req.user.userId ||
  req.user.normalizedRoles.includes('admin') ||
  req.user.normalizedRoles.includes('manager');
```

---

### Fix 2: Parent/Child Job Access Logic (Medium Priority)
**ไฟล์:** `backend/api-server/src/routes/jobs.js:702-735`

**ปัญหา:** Requester ไม่เห็น Child jobs ถ้า requesterId แตกต่างจาก Parent

**แก้ไข:**
```javascript
// เพิ่ม check สำหรับ Parent/Child relationship
let hasAccess = job.requesterId === req.user.userId ||
  job.assigneeId === req.user.userId ||
  req.user.normalizedRoles.includes('admin') ||
  req.user.normalizedRoles.includes('manager');

// ✅ NEW: Check if user is requester of parent job (for child jobs)
if (!hasAccess && job.parentJobId && job.parentJob) {
  hasAccess = job.parentJob.requesterId === req.user.userId;
}

// ✅ NEW: Check if user is requester of any child job (for parent jobs)
if (!hasAccess && job.isParent && job.childJobs) {
  hasAccess = job.childJobs.some(child => child.requesterId === req.user.userId);
}
```

---

### Fix 3: Approver Empty State Message (Low Priority)
**ไฟล์:** `backend/api-server/src/routes/jobs.js:103-110`

**ปัญหา:** Approver ที่ไม่อยู่ใน approval_flows ได้รับ empty array โดยไม่มี error message

**แก้ไข:**
```javascript
if (orConditions.length === 0) {
  console.log('[Approver Query] ⚠️ User is not an approver in any flow');
  return res.json({
    success: true,
    data: [],
    message: 'คุณยังไม่ได้ถูกเพิ่มเป็นผู้อนุมัติในโครงการใดๆ กรุณาติดต่อ Admin',  // ✅ NEW
    pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
  });
}
```

---

### Fix 4: Frontend Role Check Robustness (Medium Priority)
**ไฟล์:** `frontend/src/modules/features/job-management/components/JobActionPanel.jsx:20-27`

**ปัญหา:** Role normalization อาจ fail ถ้า roles format ไม่ตรงตามคาด

**แก้ไข:**
```javascript
// Line 20-27: Improved role normalization
const rawRoles = currentUser?.roles;
const normalizedRoles = (() => {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles.map(r => {
      if (typeof r === 'string') return r.toLowerCase();
      if (typeof r === 'object') {
        return (r?.roleName || r?.name || '').toLowerCase();
      }
      return '';
    }).filter(Boolean);
  }
  return [];
})();

const isAdmin = normalizedRoles.includes('admin');
const isDeptManager = normalizedRoles.includes('manager') || normalizedRoles.includes('dept_manager');
const isApprover = normalizedRoles.includes('approver');
const isAssignee = normalizedRoles.includes('assignee');
```

---

## 📝 Test Checklist (ใช้หลังแก้ไข)

### ✅ Admin Role
- [ ] เห็น Job List ทั้งหมด
- [ ] เข้า Job Detail ได้ทุก job (Parent & Child)
- [ ] ปุ่ม Approve แสดงถ้า job pending
- [ ] ปุ่ม Manual Assign แสดง
- [ ] ปุ่ม Reassign แสดง

### ✅ Requester Role
- [ ] เห็น Parent jobs ที่สร้างเอง
- [ ] เห็น Child jobs ที่สร้างจาก Parent jobs
- [ ] เข้า Job Detail ได้ทั้ง Parent & Child
- [ ] ไม่เห็นปุ่ม Approve/Start/Submit

### ✅ Approver Role
- [ ] เห็น jobs ที่ต้องอนุมัติ (ถ้าอยู่ใน approval_flows)
- [ ] ถ้าไม่อยู่ใน flows → แสดง message ชัดเจน
- [ ] เข้า Job Detail ได้เฉพาะ jobs ในโครงการที่มีสิทธิ์
- [ ] ปุ่ม Approve แสดงถ้าเป็น level ปัจจุบัน
- [ ] ปุ่ม Reject/Return แสดง

### ✅ Assignee Role
- [ ] เห็น jobs ที่ได้รับมอบหมาย
- [ ] เข้า Job Detail ได้เฉพาะ jobs ที่ assign ให้
- [ ] ปุ่ม Start Job แสดงถ้า status = assigned
- [ ] ปุ่ม Complete Job แสดงถ้า status = in_progress
- [ ] ปุ่ม Reassign แสดง (ถ้าต้องการย้ายงาน)

### ✅ Parent/Child Jobs Visibility
- [ ] Requester เห็น Parent + Child ที่เกี่ยวข้อง
- [ ] Assignee เห็น Child ที่ assign ให้
- [ ] Approver เห็น jobs ตาม approval flow (ไม่คำนึง parent/child)
- [ ] Admin เห็นทุก Parent/Child

---

## 📦 ไฟล์ที่เกี่ยวข้องทั้งหมด

### Backend
1. `backend/api-server/src/routes/jobs.js` - Job routes & permissions
2. `backend/api-server/src/routes/auth.js` - Authentication middleware
3. `backend/api-server/src/v2/adapters/PrismaV1Adapter.js` - Role transformation
4. `backend/api-server/src/services/approvalService.js` - Approval logic

### Frontend
1. `frontend/src/modules/features/job-management/pages/JobDetail.jsx` - Job detail page
2. `frontend/src/modules/features/job-management/components/JobActionPanel.jsx` - Action buttons
3. `frontend/src/modules/shared/utils/permission.utils.js` - Permission helpers
4. `frontend/src/modules/core/stores/authStoreV2.ts` - Auth state

---

## 🎯 สรุปขั้นตอนการแก้ไข (Recommended Order)

1. **Fix Backend Role Normalization** (30 min)
   - แก้ `auth.js` middleware
   - ทดสอบด้วย Postman

2. **Fix Parent/Child Access Logic** (45 min)
   - แก้ `jobs.js` permission check
   - ทดสอบด้วย Parent/Child jobs จริง

3. **Fix Frontend Role Check** (20 min)
   - แก้ `JobActionPanel.jsx` normalization
   - ทดสอบด้วย different roles

4. **Add Approver Empty State** (10 min)
   - แก้ `jobs.js` approver query
   - ทดสอบด้วย Approver ที่ไม่อยู่ใน flows

5. **Full Integration Testing** (60 min)
   - ทดสอบทุก Role ตาม Test Checklist
   - บันทึกผลการทดสอบ

**รวมเวลาโดยประมาณ:** 2.5-3 ชั่วโมง

---

**หมายเหตุ:** เอกสารนี้เป็น living document ให้อัปเดตเมื่อพบปัญหาใหม่หรือแก้ไขเสร็จแล้ว
