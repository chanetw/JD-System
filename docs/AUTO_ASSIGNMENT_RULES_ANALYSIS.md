# 🔄 Auto-Assignment Rules Analysis

**วัตถุประสงค์:** ตรวจสอบว่า Auto-Assignment Rules ถูก set ไว้แล้วแต่ทำไมไม่เรียกค่ามาแสดง

**สถานะ:** ✅ Code มีอยู่ แต่อาจยังไม่ขาด "ตัวเรียก" หรือ "ตัวแสดง"

---

## 🔍 พบมา

### 1️⃣ Auto-Assignment Logic ทำงาน (Backend OK ✅)

**Location:** `backend/api-server/src/routes/jobs.js` line 335-373

```javascript
// เมื่อ Create Job:
if (isSkip && !finalAssigneeId) {
  // 1. ตรวจสอบว่า "ไม่ต้องอนุมัติ" (skipApproval = true)
  // 2. และยังไม่มี assignee
  // 3. เรียก Auto-Assign Service with Fallback:

  const assignResult = await approvalService.autoAssignJobWithFallback(
    newJob.id,
    flow,
    userId,
    projectId,
    jobTypeId
  );

  // ถ้า Auto-Assign สำเร็จ:
  if (assignResult.success && assignResult.assigneeId) {
    finalAssigneeId = assignResult.assigneeId;
    autoAssigned = true;

    // Update job to 'assigned' และตั้ง assignee
  }
}
```

### 2️⃣ Skip Approval Logic (Backend OK ✅)

**Location:** `backend/api-server/src/routes/jobs.js` line 248-254

```javascript
// ขั้นตอน 2: Get Approval Flow
const flow = await approvalService.getApprovalFlow(projectId, jobTypeId);

// ขั้นตอน 3: Check Skip Approval
const isSkip = approvalService.isSkipApproval(flow);

// ถ้า isSkip = true:
//   → initialStatus = 'approved' (พร้อมมอบหมายงาน)
//   → พยายาม Auto-Assign
```

### 3️⃣ Response ส่งข้อมูล Auto-Assignment (Backend OK ✅)

**Location:** `backend/api-server/src/routes/jobs.js` line 423-443

```json
{
  "success": true,
  "data": {
    "id": 1,
    "djId": "DJ-2026-0001",
    "status": "assigned",
    "assigneeId": 5,
    "flowInfo": {
      "templateName": "Default",
      "isSkipped": true,
      "autoAssigned": true  // ⬅️ ส่งไป Frontend แล้ว
    }
  }
}
```

---

## ❓ ปัญหา: ข้อมูลไม่ถูกแสดงใน UI

### 🤔 สมมติฐาน 3 ข้อ:

#### 1️⃣ **Frontend ไม่รู้จะแสดง Auto-Assignment ตรงไหน**

- Job List page ไม่มี field แสดง "autoAssigned" status
- Dashboard ไม่มี indicator ว่า job ถูก auto-assign หรือมนุษย์มอบหมาย
- **พิสูจน์:** ดู Frontend Job components → ไม่มี field สำหรับ `autoAssigned`

#### 2️⃣ **Flow Configuration ไม่ได้ Set ให้ Skip Approval**

- Approval Flow settings ยังตั้ง `skipApproval = false`
- ทำให้ job ต้อง pending_approval ก่อน
- ไม่เข้าเงื่อนไข `if (isSkip && !finalAssigneeId)`

#### 3️⃣ **Auto-Assign Service (`autoAssignJobWithFallback`) ไม่มี Implementation**

- Function ถูกเรียก (line 346) แต่ implementation อาจไม่สมบูรณ์
- Fallback logic ไม่ทำงานถูกต้อง

---

## 🔧 Fallback Logic ที่ควรมี

**Location:** `backend/api-server/src/services/approvalService.js`

ควรมี function: `autoAssignJobWithFallback(jobId, flow, userId, projectId, jobTypeId)`

