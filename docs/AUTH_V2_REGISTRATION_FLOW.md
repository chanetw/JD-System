# V2 Authentication System - Registration & Admin Approval Flow

## Overview

ระบบการสมัครสมาชิกและการจัดการโดย Admin ของ V2 Auth System โดยใช้ **Pending Registration Pattern** เพื่อความปลอดภัยและการควบคุมการเข้าถึง

---

## 1. Flow Diagram

### User Registration Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. User submits registration form
   ├─ Email
   ├─ Password (with strength validation)
   ├─ First Name & Last Name
   └─ Organization Selection

2. Backend validates & creates RegistrationRequest
   ├─ Status: PENDING
   ├─ Generates confirmation token
   └─ Stores in v2_registration_requests table

3. System sends Email Notification
   ├─ To: Admin of Organization
   ├─ Subject: "New Registration Request - [User Name]"
   ├─ Content: User details + Approval link
   └─ Action buttons: "Approve", "Reject"

4. User sees "Pending Approval" message
   ├─ Shows organization name
   ├─ Explains admin will contact them
   └─ Provides contact email for admin
```

### Admin Approval Flow
```
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN USER MANAGEMENT & APPROVAL FLOW               │
└─────────────────────────────────────────────────────────────────┘

1. Admin views Pending Registration Requests
   └─ GET /api/v2/admin/registration-requests
      ├─ Filter by status: PENDING, APPROVED, REJECTED
      ├─ Show user details
      └─ Show submission date

2. Admin reviews registration details
   ├─ Name, Email, Organization
   ├─ Submission timestamp
   └─ Can view via modal or detail page

3. Admin takes action
   ├─ APPROVE:
   │  ├─ Creates v2_users record
   │  ├─ Assigns role (default: Member)
   │  ├─ Sends welcome email to user
   │  └─ Sets status: APPROVED
   │
   ├─ REJECT:
   │  ├─ Sets status: REJECTED
   │  ├─ Sends rejection email to user
   │  └─ User can reapply after 7 days
   │
   └─ ASSIGN ROLE:
      ├─ Change from default Member to: OrgAdmin, TeamLead
      └─ Update permissions

4. System sends Email Notifications
   ├─ To Approved User:
   │  ├─ Welcome email
   │  ├─ Login instructions
   │  └─ First login link
   │
   ├─ To Rejected User:
   │  ├─ Rejection notice
   │  ├─ Reason (if provided)
   │  └─ Reapplication instructions
   │
   └─ To Admin:
      ├─ Confirmation of action taken
      └─ Summary of new user created
```

---

## 2. Database Schema

### Registration Request Table
```sql
CREATE TABLE v2_registration_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  organization_id INTEGER NOT NULL REFERENCES v2_organizations(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  -- Status: PENDING, APPROVED, REJECTED
  status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,

  -- Admin action tracking
  reviewed_by_id INTEGER REFERENCES v2_users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,

  -- Audit trail
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_v2_registration_requests_tenant_id ON v2_registration_requests(tenant_id);
CREATE INDEX idx_v2_registration_requests_organization_id ON v2_registration_requests(organization_id);
CREATE INDEX idx_v2_registration_requests_status ON v2_registration_requests(status);
CREATE INDEX idx_v2_registration_requests_email ON v2_registration_requests(email);
```

### Updated Users Table
```sql
ALTER TABLE v2_users ADD COLUMN IF NOT EXISTS registration_request_id INTEGER REFERENCES v2_registration_requests(id);
```

---

## 3. API Endpoints

### Registration Endpoints

#### 1. Submit Registration Request
```
POST /api/v2/auth/register
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": 1
}

Response (201 Created):
{
  "success": true,
  "message": "Registration request submitted successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organization": {
      "id": 1,
      "name": "Acme Corp"
    },
    "status": "PENDING",
    "createdAt": "2024-01-29T10:30:00Z"
  }
}

