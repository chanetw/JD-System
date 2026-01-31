# User Registration Approval Workflow - API Endpoints Summary

**Date:** January 30, 2026
**Version:** 1.0

---

## Registration Request (User - No Password)

### Endpoint
```
POST /api/v2/auth/register-request
```

### Description
User submits registration form without password. Creates user with PENDING status.

### Request Body
```json
{
  "email": "user@example.com",
  "firstName": "สมเด็จ",
  "lastName": "ศรี",
  "title": "นาย",
  "phone": "08xxxxxxxx",
  "position": "Design Engineer",
  "department": "Design",
  "tenantId": 1
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "สมเด็จ",
    "lastName": "ศรี",
    "registrationStatus": "PENDING",
    "isActive": false
  },
  "message": "Registration request submitted. Awaiting admin approval."
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "EMAIL_EXISTS",
  "message": "Email already registered"
}
```

### Status Codes
- `201` - Registration request created
- `400` - Validation error
- `409` - Email already exists

---

## Approve Registration (Admin)

### Endpoint
```
POST /api/v2/auth/approve-registration
```

### Description
Admin approves registration. System generates temporary password and sends email.

### Authentication
Required: Bearer token (admin only)

### Request Body
```json
{
  "userId": 123,
  "approvedById": 456,
  "roleName": "Member"
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "firstName": "สมเด็จ",
      "lastName": "ศรี",
      "isActive": true,
      "mustChangePassword": true,
      "registrationStatus": "APPROVED"
    },
    "temporaryPassword": "aB3@mNpQxYz",
    "emailSent": true,
    "message": "User approved and notification email sent"
  }
}
```

### Response (Email Failed)
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "temporaryPassword": "aB3@mNpQxYz",
    "emailSent": false,
    "message": "User approved but email failed to send. Show password manually."
  }
}
```

### Status Codes
- `200` - Approval successful
- `400` - Validation error
- `404` - User not found
- `401` - Not authorized

---

## Reject Registration (Admin)

### Endpoint
```
POST /api/v2/auth/reject-registration
```

### Description
Admin rejects registration. System sends rejection email.

### Authentication
Required: Bearer token (admin only)

### Request Body
```json
{
  "userId": 123,
  "reason": "ไม่ตรงตำแหน่ง"
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "registrationStatus": "REJECTED"
    },
    "emailSent": true,
    "message": "Rejection notification sent to user"
  }
}
```

### Status Codes
- `200` - Rejection successful
- `400` - Validation error
- `404` - User not found
- `401` - Not authorized

---

## Change Password (User - Forced)

### Endpoint
```
POST /api/v2/auth/change-password
```

### Description
User changes password after approval. Clears `mustChangePassword` flag.

### Authentication
Required: Bearer token (user's own token)

### Request Body
```json
{
  "currentPassword": "aB3@mNpQxYz",
  "newPassword": "MyNewPass123!"
}
```

**Note:** If called without `currentPassword`, system assumes forced change after approval.

### Response (Success)
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully",
    "mustChangePassword": false
  }
}
```

### Response (Error - Weak Password)
```json
{
  "success": false,
  "error": "WEAK_PASSWORD",
  "message": "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters"
}
```

