# Quick Test Guide: Pending_Close Workflow

Quick curl commands to test the pending_close workflow implementation.

## Prerequisites

```bash
# Set your environment variables
export API_URL="http://localhost:3000/api"
export JOB_ID=1              # Change to actual job ID
export TOKEN="your_jwt_token"  # Get from login response
```

## Test Workflow

### 1. Check Job Current Status
```bash
curl -X GET "$API_URL/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.status'
```

Expected: `"in_progress"` (before submission)

---

### 2. Assignee Submits Job (Status: in_progress → pending_close)
```bash
curl -X POST "$API_URL/jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "สมบูรณ์ครบถ้วนตามข้อกำหนด",
    "attachments": [
      {
        "name": "final_design.pdf",
        "url": "https://example.com/files/final_design.pdf"
      }
    ]
  }'
```

Expected Response:
```json
{
  "success": true,
  "status": "pending_close",
  "completedAt": "2026-02-17T10:30:00Z",
  "completedBy": 5
}
```

---

### 3. Verify Job is in pending_close Status
```bash
curl -X GET "$API_URL/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.status'
```

Expected: `"pending_close"`

---

### 4a. Option A: Requester Confirms Job Closure
```bash
curl -X POST "$API_URL/jobs/$JOB_ID/confirm-close" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "ตรวจสอบคุณภาพแล้ว ผ่านเกณฑ์"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Job closed successfully",
  "status": "completed",
  "closedAt": "2026-02-17T10:35:00Z",
  "closedBy": 3
}
```

---

### 4b. Option B: Requester Requests Revision
```bash
curl -X POST "$API_URL/jobs/$JOB_ID/request-revision" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "ต้องเปลี่ยนสีจาก blue เป็น red และปรับ font size เป็น 14px"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Revision requested successfully",
  "status": "in_progress",
  "reworkCount": 1
}
```

---

### 5. Verify Final Status
```bash
# After confirm-close
curl -X GET "$API_URL/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '{status, closedAt, closedBy}'
```

Expected: `"status": "completed"`

OR

```bash
# After request-revision
curl -X GET "$API_URL/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '{status, reworkCount}'
```

Expected: `"status": "in_progress", "reworkCount": 1`

---

## Activity Log Verification

### Check JobActivity Records
```bash
curl -X GET "$API_URL/activities?jobId=$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.[] | {activityType, description, createdAt}'
```

Expected Activities:
- `job_submitted_for_close` - From completeJob()
- `job_closed` - From confirm-close
- OR `revision_requested` - From request-revision

---

## Error Test Cases

### Invalid Job ID
```bash
curl -X POST "$API_URL/jobs/99999/confirm-close" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400` error - "Job not found"

---

### Wrong Status
```bash
# Try confirm-close on a job that's NOT in pending_close status
curl -X POST "$API_URL/jobs/1/confirm-close" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400` error - "Job status must be 'pending_close', currently 'in_progress'"

---

### Unauthorized
```bash
curl -X POST "$API_URL/jobs/$JOB_ID/confirm-close" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `401` error - "Unauthorized"

---

## Full Integration Test (Happy Path)

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

JOB_ID=1
TOKEN="your_token_here"
API_URL="http://localhost:3000/api"

echo -e "${BLUE}=== Pending_Close Workflow Test ===${NC}\n"

# Step 1: Submit job
echo -e "${BLUE}Step 1: Assignee submits job${NC}"
SUBMIT=$(curl -s -X POST "$API_URL/jobs/$JOB_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Complete"}')
STATUS=$(echo $SUBMIT | jq -r '.status')
echo "Job status: $STATUS"
[[ "$STATUS" == "pending_close" ]] && echo -e "${GREEN}✓ PASS${NC}\n" || echo -e "${RED}✗ FAIL${NC}\n"

# Step 2: Confirm closure
echo -e "${BLUE}Step 2: Requester confirms closure${NC}"
CONFIRM=$(curl -s -X POST "$API_URL/jobs/$JOB_ID/confirm-close" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Approved"}')
FINAL_STATUS=$(echo $CONFIRM | jq -r '.status')
echo "Job status: $FINAL_STATUS"
[[ "$FINAL_STATUS" == "completed" ]] && echo -e "${GREEN}✓ PASS${NC}\n" || echo -e "${RED}✗ FAIL${NC}\n"

echo -e "${GREEN}=== Test Complete ===${NC}"
```

---

## Key Endpoints Summary

| Method | Endpoint | Purpose | Status Before | Status After |
|--------|----------|---------|---------------|--------------|
| POST | `/jobs/:id/complete` | Assign submits | `in_progress` | `pending_close` |
| POST | `/jobs/:id/confirm-close` | Requester approves | `pending_close` | `completed` |
| POST | `/jobs/:id/request-revision` | Requester rejects | `pending_close` | `in_progress` |

---

## Browser Testing

1. Open DevTools (F12)
2. Go to JobDetail page for a job in `in_progress` status
3. As Assignee: Click "Complete Job" button → Status becomes `pending_close`
4. Refresh page
5. As Requester: Should see two buttons:
   - "ยืนยันปิดงาน" (Confirm Close) → Status becomes `completed`
   - "ขอให้แก้ไข" (Request Revision) → Status back to `in_progress`
6. Click one of the buttons and verify status change

---

## Troubleshooting

### Error: "Job status must be 'pending_close'"
**Cause**: Job is not in pending_close status
**Solution**: First submit job with `/jobs/:id/complete` to set pending_close status

### Error: "Job not found"
**Cause**: Job ID doesn't exist or belongs to different tenant
**Solution**: Verify job ID is correct and you're authorized to access it

### Error: "Unauthorized"
**Cause**: Missing or invalid JWT token
**Solution**: Login again and get fresh token from `/api/v2/auth/login`

### Endpoint not found (404)
**Cause**: Endpoints not deployed or commit not applied
**Solution**: Verify commits caeb407 and 5a607de are in main branch

---

**Last Updated**: February 17, 2026
**Status**: Ready for testing ✅
