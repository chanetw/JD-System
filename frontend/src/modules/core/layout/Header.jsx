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
import { Link } from 'react-router-dom';
import { useAuthStore } from '@core/stores/authStore';
import { useNotificationStore } from '@core/stores/notificationStore';

/**
 * @component Header
 * @description แถบบนพร้อม Search, Role Switcher และ Notifications
 */
export default function Header() {
    // ดึงสถานะและฟังก์ชันการจัดการจาก Store (Auth และ Notifications)
    const { user, switchRole, logout } = useAuthStore();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();

    // === สถานะการแสดงผลเมนู Dropdown (UI States) ===
    const [showRoleMenu, setShowRoleMenu] = useState(false);    // เมนูสลับบทบาท
    const [showProfileMenu, setShowProfileMenu] = useState(false); // เมนูโปรไฟล์
    const [showNoti, setShowNoti] = useState(false);               // เมนูแจ้งเตือน

    // โหลดข้อมูลแจ้งเตือนเมื่อคอมโพเน็นต์ถูกแสดง หรือเมื่อผู้ใช้เปลี่ยนไป
    useEffect(() => {
        fetchNotifications();
    }, [user, fetchNotifications]);

    /**
     * เปลี่ยนบทบาทผู้ใช้งาน (สำหรับวัตถุประสงค์ในการสาธิตเท่านั้น)
     * @param {string} role - ชื่อบทบาทที่ต้องการเปลี่ยนไป (e.g., 'admin', 'requester')
     */
    const handleSwitchRole = async (role) => {
        await switchRole(role);
        setShowRoleMenu(false);
    };

    /**
     * รีเฟรชหน้า (สำหรับ Demo)
     */
    const handleResetDemo = () => {
        // Note: ไม่ใช้ Mock แล้ว เพียงแค่รีเฟรชหน้า
        window.location.reload();
    };

    // รายการ Role ที่เลือกได้ (ตาม mockup - ภาษาไทย)
    const roles = [
        { 
            id: 'requester', 
            label: 'Requester',
            labelTh: 'ผู้ขอใช้บริการ',
            badgeText: 'requester',
            color: 'bg-blue-100 text-blue-700' 
        },
        { 
            id: 'approver', 
            label: 'Approver (Head)',
            labelTh: 'ผู้อนุมัติ',
            badgeText: 'approver',
            color: 'bg-amber-100 text-amber-700' 
        },
        { 
            id: 'assignee', 
            label: 'Assignee (Graphic)',
            labelTh: 'ผู้ปฏิบัติงาน',
            badgeText: 'assignee',
            color: 'bg-green-100 text-green-700' 
        },
        { 
            id: 'admin', 
            label: 'Admin',
            labelTh: 'ผู้ดูแลระบบ',
            badgeText: 'admin',
            color: 'bg-purple-100 text-purple-700' 
        },
    ];

    // Multi-Role Support: หา roles ทั้งหมดของ user
    const getUserRoleNames = () => {
        // ถ้ามี user.roles เป็น array of objects (Multi-Role format)
        if (user?.roles && Array.isArray(user.roles) && user.roles[0]?.name) {
            return user.roles.map(r => r.name);
        }
        // ถ้าเป็น array of strings (legacy format)
        if (user?.roles && Array.isArray(user.roles)) {
            return user.roles;
        }
        // Fallback: ใช้ role เดียว
        return user?.role ? [user.role] : ['requester'];
    };

    const userRoleNames = getUserRoleNames();
    // หา role ปัจจุบัน (ใช้ตัวแรกเป็น primary)
    const currentRole = roles.find(r => userRoleNames.includes(r.id)) || roles[0];
    // หา roles ทั้งหมดที่ user มี
    const userRoles = roles.filter(r => userRoleNames.includes(r.id));

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
                        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:opacity-90 transition-all border-2 shadow-sm"
                        style={{
                            backgroundColor: currentRole.id === 'requester' ? '#DBEAFE' : 
                                           currentRole.id === 'approver' ? '#FEF3C7' : 
                                           currentRole.id === 'assignee' ? '#D1FAE5' : 
                                           '#F3E8FF',
                            borderColor: currentRole.id === 'requester' ? '#3B82F6' : 
                                        currentRole.id === 'approver' ? '#F59E0B' : 
                                        currentRole.id === 'assignee' ? '#10B981' : 
                                        '#9333EA',
                            color: currentRole.id === 'requester' ? '#1E40AF' : 
                                   currentRole.id === 'approver' ? '#92400E' : 
                                   currentRole.id === 'assignee' ? '#065F46' : 
                                   '#6B21A8'
                        }}
                    >
                        {/* Multi-Role: แสดง badges ของ roles ทั้งหมด */}
                        <div className="flex items-center gap-1.5">
                            {userRoles.length > 1 ? (
                                // แสดงหลาย roles
                                userRoles.slice(0, 2).map((role, idx) => (
                                    <span key={role.id} className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${role.color}`}>
                                        {role.badgeText}
                                    </span>
                                ))
                            ) : (
                                // แสดง role เดียว
                                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${currentRole.color}`}>
                                    {currentRole.badgeText}
                                </span>
                            )}
                            {userRoles.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    +{userRoles.length - 2}
                                </span>
                            )}
                        </div>
                        {/* Label Thai */}
                        <span className="text-sm font-semibold">
                            {userRoles.length > 1 ? 'หลายบทบาท' : currentRole.labelTh}
                        </span>
                        <ChevronDownIcon className="w-4 h-4 ml-1" />
                    </button>

                    {/* Dropdown Menu - แสดง roles ของ user */}
                    {showRoleMenu && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                            {/* หัวเรื่อง - บทบาทของฉัน */}
                            {userRoles.length > 0 && (
                                <>
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">
                                            👤 บทบาทของฉัน
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        {userRoles.map(role => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleSwitchRole(role.id)}
                                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                                                    role.id === currentRole.id ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${role.color}`}>
                                                        {role.badgeText}
                                                    </span>
                                                    <span className="text-sm text-gray-900 flex-1">
                                                        {role.labelTh}
                                                    </span>
                                                    {role.id === currentRole.id && (
                                                        <span className="text-xs text-blue-600">✓ กำลังใช้</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Demo Mode - เปลี่ยนเป็น role อื่น */}
                            <div className="px-4 py-2 border-t border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">
                                    🎭 Demo Mode
                                </p>
                            </div>
                            <div className="py-1">
                                {roles.filter(r => !userRoleNames.includes(r.id)).map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleSwitchRole(role.id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors opacity-60"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded text-xs font-medium ${role.color}`}>
                                                {role.badgeText}
                                            </span>
                                            <span className="text-sm text-gray-900">
                                                {role.label}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Reset Demo */}
                            <div className="border-t border-gray-100 mt-1">
                                <button
                                    onClick={handleResetDemo}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    🔄 Reset Demo Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>

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