ตรรมชาติ:
```javascript
async autoAssignJobWithFallback(jobId, flow, userId, projectId, jobTypeId) {
  try {
    // Priority 1: flow.autoAssignUserId (ถ้า flow ได้ระบุ user)
    if (flow?.autoAssignUserId) {
      return {
        success: true,
        assigneeId: flow.autoAssignUserId,
        reason: 'from_flow_config'
      };
    }

    // Priority 2: project_job_assignments (ตั้งค่า Auto-Assign per Project+JobType)
    const assignment = await this.prisma.projectJobAssignment.findFirst({
      where: {
        projectId,
        jobTypeId,
        isActive: true
      }
    });

    if (assignment?.assigneeId) {
      return {
        success: true,
        assigneeId: assignment.assigneeId,
        reason: 'from_job_assignment'
      };
    }

    // Priority 3: Dept Manager ของ Requester
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: {
          include: {
            manager: { select: { id: true } }
          }
        }
      }
    });

    if (requester?.department?.manager?.id) {
      return {
        success: true,
        assigneeId: requester.department.manager.id,
        reason: 'from_dept_manager'
      };
    }

    // Priority 4: Fallback - ไม่พบ assignee
    return {
      success: false,
      message: 'ไม่สามารถหา assignee ได้'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 📋 To-Do List สำหรับ Dev

### ✅ Check 1: ตรวจสอบ Approval Flow Configuration

```bash
# SQL Query: ตรวจสอบว่า Flow ได้ set skip_approval หรือไม่
SELECT
  id, name, project_id, job_type_id, skip_approval, auto_assign_user_id
FROM approval_flows
WHERE skip_approval = true AND is_active = true
LIMIT 10;

# ถ้าไม่มีข้อมูล → ต้องไป Setup Approval Flow
```

### ✅ Check 2: ตรวจสอบ Job Assignments

```bash
# SQL Query: ตรวจสอบว่ามี Assignment ไว้สำหรับ Auto-Assign หรือไม่
SELECT
  id, project_id, job_type_id, assignee_id
