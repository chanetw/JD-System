# Holiday Calendar Data Loading - Diagnostic Report
# รายงานการตรวจสอบโมดูลปฏิทินวันหยุด

**Date | วันที่:** 2026-01-28
**Status | สถานะ:** CRITICAL - Data Cannot Load
**Language | ภาษา:** Thai + English

---

## Executive Summary | บทสรุป

ปฏิทินวันหยุด (Holiday Calendar) ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้ เพราะ **service method ยังคงใช้ Supabase Direct Queries** ในขณะที่ระบบได้อัปเกรดมาใช้ Backend REST API แล้ว

The Holiday Calendar cannot load data because the **service method still uses Supabase Direct Queries** while the system has migrated to Backend REST API.

---

## 1. Root Cause | สาเหตุหลัก

### Problem: Misaligned Service Methods

**Frontend Service File:** `frontend/src/modules/shared/services/modules/adminService.js`

```javascript
// ❌ LINE 496-522: getHolidays() uses SUPABASE DIRECT
getHolidays: async (tenantId = 1) => {
    try {
        const { data, error } = await supabase  // ← DIRECT SUPABASE!
            .from('holidays')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('date', { ascending: true });
        // ...
    }
}

// ✓ LINE 556-584: addHoliday() uses BACKEND REST API
addHoliday: async (holidayData, tenantId = 1) => {
    try {
        const response = await httpClient.post('/holidays', payload);  // ← REST API!
        // ...
    }
}

// ✓ LINE 597-618: updateHoliday() uses BACKEND REST API
updateHoliday: async (id, holidayData) => {
    try {
        const response = await httpClient.put(`/holidays/${id}`, payload);  // ← REST API!
        // ...
    }
}

// ✓ LINE 605-617: deleteHoliday() uses BACKEND REST API
deleteHoliday: async (id) => {
    try {
        const response = await httpClient.delete(`/holidays/${id}`);  // ← REST API!
        // ...
    }
}
```

**Error Flow:**

```
HolidayCalendar.jsx: loadHolidays()
    ↓
api.getHolidays()
    ↓
adminService.getHolidays()
    ↓
supabase.from('holidays').select('*')  ← PROBLEM!
    ↓
Supabase Auth Check (RLS Policy Enforcement)
    ↓
❌ 403 Forbidden
   Reason: No valid session token for Supabase client
   (Frontend lost Supabase auth when switching to Backend API)
```

---

## 2. Technical Details | รายละเอียดทางเทคนิค

### Why This Happened

The system recently migrated from **Supabase Direct Queries** to **Backend REST API**:
- ✓ Organization Data (Projects, BUDs, Departments, Tenants) - Updated ✓
- ✓ Jobs Data - Updated ✓
- ✓ Master Data - Updated ✓
- ✗ Holidays - **PARTIALLY** updated (Create/Update/Delete work, but not Get)
- ✗ Holiday Dates (for SLA) - Still uses Supabase Direct

### Current State of Holiday Methods

| Method | Current Approach | Expected | Status |
|--------|-----------------|----------|--------|
| `getHolidays()` | Supabase Direct | Backend REST API | ✗ BROKEN |
| `getHolidayDates()` | Supabase Direct | Backend REST API | ✗ BROKEN |
| `addHoliday()` | Backend REST API | Backend REST API | ✓ WORKS |
| `updateHoliday()` | Backend REST API | Backend REST API | ✓ WORKS |
| `deleteHoliday()` | Backend REST API | Backend REST API | ✓ WORKS |
| `createHoliday()` | Backend REST API (via addHoliday) | Backend REST API | ✓ WORKS |

### Backend Route Status

**File:** `backend/api-server/src/routes/holidays.js`

✓ **ALL ENDPOINTS ARE IMPLEMENTED:**
- `GET /api/holidays` - List all holidays (line 15-31)
- `POST /api/holidays` - Create holiday (line 36-61)
- `PUT /api/holidays/:id` - Update holiday (line 66-96)
- `DELETE /api/holidays/:id` - Delete holiday (line 101-124)

✓ **ALL HAVE SECURITY:**
- `authenticateToken` middleware (line 9)
- `setRLSContextMiddleware` (line 10)
- Tenant isolation checks (line 19, 75, 109)

✓ **ROUTE IS REGISTERED:**
- File: `backend/api-server/src/index.js`
- Code: `app.use('/api/holidays', holidaysRoutes);`

---

## 3. Failure Scenario | สถานการณ์ที่ล้มเหลว

