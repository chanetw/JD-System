/**
 * @file PortalNav.jsx
 * @description Top Navigation สำหรับ Portal (Shared Component)
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export default function PortalNav() {
    const { user, logout, switchRole } = useAuthStore();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [showNoti, setShowNoti] = useState(false);

    // Auto fetch on mount (in real app)
    React.useEffect(() => {
        fetchNotifications();
    }, [user, fetchNotifications]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSwitchRole = async (role) => {
        await switchRole(role);
        setShowRoleMenu(false);
        // Redirect to appropriate portal based on role
        if (role === 'admin') navigate('/portal/admin');
        else if (role === 'approver') navigate('/portal/approver');
        else if (role === 'assignee') navigate('/portal/assignee');
        else navigate('/portal/marketing');
    };
    const roles = [
        { id: 'marketing', label: 'Marketing', color: 'bg-blue-100 text-blue-700' },
        { id: 'approver', label: 'Approver', color: 'bg-amber-100 text-amber-700' },
        { id: 'assignee', label: 'Assignee', color: 'bg-green-100 text-green-700' },
        { id: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    ];

    return (
        <nav className="bg-white shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-10 h-16">
            <div className="max-w-6xl mx-auto px-6 h-full">
                <div className="flex items-center justify-between h-full">
                    <Link to={user?.roles?.includes('marketing') ? '/portal/marketing' : '/portal'} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white">
                            <span className="font-bold text-lg">DJ</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-slate-800 leading-tight">DJ Request Portal</h1>
                            <p className="text-xs text-slate-500">Design Job System</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-6">
                        {/* Demo Role Switcher (Always visible for Demo) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Switch Role
                            </button>
                            {showRoleMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
                                    <p className="px-4 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        Demo Controls
                                    </p>
                                    {roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleSwitchRole(role.id)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${user?.roles?.[0] === role.id ? 'bg-slate-50 font-medium' : ''}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${role.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                            {role.label}
                                        </button>
                                    ))}
                                    {/* Back to Dashboard Link */}
                                    <div className="border-t border-slate-50 mt-1 pt-1">
                                        <Link to="/" className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-600">
                                            Go to Dashboard
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link to="/jobs" className="text-slate-600 hover:text-rose-600 text-sm font-medium">My Jobs</Link>
                        <Link to="/media-portal" className="text-slate-600 hover:text-rose-600 text-sm font-medium">Media Portal</Link>

                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowNoti(!showNoti);
                                    if (!showNoti) fetchNotifications();
                                }}
                                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNoti && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20">
                                    <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {isLoading ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
                                        ) : notifications.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">No notifications</div>
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

                        {/* User Menu */}
                        <div className="relative border-l border-slate-200 pl-4">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                            >
                                <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 text-sm font-medium">
                                    {user?.displayName?.[0] || 'U'}
                                </div>
                                <span className="text-sm text-slate-700 hidden sm:inline font-medium">
                                    {user?.displayName || 'User'}
                                </span>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown */}
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
                                    <div className="px-4 py-3 border-b border-slate-50">
                                        <p className="text-sm font-bold text-slate-800">{user?.displayName}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>

                                    {/* Role Info */}
                                    <div className="px-4 py-2">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user?.roles?.includes('admin') ? 'bg-purple-100 text-purple-700' :
                                            user?.roles?.includes('approver') ? 'bg-amber-100 text-amber-700' :
                                                user?.roles?.includes('marketing') ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>
                                            {user?.roles?.[0] || 'User'}
                                        </span>
                                    </div>

                                    <div className="border-t border-slate-50 mt-1 pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