### Status Codes
- `200` - Password changed successfully
- `400` - Validation error / weak password
- `401` - Not authenticated / wrong current password
- `422` - Unprocessable entity

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (@#$%&*)

---

## Login (User)

### Endpoint
```
POST /api/v2/auth/login
```

### Description
User logs in with email and password.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "MyNewPass123!",
  "tenantId": 1
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "firstName": "สมเด็จ",
      "lastName": "ศรี",
      "roleName": "Member",
      "isActive": true,
      "mustChangePassword": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Response (First Login - Must Change Password)
```json
{
  "success": true,
  "data": {
    "user": {
      ...
      "mustChangePassword": true  // Frontend redirects to /force-change-password
    },
    "token": "...",
    "expiresIn": "24h"
  }
}
```

### Status Codes
- `200` - Login successful
- `400` - Validation error
- `401` - Invalid credentials
- `403` - Account not approved / not active

---

## Email Templates

### Approval Email

**Subject:** ✅ บัญชีของคุณได้รับการอนุมัติแล้ว

**HTML Content:**
```
สวัสดีค่ะ/ครับ [User Name],

ยินดีต้อนรับสู่ DJ System!

บัญชีของคุณได้รับการอนุมัติจากผู้ดูแลระบบแล้ว

รหัสผ่านชั่วคราวของคุณ:
┌─────────────────────┐
│ aB3@mNpQxYz       │
└─────────────────────┘

⚠️ สำคัญ:
- ใช้รหัสผ่านนี้เพื่อเข้าสู่ระบบครั้งแรก
- ระบบจะให้คุณตั้งรหัสผ่านใหม่ของตัวเองหลังจากเข้าสู่ระบบ
- อย่าแชร์รหัสผ่านนี้กับใครอื่น

[ลิงก์เข้าสู่ระบบ]

หากมีคำถาม โปรดติดต่อทีม Support

ด้วยความเคารพ,
ทีม DJ System
```

---

### Rejection Email

**Subject:** ℹ️ ผลการพิจารณาการสมัครใช้งาน DJ System

**HTML Content:**
```
สวัสดีค่ะ/ครับ [User Name],

ขอบคุณสำหรับการสมัครใช้งาน DJ System

เราขออภัยที่การสมัครของคุณไม่ได้รับการอนุมัติในครั้งนี้

เหตุผล: [Admin Reason]

หากคุณมีคำถาม โปรดติดต่อทีม Support

ด้วยความเคารพ,
ทีม DJ System
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `EMAIL_EXISTS` | 409 | Email already registered |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `NOT_AUTHORIZED` | 401 | Insufficient permissions |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `PASSWORD_MISMATCH` | 400 | Passwords don't match |
| `INVALID_TOKEN` | 401 | Token expired or invalid |
| `ACCOUNT_NOT_ACTIVE` | 403 | Account not approved or disabled |
| `EMAIL_SEND_FAILED` | 500 | Email service error (non-blocking) |

---

## Data Flow

```
Frontend                    Backend                  Email Service
   │                           │                           │
   ├─ POST register-request ──→ │                           │
   │                           ├─ Create user (PENDING)    │
   │                           ├─ Save to DB               │
   │                      ← Success response ──┤
   │                           │                           │
   │ [User waits for approval] │                           │
   │                           │                           │
   │                      Admin approves                   │
   │                           │                           │
   │                 POST approve-registration             │
   │                      ← ├─ Generate password           │
   │                           ├─ Hash & save to DB        │
   │                           ├─ Set mustChangePassword   │
   │                           ├─ Send email ─────────────→│
   │ ← Success (or fallback) ──┤                           │
   │                           │                    ← Success
   │                           │                           │
   │ [User receives email]     │                           │
   │                           │                           │
   ├─ POST login ──────────────→│                           │
   │ (with temp password)      ├─ Verify credentials      │
   │                           ├─ Generate JWT token      │
   │                      ← Token + mustChangePassword
   │                           │                           │
   │ [Frontend detects mustChangePassword = true]          │
   │ [Redirects to /force-change-password]                │
   │                           │                           │
   ├─ POST change-password ────→│                           │
   │ (new password)            ├─ Hash password            │
   │                           ├─ Clear mustChangePassword │
   │                           ├─ Save to DB               │
   │ ← Success response ────────┤                           │
   │                           │                           │
   ├─ Redirect to dashboard ───→│                           │
   │ ✅ User has full access                               │
```

---

## Environment Variables Required

```env
# Email Service (in backend/.env)
EMAIL_API_URL=https://api.sendgrid.com/v3/mail/send
EMAIL_API_KEY=SG.xxxxxxxxxxxx

# Frontend URL (used in emails)
FRONTEND_URL=https://dj-system.example.com
LOGIN_URL=https://dj-system.example.com/login

# Database (existing)
DATABASE_URL=postgresql://user:password@host:port/dbname
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/v2/auth/register-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "สมเด็จ",
    "lastName": "ศรี",
    "title": "นาย",
    "phone": "0812345678",
    "position": "Engineer",
    "department": "Design",
    "tenantId": 1
  }'
```

### Approve
```bash
curl -X POST http://localhost:3000/api/v2/auth/approve-registration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": 123,
    "approvedById": 456,
    "roleName": "Member"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "aB3@mNpQxYz",
    "tenantId": 1
  }'
```

### Change Password
```bash
curl -X POST http://localhost:3000/api/v2/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "currentPassword": "aB3@mNpQxYz",
    "newPassword": "MyNewSecure123!"
  }'
```

---

## Rate Limiting

- **Registration:** 5 per IP per hour
- **Login:** 10 failures per IP per 15 minutes
- **Password Change:** 5 per user per hour
- **Email Send:** No limit (handled by email service)

---

## Security Considerations

✅ **All passwords:**
- Hashed with bcrypt (10 rounds)
- Never stored in plain text
- Never logged or traced

✅ **Email delivery:**
- Uses HTTPS only
- Email contains password only (no sensitive data)
- No passwords in logs

✅ **API Authentication:**
- JWT tokens required
- Token expiration enforced
- CORS properly configured

✅ **Temporary passwords:**
- Random generation (no patterns)
- 12 characters minimum
- Expire after first login (user must change)
- Never reused

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Status:** ✅ Ready for Use
