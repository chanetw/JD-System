# Implementation: Pending_Close Job Workflow

## Overview

Implemented the intermediate "pending_close" status in the job workflow to provide Requesters with the ability to confirm job completion or request revisions from Assignees before final closure.

**Status**: ✅ **COMPLETE** - Ready for testing and deployment
**Commit**: caeb407 (Schema change, Service changes, Route additions), 5a607de (Fixed Socket.io calls)
**Date**: February 17, 2026

---

## Architecture & Design

### Job Workflow Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ ASSIGNEE: Submits Job                                        │
│ POST /api/jobs/:id/complete                                 │
│ Status: in_progress → pending_close                          │
│ (approvalService.completeJob sets status to pending_close)  │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼──────────┐     ┌───────▼──────────┐
        │    REQUESTER     │     │    REQUESTER     │
        │ Choice A: Accept │     │ Choice B: Reject │
        └───────┬──────────┘     └───────┬──────────┘
                │                         │
        ┌───────▼──────────┐     ┌───────▼──────────┐
        │ POST confirm-    │     │ POST request-    │
        │ close            │     │ revision         │
        └───────┬──────────┘     └───────┬──────────┘
                │                         │
        ┌───────▼──────────┐     ┌───────▼──────────┐
        │ Status:          │     │ Status:          │
        │ pending_close → │     │ pending_close → │
        │ completed        │     │ in_progress      │
        │                  │     │ Rework Count++   │
        │ Job CLOSED ✅    │     │ Awaiting Rework  │
        └──────────────────┘     └──────────────────┘
