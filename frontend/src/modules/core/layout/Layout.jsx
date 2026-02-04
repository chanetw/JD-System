/**
 * @file Layout.jsx
 * @description Main Layout Component - โครงสร้างหลักของหน้าจอ
 * รวม Sidebar, Header และ Content Area
 * 
 * Senior Programmer Notes:
 * - ใช้ Outlet จาก react-router-dom เพื่อแสดง nested routes
 * - ถ้ายังไม่ login จะแสดงหน้า Login
 */

import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import httpClient from '@shared/services/httpClient';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * @component Layout
 * @description โครงสร้างหลักของแอป
 */
export default function Layout() {
    // ดึง state จาก authStoreV2 (Updated to V2)
    const { isAuthenticated } = useAuthStoreV2();
    const location = useLocation();

    // ============================================
    // useEffect - ทำงานเมื่อเปลี่ยนหน้า
    // ============================================
    useEffect(() => {
        const verifyDB = async () => {
            try {
                const response = await httpClient.get('/v2/health');
                if (response.status === 200 && (response.data.status === 'ok' || response.data.success)) {
                    console.log(`[Backend Check] Page: ${location.pathname} - ✅ API Server Connected`);
                } else {
                    console.warn(`[Backend Check] Page: ${location.pathname} - ⚠️ API Server Issue:`, response.data);
                }
            } catch (error) {
                console.error(`[Backend Check] Page: ${location.pathname} - ❌ API Server Error:`, error.message);
            }
        };

        verifyDB();
    }, [location.pathname]);

    // ถ้ายังไม่ได้ login ให้ Redirect ไป Login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        // ============================================
        // Main Layout Structure
        // ============================================
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar - แถบเมนูซ้าย */}
            <Sidebar />

            {/* Header - แถบบน */}
            <Header />

            {/* Main Content - เนื้อหาหลัก */}
            {/* ml-64 = margin-left เท่ากับความกว้างของ Sidebar */}
            {/* mt-16 = margin-top เท่ากับความสูงของ Header */}
            <main className="ml-64 mt-16 p-6">
                {/* Outlet = ที่แสดง nested route component */}
                <Outlet />
            </main>
        </div>
    );
}
