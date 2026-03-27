/**
 * @file PortalSettings.jsx
 * @description หน้าตั้งค่าข้อความ User Portal (Hero Title, Subtitle, Announcement)
 * Admin only
 */

import { useState, useEffect } from 'react';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import httpClient from '@shared/services/httpClient';
import { isAdmin as checkIsAdmin } from '@shared/utils/permission.utils';

export default function PortalSettings() {
    const { user } = useAuthStoreV2();
    const [form, setForm] = useState({
        heroTitle: 'ต้องการงาน Design อะไรวันนี้?',
        heroSubtitle: 'ค้นหางานเดิมหรือสร้าง Design Job ใหม่',
        announcementText: '',
        announcementVisible: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const isAdmin = checkIsAdmin(user);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await httpClient.get('/tenant-settings/portal-settings');
            if (res.data.success) {
                // Keep defaults for display if values are empty
                const filtered = Object.entries(res.data.data).reduce((acc, [key, value]) => {
                    if (value !== '' && value !== null && value !== undefined) {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                setForm(prev => ({ ...prev, ...filtered }));
            }
        } catch (err) {
            console.error('[PortalSettings] fetch error:', err);
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await httpClient.put('/tenant-settings/portal-settings', form);
            if (res.data.success) {
                showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
                // รีเฟรชข้อมูลจาก server เพื่อแสดงค่าล่าสุด
                await fetchSettings();
            } else {
                showToast(res.data.message || 'บันทึกไม่สำเร็จ', 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
    };

    if (!isAdmin) {
        return (
            <div className="p-8 text-center text-red-500">
                คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Admin เท่านั้น)
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">ตั้งค่า User Portal</h1>
                <p className="text-sm text-gray-500 mt-1">
                    กำหนดข้อความแสดงบนหน้า Portal สำหรับผู้ยื่นคำร้อง
                </p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                    {/* Hero Section */}
                    <div className="p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            🌟 ส่วน Hero (หัวหน้าเว็บไซต์)
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                หัวข้อหลัก (Hero Title)
                            </label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                value={form.heroTitle}
                                onChange={e => setForm(p => ({ ...p, heroTitle: e.target.value }))}
                                placeholder="เช่น ต้องการงาน Design อะไรวันนี้?"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                ข้อความรอง (Hero Subtitle)
                            </label>
                            <textarea
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                value={form.heroSubtitle}
                                onChange={e => setForm(p => ({ ...p, heroSubtitle: e.target.value }))}
                                placeholder="เช่น ค้นหางานเดิมหรือสร้าง Design Job ใหม่"
                                disabled={saving}
                            />
                        </div>
                    </div>

                    {/* Announcement Section */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                📢 ประกาศ (Announcement Banner)
                            </h2>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-sm text-gray-600">แสดงประกาศ</span>
                                <button
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, announcementVisible: !p.announcementVisible }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        form.announcementVisible ? 'bg-rose-500' : 'bg-gray-300'
                                    }`}
                                    disabled={saving}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        form.announcementVisible ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                ข้อความประกาศ
                            </label>
                            <textarea
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-50"
                                value={form.announcementText}
                                onChange={e => setForm(p => ({ ...p, announcementText: e.target.value }))}
                                placeholder="เช่น ระบบจะปิดปรับปรุงวันที่ 1-2 มี.ค. 68 เวลา 22:00-06:00 น."
                                disabled={saving}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                ข้อความจะแสดงเป็น Banner สีเหลืองบนหน้า Portal เมื่อเปิดการแสดงผล
                            </p>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-6 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            👁️ ตัวอย่างการแสดงผล
                        </h2>
                        <div className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-800 p-6 text-white">
                            <h3 className="text-2xl font-bold">{form.heroTitle || 'ต้องการงาน Design อะไรวันนี้?'}</h3>
                            <p className="mt-2 text-rose-100 text-sm">{form.heroSubtitle || 'ค้นหางานเดิมหรือสร้าง Design Job ใหม่'}</p>
                        </div>
                        {form.announcementVisible && form.announcementText && (
                            <div className="rounded-lg overflow-hidden border border-amber-200 bg-amber-50">
                                <style>{`
                                    @keyframes ticker-preview {
                                        0%   { transform: translateX(100%); }
                                        100% { transform: translateX(-100%); }
                                    }
                                    .ticker-preview-text {
                                        display: inline-block;
                                        animation: ticker-preview 18s linear infinite;
                                        white-space: nowrap;
                                    }
                                `}</style>
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-2 text-xs font-semibold border-r border-amber-200">
                                        <span>📢</span>
                                        <span>ประกาศ</span>
                                    </div>
                                    <div className="flex-1 overflow-hidden py-2">
                                        <span className="ticker-preview-text text-xs text-amber-700 px-4">
                                            {form.announcementText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                        <button
                            onClick={fetchSettings}
                            disabled={saving || loading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            รีเซ็ต
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    กำลังบันทึก...
                                </>
                            ) : 'บันทึกการตั้งค่า'}
                        </button>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
                    toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
                </div>
            )}
        </div>
    );
}