Error Response (400, 409):
{
  "success": false,
  "error": "EMAIL_ALREADY_REGISTERED",
  "message": "Email already exists in this organization"
}
```

#### 2. Check Registration Status
```
GET /api/v2/auth/registration-status?email=user@example.com&organizationId=1

Response (200 OK):
{
  "success": true,
  "data": {
    "status": "PENDING",
    "submittedAt": "2024-01-29T10:30:00Z",
    "organization": "Acme Corp",
    "message": "Your registration is pending approval from the organization administrator"
  }
}
```

### Admin Endpoints

#### 1. List Pending Registrations
```
GET /api/v2/admin/registration-requests?status=PENDING&organizationId=1
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "organization": {
        "id": 1,
        "name": "Acme Corp"
      },
      "status": "PENDING",
      "createdAt": "2024-01-29T10:30:00Z",
      "ipAddress": "192.168.1.1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### 2. Approve Registration Request
```
POST /api/v2/admin/registration-requests/{id}/approve
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "roleId": 4,  // Default: Member role
  "notes": "Approved as team member"
}

Response (200 OK):
{
  "success": true,
  "message": "Registration request approved successfully",
  "data": {
    "user": {
      "id": 10,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": {
        "id": 4,
        "name": "Member"
      }
    },
    "registrationRequest": {
      "id": 1,
      "status": "APPROVED",
      "reviewedAt": "2024-01-29T11:00:00Z"
    }
  }
}
```

#### 3. Reject Registration Request
```
POST /api/v2/admin/registration-requests/{id}/reject
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "reason": "Organization does not match"
}

Response (200 OK):
{
  "success": true,
  "message": "Registration request rejected successfully",
  "data": {
    "registrationRequest": {
      "id": 1,
      "status": "REJECTED",
      "rejectionReason": "Organization does not match",
      "reviewedAt": "2024-01-29T11:00:00Z"
    }
  }
}
```

---

## 4. Email Templates

### Registration Confirmation Email (to User)
```
Subject: Registration Submitted - Pending Approval

Hello [First Name],

Thank you for registering with [Organization Name].

Your registration has been submitted and is now pending approval from the organization administrator.

Registration Details:
- Organization: [Organization Name]
- Email: [Email]
- Submitted: [Timestamp]

What happens next?
The organization administrator will review your request and either approve or reject your registration. You will receive an email notification once a decision is made.

If you have any questions, please contact: [Admin Email]

Best regards,
DJ System Team
```

### Admin Notification Email
```
Subject: New Registration Request - [User Name]

Hello Administrator,

A new registration request has been submitted for your organization.

User Details:
- Name: [First Name] [Last Name]
- Email: [Email]
- Organization: [Organization Name]
- Submitted: [Timestamp]
- IP Address: [IP Address]

Action Required:
Please review the registration request and approve or reject it.

[APPROVE BUTTON] [REJECT BUTTON] [VIEW DETAILS BUTTON]

Dashboard Link: [Management URL]

Best regards,
DJ System Team
```

### Approval Notification Email (to User)
```
Subject: Registration Approved - Welcome to [Organization Name]!

Hello [First Name],

Great news! Your registration has been approved.

Your account has been created with the following details:
- Email: [Email]
- Organization: [Organization Name]
- Role: [Role Name]
- Assigned By: [Admin Name]

Next Steps:
1. Log in with your email and password
2. Complete your profile
3. Start using the system

[LOGIN BUTTON]

If you have any questions, please contact: [Admin Email]

Best regards,
DJ System Team
```

### Rejection Email (to User)
```
Subject: Registration Status - [Organization Name]

Hello [First Name],

Thank you for your interest in joining [Organization Name].

Unfortunately, your registration request has been rejected.

Reason: [Rejection Reason]

Next Steps:
You can submit a new registration request after 7 days, or contact the administrator for more information.

Administrator Email: [Admin Email]

Best regards,
DJ System Team
```

---

## 5. Frontend Components

### Registration Page Flow
```
RegisterV2.tsx
├─ Form Validation
├─ Password Strength Indicator
├─ Organization Selection Dropdown
├─ Submit Registration
└─ Pending Confirmation Page
   ├─ Show organization name
   ├─ Show submitted email
   ├─ Display pending message
   ├─ Provide admin contact
   └─ "Back to Home" button
```

