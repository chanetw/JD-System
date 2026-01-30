# Forensic Investigation Report: 401 Unauthorized API Failures / รายงานการตรวจสอบวินิจฉัย: ข้อผิดพลาด 401 Unauthorized ของ API

**Date / วันที่:** 2026-01-28
**Status / สถานะ:** CRITICAL - All API Calls Failing / วิกฤต - การเรียก API ทั้งหมดล้มเหลว
**Report Type / ประเภทรายงาน:** Diagnostic Only (No Fixes Applied) / รายงานการวินิจฉัยเท่านั้น (ไม่มีการแก้ไขโค้ด)

---

## Executive Summary / บทสรุปผู้บริหาร

All authenticated API endpoints return `401 Unauthorized` errors. The website fails to render data after login due to missing or invalid authentication tokens. This report documents the exact technical causes identified through code analysis.

API endpoint ทั้งหมดที่ต้องมีการยืนยันตัวตนส่งข้อผิดพลาด `401 Unauthorized` กลับมา เว็บไซต์ไม่สามารถแสดงผลข้อมูลหลังจากล็อกอินได้เนื่องจากไม่มี Token หรือ Token ไม่ถูกต้อง รายงานฉบับนี้บันทึกสาเหตุทางเทคนิคที่พบจากการวิเคราะห์โค้ด

---

## 1. Root Cause Analysis / การวิเคราะห์สาเหตุหลัก

### Primary Cause: Demo Login Does Not Generate JWT Token / สาเหตุหลัก: Demo Login ไม่มีการสร้าง JWT Token

**File:** [LoginDemo.jsx](frontend/src/modules/core/auth/pages/LoginDemo.jsx)
**Lines:** 57-61

```javascript
const selectedUser = users.find(u => u.id === parseInt(selectedUserId));
if (selectedUser) {
    // Issue: Passes user object WITHOUT token
    login(selectedUser);  // <-- NO TOKEN!
}
```

