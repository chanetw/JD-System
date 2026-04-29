/**
 * @file Login.jsx
 * @description หน้า Login (Mock) - เลือก User จาก Dropdown แล้วเข้าสู่ระบบ
 * 
 * ฟีเจอร์:
 * - เลือก User จาก Mock Data
 * - แสดง Role ของ User
 * - Redirect ไป Dashboard หลัง Login
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { api } from '@shared/services/apiService';
import { userService } from '@shared/services/modules/userService';

export default function LoginDemo() {
    const navigate = useNavigate();
    const { login, user } = useAuthStoreV2();
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // ถ้า login แล้ว redirect ไป dashboard
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    // โหลดรายชื่อ User
    useEffect(() => {
        const loadUsers = async () => {
            try {
                // Use getMockUsers (Public API) instead of admin-only user listing
                const data = await api.getMockUsers();
                setUsers(data);
            } catch (err) {
                console.error('Error loading users:', err);
            }
        };
        loadUsers();
    }, []);

    // Handler: Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedUserId) {
            setError('กรุณาเลือกผู้ใช้งาน');
            return;
        }

        setIsLoading(true);

        try {
            // Updated Logic: Call API to get REAL token
            const userWithToken = await userService.loginDemo(parseInt(selectedUserId));

            if (userWithToken) {
                // บันทึก user และ token ใน authStore
                login(userWithToken);

                // รอสักครู่เพื่อ UX
                await new Promise(resolve => setTimeout(resolve, 500));

                // Redirect ตาม role (Priority: Admin > Requester > Others)
                const userRoles = userWithToken.roles || [];

                if (userRoles.includes('Admin')) {
                    navigate('/');
                } else if (userRoles.includes('Requester') || userRoles.includes('marketing')) {
                    navigate('/user-portal');
                } else {
                    // Start at Dashboard for Approvers/Assignees
                    navigate('/');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('เกิดข้อผิดพลาด: ' + (err.message || 'Login failed'));
        } finally {
            setIsLoading(false);
        }
    };

    // จัดกลุ่ม User ตาม Role
    const groupedUsers = users.reduce((acc, user) => {
        let role = 'other';
        const userRoles = user.roles || [];

        // Determine primary role for grouping
        if (userRoles.includes('Admin')) {
            role = 'Admin';
        } else if (userRoles.includes('Approver') || userRoles.includes('head') || userRoles.includes('manager')) {
            role = 'Approver';
        } else if (userRoles.includes('Assignee') || userRoles.includes('graphic') || userRoles.includes('web')) {
            role = 'Assignee';
        } else if (userRoles.includes('Requester') || userRoles.includes('marketing')) {
            role = 'Requester';
        }

        if (!acc[role]) acc[role] = [];
        acc[role].push(user);
        return acc;
    }, {});

    const roleLabels = {
        Admin: '👑 Admin',
        Requester: '📝 ผู้เปิดงาน',
        Approver: '✅ Approver',
        Assignee: '🎨 Assignee'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Login Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-rose-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-3xl">DJ</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">DJ System</h1>
                    <p className="text-slate-500 mt-1">Design Job Management</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    {/* User Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เลือกผู้ใช้งาน
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white text-slate-800"
                        >
                            <option value="">-- เลือกผู้ใช้งาน --</option>
                            {Object.entries(groupedUsers).map(([role, roleUsers]) => (
                                <optgroup key={role} label={roleLabels[role] || role}>
                                    {roleUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.firstName} ({u.email})
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Selected User Info */}
                    {selectedUserId && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            {(() => {
                                const selected = users.find(u => u.id === parseInt(selectedUserId));
                                if (!selected) return null;
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 font-bold text-lg">
                                            {selected.firstName?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{selected.firstName}</p>
                                            <p className="text-sm text-slate-500">{selected.email}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${selected.roles?.includes('Admin') ? 'bg-purple-100 text-purple-700' :
                                                (selected.roles?.includes('Requester') || selected.roles?.includes('marketing')) ? 'bg-blue-100 text-blue-700' :
                                                    selected.roles?.includes('Approver') ? 'bg-green-100 text-green-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {selected.roles?.includes('Admin') ? 'ADMIN' :
                                                    (selected.roles?.includes('Requester') || selected.roles?.includes('marketing')) ? 'REQUESTER' :
                                                        selected.roles?.includes('Approver') ? 'APPROVER' :
                                                            selected.roles?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !selectedUserId}
                        className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                กำลังเข้าสู่ระบบ...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                เข้าสู่ระบบ
                            </>
                        )}
                    </button>
                </form>

                {/* Links */}
                <div className="mt-4 flex justify-between text-sm">
                    <Link to="/register" className="text-rose-600 hover:text-rose-700 font-medium">
                        สมัครใช้งาน
                    </Link>
                    <Link to="/forgot-password" className="text-slate-500 hover:text-slate-700">
                        ลืมรหัสผ่าน?
                    </Link>
                </div>

                {/* Demo Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400">
                        * Demo Mode - เลือก User เพื่อทดสอบ Role ต่างๆ
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-400">
                        DJ System v2.0 | SENA Development PCL
                    </p>
                </div>
            </div>
        </div>
    );
}
