# DJ System - API Standards Document

## ภาพรวม (Overview)

เอกสารนี้กำหนดมาตรฐานการออกแบบ RESTful API สำหรับระบบ DJ System ให้สอดคล้องกับ Modular Architecture และรองรับ Multi-tenant

---

## 1. Base URL & Versioning

```
Production:  https://api.dj-system.com/v1
Development: http://localhost:3000/api/v1
```

### Multi-tenant Routing
```
# Option 1: Subdomain
https://{tenant}.dj-system.com/api/v1/jobs

# Option 2: Header (Recommended)
https://api.dj-system.com/v1/jobs
Header: X-Tenant-ID: demo
```

---

## 2. Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | ✅ | Bearer Token (JWT) |
| `X-Tenant-ID` | ✅ | รหัส Tenant (เช่น "demo") |
| `Content-Type` | ✅ | `application/json` |
| `Accept-Language` | ❌ | ภาษา (th, en) - default: th |

### ตัวอย่าง Request
```http
GET /api/v1/jobs HTTP/1.1
Host: api.dj-system.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Tenant-ID: demo
Content-Type: application/json
```

---

## 3. Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  },
  "message": "ดึงข้อมูลสำเร็จ"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ถูกต้อง",
    "details": [
      { "field": "objective", "message": "ต้องมีอย่างน้อย 200 ตัวอักษร" }
    ]
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | ข้อมูลไม่ผ่านการตรวจสอบ |
| `UNAUTHORIZED` | 401 | ไม่ได้ Login หรือ Token หมดอายุ |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์เข้าถึง |
| `NOT_FOUND` | 404 | ไม่พบข้อมูล |
| `CONFLICT` | 409 | ข้อมูลซ้ำ |
| `QUOTA_EXCEEDED` | 429 | เกินโควต้า (10 งาน/โครงการ/วัน) |
| `SERVER_ERROR` | 500 | ข้อผิดพลาดภายในระบบ |

---

## 4. Endpoints by Module

### 4.1 Authentication Module
```
POST   /api/v1/auth/login          # เข้าสู่ระบบ
POST   /api/v1/auth/logout         # ออกจากระบบ
POST   /api/v1/auth/refresh        # Refresh Token
GET    /api/v1/auth/me             # ข้อมูลผู้ใช้ปัจจุบัน
PUT    /api/v1/auth/me             # แก้ไขโปรไฟล์
PUT    /api/v1/auth/password       # เปลี่ยนรหัสผ่าน
```

### 4.2 Design Jobs Module
```
GET    /api/v1/jobs                # รายการงาน (with filters)
GET    /api/v1/jobs/:id            # รายละเอียดงาน
POST   /api/v1/jobs                # สร้างงานใหม่
PUT    /api/v1/jobs/:id            # แก้ไขงาน
DELETE /api/v1/jobs/:id            # ลบงาน (soft delete)

# Actions
POST   /api/v1/jobs/:id/submit     # ส่งงาน
POST   /api/v1/jobs/:id/schedule   # ตั้งเวลาส่งงาน
POST   /api/v1/jobs/:id/cancel     # ยกเลิกการส่ง

# Brief
GET    /api/v1/jobs/:id/brief      # ดู Brief
PUT    /api/v1/jobs/:id/brief      # แก้ไข Brief
```

### 4.3 Approval Module
```
GET    /api/v1/approvals           # รายการรออนุมัติ
GET    /api/v1/approvals/history   # ประวัติการอนุมัติ
POST   /api/v1/jobs/:id/approve    # อนุมัติ
POST   /api/v1/jobs/:id/reject     # ปฏิเสธ
POST   /api/v1/jobs/:id/return     # ส่งกลับแก้ไข
```

### 4.4 Assignment Module
```
POST   /api/v1/jobs/:id/assign     # มอบหมายงาน
POST   /api/v1/jobs/:id/accept     # รับงาน
POST   /api/v1/jobs/:id/decline    # ปฏิเสธงาน (พร้อมเหตุผล)
POST   /api/v1/jobs/:id/complete   # ส่งงานเสร็จ
POST   /api/v1/jobs/:id/rework     # ขอแก้ไข
```

