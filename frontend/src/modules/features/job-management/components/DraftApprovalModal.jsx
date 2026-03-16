import React, { useState, useRef } from 'react';
import { XMarkIcon, CheckCircleIcon, PencilSquareIcon, PaperClipIcon, LinkIcon } from '@heroicons/react/24/outline';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import httpClient from '@shared/services/httpClient';
import { fileUploadService } from '@shared/services/modules/fileUploadService';

/**
 * DraftApprovalModal - Modal สำหรับ Requester approve/reject draft
 * @param {boolean} isOpen - แสดง modal หรือไม่
 * @param {function} onClose - ฟังก์ชันปิด modal
 * @param {object} job - ข้อมูลงาน
 * @param {function} onSuccess - callback เมื่อ approve/reject สำเร็จ
 * @param {object} currentUser - ข้อมูลผู้ใช้ปัจจุบัน (สำหรับ file upload)
 */
export default function DraftApprovalModal({ isOpen, onClose, job, onSuccess, currentUser }) {
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [reviewLink, setReviewLink] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploadingFile(true);
        try {
            const result = await fileUploadService.uploadMultipleFiles(files, {
                jobId: job.id,
                tenantId: currentUser?.tenantId || job.tenantId,
                userId: currentUser?.id,
                attachmentType: 'draft_review'
            });
            if (result.successfulFiles?.length) {
                setUploadedFiles(prev => [...prev, ...result.successfulFiles]);
            }
            if (result.errors?.length) {
                Swal.fire({ icon: 'warning', title: 'บางไฟล์ไม่สามารถอัปโหลดได้', text: result.errors.join('\n'), confirmButtonColor: '#e11d48' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'อัปโหลดไฟล์ไม่สำเร็จ', text: err.message, confirmButtonColor: '#e11d48' });
        } finally {
            setUploadingFile(false);
            e.target.value = '';
        }
    };

    const removeFile = (fileId) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleSubmit = async () => {
        if (!action) {
            Swal.fire({ icon: 'warning', title: 'เลือก Action', text: 'กรุณาเลือก Approve หรือ มีแก้ไข Draft', confirmButtonColor: '#e11d48' });
            return;
        }
        if (!reason.trim()) {
            Swal.fire({ icon: 'warning', title: 'ใส่เหตุผล', text: 'กรุณาใส่เหตุผลหรือความเห็น', confirmButtonColor: '#e11d48' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await httpClient.post(`/jobs/${job.id}/approve-draft`, {
                action,
                reason: reason.trim(),
                reviewLink: reviewLink.trim() || undefined,
                attachmentIds: uploadedFiles.map(f => f.id)
            });

            if (response.data?.success) {
                await Swal.fire({
                    icon: 'success',
                    title: action === 'approve' ? 'อนุมัติ Draft' : 'ส่งขอแก้ไข Draft',
                    text: action === 'approve' ? 'Draft ผ่านการตรวจสอบแล้ว' : 'ส่งคำขอแก้ไข Draft ให้ Assignee แล้ว',
                    confirmButtonColor: '#e11d48'
                });
                handleReset();
                onClose();
                if (onSuccess) onSuccess();
            } else {
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: response.data?.message || 'ไม่สามารถบันทึกการอนุมัติได้', confirmButtonColor: '#e11d48' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response?.data?.message || err.message || 'ไม่สามารถบันทึกการอนุมัติได้', confirmButtonColor: '#e11d48' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setAction(null);
        setReason('');
        setReviewLink('');
        setUploadedFiles([]);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            handleReset();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-gray-900">ตรวจสอบ Draft</h2>
                    <button onClick={handleClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
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
                                    action === 'approve' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'
                                }`}
                            >
                                <CheckCircleIcon className={`w-5 h-5 ${action === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${action === 'approve' ? 'text-green-700' : 'text-gray-700'}`}>
                                    ✅ อนุมัติ Draft
                                </span>
                            </button>
                            <button
                                onClick={() => setAction('reject')}
                                disabled={isSubmitting}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                                    action === 'reject' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'
                                }`}
                            >
                                <PencilSquareIcon className={`w-5 h-5 ${action === 'reject' ? 'text-amber-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${action === 'reject' ? 'text-amber-700' : 'text-gray-700'}`}>
                                    ✏️ มีแก้ไข Draft
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            {action === 'approve' ? 'ความเห็น' : 'รายละเอียดการแก้ไข'} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isSubmitting}
                            placeholder={action === 'approve' ? 'เช่น: ดีมากครับ ส่งต่อได้เลย' : 'เช่น: ต้องแก้ไขสี และ layout ตาม brief'}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm disabled:bg-gray-50"
                        />
                    </div>

                    {/* Link input */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            แนบลิงก์อ้างอิง <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                        </label>
                        <input
                            type="text"
                            value={reviewLink}
                            onChange={(e) => setReviewLink(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm disabled:bg-gray-50"
                        />
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                            <PaperClipIcon className="w-4 h-4 text-gray-400" />
                            แนบไฟล์ <span className="font-normal text-gray-400">(ไม่บังคับ, max 50 MB/ไฟล์)</span>
                        </label>
                        <div
                            onClick={() => !isSubmitting && !uploadingFile && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                isSubmitting || uploadingFile
                                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                                    : 'cursor-pointer border-gray-300 hover:border-rose-400 hover:bg-rose-50/30'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isSubmitting || uploadingFile}
                            />
                            {uploadingFile ? (
                                <p className="text-sm text-gray-500">⏳ กำลังอัปโหลด...</p>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    คลิกหรือลากไฟล์มาวางที่นี่
                                </p>
                            )}
                        </div>
                        {uploadedFiles.length > 0 && (
                            <ul className="space-y-1.5 mt-2">
                                {uploadedFiles.map(f => (
                                    <li key={f.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                        <PaperClipIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="flex-1 truncate text-gray-700">{f.file_name || f.fileName}</span>
                                        <button
                                            onClick={() => removeFile(f.id)}
                                            disabled={isSubmitting}
                                            className="text-gray-400 hover:text-red-500 flex-shrink-0 disabled:opacity-50"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !action || uploadingFile}
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
                        ) : (action === 'approve' ? 'อนุมัติ' : 'ส่งขอแก้ไข')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
