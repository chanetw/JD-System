/**
 * Tenant Settings Page (Admin Only)
 *
 * Features:
 * - Manage default CC emails for rejection notifications
 * - Add/remove emails with validation
 * - Save/load from backend API
 *
 * Route: /admin/tenant-settings
 * Access: Admin only
 */

import { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';

const TenantSettings = () => {
    const [ccEmails, setCcEmails] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tenant-settings');
            setCcEmails(response.data.data.defaultRejectionCcEmails || []);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setError('ไม่สามารถโหลดการตั้งค่าได้');
        } finally {
            setLoading(false);
        }
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const addEmail = () => {
        setError('');
        setSuccess('');

        if (!newEmail.trim()) {
            setError('กรุณากรอกอีเมล');
            return;
        }

        if (!validateEmail(newEmail)) {
            setError('รูปแบบอีเมลไม่ถูกต้อง');
            return;
        }

        if (ccEmails.includes(newEmail)) {
            setError('อีเมลนี้มีอยู่แล้ว');
            return;
        }

        setCcEmails([...ccEmails, newEmail]);
        setNewEmail('');
    };

    const removeEmail = (email) => {
        setCcEmails(ccEmails.filter(e => e !== email));
        setError('');
        setSuccess('');
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            await api.put('/tenant-settings/rejection-cc-emails', {
                emails: ccEmails
            });

            setSuccess('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Failed to save settings:', error);
            setError(error.response?.data?.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmail();
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ตั้งค่าระบบ</h1>
            <p className="text-sm text-gray-600 mb-6">Tenant Settings</p>

            {/* CC Emails Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    📧 Default CC Emails (Rejection Notifications)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    อีเมลเหล่านี้จะถูก CC ทุกครั้งที่ผู้อนุมัติยืนยันการยกเลิกงาน (Confirm Rejection)
                </p>

                {/* Email List */}
                <div className="space-y-2 mb-4">
                    {ccEmails.length > 0 ? (
                        ccEmails.map((email, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <span className="flex-1 text-gray-700">{email}</span>
                                <button
                                    onClick={() => removeEmail(email)}
                                    className="text-red-500 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                    title="ลบอีเมลนี้"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-400 italic">ยังไม่มีอีเมล CC</p>
                            <p className="text-xs text-gray-400 mt-1">เพิ่มอีเมลด้านล่าง</p>
                        </div>
                    )}
                </div>

                {/* Add Email Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        เพิ่มอีเมล CC
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="เช่น hr@company.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            onClick={addEmail}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
                        >
                            เพิ่ม
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">⚠️ {error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">✅ {success}</p>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                </button>

                {/* Info Text */}
                <p className="mt-3 text-xs text-gray-500 text-center">
                    💡 อีเมลเหล่านี้จะถูกกรอกอัตโนมัติใน Confirm Rejection Modal (ยังแก้ไขได้)
                </p>
            </div>
        </div>
    );
};

export default TenantSettings;