FROM project_job_assignments
WHERE is_active = true
LIMIT 10;
```

### ✅ Check 3: ตรวจสอบ Backend Logs

เมื่อ Create Job:
```
[Jobs] Created job DJ-2026-0001 with status: assigned, skip: true, autoAssigned: true
```

ถ้า log แสดง:
- `skip: false` → Flow ไม่ได้ set skip_approval
- `autoAssigned: false` → Auto-Assign logic ล้มเหลว
- `status: pending_approval` → ไม่ได้ skip

### ✅ Check 4: เพิ่ม UI สำหรับแสดง Auto-Assignment

**Frontend: Job List/Detail Page**

```javascript
// ต้องเพิ่ม field แสดง:
- ✅ "Auto-Assigned" badge (ถ้า autoAssigned = true)
- ✅ "Assigned by: [System]" vs "Assigned by: [Human]"
- ✅ "Assignment Method" indicator
```

---

## 🎯 สรุป: เหตุผลที่ไม่เห็น Auto-Assignment

| ลำดับ | ปัญหา | วิธีแก้ |
|------|-------|--------|
| 1 | Approval Flow ยังไม่ set `skip_approval = true` | ไปตั้งค่าใน Admin → Approval Flows |
| 2 | Project Job Assignment ยังไม่มีข้อมูล | ไปตั้งค่าใน Admin → Projects → Job Assignments |
| 3 | Frontend ไม่มี UI แสดง Auto-Assignment | เพิ่ม field/badge ใน Job List/Detail |
| 4 | `autoAssignJobWithFallback()` ยังไม่ implement | Implement function ใน approvalService.js |
| 5 | User List ไม่โหลดใน Assignment UI | ตรวจสอบ API ข้อมูลและ Component state |

---

## 🔍 LOG FINDINGS - ตรวจสอบจากการรันจริง (2026-02-04)

**ผลการตรวจสอบมีลักษณะดังนี้:**

### ✅ Check 1: Approval Flow skip_approval
```
❌ Not Found: ไม่พบ Approval Flow ใดๆ ที่ตั้งค่า skip_approval = true
```
**ผลกระทบ:**
- เนื่องจาก `skip_approval = false` ทั้งหมด
- Auto-Assignment logic ไม่ทำงานเพราะโค้ด `if (isSkip && !finalAssigneeId)` ไม่เข้า
- Job ทั้งหมดจะอยู่ status `pending_approval` ก่อน

### ✅ Check 2: Project Job Assignments
```
✅ Pass: พบ 10 รายการ Project Job Assignment ที่ตั้งค่าไว้ถูกต้องแล้ว
```
**สภาวะ:**
- Configuration ถูกต้องและพร้อม
- แต่ไม่ได้ใช้ เพราะ skip_approval ยังไม่เปิด

### ✅ Check 3: Create Job Logs
```
❌ Not Found: ไม่มี Job ใดถูก Auto-Assign (เพราะข้อ 1 ไม่ผ่าน)
```
**เหตุผล:**
- ไม่มี log `autoAssigned: true` ในตระบบ
- ทั้งหมด auto-assign logic ถูก skip เพราะ skip_approval = false

### 📊 Root Cause Analysis
```
┌─────────────────────────────────────────────────┐
│ Root Cause: skip_approval = false               │
├─────────────────────────────────────────────────┤
│ ↓                                               │
│ isSkip = false (in jobs.js line 249)           │
│ ↓                                               │
│ if (isSkip && !finalAssigneeId) = FALSE        │
│ ↓                                               │
│ Auto-Assignment logic SKIPPED entirely         │
│ ↓                                               │
│ Job status = "pending_approval"                │
│ ↓                                               │
│ ❌ User NEVER sees auto-assigned jobs          │
└─────────────────────────────────────────────────┘
```

**ตัวอย่าง Timeline:**
1. ✅ Create Job (request/user)
2. ❌ Get Approval Flow → skip_approval = false
3. ❌ isSkip = false → skip Auto-Assignment
4. ❌ Job status = "pending_approval" (ติดอยู่)
5. ❌ No Auto-Assign happens
6. ❌ Frontend ไม่เห็น `autoAssigned: true` flag

---

## ⚠️ ADDITIONAL ISSUE: User List ไม่โหลดใน Assignment UI

**ผู้ใช้รายงาน:** "auto assignment ไม่โหลดรายชื่อ user มาแสดง"

### สภาวะปัญหา:
- ใน Admin → Approval Flow page
- ใน Admin → Assignment Matrix page
- ไม่สามารถดูหรือเลือก User สำหรับ auto-assignment

### สถานที่อาจเกิดปัญหา:

#### 1️⃣ **ApprovalFlow.jsx** - Team Lead/Assignee Selector ไม่โหลด
- **Location:** `frontend/src/modules/features/admin/pages/ApprovalFlow.jsx` lines 1121-1129
- **ปัญหา:** Dropdown แสดง "-- กรุณาเลือก Team Lead --" แต่ไม่มี options
- **สาเหตุที่เป็นไปได้:**
  - `responsibleTeam.assignees` array เป็นค่าว่าง `[]`
  - API `/api/users` ไม่ส่งข้อมูล assignees กลับมา
  - RLS Policy กำลังบล็อกข้อมูล assignees

#### 2️⃣ **AssignmentMatrix.jsx** - Job Type Assignee Dropdown ไม่โหลด
- **Location:** `frontend/src/modules/features/admin/pages/AssignmentMatrix.jsx` lines 196-224
- **ปัญหา:** Dropdown ว่างเปล่า `activeAssignees.map(...)` ไม่มี options
- **สาเหตุที่เป็นไปได้:**
  - Props `assignees` ว่างเปล่า (มาจาก ApprovalFlow parent component)
  - API `/api/users` ไม่ส่ง role='assignee' users กลับมา
  - Frontend filter logic ตัดผู้ใช้ทั้งหมดออกไป

#### 3️⃣ **adminService.js** - API Data Not Being Fetched
- **Location:** `frontend/src/modules/shared/services/modules/adminService.js` lines 126-178
- **Key Function:** `loadData()` ที่ fetch users ด้วย `api.getUsers()`
- **ปัญหา:**
  ```javascript
  try {
      usersData = await api.getUsers() || [];
  } catch (e) {
      // อาจเงียบๆ fail ที่นี่
      console.warn('Failed to fetch users');
  }
  ```

### ✅ Debugging Steps สำหรับ User List Issue:

**Step 1: ตรวจสอบ Network Response**
```
1. ไปที่ Admin → Approval Flows
2. เปิด DevTools (F12) → Network Tab
3. Reload หน้า
4. หา request: GET /api/users
5. ตรวจสอบ Response ว่า:
   - status: 200 OK หรือ error?
   - data.data มีผู้ใช้ออกมาหรือ []?
   - มี userRoles ว่า role="assignee" หรือไม่?
