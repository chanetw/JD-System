# Approval Flow & Assignment Features - Test Plan
**Date**: 2026-02-11
**Focus**: Testing approval flow display, brief links, assignee display, and approval queue menu

---

## 1. Backend Status Check

### 1.1 Verify API Returns Required Data
```bash
# Test GET /api/jobs/:id returns approvals data
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/jobs/73
```

Expected response fields:
- `flowSnapshot` (object) - approval flow configuration
- `currentLevel` (number) - current approval step
- `approvals` (array) - approval history
- `briefLink` (string) - external brief link
- `childJobs` (array) - child jobs with assignee info

---

## 2. Parent Job Brief Display Test

### Test Case 1: Brief Link Display
**Scenario**: Job has a briefLink field
**Steps**:
1. Navigate to a job with briefLink (any parent or child job)
2. Go to Overview tab
3. Check if JobBriefInfo shows link with LinkIcon

**Expected Result**:
- ✅ "ลิงก์ Brief (Brief Link)" section appears
- ✅ Link displays with external link icon
- ✅ Click opens in new tab with `rel="noopener noreferrer"`
- ✅ Layout: 3-column grid (label, spacer, link)

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobBriefInfo.jsx` (lines 54-69)

---

## 3. Parent Job Assignees Test

### Test Case 2: Unique Assignees Display
**Scenario**: Parent job has multiple child jobs with various assignees
**Steps**:
1. Navigate to a parent job (job with multiple children)
2. Go to Overview tab
3. Check if ParentJobAssignees component shows

**Expected Result**:
- ✅ "ผู้รับผิดชอบงานย่อย (Child Job Assignees)" section appears
- ✅ Shows unique assignees from all children (deduplicated)
- ✅ Shows "Unassigned (N)" if some children have no assignee
- ✅ Purple badge with UserIcon for each assignee
- ✅ Gray badge for unassigned count

**File to Check**:
- `frontend/src/modules/features/job-management/components/ParentJobAssignees.jsx`

### Test Case 3: Parent Job Filtering
**Steps**:
1. Check DJList page shows parent jobs correctly
2. Parent jobs with single child should NOT appear (hidden by design)
3. Parent jobs with multiple children should appear

**Expected Result**:
- ✅ DJ list only shows parent jobs with 2+ children
- ✅ Single-child parents are filtered out
- ✅ Child jobs displayed normally with "1 of 3" suffix

---

## 4. Job Approval Flow Display

### Test Case 4: Auto-Approve Job (No Approval Flow)
**Scenario**: Job with no approval flow (skipApproval=true)
**Steps**:
1. Navigate to a job created with "Skip Approval" option
2. Go to Overview tab
3. Look for JobApprovalFlow component

**Expected Result**:
- ✅ "เส้นทางการอนุมัติ (Approval Flow)" section shows
- ✅ Empty state: "ไม่ต้องผ่านการอนุมัติ"
- ✅ Badge: "✨ อนุมัติ(Auto)" in green
- ✅ Dashed border box styling

**File to Check**:
- `backend/api-server/src/routes/jobs.js` (line ~528 for approvals relation)
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (lines 17-29)

### Test Case 5: Pending Approval (Current Level Waiting)
**Scenario**: Job in approval flow, at level 1, waiting for approval
**Steps**:
1. Navigate to a job with pending approval at level 1
2. Check approval timeline

**Expected Result**:
- ✅ Level 1 dot is RED (animate-pulse)
- ✅ Shows "รออนุมัติ1 (ชื่อผู้มีสิทธิ์)" with clock icon
- ✅ Shows approver names from flowSnapshot.levels[0].approvers
- ✅ Background color: rose-50
- ✅ Badge animated with pulse effect

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (lines 46-117)

### Test Case 6: Approved Level (Already Passed)
**Scenario**: Job has passed level 1, now at level 2
**Steps**:
1. Navigate to a job that has approval level 1 complete
2. Check timeline display

**Expected Result**:
- ✅ Level 1 dot is GREEN (bg-green-500)
- ✅ Shows "อนุมัติ1 ({approver name})" with check icon
- ✅ Approver name from approvals[0].approver.displayName
- ✅ Background color: green-50
- ✅ Level 2 dot is RED or GRAY depending on currentLevel

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (lines 96-101)

### Test Case 7: Completed Job (All Approvals Done)
**Scenario**: Job has passed all approval levels
**Steps**:
1. Navigate to an approved job (status='approved')
2. Check final approval state

**Expected Result**:
- ✅ All level dots are GREEN
- ✅ End node ("ปลายทาง") shows "✅ อนุมัติครบแล้ว"
- ✅ Shows default assignee name if available
- ✅ condition: `currentLevel === 999 || status === 'approved'`

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (lines 119-138)

### Test Case 8: Multi-Approver Levels (ALL/ANY Logic)
**Scenario**: Approval flow has level with multiple approvers
**Steps**:
1. Navigate to job with multi-approver level
2. Check if logic badge displays

**Expected Result**:
- ✅ If logic === 'all': Badge shows "ครบทุกคน (ALL)" in purple
- ✅ If logic === 'any': Badge shows "ใครก็ได้ (ANY)" in blue
- ✅ Badge only shows if `level.approvers.length > 1`
- ✅ Positioned between level header and approver list

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (lines 67-77)

---

## 5. Assignment Features

### Test Case 9: Assign Job Button (Admin/Manager Only)
**Scenario**: View unassigned job as Admin
**Steps**:
1. Login as Admin user
2. Navigate to an unassigned job (no assignee)
3. Check if "มอบหมายงาน" button appears in JobActionPanel

**Expected Result**:
- ✅ Button shows for Admin/Manager role
- ✅ Button hidden for other roles
- ✅ Button disabled for already-assigned jobs
- ✅ Click opens assignment modal

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobActionPanel.jsx`
- `frontend/src/modules/shared/services/modules/jobService.js` (assignJobManually function)