```

---

## Code Changes

### 1. Database Schema (schema.prisma)

#### Location
`/backend/prisma/schema.prisma` - Lines 24-36

#### Change
Added `pending_close` enum value to `JobStatus`:

```prisma
enum JobStatus {
  draft
  scheduled
  submitted
  pending_approval
  approved
  assigned
  in_progress
  rework
  rejected
  pending_close          // 🆕 NEW: Intermediate status before completion
  completed
  closed
}
```

#### Migration
File: `/backend/prisma/migrations/manual/add_pending_close_status.sql`

```sql
ALTER TYPE "JobStatus" ADD VALUE 'pending_close' BEFORE 'completed';
```

---

### 2. Backend Service Changes

#### File
`/backend/api-server/src/services/approvalService.js`

#### Method: `completeJob()`
**Lines**: 879-927

**What Changed**:
- Status now set to `'pending_close'` instead of `'completed'`
- Activity type changed to `'job_submitted_for_close'`
- Description updated: "ส่งมอบงาน - รอยืนยันปิดงาน"

**Before**:
```javascript
data: {
  status: 'completed',      // ❌ Direct to completed
  completedAt: new Date(),
  completedBy: userId,
  finalFiles: attachments
}
```

**After**:
```javascript
data: {
  status: 'pending_close',  // ✅ Intermediate status
  completedAt: new Date(),
  completedBy: userId,
  finalFiles: attachments
}
```

---

### 3. Backend Route Changes

#### File
`/backend/api-server/src/routes/jobs.js`

#### New Endpoint 1: `POST /api/jobs/:id/confirm-close`
**Lines**: 1478-1530

**Purpose**: Requester confirms job completion
**Request Body**:
```json
{
  "note": "ตรวจสอบคุณภาพแล้ว"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job closed successfully",
  "job": { /* updated job data */ }
}
```

**Actions**:
1. Validates job exists and is in `pending_close` status
2. Updates status: `pending_close` → `completed`
3. Sets `closedAt` and `closedBy` timestamps
4. Creates `jobActivity` record with type `'job_closed'`
5. Creates optional `jobComment` if note provided
6. Returns updated job

**Error Handling**:
- Returns 404 if job not found
- Returns 400 if job status not `pending_close`
- Returns 500 for database errors

---

#### New Endpoint 2: `POST /api/jobs/:id/request-revision`
**Lines**: 1532-1583

**Purpose**: Requester requests assignee to revise job
**Request Body**:
```json
{
  "note": "ต้องเปลี่ยนสีจาก blue เป็น red"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Revision requested successfully",
  "job": { /* updated job data */ }
}
```

**Actions**:
1. Validates job exists and is in `pending_close` status
2. Updates status: `pending_close` → `in_progress`
3. Increments `reworkCount` by 1
4. Creates `jobActivity` record with type `'revision_requested'`
5. Creates optional `jobComment` if note provided
6. Returns updated job

**Error Handling**:
- Returns 404 if job not found
- Returns 400 if job status not `pending_close`
- Returns 500 for database errors

---

### 4. Frontend Changes

#### File
`/frontend/src/modules/features/job-management/pages/JobDetail.jsx`

#### Function 1: `handleConfirmClose()`
**Lines**: 254-269

**Behavior**:
```javascript
const handleConfirmClose = async () => {
    if (!confirm('ยืนยันปิดงาน?')) return;  // Confirmation dialog
    try {
        const response = await api.post(`/jobs/${id}/confirm-close`, {
            note: ''
        });
        if (response.data.success) {
            alert('ปิดงานเรียบร้อย');
            loadJob();  // Reload job data
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (err) {
        console.error('Error confirming close:', err);
        alert('Error: ' + (err.message || 'ไม่ทราบสาเหตุ'));
    }
};
```

**User Interaction**:
1. Requester clicks "ยืนยันปิดงาน" button
2. Confirmation dialog appears: "ยืนยันปิดงาน?"
3. On confirm: API call to `/jobs/:id/confirm-close`
4. On success: Alert "ปิดงานเรียบร้อย" + reload
5. On error: Alert with error message

---

#### Function 2: `onRequestRevision()`
**Lines**: 271-286

**Behavior**:
```javascript
const onRequestRevision = async () => {
    const revisionNote = prompt('กรุณาระบุจุดแก้ไข (Optional):');
    if (revisionNote === null) return;  // User cancelled
    try {
        const response = await api.post(`/jobs/${id}/request-revision`, {
            note: revisionNote || ''
        });
        if (response.data.success) {
            alert('ขอให้แก้ไขเรียบร้อย');
            loadJob();  // Reload job data
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (err) {
        console.error('Error requesting revision:', err);
        alert('Error: ' + (err.message || 'ไม่ทราบสาเหตุ'));
    }
};
```

**User Interaction**:
1. Requester clicks "ขอให้แก้ไข" button
2. Prompt appears: "กรุณาระบุจุดแก้ไข (Optional):"
3. User enters revision notes or cancels
4. On submit: API call to `/jobs/:id/request-revision`
5. On success: Alert "ขอให้แก้ไขเรียบร้อย" + reload
6. On error: Alert with error message

---

## Database Field Requirements

### Job Model Fields Used

The implementation uses existing fields in the Job model:

| Field | Type | Purpose | Required |
|-------|------|---------|----------|
| `status` | `JobStatus` enum | Current job status | ✅ Yes |
| `completedAt` | DateTime | When assignee submitted | ✅ Yes (set by completeJob) |
| `completedBy` | Int | Assignee ID | ✅ Yes (set by completeJob) |
| `closedAt` | DateTime | When requester confirmed | ✅ Yes (set by confirm-close) |
| `closedBy` | Int | Requester ID | ✅ Yes (set by confirm-close) |
| `reworkCount` | Int | Number of revisions | ✅ Yes (incremented by request-revision) |
| `finalFiles` | JSON | Deliverable files | ✅ Yes (set by completeJob) |

**Note**: All required fields already exist in the schema. No additional database migrations needed for fields.

---

## Testing Checklist

### ✅ Pre-Deployment Tests

- [ ] **Database Migration**
  - [ ] Run: `psql $DATABASE_URL < backend/prisma/migrations/manual/add_pending_close_status.sql`
  - [ ] Verify: `SELECT enum_range(NULL::"JobStatus");` includes `pending_close`

- [ ] **Backend API Tests**
  - [ ] POST `/api/jobs/:id/complete` → status becomes `pending_close`
  - [ ] POST `/api/jobs/:id/confirm-close` with valid job → status `pending_close` → `completed`
  - [ ] POST `/api/jobs/:id/confirm-close` with invalid status → 400 error
  - [ ] POST `/api/jobs/:id/request-revision` with valid job → status `pending_close` → `in_progress`
  - [ ] POST `/api/jobs/:id/request-revision` → reworkCount increments
  - [ ] Both endpoints create jobActivity records
  - [ ] Both endpoints create jobComment if note provided

- [ ] **Frontend UI Tests**
  - [ ] Requester views pending_close job → sees "ยืนยันปิดงาน" and "ขอให้แก้ไข" buttons
  - [ ] Click "ยืนยันปิดงาน" → confirmation dialog → API call → reload
  - [ ] Click "ขอให้แก้ไข" → prompt for notes → API call → reload
  - [ ] Job status updates correctly in JobDetail after action
  - [ ] Activity log shows correct entries

- [ ] **User Experience Tests**
  - [ ] Assignee can submit job (pending_close status)
  - [ ] Requester receives notification (via existing system)
  - [ ] Requester can confirm or request revision
  - [ ] Assignee sees revised job in dashboard (if revision requested)
  - [ ] Completed job shows correct status and timestamps

- [ ] **Edge Cases**
  - [ ] Cannot confirm/revise non-pending_close job
  - [ ] Multiple revisions increase reworkCount correctly
  - [ ] Notes/comments preserved through workflow
  - [ ] Audit trail (jobActivity) shows all actions

---

## Deployment Steps

### 1. Database Setup
```bash
# Apply migration
psql $DATABASE_URL -f backend/prisma/migrations/manual/add_pending_close_status.sql

# Verify
psql $DATABASE_URL -c "SELECT enum_range(NULL::\"JobStatus\");"
```

### 2. Backend Deployment
```bash
cd backend/api-server
npm install  # if needed
npm run dev  # test locally

# Production: Restart service
npm run build  # if using compiled version
pm2 restart dj-system-api  # or your process manager
```

### 3. Frontend Deployment
```bash
cd frontend
npm run build
# Deploy to your hosting (Vercel, Netlify, etc.)
```

### 4. Verification
```bash
# Check health
curl http://localhost:3000/health

# Test endpoints
curl -X POST http://localhost:3000/api/jobs/1/confirm-close \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"test"}'
```

---

## Rollback Plan

If issues are discovered:

### Immediate Rollback (Database)
```bash
# PostgreSQL doesn't easily allow enum value removal
# Instead, mark status as unused:
# 1. Update jobs with pending_close status back to in_progress
UPDATE job SET status = 'in_progress'
WHERE status = 'pending_close';

# 2. Comment out pending_close from schema.prisma
# 3. Revert routes and services
# 4. Redeploy backend
```

### Code Rollback
```bash
# Revert to previous commits
git revert caeb407  # Pending_close implementation
git revert 5a607de  # Socket.io fix
git push origin main
```

---

## Known Limitations

1. **No Socket.io Real-time Updates**
   - Socket.io emissions removed (function not available)
   - Real-time updates can be added later through NotificationService
   - Activity logs still created for audit trail

2. **No Email Notifications**
   - Can be integrated with existing emailService if needed
   - NotificationService supports batch email sending

3. **No Approval Rules Bypass**
   - Requester must manually confirm/reject
   - Automation can be added in future versions

---

## Future Enhancements

1. **Auto-Approve Logic**
   - Allow Requesters to set auto-approval rules
   - Automatically confirm if quality thresholds met

2. **Revision History**
   - Track revision count and timestamps
   - Show revision feedback in timeline

3. **SLA Tracking**
   - Calculate SLA compliance during pending_close status
   - Alert if revision takes too long

4. **Notification System**
   - Send email/SMS to Requester when job reaches pending_close
   - Send notification to Assignee if revision requested

5. **Batch Confirm/Reject**
   - Allow Requesters to confirm multiple jobs at once
   - Useful for reviewing multiple deliverables

---

## Files Modified

### Backend
- ✅ `/backend/prisma/schema.prisma` - Added enum value
- ✅ `/backend/api-server/src/services/approvalService.js` - Modified completeJob()
- ✅ `/backend/api-server/src/routes/jobs.js` - Added 2 new endpoints
- ✅ `/backend/prisma/migrations/manual/add_pending_close_status.sql` - NEW migration

### Frontend
- ✅ `/frontend/src/modules/features/job-management/pages/JobDetail.jsx` - Implemented handlers

### Documentation
- ✅ `/docs/IMPLEMENTATION_PENDING_CLOSE_WORKFLOW.md` - This file

---

## Commits

| Commit | Message | Changes |
|--------|---------|---------|
| caeb407 | Implement pending_close workflow | Schema, Service, Routes, Frontend, Migration |
| 5a607de | Fix: Remove getSocketIO() calls | Removed undefined Socket.io emissions |

---

## Questions & Support

**Q: Where are notifications handled?**
A: Activity logs are created in jobActivity table. Real-time notifications can be triggered through NotificationService if needed.

**Q: Can Assignee change mind after submitting?**
A: Not directly. Only Requester can send job back to in_progress for revision. Assignee must wait for feedback.

**Q: What if job gets deleted while in pending_close?**
A: All API calls check if job exists before processing. Returns 404 if not found.

**Q: How many revisions can a job have?**
A: Unlimited. reworkCount increments each time request-revision is called. No maximum limit enforced.

**Q: Are old jobs affected?**
A: No. Only new jobs created after deployment will use pending_close. Existing completed jobs remain unchanged.

---

**Last Updated**: February 17, 2026
**Status**: Ready for testing and deployment ✅
