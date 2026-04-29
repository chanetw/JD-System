import httpClient from '@shared/services/httpClient';

export const normalizeExternalUrl = (value) => {
    if (!value) return null;
    const normalizedValue = String(value).trim();
    if (!normalizedValue) return null;
    if (normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://') || normalizedValue.startsWith('/')) {
        return normalizedValue;
    }
    return `https://${normalizedValue}`;
};

export const getFileId = (file) => file?.fileId || file?.id || null;

export const getFileName = (file, fallback = 'ไฟล์แนบ') =>
    file?.fileName || file?.file_name || file?.name || file?.originalName || fallback;

export const getFileMimeType = (file) =>
    String(file?.mimeType || file?.mime_type || file?.fileType || file?.file_type || '');

export const isPdfFile = (file) => {
    const mimeType = getFileMimeType(file).toLowerCase();
    const fileName = getFileName(file, '').toLowerCase();
    return mimeType === 'application/pdf' || fileName.endsWith('.pdf');
};

export const getExternalFileUrl = (file) => {
    const rawUrl = file?.publicUrl || file?.url || file?.filePath || file?.file_path || null;
    return rawUrl ? normalizeExternalUrl(rawUrl) : null;
};

export const buildStorageFileUrl = (file, action = 'download') => {
    const fileId = getFileId(file);
    if (!fileId) return null;
    const suffix = action === 'view' ? '/view' : '';
    return `/storage/files/${fileId}${suffix}`;
};

export const resolveFileAccess = (file) => {
    const fileId = getFileId(file);
    const externalUrl = getExternalFileUrl(file);
    const pdf = isPdfFile(file);
    const isExternalLink = file?.fileType === 'link' || file?.file_type === 'link' || Boolean(file?.url);

    return {
        fileId,
        fileName: getFileName(file),
        isPdf: pdf,
        isExternalLink,
        externalUrl,
        previewPath: fileId && !isExternalLink ? buildStorageFileUrl(file, 'view') : externalUrl,
        downloadPath: fileId && !isExternalLink ? buildStorageFileUrl(file, 'download') : externalUrl,
    };
};

export const openFilePreview = async (file) => {
    const access = resolveFileAccess(file);
    if (!access.previewPath) return false;

    const previewPath = String(access.previewPath);
    if (access.isExternalLink || previewPath.startsWith('http') || previewPath.startsWith('/uploads/')) {
        window.open(access.previewPath, '_blank', 'noopener,noreferrer');
        return true;
    }

    const previewWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    const response = await httpClient.get(access.previewPath, { responseType: 'blob' });
    const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || getFileMimeType(file) || 'application/octet-stream'
    });
    const blobUrl = window.URL.createObjectURL(blob);
    if (previewWindow) {
        previewWindow.location.href = blobUrl;
    } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    return true;
};

export const downloadFile = async (file) => {
    const access = resolveFileAccess(file);
    if (!access.downloadPath) return false;

    const downloadPath = String(access.downloadPath);
    if (access.isExternalLink || downloadPath.startsWith('http') || downloadPath.startsWith('/uploads/')) {
        window.open(access.downloadPath, '_blank', 'noopener,noreferrer');
        return true;
    }

    const response = await httpClient.get(access.downloadPath, { responseType: 'blob' });
    const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || getFileMimeType(file) || 'application/octet-stream'
    });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = access.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
};