The Demo Login flow / ลำดับการทำงานของ Demo Login:
1. Fetches users from `/api/auth/mock-users` (public endpoint) / ดึงรายชื่อผู้ใช้จาก `/api/auth/mock-users` (public endpoint)
2. User selects a user from dropdown / ผู้ใช้เลือกชื่อจากรายการ dropdown
3. Calls `authStore.login(selectedUser)` with **only user data** (no password, no token) / เรียกใช้ `authStore.login(selectedUser)` โดยส่งไป**เฉพาะข้อมูลผู้ใช้** (ไม่มีรหัสผ่าน และไม่มี Token)
4. The `authStore.login()` checks `if (user?.token)` at [authStore.js:186](frontend/src/modules/core/stores/authStore.js#L186) / ฟังก์ชัน `authStore.login()` จะตรวจสอบ `if (user?.token)` ที่บรรทัด 186
5. Since `selectedUser` has no `token` property, **nothing is stored in localStorage** / เนื่องจาก `selectedUser` ไม่มีคุณสมบัติ `token` จึง**ไม่มีการบันทึกอะไรลงใน localStorage**

**Consequence:** `localStorage.getItem('token')` returns `null` for all subsequent API calls.
**ผลที่ตามมา:** `localStorage.getItem('token')` จะคืนค่าเป็น `null` สำหรับการเรียก API ทั้งหมดหลังจากนั้น

---

## 2. Authentication Flow Analysis / การวิเคราะห์โฟลว์การยืนยันตัวตน

### Expected Flow (Real Login - Working) / โฟลว์ที่ควรจะเป็น (Real Login - ทำงานได้)

```
LoginReal.jsx
    ↓
authStore.login({ email, password, tenantId })
    ↓
api.login() → userService.login()
    ↓
POST /api/auth/login (Backend)
    ↓
Returns: { user: {...}, token: "eyJ..." }
    ↓
authStore stores: localStorage.setItem('token', user.token)
    ↓
httpClient interceptor reads: localStorage.getItem('token')
    ↓
API calls include: Authorization: Bearer eyJ...
    ↓
Backend validates JWT → SUCCESS
```

### Broken Flow (Demo Login - Not Working) / โฟลว์ที่ผิดพลาด (Demo Login - ไม่ทำงาน)

```
LoginDemo.jsx
    ↓
GET /api/auth/mock-users (Public)
    ↓
Returns: [{ id, email, displayName, roles }]  // NO TOKEN!
    ↓
User selects from dropdown
    ↓
authStore.login(selectedUser)  // selectedUser has NO token
    ↓
if (user?.token) { ... }  // FALSE - skipped!
    ↓
localStorage.getItem('token') → null
    ↓
httpClient sends: Authorization: Bearer null
    ↓
Backend: 401 Unauthorized
```

---

## 3. Token Storage Verification / การตรวจสอบการจัดเก็บ Token

### Storage Key Analysis / การวิเคราะห์ Key ที่ใช้จัดเก็บ

| Component / ส่วนประกอบ | Storage Key / Key ที่ใช้ | Value Expected / ค่าที่คาดหวัง |
|-----------|-------------|----------------|
| [authStore.js:187](frontend/src/modules/core/stores/authStore.js#L187) | `token` | JWT string |
| [httpClient.js:29](frontend/src/modules/shared/services/httpClient.js#L29) | `token` | JWT string |
| [userService.js:552](frontend/src/modules/shared/services/modules/userService.js#L552) | `token` | JWT string |

**Finding:** All components use the same key `'token'`. The key is consistent - **this is not the issue**.
**สิ่งที่พบ:** ส่วนประกอบทั้งหมดใช้ Key เดียวกันคือ `'token'` ซึ่งมีความสอดคล้องกัน **ประเด็นนี้จึงไม่ใช่สาเหตุของปัญหา**

### Zustand Persist Storage / การจัดเก็บแบบถาวรของ Zustand

**File:** [authStore.js:295](frontend/src/modules/core/stores/authStore.js#L295)

```javascript
{
    name: 'dj-auth-storage',
    partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated
    })
}
```

**Finding:** Zustand persist stores user data at `'dj-auth-storage'`, but the token is stored separately at `'token'`. The token is **not** inside the Zustand storage object.
**สิ่งที่พบ:** Zustand persist จัดเก็บข้อมูลผู้ใช้ไว้ที่ `'dj-auth-storage'` แต่ Token ถูกจัดเก็บแยกต่างหากที่ `'token'` ซึ่ง Token **ไม่ได้** อยู่ใน Object ของ Zustand storage

---

## 4. Backend Token Verification / การตรวจสอบ Token ฝั่ง Backend

### JWT Verification Middleware / มิดเดิลแวร์สำหรับตรวจสอบ JWT

**File:** [auth.js:27-51](backend/api-server/src/routes/auth.js#L27)

```javascript
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({...});
    }
    req.user = user;
    next();
  });
}
```

**Finding:** Backend correctly checks for `Authorization: Bearer <token>` header. When token is missing or `null`, it returns 401.
**สิ่งที่พบ:** Backend มีการตรวจสอบ Header `Authorization: Bearer <token>` อย่างถูกต้อง เมื่อไม่มี Token หรือค่าเป็น `null` ระบบจะส่ง 401 กลับมา

### Environment Variable Dependency / การพึ่งพาตัวแปรสภาพแวดล้อม

Backend requires `JWT_SECRET` environment variable:
Backend ต้องการตัวแปรสภาพแวดล้อม `JWT_SECRET`:

**File:** [auth.js:128](backend/api-server/src/routes/auth.js#L128)

```javascript
const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
  expiresIn: '24h'
});
```

**Potential Issue:** If `JWT_SECRET` is not set in `.env`, all tokens will be invalid.
**ปัญหาที่อาจเกิดขึ้น:** หากไม่ได้ตั้งค่า `JWT_SECRET` ในไฟล์ `.env` Token ทั้งหมดจะใช้งานไม่ได้

---

## 5. API Endpoints Affected / Endpoint ของ API ที่ได้รับผลกระทบ

All protected endpoints use `authenticateToken` middleware:
Endpoint ทั้งหมดที่มีการป้องกันจะใช้มิดเดิลแวร์ `authenticateToken`:

| Endpoint | File | Impact / ผลกระทบ |
|----------|------|--------|
| `GET /api/jobs` | [jobs.js](backend/api-server/src/routes/jobs.js) | Job list empty / รายการงานว่างเปล่า |
| `GET /api/master-data` | [master-data.js](backend/api-server/src/routes/master-data.js) | Projects/JobTypes empty / ข้อมูลโครงการและประเภทงานว่างเปล่า |
| `GET /api/departments` | [departments.js](backend/api-server/src/routes/departments.js) | Departments empty / ข้อมูลแผนกว่างเปล่า |
| `GET /api/users` | [users.js](backend/api-server/src/routes/users.js) | User list empty / รายชื่อผู้ใช้ว่างเปล่า |
| `GET /api/auth/me` | [auth.js](backend/api-server/src/routes/auth.js) | User info unavailable / ไม่สามารถดึงข้อมูลผู้ใช้ได้ |
| `POST /api/auth/impersonate` | [auth.js](backend/api-server/src/routes/auth.js) | Role switching fails / สลับบทบาทล้มเหลว |

---

## 6. HTTP Client Configuration / การตั้งค่า HTTP Client

**File:** [httpClient.js](frontend/src/modules/shared/services/httpClient.js)

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

httpClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

**Finding:** When `localStorage.getItem('token')` returns `null`:
**สิ่งที่พบ:** เมื่อ `localStorage.getItem('token')` คืนค่าเป็น `null`:
- No `Authorization` header is added / ไม่มีการเพิ่ม Header `Authorization`
- Backend receives request without authentication / Backend ได้รับ request โดยไม่มีการยืนยันตัวตน
- 401 Unauthorized returned / ส่ง 401 Unauthorized กลับมา

---

## 7. Console Error Evidence / หลักฐานข้อผิดพลาดใน Console

Based on the user's reported errors:
อ้างอิงจากข้อผิดพลาดที่ผู้ใช้แจ้งมา:

```
GET http://localhost:3000/api/jobs?role=admin 401 (Unauthorized)
GET http://localhost:3000/api/master-data 401 (Unauthorized)
GET http://localhost:3000/api/jobs 401 (Unauthorized)
```

**Analysis / วิเคราะห์:**
- All requests target `localhost:3000` (correct backend URL) / ทุก request ยิงไปที่ `localhost:3000` (URL ของ backend ถูกต้อง)
- Query parameters are passed correctly (`?role=admin`) / มีการส่ง Query parameter มาอย่างถูกต้อง
- Status code 401 indicates authentication failure, not authorization (403) / รหัสสถานะ 401 บ่งบอกถึงความล้มเหลวในการยืนยันตัวตน ไม่ใช่ปัญหาเรื่องสิทธิ์ (403)
- This confirms the token is missing or invalid, not that permissions are wrong / สิ่งนี้ยืนยันว่าไม่มี Token หรือ Token ไม่ถูกต้อง ไม่ใช่เรื่องการตั้งค่าสิทธิ์ผิด

---

## 8. Identified Issues Summary / สรุปประเด็นที่พบ

| # | Issue / ประเด็น | Location / ตำแหน่ง | Severity / ความรุนแรง |
|---|-------|----------|----------|
| 1 | Demo Login does not generate JWT token / Demo Login ไม่มีสร้าง JWT token | [LoginDemo.jsx:61](frontend/src/modules/core/auth/pages/LoginDemo.jsx#L61) | **CRITICAL / วิกฤต** |
| 2 | No backend endpoint for demo authentication / ไม่มี endpoint ฝั่ง backend สำหรับการยืนยันตัวตนแบบ demo | [auth.js](backend/api-server/src/routes/auth.js) | HIGH / สูง |
| 3 | httpClient sends requests without token / httpClient ส่ง request โดยไม่มี token | [httpClient.js:31-33](frontend/src/modules/shared/services/httpClient.js#L31) | Symptom / อาการ |
| 4 | getMockUsers returns users without tokens / getMockUsers คืนค่าผู้ใช้โดยไม่มี token | [auth.js:173-208](backend/api-server/src/routes/auth.js#L173) | HIGH / สูง |

---

## 9. Data Flow Diagram / แผนภูมิการไหลของข้อมูล

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEMO LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LoginDemo.jsx          authStore.js           localStorage         │
│       │                      │                      │               │
│       │─── getMockUsers() ──►│                      │               │
│       │◄── [{user objects}]──│                      │               │
│       │                      │                      │               │
│       │─── login(user) ─────►│                      │               │
│       │                      │── if(user.token)? ──►│               │
│       │                      │   FALSE - no token   │               │
│       │                      │   SKIP setItem()     │               │
│       │                      │                      │               │
│       │                      │                      │ token = null  │
│       │                      │                      │               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  httpClient.js          Backend                                      │
│       │                    │                                         │
│       │── GET /api/jobs ──►│                                         │
│       │   (no Auth header) │                                         │
│       │◄── 401 Unauthorized│                                         │
│       │                    │                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Verification Steps (For Developers) / ขั้นตอนการตรวจสอบ (สำหรับนักพัฒนา)

To confirm this diagnosis:
เพื่อยืนยันการวินิจฉัยนี้:

1. **Check localStorage after Demo Login:** / **ตรวจสอบ localStorage หลังจาก Demo Login:**
   ```javascript
   // In browser console after logging in via Demo Login
   console.log(localStorage.getItem('token')); // Expected: null
   ```

2. **Check localStorage after Real Login:** / **ตรวจสอบ localStorage หลังจาก Real Login:**
   ```javascript
   // In browser console after logging in via Real Login (email/password)
   console.log(localStorage.getItem('token')); // Expected: "eyJ..."
   ```

3. **Verify network requests:** / **ตรวจสอบ network requests:**
   - Open DevTools → Network tab / เปิด DevTools ไปที่ Tab Network
   - Check if `Authorization: Bearer ...` header exists / ตรวจสอบว่ามี Header `Authorization: Bearer ...` หรือไม่
   - Demo Login: Header will be missing / Demo Login: Header จะไม่มีอยู่
   - Real Login: Header should contain JWT / Real Login: Header ควรจะมี JWT

4. **Test Real Login Flow:** / **ทดสอบโฟลว์ Real Login:**
   - Navigate to `/login` (not `/login_demo`) / ไปที่หน้า `/login`
   - Login with valid credentials / ล็อกอินด้วยข้อมูลที่ถูกต้อง
   - API calls should work with 200 OK / การเรียก API ควรจะทำงานได้ปกติ (200 OK)

---

## 11. Conclusion / บทสรุป

The 401 Unauthorized errors are caused by the **Demo Login flow** which bypasses JWT token generation. When users log in via the dropdown selection (Demo Mode), no authentication token is created or stored. All subsequent API calls fail because the `Authorization` header is empty.

ข้อผิดพลาด 401 Unauthorized เกิดจาก**ขั้นตอนการทำงานของ Demo Login** ที่ข้ามกระบวนการสร้าง JWT token เมื่อผู้ใช้ล็อกอินผ่านการเลือกชื่อจาก dropdown (Demo Mode) จะไม่มีการสร้างหรือจัดเก็บ Token สำหรับยืนยันตัวตน ทำให้การเรียก API ทั้งหมดหลังจากนั้นเสมือนไม่มีข้อมูลระบุตัวตน (Header `Authorization` ว่างเปล่า)

**Key Finding:** The application has two login paths with different authentication mechanisms:
**สิ่งที่พบสำคัญ:** แอปพลิเคชันมีเส้นทางการล็อกอินสองแบบที่ใช้กลไกการยืนยันตัวตนต่างกัน:
- **Real Login** (`/login`): Creates JWT token → API calls work / สร้าง JWT token → การเรียก API ทำงานได้
- **Demo Login** (`/login_demo`): No token created → API calls fail with 401 / ไม่มีสร้าง JWT token → การเรียก API ล้มเหลวพร้อมข้อผิดพลาด 401

---

## 12. Files Referenced / ไฟล์ที่เกี่ยวข้อง

| File / ไฟล์ | Path / ตำแหน่ง |
|------|------|
| LoginDemo.jsx | `frontend/src/modules/core/auth/pages/LoginDemo.jsx` |
| LoginReal.jsx | `frontend/src/modules/core/auth/pages/LoginReal.jsx` |
| authStore.js | `frontend/src/modules/core/stores/authStore.js` |
| httpClient.js | `frontend/src/modules/shared/services/httpClient.js` |
| userService.js | `frontend/src/modules/shared/services/modules/userService.js` |
| auth.js (backend) | `backend/api-server/src/routes/auth.js` |

---

*Report generated by forensic code analysis. No code modifications were made.*
*รายงานถูกสร้างขึ้นจากการวิเคราะห์โค้ดโดยละเอียด ไม่มีการแก้ไขโค้ดใดๆ*
