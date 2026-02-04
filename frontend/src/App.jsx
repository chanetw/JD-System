/**
 * @file App.jsx
 * @description Main App Component - ตั้งค่า Router และ Routes
 * 
 * Senior Programmer Notes:
 * - ใช้ React Router v6 สำหรับ routing
 * - Code Splitting: ใช้ React.lazy() สำหรับ lazy loading modules
 * - Refactored: ใช้ moduleRegistry เพื่อสร้าง Routes แบบ Dynamic (Phase 4)
 * - Layout เป็น wrapper ที่มี Sidebar และ Header สำหรับ Admin/Staff pages
 * - UserPortal แยกออกมาอยู่นอก Layout หลัก เพื่อให้มี Design หน้าบ้านของตัวเอง
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';

// Core Modules (loaded immediately)
import { Layout } from '@core/layout';
import { Login, LoginDemo, Register, ForgotPassword, ChangePassword, ProtectedRoute } from '@core/auth';

// V2 Auth Pages (TypeScript - Production-ready)
import { LoginV2, RegisterV2, ForgotPasswordV2, ResetPasswordV2, ForceChangePassword } from '@core/auth-v2';

// Lazy-loaded Feature Modules (Code Splitting)
const Dashboard = lazy(() => import('@features/dashboard/pages/Dashboard'));
const UserPortal = lazy(() => import('@features/portals/pages/UserPortal.jsx'));
const MediaPortal = lazy(() => import('@features/portals/pages/MediaPortal.jsx'));

// Module Registry
import { getAllRoutes } from './moduleRegistry';

/**
 * Loading Fallback Component
 */
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
      <p className="mt-3 text-gray-500 text-sm">กำลังโหลด...</p>
    </div>
  </div>
);

/**
 * Page Loading Fallback (smaller, for inner pages)
 */
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
      <p className="mt-2 text-gray-500 text-sm">กำลังโหลด...</p>
    </div>
  </div>
);

/**
 * @component App
 * @description Root Component ของแอป
 */
function App() {
  const dynamicRoutes = getAllRoutes();
  const initialize = useAuthStoreV2((state) => state.initialize);
  const isLoading = useAuthStoreV2((state) => state.isLoading);

  // Initialize auth on app start
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    // BrowserRouter = ใช้ History API ของ Browser สำหรับ routing
    <BrowserRouter>
      <Routes>

        {/* Public Pages (No Login Required) */}
        <Route path="/login" element={<LoginV2 />} />
        <Route path="/login_demo" element={<LoginDemo />} />

        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* V2 Auth Pages (Production-ready with Sequelize + RBAC) */}
        {/* <Route path="/login-v2" element={<LoginV2 />} /> -> Moved to /login */}
        <Route path="/register-v2" element={<RegisterV2 />} />
        <Route path="/forgot-password-v2" element={<ForgotPasswordV2 />} />
        <Route path="/reset-password-v2" element={<ResetPasswordV2 />} />

        {/* Change Password (Requires Login) */}
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />

        {/* Force Change Password (After Admin Approval) */}
        <Route path="/force-change-password" element={
          <ProtectedRoute>
            <ForceChangePassword />
          </ProtectedRoute>
        } />

        {/* V1 User Portal (แยก Layout) */}
        <Route path="/user-portal" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <UserPortal />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Layout เป็น parent route ที่ wrap ทุก pages ของ Admin/Staff */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* index = default child route (เมื่อเข้า /) */}
          <Route index element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Dashboard />
            </Suspense>
          } />

          {/* === Dynamic Routes from Module Registry === */}
          {dynamicRoutes.map((route, index) => (
            <Route
              key={`${route.moduleName}-${index}`}
              path={route.path}
              element={
                <Suspense fallback={<PageLoadingFallback />}>
                  {route.element}
                </Suspense>
              }
            />
          ))}

          {/* === Admin / Legacy Routes (Pending Migration) === */}
          {/* Admin routes migrated to modules/features/admin */}

          <Route path="media-portal" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <MediaPortal />
            </Suspense>
          } />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
