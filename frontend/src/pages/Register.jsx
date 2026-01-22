/**
 * @file Register.jsx
 * @description หน้าสมัครใช้งาน (Self-Service Registration)
 * 
 * Features:
 * - กรอกข้อมูลส่วนตัว
 * - ส่งคำขอไปยัง Admin เพื่ออนุมัติ
 * - แสดงสถานะคำขอ
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/apiService';
import Button from '@/components/common/Button';
import { 
    UserIcon, 
    EnvelopeIcon, 
    PhoneIcon, 
    BuildingOfficeIcon,
    CheckCircleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Form, 2 = Success
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form data
    const [formData, setFormData] = useState({
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: ''
    });

    // Title options
    const titleOptions = [
        { value: '', label: 'เลือกคำนำหน้า' },
        { value: 'นาย', label: 'นาย' },
        { value: 'นาง', label: 'นาง' },
        { value: 'นางสาว', label: 'นางสาว' },
        { value: 'Mr.', label: 'Mr.' },
        { value: 'Mrs.', label: 'Mrs.' },
        { value: 'Ms.', label: 'Ms.' },
        { value: 'Dr.', label: 'Dr.' }
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
        if (!formData.department.trim()) {
            setError('กรุณาระบุหน่วยงาน/แผนก');
            return false;
        }
        return true;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            await api.submitRegistration(formData);
            setStep(2); // Success
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
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
                                        กำลังส่งคำขอ...
                                    </>
                                ) : (
                                    'ส่งคำขอสมัครใช้งาน'
                                )}
                            </Button>

                            {/* Back to Login */}
                            <div className="text-center">
                                <Link 
                                    to="/login" 
                                    className="inline-flex items-center text-sm text-gray-500 hover:text-rose-600"
                                >
                                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                                    กลับไปหน้า Login
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
                                ส่งคำขอสำเร็จ!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                คำขอสมัครใช้งานของคุณถูกส่งไปยัง Admin เรียบร้อยแล้ว<br />
                                กรุณารอการอนุมัติ ระบบจะส่งอีเมลแจ้งผลให้ท่านทราบ
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                                <p className="text-sm text-gray-500 mb-1">อีเมลที่ลงทะเบียน:</p>
                                <p className="font-medium text-gray-900">{formData.email}</p>
                            </div>
                            <Link to="/login">
                                <Button className="bg-rose-600 hover:bg-rose-700">
                                    กลับไปหน้า Login
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
