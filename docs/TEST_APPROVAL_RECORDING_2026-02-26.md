# Approval Recording Implementation - Test Plan
**Date**: 2026-02-26
**Status**: Ready for Testing
**Commit**: 7dc5d74

## Implementation Summary

### What Was Fixed

**Problem**: Child jobs and regular jobs that skip approval flow were not creating any approval records in the database, making audit trail incomplete.

**Solution**: Implemented explicit approval record creation at three key points:

1. **Parent-Child Job Creation** (`POST /api/jobs/parent-child`)
   - When child job status = 'approved' or 'in_progress' (skips approval flow)
   - Creates implicit approval record with comment: "Auto-approved: No approval flow required" or "Auto-approved: Job assigned with implicit approval"
   - Records requester as the approver

2. **Dependent Job Auto-Start** (when predecessor completes)
   - When a job transitions from 'pending_dependency' to 'assigned'
   - Creates implicit approval record with comment: "Auto-approved: Dependent job auto-started by predecessor completion"
   - Ensures sequential jobs have audit trail

3. **Regular Job Creation** (`POST /api/jobs`)
   - When job approval flow is skipped (isSkip=true)
   - Creates implicit approval record with appropriate comment based on whether job was auto-assigned
   - Covers both 'approved' and 'in_progress' statuses

## Test Cases

### Test 1: Parent-Child Job with Skipped Approval Flow

**Setup**:
- Create parent-child job with 3 child jobs
- Job types should have NO approval flow required (skipApproval=true)

**Steps**:
```bash
POST /api/jobs/parent-child
{
  "projectId": 1,
  "subject": "Test Parent Job",
  "priority": "normal",
  "jobTypes": [
    { "jobTypeId": 1 },
    { "jobTypeId": 2 },
    { "jobTypeId": 3 }
  ]
}
```

**Verification**:
1. Parent job created with status 'assigned'
2. All 3 child jobs created with status 'in_progress' or 'approved'
3. In database, check approvals table:
```sql
SELECT id, job_id, approver_id, step_number, status, comment
FROM approvals
WHERE job_id IN (SELECT id FROM jobs WHERE parent_job_id = <parent_id>);
```
4. **Expected**: 3 approval records created
   - stepNumber = 1
   - status = 'approved'
   - comment contains "Auto-approved"

### Test 2: Sequential Jobs (Dependent/Chained)

**Setup**:
- Create parent-child job with 2 sequential jobs
  - Job A (no dependencies)
  - Job B (depends on A)

**Steps**:
```bash
POST /api/jobs/parent-child
{
  "projectId": 1,
  "subject": "Sequential Test",
  "jobTypes": [
    { "jobTypeId": 1, "assigneeId": 123 },
    { "jobTypeId": 2, "assigneeId": 124, "predecessorIndex": 0 }
  ]
}
```

**Verification**:
1. Job A created with status 'in_progress' (if assignee)
2. Job B created with status 'pending_dependency'
3. Job A has approval record (from parent-child creation)
4. Job B initially has NO approval record (waiting for predecessor)
5. Complete Job A via: `POST /api/jobs/:id/complete`
6. Job B status changes to 'assigned'
7. Check approvals table:
```sql
SELECT * FROM approvals WHERE job_id = <job_b_id>;
```
8. **Expected**: Approval record created when Job B transitioned to 'assigned'
   - comment contains "Dependent job auto-started"

### Test 3: Regular Job with Skipped Approval

**Setup**:
- Enable skip approval flow for a job type
- Create regular (non-parent-child) job

**Steps**:
```bash
POST /api/jobs
{
  "projectId": 1,
  "jobTypeId": 1,  // Must have skipApproval=true
  "subject": "Regular Skip Test",
  "dueDate": "2026-03-15"
}
```

**Verification**:
1. Job created with status 'approved'
2. Check approvals table:
```sql
SELECT * FROM approvals WHERE job_id = <job_id>;
```
3. **Expected**: One approval record with:
   - stepNumber = 1
   - status = 'approved'
   - comment: "Auto-approved: Skipped approval flow (awaiting assignee)"

