# 🧪 DJ System - Testing Checklist

**Version:** 1.0  
**Updated:** January 26, 2026  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Requirements

### 1. Database Setup
- [ ] Run all migrations in Supabase SQL Editor:
  - `001_add_missing_columns.sql`
  - `002_create_user_roles_and_assignments.sql`
  - `003_create_job_with_items_function.sql`
  - `004_soft_delete_implementation.sql`
  - `005_audit_trail_implementation.sql`

### 2. Environment Setup
```bash
# Frontend
cd frontend
npm install
npm run dev

# Email API (Optional - for email testing)
cd backend/email-api
npm install
npm start
```

### 3. Verify .env Configuration
```
# Frontend (.env)
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_KEY=<your_supabase_anon_key>
VITE_EMAIL_API_URL=http://localhost:3001
```

---

## 🔐 Module 1: Authentication & Authorization

### 1.1 Login Flow
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Login with valid email/password | Redirect to Dashboard | ⏳ |
| Login with invalid credentials | Show error message | ⏳ |
| Logout | Clear session, redirect to login | ⏳ |
| Session persistence (refresh page) | Stay logged in | ⏳ |

### 1.2 User Registration
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Submit registration form | Show success, create request | ⏳ |
| Duplicate email | Show error message | ⏳ |
| Admin sees pending registrations | List shows in admin panel | ⏳ |
| Admin approves registration | User created with temp password | ⏳ |
| Admin rejects registration | Status updated, email sent | ⏳ |

### 1.3 Role-Based Access Control
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Marketing user sees own jobs only | Filtered job list | ⏳ |
| Approver sees pending approvals | Approval queue accessible | ⏳ |
| Assignee sees assigned jobs only | Filtered job list | ⏳ |
| Admin sees all features | Full menu access | ⏳ |

---

## 📝 Module 2: Job Request (Create DJ)

### 2.1 Create Single Job
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Fill all required fields | Enable submit button | ⏳ |
| Select project | Auto-load approval flow | ⏳ |
| Select job type | Load sub-items | ⏳ |
| Calculate due date | Skip holidays, apply SLA | ⏳ |
| Submit job | Create with requester_id from auth | ⏳ |

### 2.2 Create Parent-Child Job
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Select multiple job types | Show multi-selection UI | ⏳ |
| Submit parent-child job | Create 1 parent + N children | ⏳ |
| Child jobs inherit priority | All children have same priority | ⏳ |
| Parent due date = max(children) | Correct calculation | ⏳ |

### 2.3 Urgent Job Handling
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Set priority to Urgent | Show warning modal | ⏳ |
| Urgent shifts other job SLAs | Affected jobs updated | ⏳ |
| Notification sent to affected users | Check notifications | ⏳ |

### 2.4 Business Rules Validation
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Submit after cutoff time | Block or allow schedule | ⏳ |
| Submit on holiday | Skip to next workday | ⏳ |
| Exceed project quota | Show warning/block | ⏳ |

---

## 📋 Module 3: Job Management

### 3.1 Job List (DJList)
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View all jobs | Paginated list | ⏳ |
| Filter by status | Correct filtering | ⏳ |
| Filter by priority | Correct filtering | ⏳ |
| Search by DJ ID | Find exact match | ⏳ |
| Search by subject | Find partial matches | ⏳ |

### 3.2 Job Detail
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View job details | Show all information | ⏳ |
| See approval history | Timeline visible | ⏳ |
| See activity log | Comments/actions shown | ⏳ |
| Download attachments | Files downloadable | ⏳ |

### 3.3 Approval Queue
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Approver sees pending jobs | Correct list | ⏳ |
| Quick approve action | Status changes | ⏳ |
| Quick reject action | Status changes, reason saved | ⏳ |
| Multi-level approval | Progress to next level | ⏳ |
| Final approval | Status = in_progress | ⏳ |

### 3.4 Job Actions
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Reassign job | New assignee set | ⏳ |
| Return for rework | Status = rework | ⏳ |
| Complete job | Status = completed | ⏳ |
| Cancel job | Status = cancelled | ⏳ |

