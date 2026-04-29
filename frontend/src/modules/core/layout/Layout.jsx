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
import { useEffect, useState } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import httpClient from '@shared/services/httpClient';
import Sidebar from './Sidebar';
import Header from './Header';

const SIDEBAR_COLLAPSED_KEY = 'dj.sidebar.collapsed';

/**
 * @component Layout
 * @description โครงสร้างหลักของแอป
 */
export default function Layout() {
    // ดึง state จาก authStoreV2 (Updated to V2)
    const { isAuthenticated } = useAuthStoreV2();
    const location = useLocation();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    });

    const sidebarOffsetClass = sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64';

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

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    }, [sidebarCollapsed]);

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
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            {isMobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar overlay"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                />
            )}

            {/* Header - แถบบน */}
            <Header
                sidebarCollapsed={sidebarCollapsed}
                onMobileMenuClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            />

            {/* Main Content - เนื้อหาหลัก */}
            {/* mt-16 = margin-top เท่ากับความสูงของ Header */}
            <main className={`mt-16 min-w-0 p-4 transition-[margin] duration-200 sm:p-5 lg:p-6 ${sidebarOffsetClass}`}>
                {/* Outlet = ที่แสดง nested route component */}
                <Outlet />
            </main>
        </div>
    );
}
