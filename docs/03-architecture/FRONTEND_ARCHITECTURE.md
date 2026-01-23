# Frontend Architecture Standard (v2.0 - Modular)

## 1. Overview
เอกสารนี้กำหนดมาตรฐานโครงสร้างของ Frontend Application (React) โดยใช้สถาปัตยกรรมแบบ **Modular Architecture** เพื่อรองรับการขยายตัว (Scalability) และความเป็นอิสระของแต่ละฟีเจอร์ (Isolation)

## 2. Directory Structure Strategy
โครงสร้างหลักแบ่งออกเป็น 3 Layers:

### 2.1 Core Layer (`src/modules/core/`)
**หน้าที่:** เก็บส่วนประกอบที่ "ระบบขาดไม่ได้" และมีความเสถียรสูง เปลี่ยนแปลงน้อย
- **Components:** `auth/*` (Login logic), `layout/*` (MainLayout, Sidebar)
- **Stores:** `authStore.js` (Zustand Global State)
- **Router:** `App.jsx` entry point

### 2.2 Shared Layer (`src/modules/shared/`)
**หน้าที่:** เก็บ Reusable Components และ Utilities ที่ถูกเรียกใช้โดยหลาย Module
- **Rules:**
    - ห้ามมี Business Logic ที่ซับซ้อน
    - ห้าม Import ข้ามไปหา Feature Modules (ต้องเป็น Leaf Node ของ Dependency Graph)
- **Examples:** Button, Card, Modal, FormatDate, API Service Wrapper

### 2.3 Feature Layer (`src/modules/features/`)
**หน้าที่:** เก็บ Business Logic แยกตาม Domain (Modular)
- **Structure:**
  ```text
  features/
  └── [feature-name]/        # e.g., job-request
      ├── components/        # Components เฉพาะของ feature นี้
      ├── pages/             # Page Components (Route Targets)
      ├── hooks/             # Business Logic Hooks
      └── index.js           # Entry Point ของ Module (Export Routes)
  ```

## 3. Communication Patterns

### 3.1 Module Registration
แต่ละ Module ต้องมีไฟล์ `index.js` เพื่อระบุ Routes ของต้วเอง:

```javascript
// src/modules/features/xyz/index.js
export const routes = [
  {
    path: 'xyz-list',
    element: <XYZListPage />,
    roles: ['admin', 'staff'], // Role Guarding Config
    title: 'รายการ XYZ'
  }
];
```

### 3.2 State Management
- **Local State:** ใช้ `useState` ภายใน Component
- **Module State:** (ถ้ามี) ใช้ Context หรือ Zustand Slice ที่ Scope เฉพาะ Module
- **Global State:** ใช้ `authStore` (Core) สำหรับ User Info เท่านั้น พยายามเลี่ยง Global State สำหรับ Data ที่ใช้แค่ Feature เดียว

### 3.3 Routing & Guards
- `src/moduleRegistry.js` มีหน้าที่รวม Routes จากทุก Module
- `App.jsx` จะ Loop สร้าง `<Route>` พร้อมครอบด้วย `<ProtectedRoute>` ตาม config `roles` ที่กำหนดใน Module

## 4. API Integration
- ใช้ `src/modules/shared/services/apiService.js` เป็น Centralized Service
- แต่ละ Feature สามารถมี Service ย่อยของตัวเองได้ เช่น `jobService.js` โดย import `api` หลักมาใช้

## 5. Deployment & Build
- ระบบใช้ **Vite** ในการ Build
- การแยก Module ช่วยให้ (ในอนาคต) สามารถทำ Code Splitting แยก Chunk ได้ง่ายขึ้น
