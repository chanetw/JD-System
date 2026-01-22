/**
 * @file FinishJobModal.jsx
 * @description Modal สำหรับ Graphic Designer ปิดงาน (Finish Job)
 * 
 * Features:
 * - Upload Final Files (ไฟล์สุดท้ายที่ส่งมอบ)
 * - เพิ่ม Notes (หมายเหตุ)
 * - Preview ไฟล์ที่เลือก
 * - Validate ก่อน Submit
 */

import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '@/components/common/Button';

/**
 * @component FinishJobModal
 * @param {Object} props
 * @param {boolean} props.isOpen - สถานะเปิด/ปิด Modal
 * @param {function} props.onClose - ฟังก์ชันปิด Modal
 * @param {function} props.onConfirm - ฟังก์ชันเมื่อยืนยัน (finalFiles, notes)
 * @param {Object} props.job - ข้อมูลงาน
 * @param {boolean} props.isLoading - สถานะกำลังโหลด
 */
export default function FinishJobModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    job = {},
    isLoading = false 
}) {
    // States
    const [files, setFiles] = useState([]);
    const [notes, setNotes] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // Allowed file types
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/postscript', // .ai, .eps
        'image/vnd.adobe.photoshop', // .psd
        'application/zip', 'application/x-rar-compressed'
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.ai', '.eps', '.psd', '.zip', '.rar'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB per file
    const maxFiles = 10;

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setNotes('');
            setError('');
        }
    }, [isOpen]);

    // Handle file selection
    const handleFileSelect = (selectedFiles) => {
        const fileList = Array.from(selectedFiles);
        const validFiles = [];
        const errors = [];

        fileList.forEach(file => {
            // Check file count
            if (files.length + validFiles.length >= maxFiles) {
                errors.push(`เกินจำนวนไฟล์สูงสุด (${maxFiles} ไฟล์)`);
                return;
            }

            // Check file size
            if (file.size > maxFileSize) {
                errors.push(`${file.name}: ขนาดไฟล์เกิน 50MB`);
                return;
            }

            // Check file type by extension
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                errors.push(`${file.name}: ประเภทไฟล์ไม่รองรับ`);
                return;
            }

            // Check duplicate
            if (files.some(f => f.name === file.name && f.size === file.size)) {
                errors.push(`${file.name}: ไฟล์ซ้ำ`);
                return;
            }

            validFiles.push(file);
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
        } else {
            setError('');
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    // Drag & Drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    // Remove file
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get file icon color by extension
    const getFileColor = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const colors = {
            'ai': 'text-orange-500',
            'psd': 'text-blue-500',
            'pdf': 'text-red-500',
            'zip': 'text-yellow-600',
            'rar': 'text-purple-500',
            'jpg': 'text-green-500',
            'jpeg': 'text-green-500',
            'png': 'text-green-500',
            'gif': 'text-pink-500',
            'webp': 'text-teal-500'
        };
        return colors[ext] || 'text-gray-500';
    };

    // Handle submit
    const handleSubmit = () => {
        if (files.length === 0) {
            setError('กรุณาอัปโหลดไฟล์อย่างน้อย 1 ไฟล์');
            return;
        }

        setError('');
        onConfirm(files, notes);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">ปิดงาน (Finish Job)</h2>
                            <p className="text-sm text-gray-500">{job.djId || job.dj_id} - {job.subject}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Upload Area */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ไฟล์สุดท้ายที่ส่งมอบ <span className="text-red-500">*</span>
                        </label>
                        
                        {/* Drag & Drop Zone */}
                        <div
                            className={`
                                relative border-2 border-dashed rounded-xl p-8 text-center
                                transition-colors cursor-pointer
                                ${dragActive 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                                }
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={allowedExtensions.join(',')}
                                onChange={(e) => handleFileSelect(e.target.files)}
                                className="hidden"
                            />
                            
                            <CloudArrowUpIcon className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-green-500' : 'text-gray-400'}`} />
                            <p className="text-gray-600 font-medium">
                                ลากไฟล์มาวางที่นี่ หรือ <span className="text-green-600">เลือกไฟล์</span>
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                รองรับ: AI, PSD, PDF, JPG, PNG, GIF, ZIP (สูงสุด 50MB/ไฟล์, {maxFiles} ไฟล์)
                            </p>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => (
                                    <div 
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <DocumentIcon className={`w-8 h-8 flex-shrink-0 ${getFileColor(file.name)}`} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-700 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile(index);
                                            }}
                                            className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            หมายเหตุ (ถ้ามี)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="เช่น ส่งมอบไฟล์ AI, PSD และ Preview JPG ครบแล้ว..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSubmit}
                        disabled={isLoading || files.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-5 h-5 mr-1" />
                                ปิดงาน
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
