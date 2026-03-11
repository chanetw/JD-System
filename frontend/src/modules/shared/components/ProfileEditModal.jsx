/**
 * @file ProfileEditModal.jsx
 * @description Modal สำหรับแก้ไขโปรไฟล์ตัวเอง (ชื่อ นามสกุล)
 * เรียกจาก Header profile dropdown
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { api } from '@shared/services/apiService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { ROLE_LABELS, ROLE_V2_BADGE_COLORS } from '@shared/utils/permission.utils';

export default function ProfileEditModal({ isOpen, onClose }) {
    const { user, refreshUser } = useAuthStoreV2();
    const [form, setForm] = useState({ firstName: '', lastName: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
            });
            setError('');
            setSuccess(false);
        }
    }, [isOpen, user]);

    const handleSave = async () => {
        if (!form.firstName.trim()) {
            setError('กรุณากรอกชื่อ');
            return;
        }
        if (!form.lastName.trim()) {
            setError('กรุณากรอกนามสกุล');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await api.updateMyProfile({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
            });
            setSuccess(true);
            await refreshUser();
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            setError(err.message || 'ไม่สามารถอัปเดตโปรไฟล์ได้');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // ดึง roles ของ user
    const userRoles = user?.roles || [];
    const roleNames = userRoles.map(r => typeof r === 'string' ? r : r.name).filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">แก้ไขโปรไฟล์</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Avatar & Role Badges */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-rose-600 font-bold text-xl">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {roleNames.map(role => (
                                    <span
                                        key={role}
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_V2_BADGE_COLORS[role] || 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {ROLE_LABELS[role] || role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.firstName}
                            onChange={e => setForm({ ...form, firstName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            placeholder="ชื่อจริง"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.lastName}
                            onChange={e => setForm({ ...form, lastName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            placeholder="นามสกุล"
                        />
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                            บันทึกโปรไฟล์สำเร็จ
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
                    >
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}