### 4.5 Files Module
```
# Attachments (ไฟล์แนบ Brief)
GET    /api/v1/jobs/:id/attachments           # รายการไฟล์แนบ
POST   /api/v1/jobs/:id/attachments           # อัพโหลดไฟล์แนบ
DELETE /api/v1/jobs/:id/attachments/:fileId   # ลบไฟล์แนบ

# Deliverables (ไฟล์ส่งมอบ)
GET    /api/v1/jobs/:id/deliverables          # รายการไฟล์ส่งมอบ
POST   /api/v1/jobs/:id/deliverables          # อัพโหลดไฟล์งาน
DELETE /api/v1/jobs/:id/deliverables/:fileId  # ลบไฟล์งาน

# Download
GET    /api/v1/files/:id/download             # ดาวน์โหลดไฟล์
```

### 4.6 Comments & Activities Module
```
GET    /api/v1/jobs/:id/activities   # Timeline กิจกรรม
GET    /api/v1/jobs/:id/comments     # รายการ Comments
POST   /api/v1/jobs/:id/comments     # เพิ่ม Comment
PUT    /api/v1/jobs/:id/comments/:id # แก้ไข Comment
DELETE /api/v1/jobs/:id/comments/:id # ลบ Comment
```

### 4.7 Notifications Module
```
GET    /api/v1/notifications         # รายการแจ้งเตือน
GET    /api/v1/notifications/unread  # จำนวนที่ยังไม่อ่าน
PUT    /api/v1/notifications/:id/read      # อ่านแล้ว
PUT    /api/v1/notifications/read-all      # อ่านทั้งหมด
DELETE /api/v1/notifications/:id     # ลบแจ้งเตือน
```

### 4.8 Admin Module
```
# Job Types & SLA
GET    /api/v1/admin/job-types       # รายการประเภทงาน
POST   /api/v1/admin/job-types       # เพิ่มประเภทงาน
PUT    /api/v1/admin/job-types/:id   # แก้ไขประเภทงาน
DELETE /api/v1/admin/job-types/:id   # ลบประเภทงาน

# Holidays
GET    /api/v1/admin/holidays        # รายการวันหยุด
POST   /api/v1/admin/holidays        # เพิ่มวันหยุด
PUT    /api/v1/admin/holidays/:id    # แก้ไขวันหยุด
DELETE /api/v1/admin/holidays/:id    # ลบวันหยุด
POST   /api/v1/admin/holidays/import # Import CSV

# Approval Flows
GET    /api/v1/admin/approval-flows       # รายการ Flow
POST   /api/v1/admin/approval-flows       # เพิ่ม Flow
PUT    /api/v1/admin/approval-flows/:id   # แก้ไข Flow
DELETE /api/v1/admin/approval-flows/:id   # ลบ Flow

# Users Management
GET    /api/v1/admin/users           # รายการผู้ใช้
POST   /api/v1/admin/users           # เพิ่มผู้ใช้
PUT    /api/v1/admin/users/:id       # แก้ไขผู้ใช้
DELETE /api/v1/admin/users/:id       # ลบผู้ใช้
PUT    /api/v1/admin/users/:id/roles # กำหนด Role
```

### 4.9 Reports Module
```
GET    /api/v1/reports/dashboard     # Dashboard KPIs
GET    /api/v1/reports/jobs          # รายงานงาน
GET    /api/v1/reports/sla           # รายงาน SLA
GET    /api/v1/reports/workload      # รายงาน Workload
GET    /api/v1/reports/export        # Export CSV/Excel
```

### 4.10 Media Portal Module
```
GET    /api/v1/media                 # รายการไฟล์ Media
GET    /api/v1/media/:id             # รายละเอียดไฟล์
GET    /api/v1/media/stats           # สถิติ Media Portal
GET    /api/v1/media/projects        # ไฟล์ตามโครงการ
```

