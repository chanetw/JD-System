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
import { useAuthStore } from '@core/stores/authStore';
import { checkConnection } from '@shared/services/supabaseClient';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * @component Layout
 * @description โครงสร้างหลักของแอป
 */
export default function Layout() {
    // ดึง state จาก authStore
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    // ============================================
    // useEffect - ทำงานเมื่อเปลี่ยนหน้า
    // ============================================
    useEffect(() => {
        const verifyDB = async () => {
            const status = await checkConnection();
            if (status.success) {
                console.log(`[DB Check] Page: ${location.pathname} - ✅ Database Connected`);
            } else {
                console.error(`[DB Check] Page: ${location.pathname} - ❌ Database Error:`, status.message);
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
