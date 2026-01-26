/**
 * @file FileUpload.jsx
 * @description Reusable File Upload Component with drag & drop support
 */

import React, { useState, useRef, useCallback } from 'react';
import { fileUploadService } from '../services/modules/fileUploadService';

/**
 * FileUpload Component
 * @param {Object} props
 * @param {number} props.jobId - Job ID
 * @param {number} props.tenantId - Tenant ID
 * @param {number} props.userId - Uploader user ID
 * @param {string} props.attachmentType - Type of attachment
 * @param {Function} props.onUploadComplete - Callback when upload completes
 * @param {Function} props.onError - Callback when error occurs
 * @param {boolean} props.multiple - Allow multiple file selection
 * @param {string} props.accept - Accepted file types
 * @param {string} props.className - Additional CSS classes
 */
const FileUpload = ({
    jobId,
    tenantId,
    userId,
    attachmentType = 'general',
    onUploadComplete,
    onError,
    multiple = true,
    accept = '*/*',
    className = ''
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    const fileInputRef = useRef(null);

    // Handle drag events
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    }, []);

    // Process and upload files
    const handleFiles = async (files) => {
        if (!jobId || !tenantId || !userId) {
            const error = 'Missing required parameters for upload';
            setErrors([error]);
            onError?.(error);
            return;
        }

        setUploading(true);
        setProgress(0);
        setErrors([]);

        try {
            const result = await fileUploadService.uploadMultipleFiles(
                files,
                {
                    jobId,
                    tenantId,
                    userId,
                    attachmentType,
                    onProgress: setProgress
                }
            );

            // Process results
            const newUploaded = result.results.filter(r => r.success).map(r => r.data);
            const newErrors = result.results.filter(r => !r.success).map(r => `${r.fileName}: ${r.error}`);

            setUploadedFiles(prev => [...prev, ...newUploaded]);
            setErrors(newErrors);

            if (newUploaded.length > 0) {
                onUploadComplete?.(newUploaded);
            }

            if (newErrors.length > 0) {
                onError?.(newErrors);
            }

        } catch (error) {
            console.error('Upload error:', error);
            setErrors([error.message]);
            onError?.(error.message);
        } finally {
            setUploading(false);
            setProgress(0);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Remove uploaded file
    const removeFile = async (attachmentId) => {
        const result = await fileUploadService.deleteFile(attachmentId, userId);
        if (result.success) {
            setUploadedFiles(prev => prev.filter(f => f.id !== attachmentId));
        } else {
            setErrors([result.error]);
        }
    };

    // Trigger file input click
    const openFileBrowser = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`file-upload-container ${className}`}>
            {/* Drop Zone */}
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center
                    transition-colors duration-200 cursor-pointer
                    ${isDragging
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }
                    ${uploading ? 'pointer-events-none opacity-50' : ''}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={openFileBrowser}
            >
                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple={multiple}
                    accept={accept}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Upload Icon */}
                <div className="mb-4">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                {/* Text */}
                <p className="text-sm text-gray-600">
                    {isDragging ? (
                        <span className="text-rose-600 font-medium">วางไฟล์ที่นี่...</span>
                    ) : (
                        <>
                            <span className="text-rose-600 font-medium">คลิกเพื่อเลือกไฟล์</span>
                            <span className="text-gray-500"> หรือลากไฟล์มาวางที่นี่</span>
                        </>
                    )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    รองรับไฟล์: รูปภาพ, PDF, Word, Excel, PowerPoint, ZIP (สูงสุด 50MB)
                </p>

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">กำลังอัปโหลด... {Math.round(progress)}%</p>
                    </div>
                )}
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด:</p>
                    <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">ไฟล์ที่อัปโหลด:</p>
                    <ul className="space-y-2">
                        {uploadedFiles.map((file) => (
                            <li
                                key={file.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-xl">
                                        {fileUploadService.getFileIcon(file.mime_type || '')}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                                            {file.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {fileUploadService.formatFileSize(file.file_size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-rose-600 hover:text-rose-700"
                                    >
                                        ดู
                                    </a>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(file.id);
                                        }}
                                        className="text-sm text-gray-400 hover:text-red-500"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
