# User Registration & Approval Workflow (V2)

**Implementation Date:** January 30, 2026
**Status:** Complete
**Updated:** January 30, 2026 - Auto Email with Generated Password

---

## Overview

This document describes the implementation of a controlled, admin-approved user onboarding process. Key features:
- **ผู้ใช้ไม่ต้องกรอก Password** - ลงทะเบียนด้วยข้อมูลพื้นฐานเท่านั้น
- **Admin สร้าง Password** - ระบบ generate password อัตโนมัติเมื่อ Admin approve
- **บังคับเปลี่ยน Password** - ผู้ใช้ต้องตั้ง password ใหม่เมื่อ login ครั้งแรก

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

  User                              System                        Admin
    │                                  │                            │
    │ 1. Submit Registration Form      │                            │
    │    (ไม่ต้องกรอก Password)        │                            │
    │─────────────────────────────────>│                            │
    │                                  │                            │
    │ 2. Create User (PENDING)         │                            │
    │    passwordHash = empty          │                            │
    │<─────────────────────────────────│                            │
    │                                  │                            │
    │ 3. Show "Request Received" Page  │                            │
    │<─────────────────────────────────│                            │
    │                                  │                            │
    │                                  │ 4. Notify Admin             │
    │                                  │────────────────────────────>│
    │                                  │                            │
    │                                  │ 5. Review in Dashboard     │
    │                                  │<────────────────────────────│
    │                                  │                            │
    │                                  │ 6. Approve + Select Role   │
    │                                  │<────────────────────────────│
    │                                  │                            │
    │                                  │ 7. Generate Temp Password  │
    │                                  │    Set mustChangePassword  │
    │                                  │────────────────────────────>│
    │                                  │                            │
    │                                  │ 8. Send Email to User      │
    │ 9. Email with temp password      │<───────────────────────────│
    │<─────────────────────────────────│                            │
    │                                  │                            │
    │ 10. First Login                  │                            │
    │─────────────────────────────────>│                            │
    │                                  │                            │
    │ 11. Force Change Password Page   │                            │
    │<─────────────────────────────────│                            │
    │                                  │                            │
    │ 12. Set New Password             │                            │
    │─────────────────────────────────>│                            │
    │                                  │                            │
    │ 13. Access System                │                            │
    │<─────────────────────────────────│                            │
```

---

## Database Changes

### Users Table - New Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `status` | VARCHAR(50) | 'APPROVED' | PENDING, APPROVED, REJECTED, INACTIVE |
| `registered_at` | TIMESTAMP | NULL | When user submitted registration |
| `approved_at` | TIMESTAMP | NULL | When admin approved/rejected |
| `approved_by` | INTEGER (FK) | NULL | Admin user ID who approved |
| `rejection_reason` | TEXT | NULL | Reason for rejection |
| `last_login_at` | TIMESTAMP | NULL | Last successful login time |
| `must_change_password` | BOOLEAN | FALSE | TRUE when admin generates password |

### Migration File
```
database/migrations/manual/015_add_user_registration_status.sql
```

---

## Backend API Endpoints

### 1. Registration Request (No Password Required)
```
POST /api/v2/auth/register-request

Request:
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "title": "Mr.",            // Optional
  "phone": "081-xxx-xxxx",   // Optional
  "position": "Designer",    // Optional
  "departmentId": 1,         // Optional
  "tenantId": 1
}

Response (201):
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "status": "PENDING",
    "registeredAt": "2026-01-30T10:00:00Z"
  },
  "message": "Registration request submitted successfully. Please wait for admin approval."
}
```

**หมายเหตุ:** ไม่ต้องส่ง password - ระบบจะ generate ให้เมื่อ Admin approve

### 2. Login (Updated)
```
POST /api/v2/auth/login

Success Response (includes mustChangePassword flag):
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token",
    "expiresIn": "24h",
    "mustChangePassword": true  // If true, redirect to /force-change-password
  }
}

Error Responses for Pending Users:
- 403 PENDING_APPROVAL: "Your account is pending approval. Please wait for admin review."
- 403 REGISTRATION_REJECTED: "Your registration has been rejected. Please contact support."
- 403 USER_INACTIVE: "Your account has been deactivated. Please contact support."
```

### 3. Admin - Get Pending Registrations
```
GET /api/v2/admin/pending-registrations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "departmentName": "Marketing",
      "status": "PENDING",
      "registeredAt": "2026-01-30T10:00:00Z"
    }
  ]
}
```

### 4. Admin - Approve Registration (Generates Temporary Password)
```
POST /api/v2/admin/approve-registration
Authorization: Bearer <token>

