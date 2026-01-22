/**
 * @file Layout.jsx
 * @description Main Layout Component - โครงสร้างหลักของหน้าจอ
 * รวม Sidebar, Header และ Content Area
 * 
 * Senior Programmer Notes:
 * - ใช้ Outlet จาก react-router-dom เพื่อแสดง nested routes
 * - ถ้ายังไม่ login จะแสดงหน้า Login
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * @component Layout
 * @description โครงสร้างหลักของแอป
 */
export default function Layout() {
    // ดึง state จาก authStore
    const { isAuthenticated, switchRole } = useAuthStore();

    // ============================================
    // useEffect - ทำงานเมื่อ Component โหลดครั้งแรก
    // ============================================
    useEffect(() => {
        // Database connection initialized via apiService
        console.log('[Layout] App initialized with Database connection');
    }, []);

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