**User Action:** Navigate to `/admin/holidays` page

**What Happens:**

```
1. HolidayCalendar.jsx mounts
   └─ useEffect calls loadHolidays()

2. loadHolidays() calls:
   const data = await api.getHolidays()

3. api.getHolidays() forwards to:
   adminService.getHolidays()

4. adminService.getHolidays() executes:
   supabase.from('holidays').select('*')

5. Supabase Client makes request:
   GET https://putfusjtlzmvjmcwkefv.supabase.co/rest/v1/holidays

6. Supabase checks authentication:
   ✗ Session token is missing or invalid
   ✗ RLS policy denies access (no tenant context from Supabase)

7. Error Response:
   Status: 403 Forbidden
   Message: "row level security violation"

   OR (if no token):
   Status: 401 Unauthorized
   Message: "Unauthorized"

8. Frontend catches error:
   setHolidays([])  // Empty array fallback
   showAlert('error', 'ไม่สามารถโหลดข้อมูลวันหยุดได้')
```

**User sees:** Empty holiday list, error notification

---

## 4. Backend API is Ready! | Backend API พร้อมใช้งาน!

The backend has **fully implemented** REST API for holidays:

**GET /api/holidays**
```javascript
// Request (Authenticated)
GET /api/holidays
Authorization: Bearer {token}

// Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenantId": 1,
      "name": "วันปีใหม่",
      "date": "2026-01-01",
      "isRecurring": true,
      "createdAt": "2026-01-28T...",
      "updatedAt": "2026-01-28T..."
    },
    ...
  ]
}
```

**POST /api/holidays**
```javascript
// Request
POST /api/holidays
Authorization: Bearer {token}
{
  "name": "วันสงกรานต์",
  "date": "2026-04-13",
  "isRecurring": true
}

// Response
{
  "success": true,
  "data": { id, tenantId, name, date, isRecurring, ... }
}
```

**PUT /api/holidays/:id**
```javascript
// Request
PUT /api/holidays/1
Authorization: Bearer {token}
{
  "name": "วันปีใหม่",
  "date": "2026-01-01",
  "isRecurring": true
}

// Response
{
  "success": true,
  "data": { id, name, date, isRecurring, ... }
}
```

**DELETE /api/holidays/:id**
```javascript
// Request
DELETE /api/holidays/1
Authorization: Bearer {token}

// Response
{
  "success": true
}
```

---

## 5. Code Comparison | เปรียบเทียบโค้ด

### ❌ Current (Broken): getHolidays using Supabase

```javascript
getHolidays: async (tenantId = 1) => {
    try {
        // ❌ WRONG: Direct Supabase query
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('date', { ascending: true });

        if (error) {
            console.warn('Error fetching holidays:', error.message);
            return [];
        }

        return (data || []).map(h => ({
            id: h.id,
            name: h.name,
            date: h.date,
            type: h.type || 'government',
            recurring: h.is_recurring || false,
            isRecurring: h.is_recurring || false
        }));
    } catch (err) {
        console.error('getHolidays error:', err);
        return [];
    }
},
```

**Problems:**
- ❌ Uses deprecated Supabase direct access
- ❌ RLS policies block access (no tenant context)
- ❌ Returns 403/401 error
- ❌ Inconsistent with other methods (addHoliday, updateHoliday, deleteHoliday)

---

### ✓ Expected (Working): getHolidays using Backend API

```javascript
getHolidays: async (tenantId = 1) => {
    // ✓ RIGHT: Use Backend REST API (consistent with create/update/delete)
    try {
        const response = await httpClient.get('/holidays');

        if (!response.data.success) {
            console.warn('[adminService] Get holidays failed:', response.data.message);
            return [];
        }

        // Transform backend response to frontend format
        return (response.data.data || []).map(h => ({
            id: h.id,
            name: h.name,
            date: h.date,
            type: h.type || 'government',
            recurring: h.isRecurring || false,
            isRecurring: h.isRecurring || false
        }));

    } catch (error) {
        console.error('[adminService] getHolidays error:', error);
        return [];
    }
},
```

**Benefits:**
- ✓ Uses Backend REST API (consistent with system migration)
- ✓ Automatic authentication via httpClient interceptor
- ✓ RLS context properly enforced by backend
- ✓ Consistent with addHoliday, updateHoliday, deleteHoliday
- ✓ Secure: tenant isolation at backend

---

### Also Needs Update: getHolidayDates

