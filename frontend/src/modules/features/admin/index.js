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

/**
 * Routes สำหรับ Admin Module
 * 
 * @type {Array<{path: string, element: JSX.Element, roles?: string[], title?: string}>}
 */
export const routes = [
    // TODO: Uncomment หลังย้ายไฟล์มาที่นี่
    // {
    //   path: 'users',
    //   element: <UserManagementPage />,
    //   roles: ['admin'],
    //   title: 'จัดการผู้ใช้'
    // },
    // {
    //   path: 'job-types',
    //   element: <JobTypeSLAPage />,
    //   roles: ['admin'],
    //   title: 'ประเภทงานและ SLA'
    // },
    // ... more admin routes
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
