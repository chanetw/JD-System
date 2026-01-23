/**
 * @file App.jsx
 * @description Main App Component - ตั้งค่า Router และ Routes
 * 
 * Senior Programmer Notes:
 * - ใช้ React Router v6 สำหรับ routing
 * - Refactored: ใช้ moduleRegistry เพื่อสร้าง Routes แบบ Dynamic (Phase 4)
 * - Layout เป็น wrapper ที่มี Sidebar และ Header สำหรับ Admin/Staff pages
 * - UserPortal แยกออกมาอยู่นอก Layout หลัก เพื่อให้มี Design หน้าบ้านของตัวเอง
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Core Modules
import { Layout } from '@core/layout';
import { Login, Register, ForgotPassword, ChangePassword, ProtectedRoute } from '@core/auth';

// Feature Modules
import { Dashboard } from '@features/dashboard';
import { UserPortal, MediaPortal } from '@features/portals';

// Admin / Legacy Pages (ยังไม่ Migrate)
// import JobTypeSLA from '@/pages/admin/JobTypeSLA';
// import JobTypeItems from '@/pages/admin/JobTypeItems';
// import HolidayCalendar from '@/pages/admin/HolidayCalendar';
// import ApprovalFlow from '@/pages/admin/ApprovalFlow';
// import OrganizationManagement from '@/pages/admin/OrganizationManagement';
// import UserManagement from '@/pages/admin/UserManagementNew';
// import NotificationSettings from '@/pages/admin/NotificationSettings';
// import ReportsDashboard from '@/pages/admin/ReportsDashboard';
// import Reports from '@/pages/admin/Reports';

// Module Registry
import { getAllRoutes } from './moduleRegistry';

/**
 * @component App
 * @description Root Component ของแอป
 */
function App() {
  const dynamicRoutes = getAllRoutes();

  return (
    // BrowserRouter = ใช้ History API ของ Browser สำหรับ routing
    <BrowserRouter>
      <Routes>

        {/* Public Pages (No Login Required) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Change Password (Requires Login) */}
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />

        {/* V1 User Portal (แยก Layout) */}
        <Route path="/user-portal" element={
          <ProtectedRoute>
            <UserPortal />
          </ProtectedRoute>
        } />

        {/* Layout เป็น parent route ที่ wrap ทุก pages ของ Admin/Staff */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* index = default child route (เมื่อเข้า /) */}
          <Route index element={<Dashboard />} />

          {/* === Dynamic Routes from Module Registry === */}
          {dynamicRoutes.map((route, index) => (
            <Route
              key={`${route.moduleName}-${index}`}
              path={route.path}
              element={route.element}
            />
          ))}

          {/* === Admin / Legacy Routes (Pending Migration) === */}
          {/* Admin routes migrated to modules/features/admin */}

          <Route path="media-portal" element={<MediaPortal />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