```javascript
// ❌ Current (Broken)
getHolidayDates: async (tenantId = 1) => {
    try {
        const { data, error } = await supabase  // ← WRONG!
            .from('holidays')
            .select('date')
            .eq('tenant_id', tenantId);
        // ...
    }
},

// ✓ Expected (Working)
getHolidayDates: async (tenantId = 1) => {
    try {
        const response = await httpClient.get('/holidays');  // ← RIGHT!

        if (!response.data.success) return [];

        return (response.data.data || []).map(h => new Date(h.date));
    } catch (err) {
        console.error('getHolidayDates error:', err);
        return [];
    }
},
```

---

## 6. Complete Fix Required | แก้ไขที่ต้องทำ

### Files That Need Updating:
1. **frontend/src/modules/shared/services/modules/adminService.js**
   - Lines 496-522: `getHolidays()` - Use httpClient.get('/holidays')
   - Lines 529-546: `getHolidayDates()` - Use httpClient.get('/holidays')
   - Add transformation logic for field name mapping

### No Changes Needed For:
- ✓ Backend routes (already correct)
- ✓ Backend registration in index.js (already done)
- ✓ HolidayCalendar.jsx component (logic is correct)
- ✓ addHoliday, updateHoliday, deleteHoliday (already use httpClient)

---

## 7. Data Format Mapping | การแมปรูปแบบข้อมูล

**Database → Backend → Frontend:**

```
Database (holidays table)
├─ id: integer
├─ tenant_id: integer
├─ name: varchar
├─ date: date
├─ is_recurring: boolean
├─ created_at: timestamp
└─ updated_at: timestamp

↓ (Prisma transforms)

Backend Response (holidays.js)
├─ id: integer
├─ tenantId: integer (Prisma field name)
├─ name: string
├─ date: datetime
├─ isRecurring: boolean (Prisma field name)
├─ createdAt: datetime
└─ updatedAt: datetime

↓ (Frontend needs to map)

Frontend Usage (HolidayCalendar.jsx)
├─ id: number
├─ name: string
├─ date: string (ISO format "YYYY-MM-DD")
├─ type: string (hardcoded to 'government' - backend doesn't have this)
├─ recurring: boolean
└─ isRecurring: boolean (for compatibility)
```

**Note:** The `type` field (government/company) doesn't exist in the database schema but is expected by the frontend. The backend comments indicate this was removed. Frontend assumes `'government'` as default.

---

## 8. Error Messages Explained | อธิบายข้อความผิดพลาด

**Console Error:**
```
GET https://putfusjtlzmvjmcwkefv.supabase.co/rest/v1/holidays 403 (Forbidden)

@supabase_supabase-js.js:7224  GET ... 403 (Forbidden)
_handleRequest2 @ @supabase_supabase-js.js:7514
```

**Why 403?**
- Supabase RLS policies require a valid session token
- Frontend Supabase client lost auth when system switched to Backend API
- Request reaches Supabase but RLS denies access

**Why doesn't the backend API call fail?**
- addHoliday, updateHoliday, deleteHoliday work because they use httpClient
- httpClient has an interceptor that adds Authorization header
- Backend authenticates successfully and enforces RLS at application level

---

## 9. Summary of Issues | สรุปประเด็นทั้งหมด

| # | Component | Issue | Severity | Impact |
|---|-----------|-------|----------|--------|
| 1 | adminService.getHolidays() | Uses Supabase Direct instead of httpClient | **CRITICAL** | Holiday list cannot load |
| 2 | adminService.getHolidayDates() | Uses Supabase Direct instead of httpClient | HIGH | SLA calculation cannot get holidays |
| 3 | Inconsistent service methods | Create/Update/Delete use httpClient but Get uses Supabase | HIGH | Maintenance nightmare, future bugs |
| 4 | No `type` field in database | Frontend expects `type` but backend removed it | MEDIUM | Hardcoded to 'government' currently |

---

## 10. Verification | ยืนยันการแก้ไข

**After fixing both methods:**

1. Navigate to `/admin/holidays`
2. Holiday list should populate with data
3. Add a new holiday - should appear immediately
4. Edit a holiday - should save and refresh
5. Delete a holiday - should remove and refresh
6. All without 403 errors in console

---

*Diagnostic Report Generated: Code Analysis Only (No Fixes Applied)*
*รายงานการตรวจสอบนี้สร้างขึ้นจากการวิเคราะห์โค้ด (ไม่มีการแก้ไข)*

