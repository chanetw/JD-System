/**
 * @file App.jsx
 * @description Main App Component - ตั้งค่า Router และ Routes
 * 
 * Senior Programmer Notes:
 * - ใช้ React Router v6 สำหรับ routing
 * - Layout เป็น wrapper ที่มี Sidebar และ Header สำหรับ Admin/Staff pages
 * - UserPortal แยกออกมาอยู่นอก Layout หลัก เพื่อให้มี Design หน้าบ้านของตัวเอง
 * - V2 Portals: แยกตาม Role (marketing, approver, assignee, admin)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import CreateDJ from '@/pages/CreateDJ';
import DJList from '@/pages/DJList';
import JobDetail from '@/pages/JobDetail';
import ApprovalsQueue from '@/pages/ApprovalsQueue';
import JobTypeSLA from '@/pages/admin/JobTypeSLA';
import HolidayCalendar from '@/pages/admin/HolidayCalendar';
import ApprovalFlow from '@/pages/admin/ApprovalFlow';
import OrganizationManagement from '@/pages/admin/OrganizationManagement';
import UserManagement from '@/pages/admin/UserManagement';
import MediaPortal from '@/pages/MediaPortal';
import UserPortal from '@/pages/UserPortal';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/auth/ProtectedRoute';


import ReportsDashboard from '@/pages/admin/ReportsDashboard';

/**
 * @component App
 * @description Root Component ของแอป
 */
function App() {
  return (
    // BrowserRouter = ใช้ History API ของ Browser สำหรับ routing
    <BrowserRouter>
      <Routes>

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

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

          <Route path="create" element={<CreateDJ />} />
          <Route path="jobs" element={<DJList />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="approvals" element={<ApprovalsQueue />} />

          {/* Admin routes */}
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/job-types" element={<JobTypeSLA />} />
          <Route path="admin/organization" element={<OrganizationManagement />} />
          <Route path="admin/reports" element={<ReportsDashboard />} />
          <Route path="media-portal" element={<MediaPortal />} />
          <Route path="admin/holidays" element={<HolidayCalendar />} />
          <Route path="admin/approval-flow" element={<ApprovalFlow />} />

          {/* Staff Portals */}
          <Route path="media-portal" element={<MediaPortal />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

/**
 * @component ComingSoon
 * @description หน้า Placeholder สำหรับ features ที่ยังไม่ได้ทำ
 */
function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-gray-500 mt-2">Coming Soon...</p>
    </div>
  );
}

export default App;
