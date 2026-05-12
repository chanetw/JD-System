# Test Cases: Approval History Behavior (2026-05-12)

## Scope
- Approvals Queue history tabs:
  - approved
  - not_approved
- Assignee rejection resolution flow:
  - confirm assignee rejection
  - deny assignee rejection
- Exclude auto-approved records from approved history

## Automated test cases
File: backend/api-server/src/services/approvalService.confirmAssigneeRejection.test.js

1. confirmAssigneeRejection creates rejected approval record
- Expect: create approval row with status=rejected
- Expect: approvedAt is current action timestamp
- Expect: approverId equals current approver

2. confirmAssigneeRejection rejects invalid job status
- Input status: pending_approval
- Expect: success=false, error=INVALID_STATUS
- Expect: no approval row created

3. confirmAssigneeRejection handles job not found
- Expect: success=false, error=NOT_FOUND
- Expect: no approval row created

## Manual validation cases
1. Approver A approves normal job
- Tab approved should show this job for Approver A
- Tab approved should not show for Approver B

2. Approver A rejects normal job
- Tab not_approved should show this job for Approver A

3. Assignee requests rejection, Approver A confirms rejection
- Job status becomes rejected
- Tab not_approved shows action date/time equal to confirm action time
- Actor should map to Approver A

4. Assignee requests rejection, Approver A denies rejection
- Job status becomes in_progress
- Job should not appear in approval history as rejected action

5. Auto-approved job created from requester flow
- Tab approved should not include auto-approved records

6. Status assignee_rejected (pending decision)
- Must stay in waiting tab
- Must not appear in approved/not_approved tabs

## Commands used
- node --test src/services/approvalService.confirmAssigneeRejection.test.js src/services/jobAcceptanceService.test.js src/services/adminActions.test.js
- curl http://localhost:3000/health

## Current runtime
- backend container: dj-backend-prod (in-place update, no recreate)
- frontend container: dj-frontend-prod (in-place update, no recreate)