### Test Case 10: Reassign Job Button (Current Assignee + Admin/Manager)
**Scenario**: View assigned job as current assignee
**Steps**:
1. Login as a user who is assigned to a job
2. Navigate to that job
3. Check if "ย้ายงาน" button appears

**Expected Result**:
- ✅ Button shows for current assignee
- ✅ Button shows for Admin/Manager
- ✅ Button hidden for other users
- ✅ Click opens reassignment modal

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobActionPanel.jsx`
- `frontend/src/modules/shared/services/modules/jobService.js` (reassignJob function)

---

## 6. Approval Queue Menu Test

### Test Case 11: Approval Queue Menu Visibility
**Scenario**: Check Approval Queue menu appears based on role
**Steps**:
1. Login as Approver role
2. Check Sidebar for "คิวรออนุมัติ" menu
3. Re-login as Requester
4. Check if menu is hidden

**Expected Result**:
- ✅ Menu visible for: Approver, Admin roles
- ✅ Menu hidden for: Requester, Assignee, user, staff roles
- ✅ Menu icon: ClipboardDocumentListIcon
- ✅ Route: /approvals

**File to Check**:
- `frontend/src/modules/core/components/Sidebar.jsx` (lines 41-44 for role check, lines 87-90 for menu)
- `frontend/src/modules/features/job-management/index.jsx` (lines 37-42 for route definition)

---

## 7. Integration Test

### Test Case 12: Complete User Flow
**Scenario**: Full job lifecycle with approvals
**Steps**:
1. Login as Requester
2. Create job with approval flow
3. Logout and login as Approver
4. Navigate to Approval Queue
5. Approve job
6. Check JobDetail for updated approval status

**Expected Result**:
- ✅ Job appears in Approval Queue for Approver
- ✅ After approval, approval flow updates
- ✅ Approved level shows green dot + approver name
- ✅ Job detail refreshes to show new status

---

## 8. Visual Testing Checklist

### Layout & Spacing
- ✅ JobApprovalFlow renders below JobBriefInfo
- ✅ ParentJobAssignees renders below JobApprovalFlow
- ✅ All sections have consistent padding (px-4 py-5)
- ✅ Timeline dots align vertically

### Colors & Styles
- ✅ Green dots (bg-green-500) for passed levels
- ✅ Red dots (bg-rose-500, animate-pulse) for current level
- ✅ Gray dots (bg-gray-200) for future levels
- ✅ Timeline line is light gray (bg-gray-200)
- ✅ Status badges have correct colors

### Responsive Design
- ✅ Works on mobile (320px width)
- ✅ Works on tablet (768px width)
- ✅ Works on desktop (1024px+ width)
- ✅ Text truncation works for long names

### Accessibility
- ✅ Icons have aria-hidden or proper labels
- ✅ Links open in new tab with security attributes
- ✅ Buttons have proper focus states
- ✅ Text contrast meets WCAG standards

---

## 9. Error Handling

### Test Case 13: Missing Data Graceful Degradation
**Scenario**: Job missing some fields
**Expected Result**:
- ✅ No flowSnapshot: Shows "ไม่ต้องผ่านการอนุมัติ"
- ✅ No approvals array: Shows empty status badges
- ✅ No assignee in children: Shows "Unassigned (N)"
- ✅ No briefLink: Section doesn't render

**File to Check**:
- `frontend/src/modules/features/job-management/components/JobApprovalFlow.jsx` (line 11-12 early return)
- `frontend/src/modules/features/job-management/components/ParentJobAssignees.jsx` (line 14-16 early return)
- `frontend/src/modules/features/job-management/components/JobBriefInfo.jsx` (line 54 conditional render)

---

## 10. Test Execution Log

### Execution Date: 2026-02-11

| Test Case | Component | Status | Notes |
|-----------|-----------|--------|-------|
| 1 | JobBriefInfo | ⏳ Pending | Need to verify link displays |
| 2 | ParentJobAssignees | ⏳ Pending | Need to check deduplication |
| 3 | DJList Parent Filter | ⏳ Pending | Need to verify filtering logic |
| 4 | JobApprovalFlow (Auto) | ⏳ Pending | Empty state test |
| 5 | JobApprovalFlow (Pending) | ⏳ Pending | Red dot + pulse animation |
| 6 | JobApprovalFlow (Approved) | ⏳ Pending | Green dot + check icon |
| 7 | JobApprovalFlow (Complete) | ⏳ Pending | Final state test |
| 8 | JobApprovalFlow (Multi) | ⏳ Pending | ALL/ANY logic badges |
| 9 | Assign Button (Admin) | ⏳ Pending | Permission test |
| 10 | Reassign Button | ⏳ Pending | Current assignee test |
| 11 | Approval Queue Menu | ⏳ Pending | Role-based visibility |
| 12 | Integration Flow | ⏳ Pending | End-to-end test |
| 13 | Error Handling | ⏳ Pending | Graceful degradation |

---

## 11. Known Issues & Fixes Applied

### Fixed Issues
- ✅ **DJList Page Hanging**: Fixed tenantId field name mismatch (snake_case vs camelCase)
  - Backend returns `tenantId`, DJList was looking for `tenant_id`
  - Solution: Changed DJList line 88 to use `user.tenantId`

### Potential Issues to Watch
- Slow Supabase queries if many users have complex scopes
- Brief links might not open if domain is blocked by browser
- Multi-approver logic needs database to store correct logic field

---

## 12. Next Steps

1. **Manual Testing**: Execute test cases 1-13 in a browser
2. **Screenshot Collection**: Capture approval flow states
3. **Bug Reporting**: Document any visual or functional issues
4. **Performance Check**: Monitor network requests and page load time
5. **Final Verification**: Ensure all features work before deployment

---

**Test Plan Created By**: Claude Code
**Last Updated**: 2026-02-11
**Status**: Ready for execution
