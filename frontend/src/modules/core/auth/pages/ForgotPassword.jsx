/**
 * @file ForgotPassword.jsx
 * @description หน้าลืมรหัสผ่าน + ยืนยัน OTP + ตั้งรหัสผ่านใหม่
 * 
 * Features:
 * - กรอกอีเมลเพื่อขอ OTP
 * - กรอก OTP (6 หลัก)
 * - ตั้งรหัสผ่านใหม่
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@shared/services/apiService';
import Button from '@shared/components/Button';
import { 
    EnvelopeIcon, 
    KeyIcon,
    LockClosedIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    
    // Form data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // OTP input refs
    const otpRefs = useRef([]);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Step 1: Request OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setError('กรุณากรอกอีเมล');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('รูปแบบอีเมลไม่ถูกต้อง');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await api.requestPasswordReset(email);
            setStep(2);
            setCountdown(60); // 60 seconds cooldown
        } catch (err) {
            console.error('Request OTP error:', err);
            setError(err.message || 'ไม่พบอีเมลนี้ในระบบ');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input
    const handleOtpChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    // Handle OTP paste
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            setOtp(pastedData.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    // Handle OTP keydown (backspace)
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('กรุณากรอก OTP ให้ครบ 6 หลัก');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Verify OTP (just check format, actual verification on final step)
            // For better UX, we go to step 3 directly
            setStep(3);
        } catch (err) {
            console.error('Verify OTP error:', err);
            setError('OTP ไม่ถูกต้อง หรือหมดอายุแล้ว');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const otpString = otp.join('');
            await api.resetPasswordWithOTP(email, otpString, newPassword);
            setStep(4); // Success
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.message || 'OTP ไม่ถูกต้อง หรือหมดอายุแล้ว');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (countdown > 0) return;

        setIsLoading(true);
        setError('');

        try {
            await api.requestPasswordReset(email);
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError('ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <KeyIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">ลืมรหัสผ่าน</h1>
                            <p className="text-rose-100 text-sm">
                                {step === 1 && 'กรอกอีเมลเพื่อรับ OTP'}
                                {step === 2 && 'กรอก OTP ที่ได้รับ'}
                                {step === 3 && 'ตั้งรหัสผ่านใหม่'}
                                {step === 4 && 'สำเร็จ!'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                {step < 4 && (
                    <div className="px-6 pt-4">
                        <div className="flex items-center justify-between">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                        ${step >= s 
                                            ? 'bg-rose-600 text-white' 
                                            : 'bg-gray-200 text-gray-500'
                                        }
                                    `}>
                                        {step > s ? '✓' : s}
                                    </div>
                                    {s < 3 && (
                                        <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-rose-600' : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>อีเมล</span>
                            <span>OTP</span>
                            <span>รหัสใหม่</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Email */}
                    {step === 1 && (
                        <form onSubmit={handleRequestOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    อีเมลที่ลงทะเบียน
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        placeholder="email@company.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                disabled={isLoading}
                            >
                                {isLoading ? 'กำลังส่ง...' : 'ส่ง OTP ไปยังอีเมล'}
                            </Button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div className="text-center mb-4">
                                <p className="text-gray-600">
                                    ส่ง OTP ไปยัง <span className="font-medium text-gray-900">{email}</span>
                                </p>
                            </div>

                            {/* OTP Input */}
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => otpRefs.current[index] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        onPaste={index === 0 ? handleOtpPaste : undefined}
                                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                disabled={isLoading || otp.join('').length !== 6}
                            >
                                {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
                            </Button>

                            {/* Resend OTP */}
                            <div className="text-center">
                                {countdown > 0 ? (
                                    <p className="text-sm text-gray-500">
                                        ส่ง OTP อีกครั้งใน <span className="font-medium text-rose-600">{countdown}</span> วินาที
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                        disabled={isLoading}
                                    >
                                        ส่ง OTP อีกครั้ง
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    รหัสผ่านใหม่
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ยืนยันรหัสผ่านใหม่
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Password Requirements */}
                            <div className="text-xs text-gray-500 space-y-1">
                                <p className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                                    • อย่างน้อย 8 ตัวอักษร {newPassword.length >= 8 && '✓'}
                                </p>
                                <p className={newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-600' : ''}>
                                    • รหัสผ่านตรงกัน {newPassword === confirmPassword && newPassword.length > 0 && '✓'}
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                disabled={isLoading}
                            >
                                {isLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                            </Button>
                        </form>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                เปลี่ยนรหัสผ่านสำเร็จ!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                รหัสผ่านของคุณได้ถูกเปลี่ยนเรียบร้อยแล้ว<br />
                                สามารถใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
                            </p>
                            <Link to="/login">
                                <Button className="bg-rose-600 hover:bg-rose-700">
                                    ไปหน้า Login
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Back to Login (show on step 1-3) */}
                    {step < 4 && (
                        <div className="text-center mt-4">
                            <Link 
                                to="/login" 
                                className="inline-flex items-center text-sm text-gray-500 hover:text-rose-600"
                            >
                                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                                กลับไปหน้า Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
