# 📋 AUTO-ASSIGNMENT FEATURE - Dev Action Plan

**Status:** 🔴 Blocking Issue Identified + Root Cause Confirmed
**Issue Date:** 2026-02-04
**For:** Development Team
**Prepared By:** Technical Analysis Team

---

## 🎯 Executive Summary

**Problem:** Auto-Assignment Features configured but not working

**Root Cause:** `skip_approval = false` in ALL Approval Flows (blocking prerequisite)

**Impact:**
- ❌ No jobs being auto-assigned
- ❌ All jobs stuck in `pending_approval` status
- ❌ Cannot see auto-assigned indicator in UI

**Solution:** Enable `skip_approval = true` in Approval Flow configuration

**Time to Fix:** ⏱️ 3-5 minutes (just enable 1 checkbox)

---

## 📊 Current State vs Desired State

### CURRENT STATE ❌
```
Approval Flow Configuration
├─ skip_approval = false ❌ (BLOCKING!)
├─ auto_assign_user_id = NULL
└─ Project Job Assignments = 10 items ✅ (Ready but unused)

When Creating Job:
├─ Status = "pending_approval" ❌
├─ Assignee = NULL ❌
├─ autoAssigned = false ❌
└─ Reason: if (isSkip && !finalAssigneeId) never true
```

### DESIRED STATE ✅
```
Approval Flow Configuration
├─ skip_approval = true ✅ (ENABLED)
├─ auto_assign_user_id = [ID] ✅
└─ Project Job Assignments = 10 items ✅

When Creating Job:
├─ Status = "assigned" ✅
├─ Assignee = [User ID] ✅
├─ autoAssigned = true ✅
└─ Reason: Auto-assignment triggered successfully
```

---

## ✅ Action Plan (4 Steps)

### **STEP 1: CRITICAL - Enable skip_approval in Approval Flows**

**Responsibility:** Frontend Dev / Admin

**Location:** Admin Dashboard → Approval Flows

**Action:**
```
1. Open: http://localhost:5137/admin/approval-flow
2. Select: Project (e.g., "Sena Development")
3. Select: Job Type (e.g., "Bug Fix")
4. FIND: Checkbox labeled "Skip Approval (ข้ามการอนุมัติ)"
5. CLICK: To enable ✅ mark
6. CLICK: "Save" button
```

**Verify:**
```sql
-- Run this SQL to confirm:
SELECT id, name, project_id, job_type_id, skip_approval
FROM approval_flows
WHERE is_active = true
LIMIT 5;

-- Should show: skip_approval = true ✅
```

**Expected Outcome:**
- ✅ `skip_approval` field = `true`
- ✅ When creating jobs → auto-assignment logic triggered

**Blockers:** None (just UI setting change)

---

### **STEP 2: VERIFY - Check Project Job Assignments**

**Responsibility:** Frontend Dev / Admin

**Location:** Admin Dashboard → Approval Flows → Assignment Matrix

**Check:**
```
1. Open Approval Flow page (as Step 1)
2. Scroll to: "Job Assignment Matrix" section
3. Verify: Each job type has an assignee selected
   ✅ If yes → Continue to Step 3
   ❌ If no → Select assignees for job types
```

**If User List Empty (Dropdown Blank):**
- Debug using [AUTO_ASSIGNMENT_UI_COMPONENTS.md](AUTO_ASSIGNMENT_UI_COMPONENTS.md)
- Or follow Phase 1-4 debugging checklist

**Expected Outcome:**
- ✅ All job types have assignees configured
- ✅ No red warnings about missing assignees

---

### **STEP 3: TEST - Create Test Job**

**Responsibility:** QA / Any Dev

**Action:**
```
1. Open: Job Request Form / Create Job Page
2. Fill in: Project, Job Type, Details
3. Submit: Create job
4. Open: DevTools (F12) → Network Tab
5. Find: POST /api/jobs request
6. Check: Response JSON
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "assigned",           // ← MUST be "assigned" NOT "pending_approval"
    "assigneeId": 5,                // ← Should have assignee ID
    "flowInfo": {
      "isSkipped": true,            // ← Should be true
      "autoAssigned": true          // ← Should be true
    }
  }
}
```

**If Response Shows:**
| Response | Status | Action |
|----------|--------|--------|
| `status: "assigned"` + `autoAssigned: true` | ✅ Working | Proceed to Step 4 |
| `status: "pending_approval"` | ❌ NOT working | Go back to Step 1 |
| `status: "error"` | ❌ ERROR | Check Backend logs |

**Troubleshooting:**
```bash
# Check backend logs (in backend terminal):
# Should see: [Jobs] Created job auto-assigned

# If not, check:
# 1. Backend console for error messages
# 2. Database connectivity
# 3. RLS policies not blocking updates
```

---

### **STEP 4: UI - Display Auto-Assignment Status** (Optional)

**Responsibility:** Frontend Dev

**Status:** Low Priority (Feature already works, just not shown)

**Action:**
Add badge/indicator to show auto-assigned jobs

**File:** Job List / Job Card Component