Request:
{
  "userId": 123,
  "roleName": "Member"  // Optional, default: "Member"
}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "status": "APPROVED",
    "roleName": "Member",
    "approvedAt": "2026-01-30T12:00:00Z",
    "temporaryPassword": "Abc@1234xyz",  // Backup if email fails
    "emailSent": true  // true if email sent successfully
  },
  "message": "User approved! Temporary password has been sent to their email."
}
```

**หมายเหตุ:** ระบบส่งอีเมลอัตโนมัติ - `temporaryPassword` ส่งกลับมาเป็น backup กรณี email ส่งไม่สำเร็จ

### 4.5 Change Password (First Login)
```
POST /api/v2/auth/change-password
Authorization: Bearer <token>

Request:
{
  "newPassword": "newSecurePassword123"
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 5. Admin - Reject Registration
```
POST /api/v2/admin/reject-registration
Authorization: Bearer <token>

Request:
{
  "userId": 123,
  "reason": "Duplicate account"  // Optional
}
```

### 6. Admin - Registration Counts
```
GET /api/v2/admin/registration-counts
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "PENDING": 5,
    "APPROVED": 150,
    "REJECTED": 3,
    "INACTIVE": 10,
    "total": 168
  }
}
```

---

## Frontend Components

### New Pages

| Page | Path | Description |
|------|------|-------------|
| Register (V1) | `/register` | Registration form (ใช้ V1 UI ภาษาไทย) |
| RegistrationPending | `/registration-pending` | "Request Received" confirmation page |
| PendingApprovals | `/admin/pending-approvals` | Admin approval dashboard with temp password modal |
| ForceChangePassword | `/force-change-password` | First login password change page |

### Files Created/Modified

```
frontend/src/modules/core/auth/pages/Register.jsx          # Updated to use new API
frontend/src/modules/core/auth-v2/pages/RegistrationPending.tsx
frontend/src/modules/core/auth-v2/pages/ForceChangePassword.tsx  # NEW
frontend/src/modules/features/admin/pages/PendingApprovals.tsx   # Updated with password modal
```

### Updated Files

```
frontend/src/modules/core/auth-v2/index.ts
frontend/src/modules/core/stores/authStoreV2.ts
frontend/src/modules/shared/services/modules/authServiceV2.ts
```

---

## Zustand Store Updates

### New State Properties

```typescript
interface AuthState {
  // ... existing properties
  registrationPending: boolean;
  registrationResult: IRegisterRequestResult | null;
  pendingUsers: IPendingUser[];
  registrationCounts: IRegistrationCounts | null;
}
```

### New Actions

```typescript
interface AuthActions {
  // ... existing actions
  registerRequest: (data: IRegisterRequestData) => Promise<IRegisterRequestResult>;
  clearRegistrationState: () => void;
  fetchPendingUsers: () => Promise<void>;
  fetchRegistrationCounts: () => Promise<void>;
  approveUser: (userId: number, roleName?: string) => Promise<void>;
  rejectUser: (userId: number, reason?: string) => Promise<void>;
}
```

### New Selectors

```typescript
export const useRegistrationPending = () => useAuthStoreV2(state => state.registrationPending);
export const useRegistrationResult = () => useAuthStoreV2(state => state.registrationResult);
export const usePendingUsers = () => useAuthStoreV2(state => state.pendingUsers);
export const useRegistrationCounts = () => useAuthStoreV2(state => state.registrationCounts);
```

---

## Implementation Steps to Complete

### 1. Run Database Migration

Execute in Supabase SQL Editor:
```sql
-- Run migration file
database/migrations/manual/015_add_user_registration_status.sql
```

### 2. Regenerate Prisma Client

```bash
cd backend/api-server
npx prisma generate
```

### 3. Add Routes to App Router

Add to your React Router configuration:
```tsx
import { RegisterRequest, RegistrationPending } from './modules/core/auth-v2';
import PendingApprovals from './modules/features/admin/pages/PendingApprovals';

// In routes:
<Route path="/register-request" element={<RegisterRequest />} />
<Route path="/registration-pending" element={<RegistrationPending />} />
<Route path="/admin/pending-approvals" element={<PendingApprovals />} />
```

### 4. Add Navigation Link for Admins

Add to admin sidebar/menu:
```tsx
<Link to="/admin/pending-approvals">Pending Approvals</Link>
```

### 5. Restart Backend Server

```bash
npm run dev
```

---

## User Flow Examples

### New User Registration (ไม่ต้องกรอก Password)

1. User navigates to `/register`
2. Fills in: คำนำหน้า, ชื่อ, นามสกุล, อีเมล, เบอร์โทร, หน่วยงาน, ตำแหน่ง
3. Clicks "ส่งคำขอสมัครใช้งาน"
4. User is created with `status = 'PENDING'`, `isActive = false`, `passwordHash = ''`
5. Success page shows instructions:
   - รอการอนุมัติจาก Admin
   - Admin จะส่งรหัสผ่านให้
   - ต้องเปลี่ยนรหัสผ่านเมื่อ login ครั้งแรก

### Admin Approval (Auto Email)

1. Admin logs in (must have OrgAdmin or SuperAdmin role)
2. Navigates to `/admin/pending-approvals`
3. Sees list of pending registrations with stats
4. Clicks "Approve" on a user
5. Selects role (Member, TeamLead, OrgAdmin)
6. Confirms approval
7. **System automatically:**
   - Generates temporary password
   - Sends approval email to user with password
   - Sets `mustChangePassword = true`
8. Modal shows success (email sent confirmation)
9. If email fails, shows password for manual backup

### First Login (Force Change Password)

1. User receives temporary password from Admin
2. User logs in with email + temporary password
3. Login response includes `mustChangePassword: true`
4. Frontend redirects to `/force-change-password`
5. User enters new password (min 8 chars)
6. System updates password and sets `mustChangePassword = false`
7. User can now access the system normally

### Blocked Login Attempt

1. User with `status = 'PENDING'` tries to login
2. System checks status before authentication
3. Returns 403 error: "Your account is pending approval"
4. Frontend displays appropriate message

---

## Security Considerations

1. **Password Hashing**: All passwords are hashed with bcrypt before storage
2. **Role Assignment**: Only OrgAdmin/SuperAdmin can approve and assign roles
3. **Status Check**: Login middleware verifies both `status` AND `isActive`
4. **JWT Tokens**: Not issued until user is approved
5. **Tenant Isolation**: Pending users are scoped to their tenant

---

## Future Enhancements (TODO)

1. [ ] Email notifications to admin on new registration
2. [ ] Email notification to user on approval/rejection
3. [ ] Bulk approve/reject functionality
4. [ ] Auto-expiration of pending requests after X days
5. [ ] Registration request audit log
6. [ ] Admin notes on approval/rejection

---

## Files Summary

### Backend Files

| File | Changes |
|------|---------|
| `backend/api-server/src/v2/index.js` | Registration, login, approval, change-password routes + auto email |
| `backend/api-server/src/v2/adapters/PrismaV1Adapter.js` | Password generation, workflow methods |
| `backend/api-server/src/services/emailService.js` | Added `notifyRegistrationApproved`, `notifyRegistrationRejected` |
| `backend/prisma/schema.prisma` | Added mustChangePassword field |
| `database/migrations/manual/015_add_user_registration_status.sql` | Migration with must_change_password |

### Frontend Files

| File | Changes |
|------|---------|
| `frontend/src/modules/core/auth/pages/Register.jsx` | V1 UI updated to call V2 API (no password) |
| `frontend/src/modules/core/auth-v2/pages/RegistrationPending.tsx` | Pending confirmation |
| `frontend/src/modules/core/auth-v2/pages/ForceChangePassword.tsx` | **NEW** First login password change |
| `frontend/src/modules/features/admin/pages/PendingApprovals.tsx` | **Updated** with temp password modal |
| `frontend/src/modules/core/stores/authStoreV2.ts` | Added workflow state/actions |
| `frontend/src/modules/shared/services/modules/authServiceV2.ts` | Added API methods |
| `frontend/src/modules/core/auth-v2/index.ts` | Added ForceChangePassword export |

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
