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
import React, { useEffect, Suspense, lazy } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';

// Core Modules (loaded immediately)
import { Layout } from '@core/layout';
import { Login, LoginDemo, Register, ChangePassword, ProtectedRoute, RoleProtectedRoute } from '@core/auth';
import MagicLinkAuth from './modules/core/auth/pages/MagicLinkAuth';

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
 * Error Boundary - จับ runtime error แทน Suspense spinner ที่ซ่อน error
 */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[PageErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-red-700 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-sm text-gray-600 mb-3">{this.state.error?.message || 'Unknown error'}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700">โหลดใหม่</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <Route path="/auth/magic-link" element={<MagicLinkAuth />} />

        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPasswordV2 />} />
        <Route path="/reset-password" element={<ResetPasswordV2 />} />

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
          <RoleProtectedRoute allowedRoles={['Admin', 'Requester', 'Approver']}>
            <Suspense fallback={<LoadingFallback />}>
              <UserPortal />
            </Suspense>
          </RoleProtectedRoute>
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
                <PageErrorBoundary>
                  <Suspense fallback={<PageLoadingFallback />}>
                    {route.roles ? (
                      <RoleProtectedRoute allowedRoles={route.roles}>
                        {route.element}
                      </RoleProtectedRoute>
                    ) : (
                      route.element
                    )}
                  </Suspense>
                </PageErrorBoundary>
              }
            />
          ))}

          {/* === Admin / Legacy Routes (Pending Migration) === */}
          {/* Admin routes migrated to modules/features/admin */}

          <Route path="media-portal" element={
            <RoleProtectedRoute allowedRoles={['Admin', 'Requester', 'Approver']}>
              <Suspense fallback={<PageLoadingFallback />}>
                <MediaPortal />
              </Suspense>
            </RoleProtectedRoute>
          } />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
