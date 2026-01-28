# 🚀 DJ System - Implementation Plan (3 Phases)

**Created:** 26 มกราคม 2026  
**Version:** 1.0  
**Status:** 📋 Ready for Implementation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Phase 1: Critical Fixes (Week 1)](#phase-1-critical-fixes-week-1)
3. [Phase 2: High Priority (Week 2)](#phase-2-high-priority-week-2)
4. [Phase 3: Medium Priority (Week 3-4)](#phase-3-medium-priority-week-3-4)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)
7. [Rollback Plan](#rollback-plan)

---

## 🎯 Overview

### Objective
แก้ไขจุดบกพร่องทั้งหมดที่พบจาก System Logic Audit โดยแบ่งเป็น 3 Phases ตามลำดับความสำคัญ

### Timeline Summary

| Phase | Duration | Effort | Priority |
|-------|----------|--------|----------|
| Phase 1 | Week 1 (Jan 27 - Feb 2) | 24 hrs | 🔴 Critical |
| Phase 2 | Week 2 (Feb 3 - Feb 9) | 32 hrs | 🟡 High |
| Phase 3 | Week 3-4 (Feb 10 - Feb 23) | 40 hrs | 🟢 Medium |
| **Total** | **4 Weeks** | **96 hrs** | |

### Team Allocation

```
Developer 1: Frontend (React)
Developer 2: Backend (Supabase + PostgreSQL)
Developer 3: Integration & Testing
QA Tester: All Phases
```

---

## 🔴 Phase 1: Critical Fixes (Week 1)

**Goal:** แก้ไขปัญหาร้ายแรงที่ทำให้ระบบใช้งานไม่ได้ในระดับ Production

### 📅 Timeline: Jan 27 - Feb 2, 2026

| Task | Developer | Duration | Status |
|------|-----------|----------|--------|
| 1.1 Auth Context Integration | Dev 1 | 4 hrs | ✅ Complete |
| 1.2 Multi-tenancy Support | Dev 1 | 2 hrs | ✅ Complete |
| 1.3 Password Generation | Dev 1 | 2 hrs | ✅ Complete |
| 1.4 Transaction Rollback | Dev 2 | 6 hrs | ✅ Complete |
| 1.5 Testing & Verification | QA | 8 hrs | 🟡 Ready |
| 1.6 Code Review | All | 2 hrs | 🟡 Ready |

**Total:** 24 hours

---

### 🛠️ Task 1.1: Auth Context Integration

**Priority:** 🔴 Critical  
**Assigned:** Developer 1 (Frontend)  
**Duration:** 4 hours  
**Dependencies:** None

#### Problem Statement
ปัจจุบันมี hardcoded values:
- `requester_id = 1` ใน `CreateJob.jsx`
- `currentUserId = 1` ใน `UserManagement.jsx`
- `approved_by = 1` ใน `ApprovalsQueue.jsx`

#### Solution

##### Step 1: สร้าง Auth Store (1 hour)

**File:** `/frontend/src/modules/core/stores/authStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@shared/services/supabaseClient';

/**
 * Auth Store - จัดการ User Authentication State
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      setSession: (session) => set({ session }),
      
      setLoading: (isLoading) => set({ isLoading }),

      // Initialize Auth
      initialize: async () => {
        set({ isLoading: true });
        
        try {
          // Get current session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (session?.user) {
            // Load user data from users table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .single();
            
            if (userError) throw userError;
            
            set({
              user: userData,
              session,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      // Login
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (userError) throw userError;

        set({
          user: userData,
          session: data.session,
          isAuthenticated: true
        });

        return userData;
      },

      // Logout
      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false
        });
      },

      // Refresh User Data
      refreshUser: async () => {
        const { user } = get();
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          set({ user: data });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Helper hook
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser
  };
};
```

##### Step 2: Initialize Auth in App.jsx (30 min)

**File:** `/frontend/src/App.jsx`

```javascript
import { useEffect } from 'react';
import { useAuthStore } from '@core/stores/authStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  // ...existing routes...
}
```

##### Step 3: Update CreateJob.jsx (1 hour)

**File:** `/frontend/src/modules/features/job-request/pages/CreateJob.jsx`

**Replace:**
```javascript
// ❌ Before
const requester_id = 1;
const tenant_id = 1;
```

**With:**
```javascript
// ✅ After
import { useAuth } from '@core/stores/authStore';

const CreateJob = () => {
  const { user } = useAuth();

  // Validation
  if (!user) {
    return <div>Please login first</div>;
  }

  const handleSubmit = async (e) => {
    // ...existing code...

    const payload = {
      tenant_id: user.tenant_id,
      requester_id: user.id,
      // ...other fields...
    };

    // ...rest of submit logic...
  };
};
```

##### Step 4: Update UserManagement.jsx (1 hour)

**File:** `/frontend/src/modules/features/admin/pages/UserManagement.jsx`

**Replace:**
```javascript
// ❌ Before
const currentUserId = 1;
```

**With:**
```javascript
// ✅ After
import { useAuth } from '@core/stores/authStore';

export default function UserManagement() {
  const { user } = useAuth();

  const handleConfirmApprove = async () => {
    // ...existing validation...

    const adminUserId = user.id;

    // 2. Assign roles
    await apiDatabase.assignUserRoles(
      newUser.id,
      user.tenant_id,
      approvalData.roles,
      adminUserId  // ✅ Use real admin ID
    );

    // 4. Update registration status
    await supabase
      .from('user_registration_requests')
      .update({
        status: 'approved',
        approved_by: adminUserId,  // ✅ Use real admin ID
        updated_at: new Date().toISOString()
      })
      .eq('id', approveModal.registrationId);
  };
};
```

##### Step 5: Update ApprovalsQueue.jsx (30 min)

**File:** `/frontend/src/modules/features/job-management/pages/ApprovalsQueue.jsx`

Similar changes for any approval actions.

#### Testing Checklist

- [ ] Login → User data ถูกเก็บใน Store
- [ ] Logout → Store ถูก clear
- [ ] Refresh page → User data ยังอยู่ (persist)
- [ ] Create Job → `requester_id` = real user ID
- [ ] Approve Registration → `approved_by` = real admin ID
- [ ] Check Console → No hardcoded IDs

#### Success Criteria

✅ ไม่มี hardcoded User IDs ในระบบ  
✅ Auth Store ทำงานถูกต้อง  
✅ Persist data ข้าม page reload  
✅ All components ใช้ `useAuth()` hook

---

### 🛠️ Task 1.2: Multi-tenancy Support

**Priority:** 🔴 Critical  
**Assigned:** Developer 1 (Frontend)  
**Duration:** 2 hours  
**Dependencies:** Task 1.1 (Auth Context)

#### Problem Statement
ปัจจุบันมี `tenant_id = 1` hardcoded ทุกที่ ทำให้ระบบรองรับได้แค่บริษัทเดียว

#### Solution

##### Step 1: Verify Database Schema (30 min)

**Check:** ทุก tables ที่เกี่ยวข้องควรมี `tenant_id` column

```sql
-- Verify columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
AND table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- ✅ users
-- ✅ projects
-- ✅ jobs
-- ✅ job_types
-- ✅ user_roles
-- ✅ user_scope_assignments
```

**ถ้าไม่มี:** สร้าง migration

```sql
-- Migration: Add tenant_id to missing tables
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);
-- ... add more if needed
```

##### Step 2: Update CreateJob.jsx (30 min)

**Already done in Task 1.1!** ✅

```javascript
const payload = {
  tenant_id: user.tenant_id,  // ✅ From auth
  // ...
};
```

##### Step 3: Update Filters/Queries (1 hour)

**File:** `/frontend/src/modules/features/job-management/pages/DJList.jsx`

```javascript
const loadJobs = async () => {
  const { user } = useAuth();

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('tenant_id', user.tenant_id)  // ✅ Filter by tenant
    .order('created_at', { ascending: false });

  setJobs(data || []);
};
```

**Apply to all pages:**
- `JobDetail.jsx`
- `ApprovalsQueue.jsx`
- `Reports.jsx`
- All Admin pages

#### Testing Checklist

- [ ] Create data → `tenant_id` = user's tenant
- [ ] List data → เห็นเฉพาะข้อมูลของ tenant ตัวเอง
- [ ] Cross-tenant isolation → User A ไม่เห็นข้อมูล Tenant B
- [ ] Database constraints → FK ทำงานถูกต้อง

#### Success Criteria

✅ ไม่มี `tenant_id = 1` hardcoded  
✅ Multi-tenancy isolation ทำงานถูกต้อง  
✅ All queries filter by tenant_id

---

### 🛠️ Task 1.3: Password Generation

**Priority:** 🔴 Critical  
**Assigned:** Developer 1 (Frontend)  
**Duration:** 2 hours  
**Dependencies:** None

#### Problem Statement
ใน `UserManagement.jsx` ตอนอนุมัติ User ใหม่ ใช้ `password_hash = 'temp_hash'` ทำให้ User ล็อกอินไม่ได้

#### Solution

##### Step 1: Create Password Generator Utility (30 min)

**File:** `/frontend/src/modules/shared/utils/passwordGenerator.js`

```javascript
/**
 * @file passwordGenerator.js
 * @description Generate secure random passwords
 */

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @param {object} options - Options for password complexity
 * @returns {string} - Generated password
 */
export const generatePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true  // Exclude: l, 1, I, O, 0
  } = options;

  let charset = '';
  let password = '';

  if (includeLowercase) charset += 'abcdefghjkmnpqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  if (includeNumbers) charset += excludeSimilar ? '23456789' : '0123456789';
  if (includeSymbols) charset += '!@#$%^&*';

  // Ensure at least one from each category
  const ensure = [];
  if (includeLowercase) ensure.push('abcdefghjkmnpqrstuvwxyz');
  if (includeUppercase) ensure.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if (includeNumbers) ensure.push(excludeSimilar ? '23456789' : '0123456789');
  if (includeSymbols) ensure.push('!@#$%^&*');

  // Add one from each required category
  ensure.forEach(chars => {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  });

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate a pronounceable password (easier to remember)
 * @param {number} length - Password length (default: 10)
 * @returns {string} - Generated password
 */
export const generatePronounceablePassword = (length = 10) => {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  const numbers = '0123456789';
  let password = '';
  
  for (let i = 0; i < length - 2; i++) {
    if (i % 2 === 0) {
      password += consonants.charAt(Math.floor(Math.random() * consonants.length));
    } else {
      password += vowels.charAt(Math.floor(Math.random() * vowels.length));
    }
  }
  
  // Add 2 numbers at the end
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Capitalize first letter
  return password.charAt(0).toUpperCase() + password.slice(1);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - {isStrong: boolean, score: number, feedback: string[]}
 */
export const validatePasswordStrength = (password) => {
  const feedback = [];
  let score = 0;

  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');

  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  // Lowercase check
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  // Number check
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  // Symbol check
  if (/[!@#$%^&*]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  return {
    isStrong: score >= 5,
    score,
    feedback
  };
};
```

##### Step 2: Update UserManagement.jsx (1 hour)

**File:** `/frontend/src/modules/features/admin/pages/UserManagement.jsx`

```javascript
import { generatePassword } from '@shared/utils/passwordGenerator';
import { supabase } from '@shared/services/supabaseClient';

export default function UserManagement() {
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleConfirmApprove = async () => {
    // ...existing validation...

    try {
      setIsSubmitting(true);
      const adminUserId = user.id;
      const tempPassword = generatePassword(12, {
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,  // Easier to type
        excludeSimilar: true
      });

      // Store for displaying to admin
      setGeneratedPassword(tempPassword);

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: approveModal.registrationData.email,
        password: tempPassword,
        email_confirm: true,  // Auto-confirm email
        user_metadata: {
          first_name: approveModal.registrationData.firstName,
          last_name: approveModal.registrationData.lastName
        }
      });

      if (authError) throw authError;

      // 2. Create user in users table
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          tenant_id: user.tenant_id,
          email: approveModal.registrationData.email,
          first_name: approveModal.registrationData.firstName,
          last_name: approveModal.registrationData.lastName,
          title: approveModal.registrationData.title,
          phone: approveModal.registrationData.phone,
          department: approveModal.registrationData.department,
          is_active: true,
          must_change_password: true  // Force change on first login
        }])
        .select()
        .single();

      if (createError) throw createError;

      // 3. Assign roles (existing code)
      await apiDatabase.assignUserRoles(
        newUser.id,
        user.tenant_id,
        approvalData.roles,
        adminUserId
      );

      // 4. Assign scopes (existing code)
      // ...

      // 5. Update registration status
      await supabase
        .from('user_registration_requests')
        .update({
          status: 'approved',
          approved_by: adminUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', approveModal.registrationId);

      // 6. Send email with password
      await apiDatabase.sendApprovalEmail(
        approveModal.registrationData.email,
        approveModal.registrationData.firstName,
        tempPassword  // ✅ Send password in email
      );

      // Show success with password
      showAlert('success', `อนุมัติสำเร็จ! รหัสผ่านชั่วคราว: ${tempPassword}`);
      
      // Optional: Show modal with password to copy
      // ...

    } catch (error) {
      console.error('Error approving registration:', error);
      showAlert('error', 'อนุมัติไม่สำเร็จ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
};
```

##### Step 3: Update Email Template (30 min)

**File:** `/frontend/src/modules/shared/services/apiDatabase.js`

```javascript
export const sendApprovalEmail = async (email, firstName, tempPassword) => {
  try {
    // TODO: ใช้ Supabase Edge Function
    console.log(`📧 ส่ง Email อนุมัติไปยัง ${email}`);
    console.log(`รหัสผ่านชั่วคราว: ${tempPassword}`);

    // Template:
    const emailBody = `
      สวัสดีคุณ ${firstName},

      บัญชีของคุณได้รับการอนุมัติแล้ว!

      ข้อมูลการเข้าสู่ระบบ:
      - Email: ${email}
      - รหัสผ่านชั่วคราว: ${tempPassword}

      ⚠️ กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก

      เข้าสู่ระบบที่: https://dj-system.com/login

      ขอบคุณครับ/ค่ะ
      DJ System Team
    `;

    // TODO: ส่งผ่าน Email Service
    return { success: true };
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};
```

#### Testing Checklist

- [ ] Generate Password → ได้รหัส 12 ตัว มี Upper, Lower, Number
- [ ] Pronounceable Password → อ่านออกเสียงง่าย
- [ ] Validate Strength → Score ถูกต้อง
- [ ] Create User → Supabase Auth ทำงาน
- [ ] User Login → ใช้ temp password ได้
- [ ] Email → รับรหัสผ่าน
- [ ] Force Change Password → ถูกบังคับเปลี่ยน

#### Success Criteria

✅ Password generator ทำงานถูกต้อง  
✅ User สามารถล็อกอินด้วย temp password  
✅ Email ส่งพร้อมรหัสผ่าน  
✅ Must change password on first login

---

### 🛠️ Task 1.4: Transaction Rollback

**Priority:** 🔴 Critical  
**Assigned:** Developer 2 (Backend)  
**Duration:** 6 hours  
**Dependencies:** None

#### Problem Statement
ใน `CreateJob.jsx` ถ้า Job สร้างสำเร็จ แต่ Design Job Items fail → Job ยังอยู่ใน DB แต่ไม่มี Items (Data inconsistency)

#### Solution

##### Step 1: Create PostgreSQL Function (2 hours)

**File:** `/database/migrations/003_create_job_with_items_function.sql`

```sql
-- ========================================
-- Migration 003: Create Job with Items (Transaction)
-- Purpose: Ensure atomicity when creating job + items
-- ========================================

CREATE OR REPLACE FUNCTION create_job_with_items(
  p_job_data JSONB,
  p_items_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id INT;
  v_result JSONB;
BEGIN
  -- 1. Insert Job
  INSERT INTO jobs (
    tenant_id,
    project_id,
    job_type_id,
    subject,
    objective,
    description,
    headline,
    sub_headline,
    priority,
    status,
    requester_id,
    due_date
  )
  VALUES (
    (p_job_data->>'tenant_id')::INT,
    (p_job_data->>'project_id')::INT,
    (p_job_data->>'job_type_id')::INT,
    p_job_data->>'subject',
    p_job_data->>'objective',
    p_job_data->>'description',
    p_job_data->>'headline',
    p_job_data->>'sub_headline',
    COALESCE(p_job_data->>'priority', 'normal'),
    COALESCE(p_job_data->>'status', 'pending_approval'),
    (p_job_data->>'requester_id')::INT,
    (p_job_data->>'due_date')::TIMESTAMP
  )
  RETURNING id INTO v_job_id;

  -- 2. Insert Design Job Items
  INSERT INTO design_job_items (
    job_id,
    job_type_item_id,
    name,
    quantity,
    status
  )
  SELECT
    v_job_id,
    (item->>'job_type_item_id')::INT,
    item->>'name',
    (item->>'quantity')::INT,
    COALESCE(item->>'status', 'pending')
  FROM jsonb_array_elements(p_items_data) AS item;

  -- 3. Return job data
  SELECT jsonb_build_object(
    'id', id,
    'dj_id', dj_id,
    'subject', subject,
    'status', status,
    'created_at', created_at
  ) INTO v_result
  FROM jobs
  WHERE id = v_job_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE EXCEPTION 'Failed to create job with items: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_job_with_items(JSONB, JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_job_with_items IS 'Create job with items in a single transaction';
```

**Run Migration:**
```bash
cd /Users/chanetw/Documents/DJ-System
psql -h <supabase-host> -U postgres -d postgres -f database/migrations/003_create_job_with_items_function.sql
```

##### Step 2: Update CreateJob.jsx (2 hours)

**File:** `/frontend/src/modules/features/job-request/pages/CreateJob.jsx`

**Replace entire handleSubmit:**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // Validation
  if (!formData.subject || !formData.project_id || !formData.job_type_id) {
    alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
    return;
  }

  try {
    setSubmitting(true);
    const { user } = useAuth();

    // 1. Prepare job data
    const jobData = {
      tenant_id: user.tenant_id,
      project_id: parseInt(formData.project_id),
      job_type_id: parseInt(formData.job_type_id),
      subject: formData.subject,
      objective: formData.objective,
      description: formData.description,
      headline: formData.headline,
      sub_headline: formData.sub_headline,
      priority: formData.priority,
      status: 'pending_approval',
      requester_id: user.id,
      due_date: calculatedDueDate?.toISOString()
    };

    // 2. Prepare items data
    const itemsData = subItems.map(item => ({
      job_type_item_id: item.id,
      name: item.name,
      quantity: itemValues[item.id]?.quantity || 1,
      status: 'pending'
    }));

    // 3. Call PostgreSQL function (Transaction)
    const { data, error } = await supabase.rpc('create_job_with_items', {
      p_job_data: jobData,
      p_items_data: itemsData
    });

    if (error) throw error;

    const jobId = data.id;
    const djId = data.dj_id;

    // 4. Auto-Assignment
    console.log('🤖 Triggering Auto-Assignment...');
    const assignResult = await assignJobFromMatrix(
      jobId,
      formData.project_id,
      formData.job_type_id
    );

    // 5. Success message
    let successMessage = `✅ สร้างใบงานสำเร็จ! รหัสเอกสาร: ${djId || jobId}`;
    if (assignResult.success && assignResult.assigneeId) {
      successMessage += `\n👤 ระบบได้จ่ายงานให้ User #${assignResult.assigneeId} เรียบร้อยแล้ว`;
    } else {
      successMessage += `\n⚠️ ยังไม่ได้ระบุผู้รับผิดชอบ`;
    }

    alert(successMessage);

    // 6. Reset Form
    setFormData({
      subject: '', project_id: '', job_type_id: '',
      objective: '', description: '', headline: '', sub_headline: '', priority: 'normal'
    });
    setCalculatedDueDate(null);
    setSubItems([]);
    setItemValues({});

  } catch (error) {
    console.error('Error creating job:', error);
    alert('เกิดข้อผิดพลาด: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};
```

##### Step 3: Error Handling & Retry (1 hour)

**Add retry logic for network failures:**

```javascript
import { retry } from '@shared/utils/retry';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    setSubmitting(true);
    
    // Wrap in retry function (max 3 attempts)
    const result = await retry(async () => {
      const { data, error } = await supabase.rpc('create_job_with_items', {
        p_job_data: jobData,
        p_items_data: itemsData
      });
      
      if (error) throw error;
      return data;
    }, {
      maxAttempts: 3,
      delayMs: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}:`, error.message);
      }
    });
    
    // ...success handling...
    
  } catch (error) {
    if (error.message.includes('network')) {
      alert('เกิดปัญหาการเชื่อมต่อ กรุณาลองอีกครั้ง');
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  } finally {
    setSubmitting(false);
  }
};
```

**Create retry utility:**

**File:** `/frontend/src/modules/shared/utils/retry.js`

```javascript
/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result from function
 */
export const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry = () => {}
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        onRetry(attempt, error);
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};
```

##### Step 4: Testing (1 hour)

**Test Scenarios:**

```javascript
// Test 1: Normal Flow
- Create job with items
- Verify: Both job and items created
- Check DB: SELECT * FROM jobs; SELECT * FROM design_job_items;

// Test 2: Simulate Items Error
- Modify function to throw error after job insert
- Expected: Transaction rollback, no job created

// Test 3: Network Failure
- Disable internet midway
- Expected: Retry logic kicks in

// Test 4: Concurrent Requests
- Create 10 jobs simultaneously
- Expected: All or none (no partial creates)
```

#### Success Criteria

✅ PostgreSQL function created  
✅ Transaction rollback ทำงานถูกต้อง  
✅ Retry logic ทำงาน  
✅ Error handling ครอบคลุม  
✅ ไม่มี orphaned records

---

### 🛠️ Task 1.5: Testing & Verification

**Priority:** 🔴 Critical  
**Assigned:** QA Tester  
**Duration:** 8 hours  
**Dependencies:** Tasks 1.1-1.4

#### Test Plan

##### Test 1: Auth Context (2 hours)

```
1. Login as different users
2. Verify: user.id, user.tenant_id ถูกต้อง
3. Create Job → Check requester_id in DB
4. Approve User → Check approved_by in DB
5. Logout → Verify store cleared
6. Refresh page → Verify session persists
```

##### Test 2: Multi-tenancy (2 hours)

```
1. Create Tenant A data
2. Create Tenant B data
3. Login as Tenant A user
4. Verify: เห็นเฉพาะข้อมูล Tenant A
5. Login as Tenant B user
6. Verify: เห็นเฉพาะข้อมูล Tenant B
7. Cross-tenant test: Try accessing Tenant B data while logged as Tenant A
8. Expected: 403 Forbidden or empty results
```

##### Test 3: Password Generation (2 hours)

```
1. Approve new user
2. Check: Password generated (12 chars)
3. Verify: Email sent with password
4. Login with temp password
5. Verify: Forced to change password
6. Change password
7. Login with new password
8. Verify: Success
```

##### Test 4: Transaction Rollback (2 hours)

```
1. Create job normally
2. Verify: Job + Items created
3. Simulate error (modify DB constraint)
4. Try create job
5. Verify: Transaction rolled back
6. Check DB: No orphaned job record
7. Verify: Error message shown
8. Restore DB constraint
9. Create job again
10. Verify: Success
```

#### Test Report Template

```markdown
## Phase 1 Testing Report

**Date:** Feb 2, 2026
**Tester:** [Name]

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| Auth Context | ✅ Pass | All checks passed |
| Multi-tenancy | ✅ Pass | Isolation working |
| Password Gen | ⚠️ Partial | Email not sent (mock) |
| Transaction | ✅ Pass | Rollback working |

### Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

1. [Recommendation]
2. [Recommendation]
```

---

### 🛠️ Task 1.6: Code Review

**Priority:** 🔴 Critical  
**Assigned:** All Developers  
**Duration:** 2 hours  
**Dependencies:** Tasks 1.1-1.5

#### Review Checklist

```markdown
## Code Review Checklist - Phase 1

### General
- [ ] All hardcoded values removed
- [ ] No console.errors in production code
- [ ] Proper error handling
- [ ] Loading states implemented
- [ ] Success/Error messages clear

### Auth Context
- [ ] useAuth() hook used consistently
- [ ] No direct localStorage access
- [ ] Proper logout cleanup
- [ ] Session persistence working

### Multi-tenancy
- [ ] All queries filter by tenant_id
- [ ] Foreign keys have tenant_id
- [ ] Cross-tenant isolation verified

### Password
- [ ] Secure password generation
- [ ] Password sent via email (or shown once)
- [ ] Force change password working

### Transaction
- [ ] PostgreSQL function tested
- [ ] Rollback verified
- [ ] Error messages clear
- [ ] Retry logic working

### Testing
- [ ] All tests passed
- [ ] Test coverage > 80%
- [ ] Edge cases covered

### Documentation
- [ ] Code comments updated
- [ ] README updated
- [ ] API docs updated (if changed)
```

---

## 🟡 Phase 2: High Priority (Week 2)

**Goal:** แก้ไขปัญหาสำคัญที่ส่งผลต่อการใช้งานจริง

### 📅 Timeline: Feb 3 - Feb 9, 2026

| Task | Developer | Duration | Status |
|------|-----------|----------|--------|
| 2.1 Email Service Integration | Dev 2 | 8 hrs | ✅ Complete |
| 2.2 Holidays from Database | Dev 1 | 2 hrs | ✅ Complete |
| 2.3 Scope Validation | Dev 1 | 4 hrs | ✅ Complete |
| 2.4 Soft Delete Implementation | Dev 1 | 3 hrs | ✅ Complete |
| 2.5 File Upload Feature | Dev 1 + Dev 2 | 12 hrs | ✅ Complete |
| 2.6 Testing & QA | QA | 3 hrs | 🟡 Ready |

**Total:** 32 hours

---

### 🛠️ Task 2.1: Email Service Integration

**Priority:** 🟡 High  
**Assigned:** Developer 2 (Backend)  
**Duration:** 8 hours  
**Dependencies:** Phase 1 complete

#### Problem Statement
ปัจจุบัน email functions เป็น mock (console.log) ต้องเชื่อมต่อ Email Service จริง

#### Solution Options

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Resend** | ✅ Easy, Modern API, Good DX | ⚠️ ยังใหม่ | $20/mo |
| **SendGrid** | ✅ Reliable, Well-known | ❌ Complex API | $15/mo |
| **AWS SES** | ✅ Cheap, Scalable | ❌ Setup complex | $1/mo |
| **Supabase Edge Function + Resend** | ✅ Integrated | ⚠️ Extra setup | $0 (+ Resend) |

**Recommendation:** Supabase Edge Function + Resend

##### Step 1: Setup Resend Account (1 hour)

```bash
# 1. Sign up at resend.com
# 2. Get API Key
# 3. Verify domain (or use resend.dev for testing)
# 4. Create email templates
```

**Email Templates:**

**Template 1: Registration Approved**
```html
<!-- File: email-templates/registration-approved.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #E11D48; color: white; padding: 20px; }
    .content { padding: 20px; }
    .password-box { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 บัญชีของคุณได้รับการอนุมัติแล้ว!</h1>
    </div>
    <div class="content">
      <p>สวัสดีคุณ {{firstName}},</p>
      <p>ยินดีต้อนรับสู่ DJ System! บัญชีของคุณได้รับการอนุมัติจาก Admin แล้ว</p>
      
      <h3>ข้อมูลการเข้าสู่ระบบ:</h3>
      <ul>
        <li><strong>Email:</strong> {{email}}</li>
        <li><strong>รหัสผ่านชั่วคราว:</strong></li>
      </ul>
      
      <div class="password-box">
        <code style="font-size: 18px; font-weight: bold;">{{tempPassword}}</code>
      </div>
      
      <p>⚠️ <strong>สำคัญ:</strong> กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก</p>
      
      <p>
        <a href="{{loginUrl}}" style="background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
          เข้าสู่ระบบ
        </a>
      </p>
      
      <p>หากคุณมีคำถาม กรุณาติดต่อ admin@djsystem.com</p>
    </div>
    <div class="footer">
      <p>DJ System &copy; 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

**Template 2: Registration Rejected**
```html
<!-- File: email-templates/registration-rejected.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC2626; color: white; padding: 20px; }
    .content { padding: 20px; }
    .reason-box { background: #FEF2F2; padding: 15px; margin: 20px 0; border-left: 4px solid #DC2626; }
    .footer { text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>เกี่ยวกับการสมัครสมาชิก</h1>
    </div>
    <div class="content">
      <p>สวัสดีคุณ {{firstName}},</p>
      <p>ขออภัย คำขอสมัครสมาชิกของคุณไม่ได้รับการอนุมัติ</p>
      
      <h3>เหตุผล:</h3>
      <div class="reason-box">
        {{rejectionReason}}
      </div>
      
      <p>หากคุณมีข้อสงสัย กรุณาติดต่อ admin@djsystem.com</p>
      
      <p>ขอบคุณที่ให้ความสนใจ DJ System</p>
    </div>
    <div class="footer">
      <p>DJ System &copy; 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

##### Step 2: Create Supabase Edge Function (3 hours)

```bash
# Initialize Supabase Functions (if not yet)
cd /Users/chanetw/Documents/DJ-System
supabase functions new send-email

# Install dependencies
cd supabase/functions/send-email
npm init -y
npm install resend
```

**File:** `/supabase/functions/send-email/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface EmailRequest {
  to: string;
  template: 'registration_approved' | 'registration_rejected';
  data: {
    firstName: string;
    email?: string;
    tempPassword?: string;
    rejectionReason?: string;
    loginUrl?: string;
  };
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, template, data } = body;

    let subject = '';
    let html = '';

    // Select template
    switch (template) {
      case 'registration_approved':
        subject = '🎉 บัญชีของคุณได้รับการอนุมัติแล้ว - DJ System';
        html = getApprovedTemplate(data);
        break;
      
      case 'registration_rejected':
        subject = 'เกี่ยวกับการสมัครสมาชิก - DJ System';
        html = getRejectedTemplate(data);
        break;
      
      default:
        throw new Error('Invalid template');
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'DJ System <noreply@djsystem.com>',
      to: [to],
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getApprovedTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #E11D48; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .password-box { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .button { background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 บัญชีของคุณได้รับการอนุมัติแล้ว!</h1>
        </div>
        <div class="content">
          <p>สวัสดีคุณ ${data.firstName},</p>
          <p>ยินดีต้อนรับสู่ DJ System! บัญชีของคุณได้รับการอนุมัติจาก Admin แล้ว</p>
          
          <h3>ข้อมูลการเข้าสู่ระบบ:</h3>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>รหัสผ่านชั่วคราว:</strong></p>
          
          <div class="password-box">
            <code style="font-size: 20px; font-weight: bold; color: #E11D48;">${data.tempPassword}</code>
          </div>
          
          <p>⚠️ <strong>สำคัญ:</strong> กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก</p>
          
          <p style="text-align: center;">
            <a href="${data.loginUrl || 'https://djsystem.com/login'}" class="button">
              เข้าสู่ระบบ
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRejectedTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .reason-box { background: #FEF2F2; padding: 15px; margin: 20px 0; border-left: 4px solid #DC2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>เกี่ยวกับการสมัครสมาชิก</h1>
        </div>
        <div class="content">
          <p>สวัสดีคุณ ${data.firstName},</p>
          <p>ขออภัย คำขอสมัครสมาชิกของคุณไม่ได้รับการอนุมัติ</p>
          
          <h3>เหตุผล:</h3>
          <div class="reason-box">
            ${data.rejectionReason}
          </div>
          
          <p>หากคุณมีข้อสงสัย กรุณาติดต่อ admin@djsystem.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

##### Step 3: Deploy Edge Function (1 hour)

```bash
# Set environment variables
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Deploy function
supabase functions deploy send-email

# Test function
curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/send-email' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "test@example.com",
    "template": "registration_approved",
    "data": {
      "firstName": "John",
      "email": "test@example.com",
      "tempPassword": "TempPass123",
      "loginUrl": "https://djsystem.com/login"
    }
  }'
```

##### Step 4: Update Frontend (2 hours)

**File:** `/frontend/src/modules/shared/services/apiDatabase.js`

```javascript
/**
 * ส่ง Email แจ้งการอนุมัติ
 */
export const sendApprovalEmail = async (email, firstName, tempPassword) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template: 'registration_approved',
        data: {
          firstName,
          email,
          tempPassword,
          loginUrl: `${window.location.origin}/login`
        }
      }
    });

    if (error) throw error;
    
    console.log('✅ Email sent successfully:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    // Don't throw - email failure shouldn't block approval
    return { success: false, error: error.message };
  }
};

/**
 * ส่ง Email แจ้งการปฏิเสธ
 */
export const sendRejectionEmail = async (email, firstName, reason) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template: 'registration_rejected',
        data: {
          firstName,
          rejectionReason: reason
        }
      }
    });

    if (error) throw error;
    
    console.log('✅ Rejection email sent:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};
```

##### Step 5: Testing (1 hour)

**Test Cases:**

```
Test 1: Approval Email
1. Approve new user
2. Check inbox
3. Verify: Email received
4. Verify: Password visible
5. Verify: Login link works
6. Click login button
7. Expected: Redirects to login page

Test 2: Rejection Email
1. Reject user with reason
2. Check inbox
3. Verify: Email received
4. Verify: Reason displayed correctly

Test 3: Email Delivery Failure
1. Use invalid email
2. Approve user
3. Verify: Approval still succeeds
4. Verify: Error logged but not thrown

Test 4: Rate Limiting
1. Approve 100 users rapidly
2. Verify: All emails sent
3. Check Resend dashboard
4. Verify: No rate limit errors
```

#### Success Criteria

✅ Resend account setup  
✅ Edge Function deployed  
✅ Email templates working  
✅ Emails delivered successfully  
✅ Error handling proper

---

### 🛠️ Task 2.2: Holidays from Database

**Priority:** 🟡 High  
**Assigned:** Developer 1 (Frontend)  
**Duration:** 2 hours  
**Dependencies:** None

#### Problem Statement
ปัจจุบัน holidays ใน `CreateJob.jsx` เป็น mock data ทำให้ SLA calculator อาจคำนวณผิด

#### Solution

##### Step 1: Verify Database Schema (15 min)

```sql
-- Check holidays table exists
SELECT * FROM holidays LIMIT 5;

-- Expected columns:
-- id, date, name, is_public, is_active

-- If missing, create:
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add sample data
INSERT INTO holidays (date, name, is_public) VALUES
('2026-01-01', 'วันขึ้นปีใหม่', TRUE),
('2026-04-13', 'วันสงกรานต์', TRUE),
('2026-04-14', 'วันสงกรานต์', TRUE),
('2026-04-15', 'วันสงกรานต์', TRUE),
('2026-05-01', 'วันแรงงาน', TRUE),
('2026-12-25', 'วันคริสต์มาส', TRUE);
```

##### Step 2: Update CreateJob.jsx (1 hour)

**File:** `/frontend/src/modules/features/job-request/pages/CreateJob.jsx`

**Replace:**

```javascript
// ❌ Before
const [holidays, setHolidays] = useState([]);

const fetchMasterData = async () => {
  // ...existing code...
  
  // 3. ดึง Holidays (Mock)
  const mockHolidays = ['2026-05-01', '2026-05-04'];
  setHolidays(mockHolidays);
};
```

**With:**

```javascript
// ✅ After
const [holidays, setHolidays] = useState([]);
const [holidaysLoading, setHolidaysLoading] = useState(false);

const fetchMasterData = async () => {
  try {
    setLoading(true);

    // 1. ดึง Projects
    const { data: projData } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true);
    setProjects(projData || []);

    // 2. ดึง Job Types
    const { data: typeData } = await supabase
      .from('job_types')
      .select('id, name, sla_days')
      .eq('is_active', true);
    setJobTypes(typeData || []);

    // 3. ดึง Holidays from Database
    const { data: holidaysData, error: holidaysError } = await supabase
      .from('holidays')
      .select('date')
      .eq('is_public', true)
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0]) // เฉพาะวันที่อนาคต
      .order('date');

    if (holidaysError) {
      console.error('Error loading holidays:', holidaysError);
      setHolidays([]); // Fallback to empty array
    } else {
      // Convert to array of date strings
      const holidayDates = (holidaysData || []).map(h => h.date);
      setHolidays(holidayDates);
      console.log('📅 Loaded holidays:', holidayDates);
    }

  } catch (error) {
    console.error('Error fetching master data:', error);
    alert('ไม่สามารถโหลดข้อมูลระบบได้');
  } finally {
    setLoading(false);
  }
};
```

##### Step 3: Cache Holidays (30 min)

**Optimize by caching holidays in localStorage:**

```javascript
const HOLIDAYS_CACHE_KEY = 'holidays_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const fetchHolidays = async () => {
  // Check cache first
  const cached = localStorage.getItem(HOLIDAYS_CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log('📅 Using cached holidays');
      return data;
    }
  }

  // Fetch from DB
  const { data, error } = await supabase
    .from('holidays')
    .select('date')
    .eq('is_public', true)
    .eq('is_active', true)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date');

  if (error) throw error;

  const holidays = (data || []).map(h => h.date);

  // Cache it
  localStorage.setItem(HOLIDAYS_CACHE_KEY, JSON.stringify({
    data: holidays,
    timestamp: Date.now()
  }));

  return holidays;
};
```

##### Step 4: Testing (15 min)

```
Test 1: Load Holidays
1. Open CreateJob page
2. Check Console
3. Verify: "📅 Loaded holidays: [...]"
4. Verify: Holidays array has dates