### Test 4: Regular Job with Skipped Approval + Auto-Assign

**Setup**:
- Enable skip approval AND auto-assign for job type

**Steps**:
```bash
POST /api/jobs
{
  "projectId": 1,
  "jobTypeId": 1,  // Must have skipApproval=true + autoAssign enabled
  "subject": "Regular Skip + Auto-Assign Test",
  "dueDate": "2026-03-15"
}
```

**Verification**:
1. Job created with status 'in_progress' (auto-assigned)
2. Check approvals table:
```sql
SELECT * FROM approvals WHERE job_id = <job_id>;
```
3. **Expected**: One approval record with:
   - status = 'approved'
   - comment: "Auto-approved & auto-assigned: Skipped approval flow with auto-assignment"

### Test 5: Job with Approval Flow (Auto-Approve)

**Setup**:
- Job type with approval flow where requester is approver
- Create regular job

**Expected Result** (unchanged):
- Job created with status 'pending_approval'
- Auto-approve function called and creates approval record
- Job status advances to 'pending_level_2', 'approved', or 'in_progress'
- Existing auto-approve flow continues to work

## Verification Queries

### Check All Job Approval Records
```sql
SELECT
  j.id, j.dj_id, j.status,
  a.id as approval_id, a.approver_id, a.step_number, a.status as approval_status,
  a.comment, a.approved_at
FROM jobs j
LEFT JOIN approvals a ON j.id = a.job_id
WHERE j.id IN (<job_ids>)
ORDER BY j.id, a.step_number;
```

### Check Approval Records Count by Job Status
```sql
SELECT
  j.status,
  COUNT(j.id) as total_jobs,
  COUNT(a.id) as jobs_with_approvals,
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as jobs_without_approvals
FROM jobs j
LEFT JOIN approvals a ON j.id = a.job_id
WHERE j.created_at > now() - interval '1 day'
GROUP BY j.status;
```

### Check for Jobs Without Approval Records (Issue Detection)
```sql
SELECT j.id, j.dj_id, j.status, j.is_parent, j.parent_job_id
FROM jobs j
LEFT JOIN approvals a ON j.id = a.job_id
WHERE a.id IS NULL
  AND j.created_at > now() - interval '1 day'
  AND j.status NOT IN ('draft', 'pending_dependency');
-- Should return EMPTY set if all jobs have approval records
```

## Expected Outcomes

### Before Fix
- Child jobs created: 3
- Approval records created: 0
- `approvals` table empty
- No audit trail for skipped/auto-approved flows

### After Fix
- Child jobs created: 3
- Approval records created: 3 (one implicit approval per job)
- `approvals` table shows:
  - All 3 jobs have stepNumber=1, status='approved'
  - Comments explain why approved (no flow, auto-assigned, etc.)
- Complete audit trail for all job creation paths

## Regression Testing

### Existing Flows Should Still Work

1. **Multi-Level Approval** ✅
   - Job created with status 'pending_approval'
   - Auto-approve Level 1 if requester is approver
   - Advance to 'pending_level_2' if more levels
   - Approval records created by auto-approve

2. **Manual Approval** ✅
   - Job in 'pending_approval' status
   - Approver manually approves via UI
   - Approval records created via approval endpoint
   - No change to existing behavior

3. **Parent Job Only** ✅
   - Parent job created with smart status (assigned or pending_approval)
   - No changes to parent job logic
   - Only child jobs get implicit approvals

## Deployment Steps

1. Verify tests pass (see Test Cases above)
2. Ensure database migration applied (if any - currently none needed)
3. Restart backend
4. Test approval records appear in database for new jobs
5. Monitor logs for any errors in approval record creation

## Rollback Plan

If issues occur:
1. Revert commit: `git revert 7dc5d74`
2. Restart backend
3. No database cleanup needed (extra approval records are harmless)

## Notes

- Approval record creation is wrapped in try/catch to prevent job creation failures
- If approval record creation fails, job is created successfully but warning logged
- Implicit approvals are marked with comments distinguishing them from manual approvals
- All changes are additive (no breaking changes to existing logic)
