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
import { initMockData } from '@/services/mockStorage';
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
        // เริ่มต้นโหลด Mock Data
        initMockData();

        // ถ้ายังไม่ได้ login ให้ auto login เป็น Marketing (สำหรับ Demo)
        if (!isAuthenticated) {
            switchRole('marketing');
        }
    }, []);

    // ถ้ายังไม่ได้ login ให้แสดง loading
    // (ในกรณีจริงควรแสดงหน้า Login)
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">กำลังโหลด...</p>
                </div>
            </div>
        );
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
