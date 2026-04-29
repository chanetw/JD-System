import React, { useState, useRef } from 'react';
import { PaperClipIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import httpClient from '@shared/services/httpClient';
import { fileUploadService } from '@shared/services/modules/fileUploadService';

/**
 * DraftSubmitModal - Modal สำหรับส่ง Draft ให้ตรวจสอบ
 * ใช้ร่วมกันได้ทั้งใน JobDetail และ Dashboard (My Queue)
 * @param {object} currentUser - ข้อมูลผู้ใช้ปัจจุบัน (สำหรับ file upload)
 */
const DraftSubmitModal = ({ isOpen, onClose, job, onSuccess, currentUser }) => {
    const [draftLink, setDraftLink] = useState('');
    const [draftNote, setDraftNote] = useState('');
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
                attachmentType: 'draft'
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

    const cleanupUploadedFiles = async (filesToCleanup = []) => {
        const fileIds = filesToCleanup.map(file => file?.id).filter(Boolean);
        if (!fileIds.length) return;

        await Promise.allSettled(
            fileIds.map(fileId => fileUploadService.deleteFile(fileId, currentUser?.id))
        );
    };

    const removeFile = async (fileId) => {
        const result = await fileUploadService.deleteFile(fileId, currentUser?.id);
        if (!result.success) {
            await Swal.fire({
                icon: 'error',
                title: 'ลบไฟล์ไม่สำเร็จ',
                text: result.error || 'ไม่สามารถลบไฟล์นี้ได้',
                confirmButtonColor: '#e11d48'
            });
            return;
        }

        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            await httpClient.post(`/jobs/${job.id}/submit-draft`, {
                link: draftLink.trim() || undefined,
                note: draftNote.trim() || undefined,
                attachmentIds: uploadedFiles.map(f => f.id)
            });

            await Swal.fire({
                icon: 'success',
                title: 'ส่ง Draft สำเร็จ!',
                text: 'ระบบได้แจ้งเตือนไปยัง Requester และ Approver แล้ว งานจะยังอยู่ในคิวกำลังทำสถานะรอตรวจ Draft',
                confirmButtonColor: '#e11d48'
            });

            handleReset();
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'ส่ง Draft ไม่สำเร็จ',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#e11d48'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setDraftLink('');
        setDraftNote('');
        setUploadedFiles([]);
    };

    const handleClose = async () => {
        if (!isSubmitting) {
            await cleanupUploadedFiles(uploadedFiles);
            handleReset();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-blue-600">📝 ส่ง Draft ให้ตรวจ</h3>
                    <button onClick={handleClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        ส่ง draft ให้ Requester และ Approver ตรวจสอบก่อนส่งงานจริง
                    </p>

                    {/* Link */}
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            ลิงก์ Draft <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                        </label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-50"
                            value={draftLink}
                            onChange={e => setDraftLink(e.target.value)}
                            placeholder="https://..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700">
                            หมายเหตุ <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                        </label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-50"
                            rows={3}
                            value={draftNote}
                            onChange={e => setDraftNote(e.target.value)}
                            placeholder="เช่น กรุณาตรวจสอบ concept และสี..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <PaperClipIcon className="w-4 h-4 text-gray-400" />
                            แนบไฟล์ <span className="font-normal text-gray-400">(ไม่บังคับ, max 50 MB/ไฟล์)</span>
                        </label>
                        <div
                            onClick={() => !isSubmitting && !uploadingFile && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                isSubmitting || uploadingFile
                                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                                    : 'cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
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
                                <p className="text-sm text-gray-500">คลิกหรือลากไฟล์มาวางที่นี่</p>
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
                <div className="flex gap-2 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                    <Button variant="ghost" onClick={handleClose} disabled={isSubmitting} className="flex-1">
                        ยกเลิก
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || uploadingFile} className="flex-1">
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังส่ง Draft...
                            </>
                        ) : 'ส่ง Draft'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DraftSubmitModal;
