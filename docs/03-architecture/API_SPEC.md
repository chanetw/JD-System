# 🔌 API Specification (DJ System Phase 2)

## 1. Authentication (Mock/Supabase)

### `POST /auth/login`
- **Desc:** Login User
- **Request:** `{ "id": number }` (Mock) or `{ "email": string, "password": string }`
- **Response:**
```json
{
  "token": "jwt_token...",
  "user": { "id": 1, "firstName": "Adirek", "roles": ["admin"] }
}
```

---

## 2. Jobs Management

### `GET /api/jobs`
- **Desc:** Get all jobs (Filtered by Role)
- **QueryParams:**
  - `status`: string (optional)
  - `myQueue`: boolean (true = filter by assignee/requester based on token)
- **Response:** `Array<Job>`

### `POST /api/jobs`
- **Desc:** Create New Job
- **Support:** Single Job & Parent-Child Job
- **Request (Single):**
```json
{
  "projectId": 1,
  "jobTypeId": 2,
  "subject": "Banner FB",
  "priority": "Normal",
  "assigneeId": 5 (Optional)
}
```
- **Request (Parent-Child):**
```json
{
  "projectId": 1,
  "subject": "Campaign Launch",
  "jobTypes": [
    { "jobTypeId": 2, "assigneeId": 5 },
    { "jobTypeId": 3, "assigneeId": 6 }
  ],
  "isParent": true
}
```

### `PATCH /api/jobs/:id/status`
- **Desc:** Update Status (General Update)
- **Request:** `{ "status": "approved", "comment": "Good job" }`

---

## 4. Approval & Workflow (Phase 3)

### `GET /api/projects/:id/flow`
- **Desc:** Get Approval Flow Diagram for a Project
- **Response:**
```json
{
  "projectId": 1,
  "nodes": [
    { "id": "1", "label": "Reviewer", "role": "Head of Graphic" },
    { "id": "2", "label": "Approver", "role": "Marketing Manager" }
  ],
  "edges": [
    { "source": "1", "target": "2" }
  ]
}
```

### `GET /api/approvals/pending`
- **Desc:** Get jobs pending for CURRENT USER's approval
- **Process:** Checks `approval_flows` vs current job status level.
- **Response:** `Array<Job>`

### `PATCH /api/jobs/:id/approve`
- **Desc:** Approve Job and move to next level
- **Request:**
```json
{
  "action": "approve",
  "comment": "OK, proceed."
}
```
- **Logic:**
  1. Check User Permission
  2. Update `activity_logs`
  3. If have next level -> Status `pending_level_2`
  4. If no next level -> Status `approved` (Ready for Assignee)

### `PATCH /api/jobs/:id/reject`
- **Desc:** Reject Job
- **Request:**
```json
{
  "action": "reject",
  "reason": "Wrong artwork",
  "sendTo": "requester" // or "previous_approver"
}
```

---

## 3. Master Data

### `GET /api/master/projects`
- **Desc:** Get Active Projects
- **Response:** `[{ "id": 1, "name": "Sena Kith", "budId": 2 }]`

### `GET /api/master/users`
- **Desc:** Get Users for Dropdowns
- **Response:** `[{ "id": 1, "displayName": "Adirek" }]`
