/**
 * @file Header.jsx
 * @description ส่วนหัวของแอปพลิเคชัน (Header Component)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงแถบค้นหางาน (Search) ทั่วทั้งระบบ
 * - แสดงระบบแจ้งเตือน (Notifications) พร้อมจำนวนรายการที่ยังไม่ได้อ่าน
 * - แสดงส่วนสลับบทบาท (Role Switcher) สำหรับการสาธิต (Demo)
 * - แสดงเมนูโปรไฟล์ผู้ใช้งานและการออกจากระบบ (Profile & Logout)
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { useNotificationStore } from '@core/stores/notificationStore';
import api from '@shared/services/apiService';

/**
 * @component Header
 * @description แถบบนพร้อม Search, Role Switcher และ Notifications
 */
export default function Header() {
    // ดึงสถานะและฟังก์ชันการจัดการจาก Store (Auth และ Notifications)
    const { user, logout } = useAuthStoreV2();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();
    const navigate = useNavigate();

    // === สถานะการแสดงผลเมนู Dropdown (UI States) ===
    const [showProfileMenu, setShowProfileMenu] = useState(false); // เมนูโปรไฟล์
    const [showNoti, setShowNoti] = useState(false);               // เมนูแจ้งเตือน

    // โหลดข้อมูลแจ้งเตือนเมื่อคอมโพเน็นต์ถูกแสดง หรือเมื่อผู้ใช้เปลี่ยนไป
    useEffect(() => {
        fetchNotifications();
    }, [user, fetchNotifications]);

    // Toast State สำหรับแสดงข้อความแจ้งเตือน
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    // Auto-hide toast หลังจาก 4 วินาที
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    /**
     * Handle logout
     */
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };


    return (
        // ============================================
        // Header Container
        // ============================================
        <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">

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
            Notifications - การแจ้งเตือน
            ============================================ */}
                {/* ============================================
            Notifications - การแจ้งเตือน
            ============================================ */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowNoti(!showNoti);
                            if (!showNoti) fetchNotifications();
                        }}
                        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        <BellIcon className="w-6 h-6" />
                        {/* Badge แสดงจำนวนแจ้งเตือนที่ยังไม่อ่าน */}
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* รายการแจ้งเตือน Dropdown */}
                    {showNoti && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20">
                            <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">การแจ้งเตือน (Notifications)</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                        className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                                    >
                                        อ่านทั้งหมด (Mark all read)
                                    </button>
                                )}
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">กำลังโหลด...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">ไม่มีรายการแจ้งเตือน</div>
                                ) : (
                                    notifications.map(noti => (
                                        <Link
                                            key={noti.id}
                                            to={noti.link}
                                            onClick={() => { markAsRead(noti.id); setShowNoti(false); }}
                                            className={`block px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 ${!noti.isRead ? 'bg-rose-50/30' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!noti.isRead ? 'bg-rose-500' : 'bg-transparent'}`}></div>
                                                <div>
                                                    <p className={`text-sm ${!noti.isRead ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                                        {noti.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{noti.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(noti.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast Popup */}
            {toast.show && (
                <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${toast.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    {toast.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button
                        onClick={() => setToast({ ...toast, show: false })}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
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
