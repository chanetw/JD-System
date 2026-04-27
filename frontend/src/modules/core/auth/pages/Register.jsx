/**
 * @file Register.jsx
 * @description หน้าสมัครใช้งาน (Self-Service Registration)
 * 
 * Features:
 * - กรอกข้อมูลส่วนตัว
 * - ส่งคำขอไปยัง Admin เพื่ออนุมัติ
 * - แสดงสถานะคำขอ
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@shared/components/Button';
import { authServiceV2 } from '@shared/services/modules/authServiceV2';
import { 
    UserIcon, 
    EnvelopeIcon, 
    PhoneIcon, 
    BuildingOfficeIcon,
    CheckCircleIcon,
    ArrowLeftIcon,
    LockClosedIcon,
    ShieldCheckIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/20/solid';

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Form, 2 = Success
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        department: '',
        position: ''
    });

    // Title options
    const titleOptions = [
        { value: '', label: 'เลือกคำนำหน้า' },
        { value: 'นาย', label: 'นาย' },
        { value: 'นาง', label: 'นาง' },
        { value: 'นางสาว', label: 'นางสาว' }
    ];

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const getPasswordValidation = (password) => {
        const checks = {
            minLength: String(password || '').length >= 8,
            hasUppercase: /[A-Z]/.test(password || ''),
            hasLowercase: /[a-z]/.test(password || ''),
            hasNumber: /\d/.test(password || ''),
            hasSpecialChar: /[^A-Za-z0-9]/.test(password || '')
        };

        const score = Object.values(checks).filter(Boolean).length;
        const isMediumOrBetter = checks.minLength && score >= 4;
        const missingMessages = [];

        if (!checks.minLength) missingMessages.push('เพิ่มความยาวอย่างน้อย 8 ตัวอักษร');
        if (!checks.hasUppercase) missingMessages.push('เพิ่มตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
        if (!checks.hasLowercase) missingMessages.push('เพิ่มตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
        if (!checks.hasNumber) missingMessages.push('เพิ่มตัวเลขอย่างน้อย 1 ตัว');
        if (!checks.hasSpecialChar) missingMessages.push('เพิ่มอักขระพิเศษอย่างน้อย 1 ตัว เช่น !@#%');

        return {
            checks,
            score,
            isMediumOrBetter,
            missingMessages
        };
    };

    // Validate form
    const validateForm = () => {
        if (!formData.firstName.trim()) {
            setError('กรุณากรอกชื่อ');
            return false;
        }
        if (!formData.lastName.trim()) {
            setError('กรุณากรอกนามสกุล');
            return false;
        }
        if (!formData.email.trim()) {
            setError('กรุณากรอกอีเมล');
            return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('รูปแบบอีเมลไม่ถูกต้อง');
            return false;
        }
        if (!formData.password.trim()) {
            setError('กรุณากรอกรหัสผ่าน');
            return false;
        }
        const passwordValidation = getPasswordValidation(formData.password);
        if (!passwordValidation.isMediumOrBetter) {
            if (passwordValidation.missingMessages.length > 0) {
                setError(`รหัสผ่านยังไม่ผ่านเกณฑ์ กรุณา${passwordValidation.missingMessages.join(' และ ')}`);
            } else {
                setError('รหัสผ่านยังไม่ผ่านเกณฑ์');
            }
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return false;
        }
        if (!formData.department.trim()) {
            setError('กรุณาระบุหน่วยงาน/แผนก');
            return false;
        }
        return true;
    };

    const passwordValidation = getPasswordValidation(formData.password);

    // Handle submit - calls V2 registration request API
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            const data = await authServiceV2.registerRequest({
                email: formData.email.toLowerCase(),
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                title: formData.title,
                phone: formData.phone,
                position: formData.position,
                departmentId: null,
                tenantId: 1
            });

            if (!data.success) {
                const errCode = data.error || '';
                if (errCode === 'EMAIL_EXISTS') {
                    setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น');
                } else {
                    setError(data.message || errCode || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
                }
                return;
            }

            setStep(2); // Success
        } catch (err) {
            console.error('Registration error:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
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

            {/* Registration Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">DJ</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">สมัครใช้งานระบบ</h1>
                            <p className="text-rose-100 text-sm">DJ System - Design Job Management</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 ? (
                        /* Step 1: Registration Form */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-sm font-medium text-amber-800">
                                    กรุณากรอกข้อมูลในแบบฟอร์มเป็นภาษาไทย
                                </p>
                                <p className="mt-1 text-xs text-amber-700">
                                    เพื่อความถูกต้องของข้อมูลในระบบ โปรดใช้ชื่อ-นามสกุล และรายละเอียดหน่วยงานเป็นภาษาไทย
                                </p>
                            </div>

                            {/* Title & Name Row */}
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        คำนำหน้า
                                    </label>
                                    <select
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    >
                                        {titleOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ชื่อ <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="ชื่อ"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="นามสกุล"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    อีเมล <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="email@company.com"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    รหัสผ่าน <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-12 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors ${
                                            !formData.password ? 'border-gray-300' :
                                            passwordValidation.isMediumOrBetter ? 'border-green-400' : 'border-amber-300'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {/* Password checklist validation */}
                                <div className="mt-2 space-y-0.5">
                                    {!formData.password ? (
                                        <p className="text-xs text-gray-400">ตัวอย่าง: MyPass@123</p>
                                    ) : (
                                        <>
                                            {[
                                                { key: 'minLength', label: 'อย่างน้อย 8 ตัวอักษร' },
                                                { key: 'hasUppercase', label: 'ตัวพิมพ์ใหญ่ (A-Z)' },
                                                { key: 'hasLowercase', label: 'ตัวพิมพ์เล็ก (a-z)' },
                                                { key: 'hasNumber', label: 'ตัวเลข (0-9)' },
                                                { key: 'hasSpecialChar', label: 'อักขระพิเศษ (!@#$%)' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className={`flex items-center gap-1.5 transition-colors ${
                                                    passwordValidation.checks[key] ? 'text-green-600' : 'text-gray-400'
                                                }`}>
                                                    {passwordValidation.checks[key] ? (
                                                        <CheckCircleSolidIcon className="w-3.5 h-3.5 shrink-0" />
                                                    ) : (
                                                        <div className="w-3.5 h-3.5 shrink-0 rounded-full border-[1.5px] border-current" />
                                                    )}
                                                    <span className="text-xs">{label}</span>
                                                </div>
                                            ))}
                                            <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                                <p className={`text-xs font-medium ${
                                                    passwordValidation.isMediumOrBetter ? 'text-green-600' : 'text-amber-600'
                                                }`}>
                                                    {passwordValidation.isMediumOrBetter
                                                        ? 'รหัสผ่านสามารถใช้ได้'
                                                        : `รหัสผ่านยังไม่ผ่านเกณฑ์ (${passwordValidation.score}/4)`
                                                    }
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <ShieldCheckIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-12 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors ${
                                            !formData.confirmPassword ? 'border-gray-300' :
                                            formData.password === formData.confirmPassword ? 'border-green-400' : 'border-red-400'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                                        aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {formData.confirmPassword && (
                                    <p className={`text-xs mt-1 ${
                                        formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'
                                    }`}>
                                        {formData.password === formData.confirmPassword ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน'}
                                    </p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    เบอร์โทรศัพท์
                                </label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08x-xxx-xxxx"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    หน่วยงาน/แผนก <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        placeholder="ระบุหน่วยงานหรือแผนก"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Position */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ตำแหน่ง
                                </label>
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    placeholder="ตำแหน่งงาน"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        กำลังสมัคร...
                                    </>
                                ) : (
                                    'สมัครใช้งาน'
                                )}
                            </Button>

                            {/* Back to Login */}
                            <div className="text-center">
                                <Link 
                                    to="/login" 
                                    className="inline-flex items-center text-sm text-gray-500 hover:text-rose-600"
                                >
                                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                                    ไปที่หน้า Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        /* Step 2: Success Message */
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                สมัครสำเร็จ!
                            </h2>
                            <p className="text-gray-600 mb-4">
                                บัญชีของคุณ Active แล้ว พร้อมเข้าใช้งานระบบทันที
                            </p>
                            <div className="bg-green-50 rounded-xl p-4 mb-4 text-left border border-green-200">
                                <p className="text-sm font-medium text-green-800 mb-2">สิ่งที่คุณได้รับ:</p>
                                <ol className="text-sm text-green-700 list-decimal list-inside space-y-1">
                                    <li>บัญชี Active ทันทีหลังจากสมัคร</li>
                                    <li>สิทธิ์ Requester สำหรับโครงการ Sena Head Office (HO)</li>
                                    <li>สามารถ Login ด้วย Email และรหัสผ่านที่สมัครไป</li>
                                    <li>ติดต่อ Admin หากต้องการปรับเปลี่ยนสิทธิ์การใช้งาน</li>
                                </ol>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                                <p className="text-sm text-gray-500 mb-1">อีเมลที่ลงทะเบียน:</p>
                                <p className="font-medium text-gray-900">{formData.email}</p>
                            </div>
                            <Link to="/login">
                                <Button className="bg-rose-600 hover:bg-rose-700">
                                    ไปที่หน้า Login
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
