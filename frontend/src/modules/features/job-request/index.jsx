/**
 * @file index.js
 * @description Entry Point ของ Job Request Module
 * 
 * Module นี้รับผิดชอบ:
 * - หน้าสร้างงานใหม่ (CreateDJ / CreateJobPage)
 * 
 * การใช้งาน:
 * - Import { routes } จากไฟล์นี้เพื่อลงทะเบียนใน moduleRegistry.js
 */

// === Route Definitions ===
// หมายเหตุ: ปัจจุบันยังใช้ routes จาก App.jsx โดยตรง
// หลังจาก migrate ครบแล้ว จะ export routes จากที่นี่

import React from 'react';
import CreateJobPage from './pages/CreateJobPage';

/**
 * Routes สำหรับ Job Request Module
 * 
 * @type {Array<{path: string, element: JSX.Element, roles?: string[], title?: string}>}
 */
export const routes = [
    {
        path: 'create',
        element: <CreateJobPage />,
        roles: ['user', 'admin', 'staff'],
        title: 'สร้างรายการงาน'
    }
];

/**
 * Metadata ของ Module
 * ใช้สำหรับแสดงใน Admin Panel หรือ Navigation
 */
export const moduleInfo = {
    name: 'job-request',
    displayName: 'สร้างงานใหม่',
    icon: 'PlusCircleIcon',
    description: 'หน้าจอสำหรับสร้างรายการงานออกแบบใหม่'
};
