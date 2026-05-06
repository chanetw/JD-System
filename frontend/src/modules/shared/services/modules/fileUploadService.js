/**
 * @file fileUploadService.js
 * @description File Upload Service using Backend API /api/storage/*
 */

import httpClient from '../httpClient';

// Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Design files
    'application/postscript', // AI, EPS
    'image/vnd.adobe.photoshop', // PSD
];

const formatUploadError = (error, maxFileSizeBytes) => {
    const maxMb = Math.floor((maxFileSizeBytes || MAX_FILE_SIZE) / (1024 * 1024));
    const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message;
    const backendError = error?.response?.data?.error;

    if (backendMessage) {
        return backendMessage;
    }

    if (status === 413 || backendError === 'FILE_TOO_LARGE') {
        return `ไฟล์มีขนาดใหญ่เกินกำหนด (สูงสุด ${maxMb}MB ต่อไฟล์)`;
    }

    if (status === 415 || backendError === 'INVALID_FILE') {
        return 'ประเภทไฟล์ไม่รองรับ หรือไฟล์ไม่ถูกต้อง';
    }

    return error?.message || 'อัปโหลดไฟล์ไม่สำเร็จ';
};

export const fileUploadService = {
    /**
     * Upload a file to backend storage
     * @param {File} file - File object to upload
     * @param {Object} options - Upload options
     * @param {number} options.jobId - Job ID
     * @param {number} [options.projectId] - Project ID
     * @param {number} options.tenantId - Tenant ID
     * @param {number} options.userId - Uploader user ID
     * @param {string} options.attachmentType - Type of attachment (e.g., 'CI Guideline', 'Logo Pack')
     * @param {Function} options.onProgress - Progress callback (0-100)
     * @param {number} [options.maxFileSize] - Override max file size in bytes (default: 50MB)
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    uploadFile: async (file, options = {}) => {
        const { jobId, projectId, tenantId, userId, attachmentType, onProgress, maxFileSize } = options;

        try {
            // Validate file (pass maxFileSize override if provided)
            const validation = fileUploadService.validateFile(file, maxFileSize);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const formData = new FormData();
            const safeAttachmentType = String(attachmentType || 'general').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            const folderParts = [`tenant_${tenantId || 1}`];
            if (jobId) folderParts.push(`job_${jobId}`);
            folderParts.push(safeAttachmentType);

            formData.append('file', file);
            formData.append('folder', folderParts.join('/'));
            if (jobId) formData.append('jobId', jobId);
            if (projectId) formData.append('projectId', projectId);

            const response = await httpClient.post('/storage/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
                    }
                }
            });

            if (onProgress) onProgress(100);
            return response.data;

        } catch (error) {
            console.error('Error uploading file:', error);
            return {
                success: false,
                error: formatUploadError(error, maxFileSize)
            };
        }
    },

    /**
     * Upload multiple files
     * @param {FileList|Array<File>} files - Files to upload
     * @param {Object} options - Upload options
     * @returns {Promise<{success: boolean, results: Array}>}
     */
    uploadMultipleFiles: async (files, options = {}) => {
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = await fileUploadService.uploadFile(file, {
                ...options,
                onProgress: options.onProgress
                    ? (progress) => options.onProgress((i / files.length) * 100 + progress / files.length)
                    : undefined
            });

            results.push({
                fileName: file.name,
                ...result
            });

            if (result.success) successCount++;
            else failCount++;
        }

        const successfulFiles = results.filter(result => result.success && result.data).map(result => result.data);
        const errors = results.filter(result => !result.success).map(result => `${result.fileName}: ${result.error}`);

        return {
            success: failCount === 0,
            successCount,
            failCount,
            results,
            successfulFiles,
            errors
        };
    },

    /**
     * Delete a file
     * @param {number} attachmentId - Attachment ID
     * @param {number} userId - User performing deletion
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    deleteFile: async (attachmentId, userId) => {
        try {
            const response = await httpClient.delete(`/storage/files/${attachmentId}`);
            return response.data;

        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get attachments for a job
     * @param {number} jobId - Job ID
     * @returns {Promise<Array>}
     */
    getJobAttachments: async (jobId) => {
        try {
            const response = await httpClient.get(`/storage/files?jobId=${jobId}`);
            return response.data?.data || [];

        } catch (error) {
            console.error('Error getting job attachments:', error);
            return [];
        }
    },

    /**
     * Get download URL for a file (signed URL for private buckets)
     * @param {string} filePath - File path in storage
     * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
     * @returns {Promise<string|null>}
     */
    getDownloadUrl: async (filePath, expiresIn = 3600) => {
        try {
            // Backend ใช้ /api/storage/files/:id สำหรับดาวน์โหลด
            // filePath ที่นี่อาจเป็น ID หรือ path — คืน URL ตรงๆ
            return `${httpClient.defaults.baseURL}/storage/files/${filePath}`;
        } catch (error) {
            console.error('Error getting download URL:', error);
            return null;
        }
    },

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @param {number} [maxSizeBytes] - Override max size in bytes (default: global MAX_FILE_SIZE 50MB)
     * @returns {{valid: boolean, error?: string}}
     */
    validateFile: (file, maxSizeBytes) => {
        const effectiveMaxSize = maxSizeBytes || MAX_FILE_SIZE;
        // Check file size
        if (file.size > effectiveMaxSize) {
            return {
                valid: false,
                error: `ไฟล์ขนาดใหญ่เกินไป (สูงสุด ${effectiveMaxSize / (1024 * 1024)}MB)`
            };
        }

        // Check MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
            return {
                valid: false,
                error: `ประเภทไฟล์ไม่รองรับ: ${file.type}`
            };
        }

        // Check file name
        if (file.name.length > 255) {
            return {
                valid: false,
                error: 'ชื่อไฟล์ยาวเกินไป (สูงสุด 255 ตัวอักษร)'
            };
        }

        return { valid: true };
    },

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string}
     */
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file icon based on file type
     * @param {string} mimeType - MIME type
     * @returns {string} - Icon class or emoji
     */
    getFileIcon: (mimeType) => {
        const normalizedMimeType = String(mimeType || '').toLowerCase();
        if (normalizedMimeType.startsWith('image/')) return '🖼️';
        if (normalizedMimeType === 'application/pdf') return '📄';
        if (normalizedMimeType.includes('word')) return '📝';
        if (normalizedMimeType.includes('excel') || normalizedMimeType.includes('spreadsheet')) return '📊';
        if (normalizedMimeType.includes('powerpoint') || normalizedMimeType.includes('presentation')) return '📽️';
        if (normalizedMimeType.includes('zip') || normalizedMimeType.includes('rar')) return '📦';
        if (normalizedMimeType.includes('photoshop') || normalizedMimeType.includes('postscript')) return '🎨';
        return '📎';
    }
};

export default fileUploadService;