---

## ⚙️ Module 4: Admin Features

### 4.1 User Management
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View active users | List with roles | ⏳ |
| Edit user roles | Roles updated | ⏳ |
| Edit user scopes | Scopes updated | ⏳ |
| Deactivate user | is_active = false | ⏳ |

### 4.2 Job Types & SLA
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View job types | List with SLA days | ⏳ |
| Create job type | New type added | ⏳ |
| Edit SLA days | Value updated | ⏳ |
| Manage sub-items | Items linked to type | ⏳ |

### 4.3 Approval Flow
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View flows by project | List shown | ⏳ |
| Create new flow | Flow created | ⏳ |
| Add approval levels | Levels saved | ⏳ |
| Set approvers per level | Approvers assigned | ⏳ |

### 4.4 Holiday Calendar
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View holidays | Calendar displayed | ⏳ |
| Add holiday | Date saved | ⏳ |
| Delete holiday | Date removed | ⏳ |
| Holidays affect SLA calculation | Due dates skip holidays | ⏳ |

### 4.5 Organization Management
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| View BUDs | List shown | ⏳ |
| View projects | List shown | ⏳ |
| Create/edit BUD | Data saved | ⏳ |
| Create/edit project | Data saved | ⏳ |

---

## 📊 Module 5: Dashboard & Reports

### 5.1 Dashboard
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Show correct stats | Numbers match DB | ⏳ |
| Filter by date range | Stats update | ⏳ |
| Recent jobs list | Sorted by date | ⏳ |

### 5.2 Reports
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Generate job report | Data exported | ⏳ |
| Filter by project | Correct data | ⏳ |
| Filter by date range | Correct data | ⏳ |

---

## 🔔 Module 6: Notifications

### 6.1 In-App Notifications
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| New job notification | Bell icon shows count | ⏳ |
| Approval required notification | Alert shown | ⏳ |
| Mark as read | Count decreases | ⏳ |

### 6.2 Email Notifications (requires Email API)
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Registration approved email | Email received | ⏳ |
| Registration rejected email | Email received | ⏳ |
| Job assigned email | Email received | ⏳ |
| Job status update email | Email received | ⏳ |

---

## 🔒 Module 7: Multi-Tenancy & Security

### 7.1 Data Isolation
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| User A (Tenant 1) can't see Tenant 2 data | Correctly filtered | ⏳ |
| API returns only tenant-specific data | No cross-tenant leak | ⏳ |

### 7.2 Scope Validation
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| User with Project scope sees only their projects | Filtered correctly | ⏳ |
| User with BUD scope sees all projects in BUD | Filtered correctly | ⏳ |
| User with Tenant scope sees all | Full access | ⏳ |

---

## 📱 Module 8: Responsive Design

| Screen Size | Test Case | Expected Result | Status |
|-------------|-----------|-----------------|--------|
| Desktop (1920px) | Full layout | All elements visible | ⏳ |
| Tablet (768px) | Responsive layout | Sidebar collapsible | ⏳ |
| Mobile (375px) | Mobile layout | Stacked layout, touch-friendly | ⏳ |

---

## 🚨 Known Issues & Workarounds

| Issue | Workaround | Status |
|-------|------------|--------|
| Email API requires separate server | Run `npm start` in backend/email-api | Document only |
| Soft delete not visible in UI | Use database query to restore | Phase 2 |

---

## ✅ Sign-Off

| Phase | Tester | Date | Status |
|-------|--------|------|--------|
| Phase 1 Testing | | | ⏳ Pending |
| Phase 2 Testing | | | ⏳ Pending |
| Phase 3 Testing | | | ⏳ Pending |
| Final Sign-Off | | | ⏳ Pending |

---

**Notes:**
- Mark each test case as ✅ (Pass), ❌ (Fail), or ⚠️ (Partial)
- Log any bugs found in GitHub Issues
- Retest failed cases after fixes
