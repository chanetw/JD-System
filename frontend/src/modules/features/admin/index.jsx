/**
 * @file index.js
 * @description Entry Point ของ Admin Module
 * 
 * Module นี้รับผิดชอบ:
 * - หน้าจัดการผู้ใช้ (UserManagement)
 * - หน้าตั้งค่า Job Types และ SLA
 * - หน้าจัดการโครงสร้างองค์กร (BUD)
 * - หน้าตั้งค่าระบบอื่นๆ
 * 
 * การใช้งาน:
 * - Import { routes } จากไฟล์นี้เพื่อลงทะเบียนใน moduleRegistry.js
 */

import React, { Suspense } from 'react';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// === Lazy Loading Components ===
// ใช้ React.lazy เพื่อโหลดหน้าแบบ Dynamic (Code Splitting)
// ทำให้ Initial Bundle เล็กลง และโหลดเฉพาะหน้าที่ผู้ใช้ต้องการจริงๆ
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const JobTypeSLA = React.lazy(() => import('./pages/JobTypeSLA'));
const JobTypeItems = React.lazy(() => import('./pages/JobTypeItems'));
const ApprovalFlow = React.lazy(() => import('./pages/ApprovalFlow'));
const AssignmentMatrix = React.lazy(() => import('./pages/AssignmentMatrix'));
const OrganizationManagement = React.lazy(() => import('./pages/OrganizationManagement'));
const HolidayCalendar = React.lazy(() => import('./pages/HolidayCalendar'));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings'));
// V2 ApprovalFlowTemplates REMOVED - Using V1 Extended instead


/**
 * Helper: ครอบ Component ด้วย Suspense (สำหรับ Lazy Loading)
 * @param {React.Component} Component - Component ที่ต้องการโหลดแบบ Lazy
 * @returns {React.Element} - Component ที่ถูกครอบด้วย Suspense
 */
const withSuspense = (Component) => (
    <Suspense fallback={
        <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="md" color="rose" label="" />
        </div>
    }>
        <Component />
    </Suspense>
);

/**
 * Routes สำหรับ Admin Module
 * 
 * แต่ละ Route ประกอบด้วย:
 * - path: URL path (ต่อจาก base path /)
 * - element: React Component ที่จะ render (ครอบด้วย Suspense)
 * - roles: Array ของ roles ที่อนุญาตให้เข้าถึง
 * - title: ชื่อหน้าสำหรับแสดงใน UI
 * 
 * @type {Array<{path: string, element: JSX.Element, roles?: string[], title?: string}>}
 */
export const routes = [
    {
        path: 'admin/users',
        element: withSuspense(UserManagement),
        roles: ['Admin'],
        title: 'จัดการผู้ใช้'
    },
    {
        path: 'admin/job-types',
        element: withSuspense(JobTypeSLA),
        roles: ['Admin'],
        title: 'ประเภทงานและ SLA'
    },
    {
        path: 'admin/job-type-items',
        element: withSuspense(JobTypeItems),
        roles: ['Admin'],
        title: 'รายการย่อยประเภทงาน'
    },
    {
        path: 'admin/approval-flow',
        element: withSuspense(ApprovalFlow),
        roles: ['Admin'],
        title: 'ลำดับการอนุมัติ'
    },
    {
        path: 'admin/assignment-matrix',
        element: withSuspense(AssignmentMatrix),
        roles: ['Admin'],
        title: 'กำหนดผู้รับงานอัตโนมัติ'
    },
    {
        path: 'admin/organization',
        element: withSuspense(OrganizationManagement),
        roles: ['Admin'],
        title: 'โครงสร้างองค์กร'
    },
    {
        path: 'admin/holidays',
        element: withSuspense(HolidayCalendar),
        roles: ['Admin'],
        title: 'ปฏิทินวันหยุด'
    },
    {
        path: 'admin/notifications',
        element: withSuspense(NotificationSettings),
        roles: ['Admin'],
        title: 'ตั้งค่าการแจ้งเตือน'
    },
    // V2 Approval Flow Templates route REMOVED - Using V1 Extended instead
];

/**
 * Metadata ของ Module
 */
export const moduleInfo = {
    name: 'admin',
    displayName: 'จัดการระบบ',
    icon: 'Cog6ToothIcon',
    description: 'หน้าจอสำหรับผู้ดูแลระบบ (Admin Only)'
};