**Code Example:**
```jsx
{job.flowInfo?.autoAssigned && (
  <span className="badge badge-success">
    🔄 Auto-Assigned
  </span>
)}
```

**Where to Add:**
- [ ] Job List Page (show in table/card)
- [ ] Job Detail Page (show in header)
- [ ] Job Status indicator

---

## 🔍 Verification Checklist

Complete each item before marking step complete:

### Pre-Implementation
- [ ] Read this document completely
- [ ] Understood root cause (skip_approval = false)
- [ ] Understood expected outcome

### Step 1 Completion
- [ ] Opened Admin → Approval Flows
- [ ] Found "Skip Approval" checkbox
- [ ] ✅ Enabled checkbox
- [ ] Clicked Save
- [ ] Database shows `skip_approval = true` ✅

### Step 2 Completion
- [ ] Opened Assignment Matrix
- [ ] Verified assignees selected for job types
- [ ] No warnings about missing assignees
- [ ] User list loaded properly (not blank)

### Step 3 Completion
- [ ] Created test job
- [ ] Response shows `status: "assigned"` ✅
- [ ] Response shows `autoAssigned: true` ✅
- [ ] Backend logs show auto-assign success ✅

### Step 4 Completion (Optional)
- [ ] Added auto-assigned badge to UI
- [ ] Badge shows for auto-assigned jobs
- [ ] Badge doesn't show for manual assignments

---

## 🚨 Troubleshooting Decision Tree

```
Did you enable skip_approval = true?
├─ ❌ NO → Go to Step 1, do it now
└─ ✅ YES
    ├─ Does dropdown show assignees?
    │  ├─ ❌ NO → See AUTO_ASSIGNMENT_UI_COMPONENTS.md
    │  └─ ✅ YES
    │      ├─ Did you select assignees for job types?
    │      │  ├─ ❌ NO → Do it in Step 2
    │      │  └─ ✅ YES
    │      │      ├─ Create job status = "pending_approval"?
    │      │      │  ├─ ✅ YES → skip_approval not actually saved
    │      │      │  │           (check DB, might be cache issue)
    │      │      │  └─ ❌ NO
    │      │      │      ├─ Create job status = "assigned"?
    │      │      │      │  ├─ ✅ YES → ✅ Working! Go to Step 4
    │      │      │      │  └─ ❌ NO
    │      │      │      │      └─ Backend error? Check logs
    │      │      │      └─ API error (401/403/500)?
    │      │      │         ├─ ✅ YES → Report Backend issue
    │      │      │         └─ ❌ NO → Unknown error
```

---

## 📞 If Still Stuck

**Gather Information:**

1. **Screenshot of Approval Flow Settings**
   - Show skip_approval ✅ checkbox
   - Show selected assignees

2. **Backend Log Output**
   ```
   When creating job, what does console show?
   [Jobs] Created job DJ-2026-0001 with:
   - status: ?
   - skip: ?
   - autoAssigned: ?
   ```

3. **Network Response Screenshot**
   - POST /api/jobs response
   - Especially: status and flowInfo fields

4. **Database Query Results**
   ```sql
   SELECT skip_approval FROM approval_flows
   WHERE project_id = ? LIMIT 1;

   Result: skip_approval = ?
   ```

---

## 📚 Reference Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [AUTO_ASSIGNMENT_QUICK_FIX.md](AUTO_ASSIGNMENT_QUICK_FIX.md) | 3-minute quick reference | All Devs |
| [AUTO_ASSIGNMENT_RULES_ANALYSIS.md](AUTO_ASSIGNMENT_RULES_ANALYSIS.md) | Deep analysis with code locations | Senior Devs |
| [AUTO_ASSIGNMENT_UI_COMPONENTS.md](AUTO_ASSIGNMENT_UI_COMPONENTS.md) | Debug user list loading issues | Frontend Devs |
| [DEV_ACTION_PLAN.md](DEV_ACTION_PLAN.md) | This document - complete action plan | All Devs |

---

## 📈 Success Metrics

After completing all steps:

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Jobs auto-assigned | 0 | > 0 | ✅ |
| Auto-assignment logs | ❌ none | ✅ showing | ✅ |
| Auto-assigned badge | ❌ missing | ✅ showing | ✅ |
| User satisfaction | ❌ frustrated | ✅ happy | ✅ |

---

## ⏰ Timeline

| Step | Task | Owner | Time | Dependencies |
|------|------|-------|------|--------------|
| 1 | Enable skip_approval | Admin/Frontend | 3 min | None |
| 2 | Verify Assignment Matrix | Admin/Frontend | 2 min | Step 1 |
| 3 | Test Job Creation | QA/Dev | 5 min | Steps 1-2 |
| 4 | Add UI Badge | Frontend | 10 min | Steps 1-3 |
| **TOTAL** | | | **20 min** | |

---

## 🎯 Next Steps

1. **Immediate:** Share this with Dev Team
2. **Today:** Execute Steps 1-3 (15 min total)
3. **This Sprint:** Complete Step 4 (UI improvement)
4. **Done:** Auto-Assignment feature fully functional ✅

---

**Document Status:** ✅ Ready for Dev Team
**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Version:** 1.0
