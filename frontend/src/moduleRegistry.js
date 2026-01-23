/**
 * @file moduleRegistry.js
 * @description ระบบลงทะเบียน Module แบบ Dynamic (Modular Architecture)
 * 
 * วัตถุประสงค์:
 * - รวบรวม Routes จากทุก Feature Module ไว้ที่เดียว
 * - ให้ App.jsx สามารถ Loop สร้าง <Route> ได้โดยอัตโนมัติ
 * - รองรับการเพิ่ม/ลด Module ได้ง่าย (Plug & Play)
 * 
 * การใช้งาน:
 * 1. สร้างไฟล์ index.js ใน Feature Module ที่ export `routes` array
 * 2. Import และเพิ่มใน registeredModules ด้านล่าง
 * 3. App.jsx จะ render routes เหล่านี้โดยอัตโนมัติ
 */

import { routes as jobRequestRoutes } from '@features/job-request';
import { routes as jobManagementRoutes } from '@features/job-management';
import { routes as adminRoutes } from '@features/admin/index.jsx';

/**
 * รายการ Module ที่ลงทะเบียนในระบบ
 * แต่ละ entry ประกอบด้วย:
 * - name: ชื่อ Module (สำหรับ Debug)
 * - basePath: Path พื้นฐานของ Module (ถ้ามี)
 * - routes: Array ของ Route Object
 * - enabled: เปิด/ปิดการใช้งาน Module
 * 
 * @type {Array<{name: string, basePath: string, routes: Array, enabled: boolean}>}
 */
export const registeredModules = [
    // === Core Modules (ไม่สามารถปิดได้) ===
    {
        name: 'auth',
        basePath: '',
        routes: [], // Auth routes ยังคงอยู่ใน App.jsx เพราะอยู่นอก Layout
        enabled: true,
        isCore: true
    },

    // === Feature Modules (Plug & Play) ===
    {
        name: 'job-request',
        basePath: '',
        routes: jobRequestRoutes,
        enabled: true
    },
    {
        name: 'job-management',
        basePath: '',
        routes: jobManagementRoutes,
        enabled: true
    },
    {
        name: 'admin',
        basePath: '',
        routes: adminRoutes,
        enabled: true
    },
];

/**
 * ดึง Routes ทั้งหมดจาก Module ที่เปิดใช้งาน
 * 
 * @returns {Array} - Array ของ Route Objects ที่พร้อม render
 * 
 * แต่ละ Route Object ประกอบด้วย:
 * - path: URL path ของ route
 * - element: React Component ที่จะ render
 * - roles: (optional) Array ของ roles ที่อนุญาต
 * - title: (optional) ชื่อหน้าสำหรับแสดงใน UI
 */
export function getAllRoutes() {
    const allRoutes = [];

    // วนลูปผ่านทุก Module ที่ลงทะเบียนไว้
    for (const module of registeredModules) {
        // ข้าม Module ที่ปิดการใช้งาน
        if (!module.enabled) continue;

        // เพิ่ม basePath ให้กับ routes ของ module (ถ้ามี)
        for (const route of module.routes) {
            const fullPath = module.basePath
                ? `${module.basePath}/${route.path}`
                : route.path;

            allRoutes.push({
                ...route,
                path: fullPath,
                moduleName: module.name // เก็บชื่อ Module ไว้สำหรับ Debug
            });
        }
    }

    return allRoutes;
}

/**
 * ตรวจสอบว่า Module นั้นเปิดใช้งานอยู่หรือไม่
 * 
 * @param {string} moduleName - ชื่อ Module ที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าเปิดใช้งาน
 */
export function isModuleEnabled(moduleName) {
    const module = registeredModules.find(m => m.name === moduleName);
    return module?.enabled ?? false;
}

/**
 * ดึงรายชื่อ Module ทั้งหมดพร้อมสถานะ
 * สำหรับใช้ใน Admin Panel หรือ Debug
 * 
 * @returns {Array<{name: string, enabled: boolean, routeCount: number}>}
 */
export function getModuleStatus() {
    return registeredModules.map(m => ({
        name: m.name,
        enabled: m.enabled,
        isCore: m.isCore || false,
        routeCount: m.routes.length
    }));
}

// Log ข้อมูล Module เมื่อ Load (Development Only)
if (import.meta.env.DEV) {
    console.log('[Module Registry] Loaded Modules:', getModuleStatus());
}

export default registeredModules;
