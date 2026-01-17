/**
 * @file Sidebar.jsx
 * @description Sidebar Navigation Component
 * แถบเมนูด้านซ้ายสำหรับนำทางไปยังหน้าต่างๆ
 * 
 * Senior Programmer Notes:
 * - ใช้ NavLink จาก react-router-dom เพื่อ highlight เมนูที่ active
 * - แสดงเมนูตาม Role ของผู้ใช้
 */

import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { FolderIcon, Cog6ToothIcon, UserGroupIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

/**
 * @component Sidebar
 * @description แถบเมนูด้านซ้าย
 */
export default function Sidebar() {
    // ดึงข้อมูล user จาก authStore
    // (useAuthStore = Zustand hook สำหรับดึง state)
    const { user } = useAuthStore();

    // ตรวจสอบว่าเป็น Admin หรือไม่
    const isAdmin = user?.roles?.includes('admin');

    return (
        // ============================================
        // Sidebar Container
        // ============================================
        // ============================================
        // Sidebar Container
        // ============================================
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#881337] text-white flex flex-col z-20 shadow-xl">

            {/* ============================================
          Logo & Title
          ============================================ */}
            <div className="p-6">
                {/* โลโก้ระบบ */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <span className="text-[#881337] font-bold text-lg">DJ</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-lg leading-tight">DJ System</h1>
                        <p className="text-xs text-rose-200">Design Job Management</p>
                    </div>
                </div>
            </div>

            {/* ============================================
          Navigation Menu - เมนูนำทาง
          ============================================ */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2 scrollbar-rose">

                <SidebarLink to="/" icon={DashboardIcon}>
                    Dashboard
                </SidebarLink>

                <SidebarLink to="/create" icon={CreateIcon}>
                    Create DJ
                </SidebarLink>

                <SidebarLink to="/jobs" icon={ListIcon}>
                    DJ List
                </SidebarLink>

                <SidebarLink to="/approvals" icon={ApprovalIcon}>
                    Approvals Queue
                </SidebarLink>

                <SidebarLink to="/media-portal" icon={MediaIcon}>
                    Media Portal
                </SidebarLink>

                <SidebarLink to="/user-portal" icon={UserIcon}>
                    User Portal
                </SidebarLink>

                {/* ============================================
            Admin Menu - เมนู Admin (แสดงเฉพาะ Admin)
            ============================================ */}
                {isAdmin && (
                    <>
                        <div className="pt-6 pb-2 px-2">
                            <p className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                                Admin
                            </p>
                        </div>

                        <SidebarLink to="/admin/organization" icon={BuildingOfficeIcon}>
                            Organization Data
                        </SidebarLink>

                        <SidebarLink to="/admin/approval-flow" icon={FlowIcon}>
                            Approval Flow
                        </SidebarLink>

                        <SidebarLink to="/admin/users" icon={UserGroupIcon}>
                            User Management
                        </SidebarLink>

                        <SidebarLink to="/admin/job-types" icon={Cog6ToothIcon}>
                            Job Type & SLA
                        </SidebarLink>

                        <SidebarLink to="/admin/holidays" icon={CalendarIcon}>
                            Holiday Calendar
                        </SidebarLink>

                        <SidebarLink to="/reports" icon={ReportIcon}>
                            Reports
                        </SidebarLink>
                    </>
                )}
            </nav>

            {/* ============================================
          Bottom Action
          ============================================ */}
            <div className="p-4 border-t border-rose-800/30 bg-[#881337]">
                <button className="flex items-center gap-3 px-3 py-2 w-full text-rose-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Back to Home</span>
                </button>
            </div>
        </aside>
    );
}

/**
 * @component SidebarLink
 * @description Link ในเมนู Sidebar พร้อม active state
 */
function SidebarLink({ to, icon: Icon, children, badge, badgeColor }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-[#9f1239] text-white shadow-sm'
                    : 'text-rose-100 hover:bg-white/10 hover:text-white'
                }`
            }
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-5 h-5 opacity-90" />}
                {children}
            </div>
            {badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${badgeColor}`}>
                    {badge}
                </span>
            )}
        </NavLink>
    );
}

// ============================================
// Icons - ไอคอนต่างๆ (Heroicons style)
// ============================================

function DashboardIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );
}

function CreateIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
        </svg>
    );
}

function ListIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
    );
}

function ApprovalIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function SettingsIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function CalendarIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function FlowIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
    );
}

function ReportIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

function MediaIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function UserIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );
}

function ArrowLeftOnRectangleIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    );
}