```

**Step 2: ตรวจสอบ Frontend State (Console)**
```javascript
// Paste ลงใน Browser Console:
// (หลังจากเปิด Approval Flow page)

// 1. Check if users loaded
const userInput = document.querySelector('select[value*="Team"]');
console.log('Team Lead Select element:', userInput);

// 2. Check if has options
const options = userInput?.querySelectorAll('option');
console.log('Total options in select:', options?.length);

// 3. Check selected project
console.log('Current project data available?');

// 4. Check window state (ถ้า component expose state)
console.log('Window state:', window.__ADMIN_STATE || 'Not exposed');
```

**Step 3: ตรวจสอบ Database**
```bash
# ตรวจสอบว่ามี users with role='assignee' หรือไม่
SELECT
  u.id, u.email, u.display_name,
  ur.role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role_name = 'assignee'
  AND u.is_active = true
  AND ur.is_active = true
LIMIT 10;
```

**Step 4: ตรวจสอบ RLS Policies**
```
หากผู้ใช้ logged in เป็น 'admin' แต่ยังดูไม่เห็น users:
- ตรวจสอบ RLS policy ใน Supabase/Database
- ตรวจสอบว่า admin user มี permission ดูทุก users หรือไม่
```

---

## 🚀 Quick Fix Steps - Priority Order

### 🔴 **BLOCKING ISSUE FIRST: Enable skip_approval in Approval Flow**

**ที่ต้องทำทันที (เป็น blocker ของทุกอย่าง):**

**Location:** Admin → Approval Flows

1. ✅ ไปที่ Page: `http://localhost:5137/admin/approval-flow`
2. ✅ หลังจากทำการตั้งค่า flow แล้ว
3. ✅ **คลิกที่ Checkbox: "Skip Approval (ข้ามการอนุมัติ)"**
   - ⚠️ **นี่คือสิ่งที่ HIT MISS ตอนนี้!**
   - ปัจจุบัน `skip_approval = false` ทั้งหมด
4. ✅ (Optional) ตั้ง "Auto-Assign User" ถ้าต้องการจ่ายให้คนที่ระบุ

**ผลที่คาดหวัง:**
```
INSERT/UPDATE approval_flows
SET skip_approval = true,
    auto_assign_user_id = [selected_user_id]  // optional
WHERE project_id = [project_id]
  AND job_type_id = [job_type_id];
```

---

### 🟡 **SECOND: ตรวจสอบ Assignment Matrix (ถ้า skip_approval = true แล้ว)**

**Location:** Admin → Assignment Matrix (หรือใน Approval Flow → Job Assignment Matrix)

1. เลือก Project
2. ตรวจสอบว่ามี Assignee กำหนดไว้สำหรับ Job Type หรือไม่
3. ถ้าไม่มี → เลือก Assignee จาก dropdown