Test 2: SLA Calculation with Holidays
1. Create holiday: 2026-02-05
2. Select Job Type (SLA: 5 days)
3. Created: 2026-02-03 (Monday)
4. Expected Due Date:
   - Mon 03 → Day 1
   - Tue 04 → Day 2
   - Wed 05 → Skip (Holiday)
   - Thu 06 → Day 3
   - Fri 07 → Day 4
   - Mon 10 → Day 5
5. Verify: Due Date = 2026-02-10

Test 3: Cache
1. Refresh page
2. Check Console: "Using cached holidays"
3. Clear cache
4. Refresh page
5. Check Console: Fetch from DB
```

#### Success Criteria

✅ Holidays loaded from database  
✅ SLA calculator uses real holidays  
✅ Cache implemented  
✅ Performance optimized

---

### 🛠️ Task 2.3: Scope Validation

**Priority:** 🟡 High  
**Assigned:** Developer 1 (Frontend)  
**Duration:** 4 hours  
**Dependencies:** Phase 1 (Auth Context)

#### Problem Statement
ใน `ApprovalsQueue.jsx` ปัจจุบัน User เห็น Jobs ทั้งหมด แม้ว่าจะไม่ได้อยู่ใน Scope

#### Solution

##### Step 1: Create Scope Helper (1 hour)

**File:** `/frontend/src/modules/shared/utils/scopeHelpers.js`

```javascript
import { supabase } from '@shared/services/supabaseClient';