### Admin User Management Panel
```
AdminUserManagement.tsx
├─ Tabs:
│  ├─ Pending Requests
│  ├─ Approved Users
│  └─ Rejected Requests
├─ Table:
│  ├─ Name
│  ├─ Email
│  ├─ Organization
│  ├─ Submitted Date
│  ├─ Status Badge
│  └─ Actions (Approve/Reject/View)
└─ Modal for:
   ├─ View Details
   ├─ Approve with Role Assignment
   └─ Reject with Reason
```

---

## 6. Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (recommended)

### Email Verification
- Confirmation email sent immediately after submission
- Admin can view submission IP address
- Admin can view user agent for fraud detection

### Role Assignment Security
- Only Org Admin or SuperAdmin can approve
- Default role: Member (least privilege)
- Admin explicitly assigns other roles (TeamLead, OrgAdmin)
- All actions logged in audit trail

### Rate Limiting
- Max 5 registration requests per email per 24 hours
- Max 10 requests per IP per 24 hours
- Prevent spam and abuse

---

## 7. Implementation Status

### Phase 1: Database & Models ✅
- [x] Create v2_registration_requests table
- [x] Add migration SQL file

### Phase 2: Backend Services
- [ ] RegistrationRequestService (create, list, approve, reject)
- [ ] Update AuthService (handle pending registrations)
- [ ] Email notification service integration
- [ ] Admin routes (approve, reject, list)

### Phase 3: Frontend Components
- [ ] Update RegisterV2.tsx (show pending confirmation)
- [ ] Create AdminRegistrationPanel.tsx
- [ ] Create RegistrationStatusPage.tsx
- [ ] Add tabs to user management

### Phase 4: Notifications
- [ ] Email template setup
- [ ] Send notifications to admin
- [ ] Send notifications to user (approved/rejected)

### Phase 5: Testing & Documentation
- [ ] Unit tests for registration flow
- [ ] Integration tests for admin approval
- [ ] End-to-end testing
- [ ] User documentation

---

## 8. User Stories

### User Story 1: Register for Account
```
As a new user,
I want to submit a registration request,
So that I can request access to the system

Acceptance Criteria:
✓ User can enter email, password, name, and select organization
✓ Password validation shows strength indicator
✓ Duplicate email checking prevents duplicates
✓ After submission, user sees "Pending Approval" message
✓ User receives confirmation email
```

### User Story 2: Admin Reviews Registrations
```
As an organization administrator,
I want to review pending registration requests,
So that I can control who has access to the system

Acceptance Criteria:
✓ Admin can see list of pending requests
✓ Admin can view detailed user information
✓ Admin can approve or reject requests
✓ Admin can assign roles during approval
✓ Admin receives notifications of new requests
```

### User Story 3: User Receives Approval
```
As a registered user,
I want to receive notification when my registration is approved,
So that I know I can access the system

Acceptance Criteria:
✓ User receives approval email with login link
✓ Email contains login instructions
✓ User can log in immediately after approval
✓ User's role is properly assigned
```

---

## 9. Environment Variables

```bash
# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@djsystem.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@djsystem.com

# Registration Settings
REGISTRATION_PENDING_DAYS=7
REGISTRATION_MAX_ATTEMPTS=5
REGISTRATION_RATE_LIMIT_HOURS=24

# Frontend
VITE_REGISTRATION_ENABLED=true
VITE_REQUIRE_EMAIL_VERIFICATION=false
```

---

## 10. Next Steps

1. **Database Migration**: Run SQL migration to create v2_registration_requests table
2. **Backend Implementation**: Build RegistrationRequestService and admin endpoints
3. **Frontend Update**: Modify RegisterV2.tsx and add AdminPanel
4. **Email Setup**: Configure email service and templates
5. **Testing**: Test complete flow from registration to approval
6. **Documentation**: Update user guides and admin documentation
