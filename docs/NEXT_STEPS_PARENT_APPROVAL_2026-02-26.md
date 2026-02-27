# Next Steps: Parent Job Approval Record Investigation

**Status**: Parent approval record creation issue identified but root cause unclear
**Affected Test**: DJ-260226-0009
**Issue**: Parent status='approved' but approval_count=0, while child has approval_count=1

## What We Know ✅

1. **Child approval records ARE being created** (working correctly)
   - Created via implicit approval at line 2084-2104 in jobs.js
   - Triggered when childStatus = 'in_progress' or 'approved'
   - Shows up correctly in database

2. **Parent auto-approve IS being called** (status advances)
   - Parent status changes from 'pending_approval' → 'approved' or 'pending_level_2'
   - This means the autoApproveIfRequesterIsApprover() function is executing successfully
   - And the job status update at line 1750-1756 is working

3. **But parent approval record is MISSING** (not in database)
   - Should be created at line 1712-1722 in approvalService.js
   - But query returns 0 approval records for parent job

## Root Cause Hypothesis

**Most Likely**: The approval record creation (line 1712-1722 in approvalService.js) is **throwing an error silently**:
```javascript
// Line 1712-1722 in approvalService.js
const approval = await this.prisma.approval.create({
  data: {
    jobId,              // Could be null or invalid?
    approverId: requesterId,
    stepNumber: 1,
    status: 'approved',
    approvedAt: new Date(),
    comment: 'Auto-approved: ผู้สร้างงานเป็นผู้อนุมัติ',
    tenantId
  }
});
```

**Why it doesn't show as error in parent status**:
- If approval creation fails, the error is caught at line 1785-1788
- But the job update (line 1750-1756) happens BEFORE the approval creation
- So job status changes successfully, but approval record is not created

## Your Task: Verify Root Cause

### Option A: Quick Check (5 minutes)
```bash
# 1. Restart backend and watch logs
cd backend/api-server
npm run dev | grep -E "\[(Parent-Child|AutoApprove|ApprovalService)\]"

# 2. In another terminal, create test job:
curl -X POST http://localhost:3000/api/jobs/parent-child \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "subject": "Debug Parent Approval",
    "priority": "normal",
    "jobTypes": [
      { "jobTypeId": 1 }
    ]
  }'

# 3. Watch for log lines:
# - Should see: "[Parent-Child] Auto-approved parent DJ-..."
# - Look for: "[ApprovalService] autoApproveIfRequesterIsApprover error:" ← KEY LINE

# 4. Note the DJ ID from response, then run:
psql $DATABASE_URL -c "SELECT * FROM approvals WHERE job_id IN (SELECT id FROM jobs WHERE dj_id = 'DJ-...');"
```

### Option B: Full Investigation (15 minutes)
Follow the detailed steps in `/docs/DEBUG_PARENT_APPROVAL_2026-02-26.md`

## Likely Fix

Once we confirm the error, it's probably one of:

1. **jobId is null or invalid**
   - Fix: Add validation before approval creation

2. **tenantId is null**
   - Fix: Ensure tenantId is passed correctly through the function chain

3. **Prisma constraint violation**
   - Fix: Check database schema for missing constraints or unique violations

4. **Job status update runs before approval creation finishes**
   - Fix: Move approval creation before job update (wrap in Promise.all if independent)

## Recommended Action

**RUN OPTION A FIRST** - It will tell us immediately if there's an error in the logs.

If you see `[ApprovalService] autoApproveIfRequesterIsApprover error:`, we'll know exactly what failed.

If you don't see that error, then the approval record is being created but something else is wrong (query issue, database issue, etc).

## Files to Check

- **Main endpoint**: `/backend/api-server/src/routes/jobs.js` (lines 2276-2290)
- **Auto-approve service**: `/backend/api-server/src/services/approvalService.js` (lines 1675-1789)
- **Error handling**: Line 1785-1788 in approvalService.js

## Commit Ready?

Once we fix this, commit with message:
```
fix: Parent job approval record creation in auto-approve workflow

- Identified and fixed approval record creation for parent jobs with auto-approve
- Ensures complete audit trail for all job workflows
- Related to issue: Parent approval records not appearing in database
```

---

**Next**: Run Option A debug steps and share the backend logs. We'll have the answer immediately.
