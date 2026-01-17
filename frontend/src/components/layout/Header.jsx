/**
 * @file Header.jsx
 * @description Header Component - แถบด้านบนพร้อม Search, Notifications และ Role Switcher
 * 
 * Senior Programmer Notes:
 * - Role Switcher ใช้สำหรับ Demo เท่านั้น
 * - Notifications แสดงจำนวนที่ยังไม่ได้อ่าน
 */

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { resetMockData } from '@/services/mockStorage';

/**
 * @component Header
 * @description แถบบนพร้อม Search, Role Switcher และ Notifications
 */
export default function Header() {
    // ดึง state และ actions จาก authStore
    const { user, switchRole, logout } = useAuthStore();

    // State สำหรับแสดง/ซ่อน dropdown
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    /**
     * @function handleSwitchRole
     * @description เปลี่ยนบทบาทผู้ใช้ (สำหรับ Demo)
     */
    const handleSwitchRole = async (role) => {
        await switchRole(role);
        setShowRoleMenu(false);
    };

    /**
     * @function handleResetDemo
     * @description Reset ข้อมูล Demo กลับเป็นค่าเริ่มต้น
     */
    const handleResetDemo = () => {
        resetMockData();
        window.location.reload();
    };

    // รายการ Role ที่เลือกได้
    const roles = [
        { id: 'marketing', label: 'Marketing Requester', color: 'bg-blue-100 text-blue-700' },
        { id: 'approver', label: 'Approver (Head)', color: 'bg-amber-100 text-amber-700' },
        { id: 'assignee', label: 'Assignee (Graphic)', color: 'bg-green-100 text-green-700' },
        { id: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    ];

    // หา role ปัจจุบัน
    const currentRole = roles.find(r => r.id === user?.roles?.[0]) || roles[0];

    return (
        // ============================================
        // Header Container
        // ============================================
        <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">

            {/* ============================================
          Search Box - ช่องค้นหา
          ============================================ */}
            <div className="w-full max-w-md">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา DJ ID หรือ Subject..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* ============================================
          Right Section - ด้านขวา
          ============================================ */}
            <div className="flex items-center gap-4">

                {/* ============================================
            Role Switcher - เปลี่ยนบทบาท (Demo)
            ============================================ */}
                <div className="relative">
                    <button
                        onClick={() => setShowRoleMenu(!showRoleMenu)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${currentRole.color}`}
                    >
                        {currentRole.label}
                        <ChevronDownIcon className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showRoleMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <p className="px-4 py-2 text-xs text-gray-500 font-medium">
                                เปลี่ยนบทบาท (Demo)
                            </p>
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => handleSwitchRole(role.id)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${role.id === currentRole.id ? 'font-medium' : ''
                                        }`}
                                >
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${role.color}`}>
                                        {role.id}
                                    </span>
                                    {role.label}
                                </button>
                            ))}
                            <hr className="my-1" />
                            <button
                                onClick={handleResetDemo}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                🔄 Reset Demo Data
                            </button>
                        </div>
                    )}
                </div>

                {/* ============================================
            Notifications - การแจ้งเตือน
            ============================================ */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <BellIcon className="w-6 h-6" />
                    {/* Badge แสดงจำนวนแจ้งเตือนที่ยังไม่อ่าน */}
                    <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        8
                    </span>
                </button>

                {/* ============================================
            Profile Menu - เมนูผู้ใช้
            ============================================ */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg"
                    >
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                            <span className="text-rose-600 font-medium text-sm">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

// ============================================
// Icons
// ============================================

function SearchIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function ChevronDownIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

function BellIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    );
}