### 4.11 Master Data
```
GET    /api/v1/projects              # รายการโครงการ
GET    /api/v1/buds                  # รายการ BUDs
GET    /api/v1/users/assignees       # รายการ Assignees
GET    /api/v1/users/approvers       # รายการ Approvers
```

---

## 5. Query Parameters

### Pagination
```
GET /api/v1/jobs?page=1&limit=10
```

### Sorting
```
GET /api/v1/jobs?sort=created_at&order=desc
```

### Filtering
```
GET /api/v1/jobs?status=pending_approval&project_id=5&priority=urgent
```

### Date Range
```
GET /api/v1/jobs?created_from=2024-01-01&created_to=2024-12-31
```

### Search
```
GET /api/v1/jobs?search=banner
```

### Combined Example
```
GET /api/v1/jobs?status=in_progress&project_id=5&sort=deadline&order=asc&page=1&limit=20
```

---

## 6. WebSocket Events (Real-time)

### Connection
```javascript
const socket = io('wss://api.dj-system.com', {
  auth: { token: 'Bearer xxx', tenantId: 'demo' }
});
```

### Server → Client Events
| Event | Description | Payload |
|-------|-------------|---------|
| `notification:new` | แจ้งเตือนใหม่ | `{ id, type, title, link }` |
| `job:updated` | งานถูกอัปเดต | `{ jobId, status, updatedBy }` |
| `job:assigned` | งานถูก Assign | `{ jobId, assigneeId }` |
| `comment:added` | Comment ใหม่ | `{ jobId, comment }` |
| `sla:warning` | เตือน SLA | `{ jobId, daysRemaining }` |

### Client → Server Events
| Event | Description |
|-------|-------------|
| `join:job` | เข้าร่วมห้องงาน (รับ update) |
| `leave:job` | ออกจากห้องงาน |
| `typing:start` | กำลังพิมพ์ |
| `typing:stop` | หยุดพิมพ์ |

---

## 7. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 requests/minute |
| `POST /jobs` | 10 requests/day/project |
| `POST /*/attachments` | 20 requests/minute |
| Other endpoints | 100 requests/minute |

---

## 8. File Upload

### Supported File Types
| Category | Extensions | Max Size |
|----------|------------|----------|
| Images | jpg, png, gif, webp | 10 MB |
| Documents | pdf, doc, docx, ppt, pptx | 50 MB |
| Design Files | ai, psd, eps, indd | 100 MB |
| Videos | mp4, mov, avi | 500 MB |

### Upload Endpoint
```http
POST /api/v1/jobs/:id/attachments
Content-Type: multipart/form-data

file: (binary)
attachment_type: "CI Guideline"
```

---

## 9. Business Rules (Validation)

### Create Job
- `objective`: ต้องมีอย่างน้อย 200 ตัวอักษร
- `project_id`: ต้องระบุ
- `job_type_id`: ต้องระบุ
- `subject`: ต้องระบุ

### Submit Job
- ต้องไม่เป็นช่วงเวลา 22:00-05:00
- ต้องไม่เป็นวันหยุด/สุดสัปดาห์
- ต้องไม่เกินโควต้า 10 งาน/โครงการ/วัน
- ไฟล์แนบต้องครบตามที่ Job Type กำหนด

---

## 10. Status Codes Summary

| Status | Meaning |
|--------|---------|
| 200 | OK - สำเร็จ |
| 201 | Created - สร้างสำเร็จ |
| 204 | No Content - ลบสำเร็จ |
| 400 | Bad Request - ข้อมูลไม่ถูกต้อง |
| 401 | Unauthorized - ไม่ได้ Login |
| 403 | Forbidden - ไม่มีสิทธิ์ |
| 404 | Not Found - ไม่พบข้อมูล |
| 409 | Conflict - ข้อมูลซ้ำ |
| 429 | Too Many Requests - เกินโควต้า |
| 500 | Server Error - ข้อผิดพลาดระบบ |
