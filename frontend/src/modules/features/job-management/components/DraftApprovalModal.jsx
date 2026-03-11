import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import httpClient from '@shared/services/httpClient';

/**
 * DraftApprovalModal - Modal สำหรับ Requester approve/reject draft
 * @param {boolean} isOpen - แสดง modal หรือไม่
 * @param {function} onClose - ฟังก์ชันปิด modal
 * @param {object} job - ข้อมูลงาน
 * @param {function} onSuccess - callback เมื่อ approve/reject สำเร็จ
 */
export default function DraftApprovalModal({ isOpen, onClose, job, onSuccess }) {
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!action) {
            Swal.fire({
                icon: 'warning',
                title: 'เลือก Action',
                text: 'กรุณาเลือก Approve หรือ Reject',
                confirmButtonColor: '#e11d48'
            });
            return;
        }
        if (!reason.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'ใส่เหตุผล',
                text: 'กรุณาใส่เหตุผลหรือความเห็น',
                confirmButtonColor: '#e11d48'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await httpClient.post(`/jobs/${job.id}/approve-draft`, {
                action,
                reason: reason.trim()
            });

            if (response.data?.success) {
                await Swal.fire({
                    icon: 'success',
                    title: action === 'approve' ? 'อนุมัติ Draft' : 'ปฏิเสธ Draft',
                    text: action === 'approve' ? 'Draft ผ่านการตรวจสอบแล้ว' : 'Draft ไม่ผ่านการตรวจสอบ',
                    confirmButtonColor: '#e11d48'
                });
                setAction(null);
                setReason('');
                onClose();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: response.data?.message || 'ไม่สามารถบันทึกการอนุมัติได้',
                    confirmButtonColor: '#e11d48'
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || err.message || 'ไม่สามารถบันทึกการอนุมัติได้',
                confirmButtonColor: '#e11d48'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setAction(null);
            setReason('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">ตรวจสอบ Draft</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        งาน: <span className="font-semibold text-gray-900">{job.djId} - {job.subject}</span>
                    </p>

                    {/* Action Selection */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">การตรวจสอบ</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => setAction('approve')}
                                disabled={isSubmitting}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                                    action === 'approve'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 bg-white hover:border-green-300'
                                }`}
                            >
                                <CheckCircleIcon className={`w-5 h-5 ${
                                    action === 'approve' ? 'text-green-600' : 'text-gray-400'
                                }`} />
                                <span className={`font-medium ${
                                    action === 'approve' ? 'text-green-700' : 'text-gray-700'
                                }`}>
                                    ✅ อนุมัติ Draft
                                </span>
                            </button>

                            <button
                                onClick={() => setAction('reject')}
                                disabled={isSubmitting}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                                    action === 'reject'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 bg-white hover:border-red-300'
                                }`}
                            >
                                <XCircleIcon className={`w-5 h-5 ${
                                    action === 'reject' ? 'text-red-600' : 'text-gray-400'
                                }`} />
                                <span className={`font-medium ${
                                    action === 'reject' ? 'text-red-700' : 'text-gray-700'
                                }`}>
                                    ❌ ปฏิเสธ Draft
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            {action === 'approve' ? 'ความเห็น' : 'เหตุผลในการปฏิเสธ'}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isSubmitting}
                            placeholder={action === 'approve' ? 'เช่น: ดีมากครับ ส่งต่อได้เลย' : 'เช่น: ต้องแก้ไขสี และ layout'}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm disabled:bg-gray-50"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !action}
                        variant={action === 'approve' ? 'primary' : 'danger'}
                        className="flex-1"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังบันทึก...
                            </>
                        ) : (action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
