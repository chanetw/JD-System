/**
 * @file index.js
 * @description Entry Point ของ Job Management Module
 * 
 * Module นี้รับผิดชอบ:
 * - หน้ารายการงานทั้งหมด (DJList)
 * - หน้ารายละเอียดงาน (JobDetail)
 * - หน้าคิวอนุมัติ (ApprovalsQueue)
 * 
 * การใช้งาน:
 * - Import { routes } จากไฟล์นี้เพื่อลงทะเบียนใน moduleRegistry.js
 */

import React from 'react';
import DJList from './pages/DJList';
import JobDetail from './pages/JobDetail';
import ApprovalsQueue from './pages/ApprovalsQueue';

/**
 * Routes สำหรับ Job Management Module
 * 
 * @type {Array<{path: string, element: JSX.Element, roles?: string[], title?: string}>}
 */
export const routes = [
    {
        path: 'jobs',
        element: <DJList />,
        roles: ['Admin', 'Requester', 'Assignee', 'Approver', 'user', 'staff'], // Include legacy and proper roles
        title: 'รายการงาน'
    },
    {
        path: 'jobs/:id',
        element: <JobDetail />,
        roles: ['Admin', 'Requester', 'Assignee', 'Approver', 'user', 'staff'],
        title: 'รายละเอียดงาน'
    },
    {
        path: 'approvals',
        element: <ApprovalsQueue />,
        roles: ['Approver', 'Admin'],
        title: 'คิวรออนุมัติ'
    }
];

/**
 * Metadata ของ Module
 */
export const moduleInfo = {
    name: 'job-management',
    displayName: 'จัดการงาน',
    icon: 'ClipboardDocumentListIcon',
    description: 'หน้าจอสำหรับดูรายการงาน, รายละเอียด และคิวอนุมัติ'
};