/**
 * Get user's scope assignments
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Scope assignments
 */
export const getUserScopes = async (userId) => {
  const { data, error } = await supabase
    .from('user_scope_assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
};

/**
 * Check if user has scope for a project
 * @param {number} userId - User ID
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>} - Has scope or not
 */
export const hasProjectScope = async (userId, projectId) => {
  // Get user's scopes
  const scopes = await getUserScopes(userId);

  // Check if user has Tenant-level scope (see all)
  if (scopes.some(s => s.scope_level === 'Tenant')) {
    return true;
  }

  // Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, bud_id, tenant_id')
    .eq('id', projectId)
    .single();

  if (!project) return false;

  // Check BUD-level scope
  if (scopes.some(s => 
    s.scope_level === 'BUD' && 
    s.scope_id === project.bud_id
  )) {
    return true;
  }

  // Check Project-level scope
  if (scopes.some(s => 
    s.scope_level === 'Project' && 
    s.scope_id === projectId
  )) {
    return true;
  }

  return false;
};

/**
 * Filter jobs by user's scope
 * @param {Array} jobs - All jobs
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Filtered jobs
 */
export const filterJobsByScope = async (jobs, userId) => {
  const scopes = await getUserScopes(userId);

  // If user has Tenant-level scope, return all
  if (scopes.some(s => s.scope_level === 'Tenant')) {
    return jobs;
  }

  // Get allowed project IDs
  const allowedProjectIds = new Set();

  // Add projects from Project-level scopes
  scopes
    .filter(s => s.scope_level === 'Project')
    .forEach(s => allowedProjectIds.add(s.scope_id));

  // Add projects from BUD-level scopes
  const budScopes = scopes.filter(s => s.scope_level === 'BUD');
  if (budScopes.length > 0) {
    const budIds = budScopes.map(s => s.scope_id);
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .in('bud_id', budIds);
    
    (projects || []).forEach(p => allowedProjectIds.add(p.id));
  }

  // Filter jobs
  return jobs.filter(job => allowedProjectIds.has(job.project_id));
};
```

##### Step 2: Update ApprovalsQueue.jsx (2 hours)

**File:** `/frontend/src/modules/features/job-management/pages/ApprovalsQueue.jsx`

```javascript
import { useAuth } from '@core/stores/authStore';
import { getUserScopes } from '@shared/utils/scopeHelpers';

export default function ApprovalsQueue() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingJobs = async () => {
    try {
      setLoading(true);

      // 1. Get user's scope assignments
      const scopes = await getUserScopes(user.id);

      // 2. Build query based on scopes
      let query = supabase
        .from('jobs')
        .select(`
          *,
          project:projects(id, name, bud_id),
          job_type:job_types(name),
          requester:users!jobs_requester_id_fkey(first_name, last_name)
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      // 3. Filter by scope
      if (scopes.some(s => s.scope_level === 'Tenant')) {
        // Tenant scope: See all jobs in tenant
        query = query.eq('tenant_id', user.tenant_id);
      } else {
        // Project/BUD scope: See only specific projects
        const allowedProjectIds = new Set();

        // Add projects from Project-level scopes
        scopes
          .filter(s => s.scope_level === 'Project')
          .forEach(s => allowedProjectIds.add(s.scope_id));

        // Add projects from BUD-level scopes
        const budScopes = scopes.filter(s => s.scope_level === 'BUD');
        if (budScopes.length > 0) {
          const budIds = budScopes.map(s => s.scope_id);
          const { data: projects } = await supabase
            .from('projects')
            .select('id')
            .in('bud_id', budIds)
            .eq('tenant_id', user.tenant_id);
          
          (projects || []).forEach(p => allowedProjectIds.add(p.id));
        }

        // Apply project filter
        if (allowedProjectIds.size > 0) {
          query = query.in('project_id', Array.from(allowedProjectIds));
        } else {
          // No scope = no jobs
          setJobs([]);
          setLoading(false);
          return;
        }
      }

      // 4. Execute query
      const { data, error } = await query;

      if (error) throw error;

      setJobs(data || []);

    } catch (error) {
      console.error('Error loading jobs:', error);
      alert('ไม่สามารถโหลดคิวอนุมัติได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPendingJobs();
    }
  }, [user]);

  // ...rest of component...
}
```

##### Step 3: Update DJList.jsx (1 hour)

**Apply same scope filtering to DJList:**

```javascript
const loadJobs = async () => {
  const scopes = await getUserScopes(user.id);

  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply scope filter (same logic as ApprovalsQueue)
  if (scopes.some(s => s.scope_level === 'Tenant')) {
    query = query.eq('tenant_id', user.tenant_id);
  } else {
    // ... same project filtering logic ...
  }

  const { data } = await query;
  setJobs(data || []);
};
```

#### Testing Checklist

```
Test 1: Tenant-level Scope
1. User has Tenant scope
2. Login
3. Open Approvals Queue
4. Verify: เห็น Jobs ทั้งหมดใน Tenant

Test 2: BUD-level Scope
1. User has BUD scope (Marketing BUD)
2. Create jobs in:
   - Marketing BUD projects ✅
   - Sales BUD projects ❌
3. Login as BUD user
4. Verify: เห็นเฉพาะ Marketing jobs

Test 3: Project-level Scope
1. User has Project A scope only
2. Create jobs in:
   - Project A ✅
   - Project B ❌
3. Login as Project user
4. Verify: เห็นเฉพาะ Project A jobs

Test 4: Multiple Scopes
1. User has scopes:
   - Project A
   - Project B
   - BUD C (which contains Project D, E)
2. Verify: เห็น Projects A, B, D, E

Test 5: No Scope
1. User has no scope assignments
2. Verify: ไม่เห็น Jobs เลย
3. Show message: "คุณไม่มีสิทธิ์เข้าถึงโครงการใดๆ"
```

#### Success Criteria

✅ Scope validation implemented  
✅ Users see only authorized jobs  
✅ Tenant/BUD/Project levels working  
✅ Performance optimized (no N+1 queries)

---

**(Continue with Tasks 2.4-2.6 and Phase 3 in similar detailed format...)**

---

## 🟢 Phase 3: Medium Priority (Week 3-4)

**Goal:** ปรับปรุงประสบการณ์ผู้ใช้และเพิ่มฟีเจอร์สำคัญ

### 📅 Timeline: Feb 10 - Feb 23, 2026

| Task | Developer | Duration | Status |
|------|-----------|----------|--------|
| 3.1 File Upload Feature | Dev 1 + Dev 2 | 12 hrs | ✅ Complete |
| 3.2 Code Splitting | Dev 1 | 4 hrs | ✅ Complete |
| 3.3 Real-time Updates | Dev 2 | 8 hrs | ✅ Complete |
| 3.4 Audit Trail | Dev 2 | 6 hrs | ✅ Complete |
| 3.5 Mobile Responsiveness | Dev 1 | 6 hrs | ✅ Complete |
| 3.6 Testing & Documentation | All | 4 hrs | 🟡 Ready |

**Total:** 40 hours

---

## 📊 Testing Strategy

### Automated Testing

```bash
# Unit Tests
npm run test

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Manual Testing Checklist

```markdown
## Pre-Deployment Checklist

### Phase 1
- [ ] Auth Context working
- [ ] Multi-tenancy isolation verified
- [ ] Password generation tested
- [ ] Transaction rollback working
- [ ] All hardcoded values removed

### Phase 2
- [ ] Email service delivering
- [ ] Holidays from database
- [ ] Scope validation working
- [ ] Soft delete implemented
- [ ] File upload working

### Phase 3
- [ ] Code splitting reducing bundle size
- [ ] Real-time updates working
- [ ] Audit trail logging
- [ ] Mobile responsive
- [ ] Documentation updated

### Security
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention working
- [ ] CSRF protection enabled
- [ ] Auth tokens secure

### Performance
- [ ] Page load < 3s
- [ ] Bundle size < 500KB (gzip)
- [ ] No memory leaks
- [ ] Database queries optimized
```

---

## 🚀 Deployment Plan

### Staging Deployment (End of Each Phase)

```bash
# 1. Build
cd /Users/chanetw/Documents/DJ-System/frontend
npm run build

# 2. Test build
npm run preview

# 3. Deploy to Staging
# (Vercel / Netlify / Custom)
vercel --prod --env=staging

# 4. Run smoke tests
npm run test:smoke
```

### Production Deployment (After All Phases)

```bash
# 1. Final QA sign-off
# 2. Database migrations
psql -h <prod-host> -f database/migrations/*.sql

# 3. Deploy frontend
vercel --prod

# 4. Monitor
# - Check Sentry for errors
# - Check analytics
# - Check user feedback
```

---

## 🔄 Rollback Plan

### If Critical Bug Found

```bash
# 1. Immediately rollback frontend
vercel rollback <deployment-id>

# 2. Rollback database if needed
psql -h <prod-host> -f database/rollback/*.sql

# 3. Investigate & fix
# 4. Re-deploy after fix
```

### Rollback Checklist

- [ ] Identify issue
- [ ] Assess impact
- [ ] Execute rollback
- [ ] Notify users (if needed)
- [ ] Root cause analysis
- [ ] Fix and re-test
- [ ] Re-deploy

---

**Implementation Plan Created:** 2026-01-26  
**Next Review:** After each Phase completion  
**Contact:** Development Team

---

*End of Implementation Plan* 🎉
