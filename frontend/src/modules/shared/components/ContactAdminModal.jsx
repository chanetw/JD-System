/**
 * @file ContactAdminModal.jsx
 * @description Modal ติดต่อ Admin — ส่งข้อความถึง Admin ทั้งหมดใน tenant
 * ใช้ร่วมกันจาก UserProfileMenu (Header + UserPortal)
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import httpClient from '@shared/services/httpClient';

const CATEGORIES = [
    { value: 'bug', label: 'แจ้งปัญหาการใช้งาน (Bug)' },
    { value: 'access', label: 'ขอสิทธิ์การใช้งาน (Access)' },
    { value: 'request', label: 'คำขออื่น ๆ (Other Request)' },
];

export default function ContactAdminModal({ isOpen, onClose }) {
    const [form, setForm] = useState({ category: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.category || !form.subject.trim() || !form.message.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            return;
        }
        if (form.message.trim().length < 10) {
            setError('รายละเอียดต้องมีอย่างน้อย 10 ตัวอักษร');
            return;
        }

        setLoading(true);
        try {
            await httpClient.post('/contact-admin', {
                subject: form.subject.trim(),
                category: form.category,
                message: form.message.trim(),
            });
            setSuccess(true);
            setTimeout(() => {
                setForm({ category: '', subject: '', message: '' });
                setSuccess(false);
                onClose();
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm({ category: '', subject: '', message: '' });
        setError('');
        setSuccess(false);
        onClose();
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">ติดต่อ Admin</h2>
                        <p className="text-sm text-slate-500 mt-0.5">แจ้งปัญหาการใช้งานหรือคำขอสิทธิ์เพิ่มเติม</p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className="px-6 py-10 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">ส่งข้อความสำเร็จแล้ว!</h3>
                        <p className="text-sm text-slate-500">ทีม Admin ได้รับข้อความของคุณแล้ว และจะติดต่อกลับโดยเร็ว</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ประเภท <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
                            >
                                <option value="">-- เลือกประเภท --</option>
                                {CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                หัวข้อ <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.subject}
                                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                                placeholder="เช่น ขอสิทธิ์เพิ่มในโครงการ, พบปัญหาการเข้าใช้งาน"
                                maxLength={255}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                รายละเอียด <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={form.message}
                                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="อธิบายรายละเอียดของปัญหาหรือคำขอ..."
                                rows={5}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                                maxLength={2000}
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {loading && (
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {loading ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
