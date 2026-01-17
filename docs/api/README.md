# DJ System - API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.dj-system.com/api
```

## Authentication

ทุก API (ยกเว้น `/auth/login`) ต้องใช้ JWT Token ใน Header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication APIs

### 1.1 Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "สมชาย",
      "lastName": "ใจดี",
      "roles": ["marketing", "approver"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### 1.2 Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "displayName": "สมชาย Marketing",
    "roles": ["marketing"]
  }
}
```

---

## 2. Design Jobs APIs

### 2.1 Get Jobs List
```http
GET /api/jobs?status=in_progress&project=1&page=1&limit=20
```

**Query Parameters:**
- `status` - Filter by status
- `project` - Filter by project ID
- `assignee` - Filter by assignee ID
- `priority` - Filter by priority
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "djId": "DJ-2024-0001",
        "subject": "Banner Facebook Q1 Campaign",
        "status": "in_progress",
        "priority": "normal",
        "project": {
          "id": 1,
          "name": "Sena Park Grand"
        },
        "jobType": {
          "id": 1,
          "name": "Online Artwork"
        },
        "requester": {
          "id": 2,
          "displayName": "สมหญิง Marketing"
        },
        "assignee": {
          "id": 5,
          "displayName": "กานต์ Graphic"
        },
        "deadline": "2024-01-14T17:00:00Z",
        "isOverdue": true,
        "overdueDays": 2,
        "createdAt": "2024-01-01T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### 2.2 Get Job Detail
```http
GET /api/jobs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "djId": "DJ-2024-0001",
    "subject": "Banner Facebook Q1 Campaign",
    "status": "in_progress",
    "priority": "urgent",
    "project": { "id": 1, "name": "Sena Park Grand" },
    "jobType": { "id": 1, "name": "Online Artwork", "slaWorkingDays": 7 },
    "brief": {
      "objective": "ต้องการ Banner สำหรับ Facebook Ad Campaign...",
      "headline": "โปรสุดคุ้ม! ลดสูงสุด 500,000 บาท",
      "subHeadline": "เฉพาะ Q1/2025 เท่านั้น",
      "sellingPoints": ["ฟรีค่าโอน", "ฟรีค่าจดจำนอง"],
      "price": "เริ่มต้น 2.99 ล้านบาท"
    },
    "attachments": [
      {
        "id": 1,
        "fileName": "logo-pack.zip",
        "fileSize": 2621440,
        "fileType": "application/zip"
      }
    ],
    "deliverables": [
      {
        "id": 1,
        "version": 2,
        "fileName": "FB_Banner_Q1_v2.png",
        "isFinal": false
      }
    ],
    "deadline": "2024-01-14T17:00:00Z",
    "isOverdue": true,
    "overdueDays": 2
  }
}
```

### 2.3 Create Job
```http
POST /api/jobs
```

**Request Body:**
```json
{
  "projectId": 1,
  "jobTypeId": 1,
  "subject": "Banner Facebook Q1 Campaign 2025",
  "priority": "normal",
  "brief": {
    "objective": "ต้องการ Banner สำหรับ Facebook Ad Campaign...",
    "headline": "โปรสุดคุ้ม! ลดสูงสุด 500,000 บาท",
    "subHeadline": "เฉพาะ Q1/2025 เท่านั้น",
    "sellingPoints": ["ฟรีค่าโอน", "ฟรีค่าจดจำนอง"],
    "price": "เริ่มต้น 2.99 ล้านบาท"
  }
}
```

### 2.4 Submit Job
```http
POST /api/jobs/:id/submit
```

**Request Body:**
```json
{
  "scheduledSubmitAt": "2024-01-06T08:00:00Z" // Optional: for auto-submit
}
```

### 2.5 Approve Job
```http
POST /api/jobs/:id/approve
```

**Request Body:**
```json
{
  "comment": "อนุมัติ"
}
```

### 2.6 Assign Job
```http
POST /api/jobs/:id/assign
```

**Request Body:**
```json
{
  "assigneeId": 5
}
```

---

## 3. File Upload APIs

### 3.1 Upload Attachments
```http
POST /api/jobs/:id/attachments
Content-Type: multipart/form-data
```

**Form Data:**
- `files` - File(s) to upload
- `attachmentType` - Type of attachment (e.g., "CI Guideline")

**Response:**
```json
{
  "success": true,
  "data": {
    "attachments": [
      {
        "id": 1,
        "fileName": "logo-pack.zip",
        "filePath": "/uploads/jobs/1/logo-pack-1234567890.zip",
        "fileSize": 2621440,
        "fileType": "application/zip"
      }
    ]
  }
}
```

### 3.2 Upload Deliverables
```http
POST /api/jobs/:id/deliverables
Content-Type: multipart/form-data
```

**Form Data:**
- `files` - File(s) to upload
- `version` - Version number
- `isFinal` - Is this the final version? (true/false)

---

## 4. Comments & Activities APIs

### 4.1 Get Activities
```http
GET /api/jobs/:id/activities
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "activityType": "created",
        "description": "สร้างโดย สมหญิง",
        "user": {
          "id": 2,
          "displayName": "สมหญิง Marketing"
        },
        "createdAt": "2024-01-01T09:00:00Z"
      }
    ]
  }
}
```

### 4.2 Add Comment
```http
POST /api/jobs/:id/comments
```

**Request Body:**
```json
{
  "comment": "ขอให้ปรับสีโทนให้สว่างขึ้น @กานต์",
  "mentions": [5]
}
```

---

## 5. Notifications APIs

### 5.1 Get Notifications
```http
GET /api/notifications?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "job_assigned",
        "title": "DJ-2024-0156 ได้รับการ Assign แล้ว",
        "message": "งานถูก assign ให้ กานต์ Graphic",
        "link": "/jobs/1",
        "isRead": false,
        "createdAt": "2024-01-05T10:00:00Z"
      }
    ],
    "unreadCount": 8
  }
}
```

### 5.2 Mark as Read
```http
PUT /api/notifications/:id/read
```

---

## 6. Admin APIs

### 6.1 Job Types
```http
GET /api/admin/job-types
POST /api/admin/job-types
PUT /api/admin/job-types/:id
DELETE /api/admin/job-types/:id
```

### 6.2 Holidays
```http
GET /api/admin/holidays
POST /api/admin/holidays
DELETE /api/admin/holidays/:id
```

### 6.3 Approval Flows
```http
GET /api/admin/approval-flows
POST /api/admin/approval-flows
PUT /api/admin/approval-flows/:id
```

---

## 7. Reports APIs

### 7.1 Dashboard KPIs
```http
GET /api/reports/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "newToday": 3,
    "dueTomorrow": 5,
    "dueToday": 2,
    "overdue": 1
  }
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "subject",
        "message": "Subject is required"
      }
    ]
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Job not found"
  }
}
```

---

## WebSocket Events (Socket.io)

### Client → Server Events
```javascript
// Join job room
socket.emit('job:join', { jobId: 1 });

// Leave job room
socket.emit('job:leave', { jobId: 1 });
```

### Server → Client Events
```javascript
// New notification
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});

// Job updated
socket.on('job:updated', (job) => {
  console.log('Job updated:', job);
});

// New comment
socket.on('comment:added', (comment) => {
  console.log('New comment:', comment);
});
```
