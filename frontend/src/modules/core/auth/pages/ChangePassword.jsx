/**
 * @file ChangePassword.jsx
 * @description หน้าเปลี่ยนรหัสผ่าน (สำหรับ User ที่ Login แล้ว)
 * 
 * Features:
 * - เปลี่ยนรหัสผ่านโดยกรอกรหัสเดิม + รหัสใหม่
 * - รองรับกรณี must_change_password (บังคับเปลี่ยนครั้งแรก)
 * - Validate ความแข็งแรงของรหัสผ่าน
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@core/stores/authStore';
import { api } from '@shared/services/apiService';
import Button from '@shared/components/Button';
import { 
    LockClosedIcon, 
    EyeIcon, 
    EyeSlashIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function ChangePassword() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    
    // Form data
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Password visibility
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Check if user must change password (first login after admin create)
    const mustChangePassword = user?.mustChangePassword || user?.must_change_password;

    // Password strength checker
    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        if (strength <= 2) return { level: 'weak', label: 'อ่อน', color: 'bg-red-500', width: '33%' };
        if (strength <= 4) return { level: 'medium', label: 'ปานกลาง', color: 'bg-yellow-500', width: '66%' };
        return { level: 'strong', label: 'แข็งแรง', color: 'bg-green-500', width: '100%' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    // Validation checks
    const checks = {
        minLength: newPassword.length >= 8,
        hasLower: /[a-z]/.test(newPassword),
        hasUpper: /[A-Z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        match: newPassword === confirmPassword && newPassword.length > 0
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate
        if (!mustChangePassword && !currentPassword) {
            setError('กรุณากรอกรหัสผ่านปัจจุบัน');
            return;
        }
        
        if (!checks.minLength) {
            setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            return;
        }

        if (!checks.match) {
            setError('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        setIsLoading(true);

        try {
            await api.changePassword(currentPassword, newPassword);
            setSuccess(true);
            
            // If this was a forced password change, update user state
            if (mustChangePassword) {
                // User will need to re-login or we update the state
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (err) {
            console.error('Change password error:', err);
            setError(err.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        } finally {
            setIsLoading(false);
        }
    };

    // If not logged in, redirect to login
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <CheckCircleIcon className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        เปลี่ยนรหัสผ่านสำเร็จ!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        รหัสผ่านของคุณได้ถูกเปลี่ยนเรียบร้อยแล้ว
                    </p>
                    <Button 
                        onClick={() => navigate('/')}
                        className="bg-rose-600 hover:bg-rose-700"
                    >
                        กลับไปหน้าหลัก
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <ShieldCheckIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">เปลี่ยนรหัสผ่าน</h1>
                            <p className="text-rose-100 text-sm">
                                {mustChangePassword 
                                    ? 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน' 
                                    : 'DJ System Security'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warning for forced change */}
                {mustChangePassword && (
                    <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">
                            นี่คือการเข้าสู่ระบบครั้งแรก กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย
                        </p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Current Password (hide if forced change) */}
                    {!mustChangePassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                รหัสผ่านปัจจุบัน
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showCurrent ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            รหัสผ่านใหม่
                        </label>
                        <div className="relative">
                            <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                placeholder="กรอกรหัสผ่านใหม่"
                                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Password Strength Bar */}
                        {newPassword && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-gray-500">ความแข็งแรงรหัสผ่าน</span>
                                    <span className={`font-medium ${
                                        passwordStrength.level === 'strong' ? 'text-green-600' :
                                        passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                        style={{ width: passwordStrength.width }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ยืนยันรหัสผ่านใหม่
                        </label>
                        <div className="relative">
                            <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-2">ข้อกำหนดรหัสผ่าน:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className={`flex items-center gap-1 ${checks.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4" />
                                อย่างน้อย 8 ตัวอักษร
                            </div>
                            <div className={`flex items-center gap-1 ${checks.hasLower ? 'text-green-600' : 'text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4" />
                                ตัวพิมพ์เล็ก (a-z)
                            </div>
                            <div className={`flex items-center gap-1 ${checks.hasUpper ? 'text-green-600' : 'text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4" />
                                ตัวพิมพ์ใหญ่ (A-Z)
                            </div>
                            <div className={`flex items-center gap-1 ${checks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4" />
                                ตัวเลข (0-9)
                            </div>
                            <div className={`flex items-center gap-1 col-span-2 ${checks.match ? 'text-green-600' : 'text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4" />
                                รหัสผ่านตรงกัน
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-700"
                        disabled={isLoading || !checks.minLength || !checks.match}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังบันทึก...
                            </>
                        ) : (
                            'บันทึกรหัสผ่านใหม่'
                        )}
                    </Button>

                    {/* Back Button (only if not forced) */}
                    {!mustChangePassword && (
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            ยกเลิก
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
