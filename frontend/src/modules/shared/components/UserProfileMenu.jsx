/**
 * @file UserProfileMenu.jsx
 * @description Shared profile dropdown menu — ใช้ร่วมกันทุกหน้า (Header + UserPortal)
 * UI ยึดดีไซน์ของ UserPortal เป็นมาตรฐาน
 *
 * เมนู: แก้ไขโปรไฟล์ | ติดต่อ Admin | ออกจากระบบ
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { ROLE_LABELS, ROLE_V2_BADGE_COLORS } from '@shared/utils/permission.utils';
import ProfileEditModal from '@shared/components/ProfileEditModal';
import ContactAdminModal from '@shared/components/ContactAdminModal';

// ─── Inline SVG Icons (same style as UserPortal) ────────────────

function PencilIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

function EnvelopeIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
}

function LogoutIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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

// ─── Component ──────────────────────────────────────────────────

export default function UserProfileMenu({ showName = false }) {
    const { user, logout } = useAuthStoreV2();
    const navigate = useNavigate();

    const [showMenu, setShowMenu] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    const menuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setShowMenu(false);
        logout();
        navigate('/login', { replace: true });
    };

    // Build initials
    const initials =
        (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') ||
        user?.displayName?.[0] ||
        user?.email?.[0] ||
        'U';

    const displayName =
        user?.displayName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        user?.email ||
        '';

    return (
        <>
            {/* ── Trigger + Dropdown Container ── */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(prev => !prev)}
                    className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
                >
                    <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 text-sm font-medium">
                        {initials}
                    </div>
                    {showName && (
                        <>
                            <span className="text-sm text-slate-700 hidden sm:inline">
                                {user?.firstName || user?.email}
                            </span>
                            <ChevronDownIcon className="w-4 h-4 text-slate-400 hidden sm:block" />
                        </>
                    )}
                </button>

                {showMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                        {/* User Info */}
                        <div className="px-4 py-2.5 border-b border-slate-100">
                            <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            {/* Role Badges */}
                            {(user?.roles || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {(user?.roles || []).map(r => {
                                        const roleName = typeof r === 'string' ? r : r.name;
                                        return roleName ? (
                                            <span
                                                key={roleName}
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_V2_BADGE_COLORS[roleName] || 'bg-slate-100 text-slate-700'}`}
                                            >
                                                {ROLE_LABELS[roleName] || roleName}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => { setShowEditProfile(true); setShowMenu(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <PencilIcon className="w-4 h-4 text-slate-400" />
                            แก้ไขโปรไฟล์
                        </button>
                        <button
                            onClick={() => { setShowContactModal(true); setShowMenu(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                            ติดต่อ Admin
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <LogoutIcon className="w-4 h-4 text-red-400" />
                            ออกจากระบบ
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modals (rendered outside dropdown) ── */}
            <ProfileEditModal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
            />
            <ContactAdminModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
            />
        </>
    );
}