**ถ้า Dropdown ว่างเปล่า (User List ไม่โหลด):**
- ไปดู [⚠️ ADDITIONAL ISSUE: User List ไม่โหลด](#️-additional-issue-user-list-ไม่โหลดใน-assignment-ui)

---

### 🟢 **THIRD: Test Auto-Assignment (หลังจาก Step 1 & 2)**

**เมื่อ skip_approval = true แล้ว:**

1. ✅ สร้าง Job ใหม่ด้วย File ที่อยู่ใน Flow ที่ได้ตั้งค่า
2. ✅ Check Network Response:
   ```json
   {
     "data": {
       "status": "assigned",  // ← ต้อง assigned ไม่ใช่ pending_approval
       "assigneeId": 5,
       "flowInfo": {
         "isSkipped": true,    // ← ยืนยัน skip_approval ทำงาน
         "autoAssigned": true  // ← ยืนยัน auto-assign ทำงาน
       }
     }
   }
   ```

3. ✅ Check Backend Logs:
   ```
   [Jobs] Created job DJ-2026-000X with status: assigned, skip: true, autoAssigned: true
   ```

---

### 🔵 **FOURTH: Display Auto-Assigned Status in UI (ถ้าต้องการ)**

**Frontend: Job List/Detail Page**

เพิ่ม field แสดง auto-assigned status (ถ้ายังไม่มี):

```jsx
// ใน Job List/Detail Component:
<div className="flex gap-2 items-center">
  {job.autoAssigned && (
    <span className="badge badge-success badge-sm">
      🔄 Auto-Assigned
    </span>
  )}
  {job.assigneeId && (
    <span className="text-sm text-gray-600">
      Assignee: {job.assigneeName || 'User #' + job.assigneeId}
    </span>
  )}
</div>
```

---

### 📋 **Checklist ก่อนติดต่อ Backend Dev**

- [ ] **Phase 1 - Check Network Response**
  - [ ] `/api/users` return ข้อมูล users หรือ error?
  - [ ] มี assignees list หรือว่างเปล่า?

- [ ] **Phase 2 - Check Database**
  - [ ] Database มี users with role='assignee' หรือไม่?
  - [ ] Count: `SELECT COUNT(*) FROM user_roles WHERE role_name='assignee'`

- [ ] **Phase 3 - Check Backend Code**
  - [ ] `approvalService.getApprovalFlow()` return ได้หรือไม่?
  - [ ] `approvalService.isSkipApproval()` function มีหรือ return false เสมอ?

- [ ] **Phase 4 - Test Creation**
  - [ ] Create Job แล้ว status = 'assigned' หรือ 'pending_approval'?
  - [ ] Response มี `autoAssigned: true` flag หรือไม่?

---

## ✅ Expected Result หลังแก้

### หลังจากทำการเปิด skip_approval = true และจ่ายงาน:

**Backend Response (Create Job):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "djId": "DJ-2026-0001",
    "status": "assigned",        // ← Changed from "pending_approval"
    "assigneeId": 5,             // ← Assigned automatically
    "flowInfo": {
      "templateName": "Default",
      "isSkipped": true,         // ← skip_approval ทำงาน
      "autoAssigned": true       // ← auto-assign ทำงาน
    }
  }
}
```

**Backend Logs:**
```
[Jobs] Created job DJ-2026-0001
       status: assigned
       skip: true
       autoAssigned: true
       assignee: #5 (John Doe)
```

**Frontend Display (Job List/Card):**
```
┌─────────────────────────────────────┐
│ DJ-2026-0001                        │
│ Status: ✅ Assigned                 │
│ Assignee: John Doe                  │
│ Method: 🔄 Auto-Assigned by System  │
└─────────────────────────────────────┘
```

---

## 🎯 Quick Summary สำหรับ Dev Team

| ขั้นตอน | What | How | Why | เวลา |
|--------|------|-----|-----|------|
| 1 | Enable skip_approval | Admin → Approval Flows → ✅ Check Skip | Auto-assign ต้อง skip_approval=true | 1 min |
| 2 | Set Assignee | Admin → Assignment Matrix → Select | โครงการต้องมี default assignee | 2 min |
| 3 | Test Job Creation | Create new job → Check response | ตรวจสอบว่า status='assigned' | 2 min |
| 4 | Debug if needed | Run DB query / Check logs | ถ้ายังไม่ work ให้เทสกันจริง | Variable |

---

### ⚠️ Common Pitfalls

1. **Forgot to Enable skip_approval**
   - ❌ Auto-assign logic ถูก skip เพราะ `if (isSkip && !finalAssigneeId)` = false
   - ✅ Must ✅ enable checkbox ใน Approval Flow

2. **User List Empty in Assignment Matrix**
   - ❌ Dropdown ว่างเปล่า (ไม่มี assignees แสดง)
   - ✅ Check: /api/users return ข้อมูล assignees หรือไม่

3. **autoAssignJobWithFallback() Error**
   - ❌ Backend throws error เมื่อ auto-assign
   - ✅ Check: approvalService.js มี implementation ถูกต้องหรือไม่

4. **RLS Policy Blocking Auto-Assignment**
   - ❌ User can't update job assigned_to field
   - ✅ Check: RLS policy allow admin/service update

---

**Last Updated:** 2026-02-04 (Updated with Log Findings + User List Issue)
**Status:** ✅ Analysis Complete - Root Cause Identified - Ready for Quick Fix
