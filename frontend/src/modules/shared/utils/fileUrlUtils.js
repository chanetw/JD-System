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

export const getFileId = (file) => file?.fileId || file?.file_id || file?.id || null;

export const getFileName = (file, fallback = 'ไฟล์แนบ') =>
    file?.fileName || file?.file_name || file?.name || file?.originalName || file?.title || fallback;

export const getFileMimeType = (file) =>
    String(file?.mimeType || file?.mime_type || file?.mime || file?.type || file?.fileType || file?.file_type || '');

export const isPdfFile = (file) => {
    const mimeType = getFileMimeType(file).toLowerCase();
    const fileName = getFileName(file, '').toLowerCase();
    return mimeType === 'application/pdf' || fileName.endsWith('.pdf');
};

export const getExternalFileUrl = (file) => {
    const rawUrl = file?.publicUrl || file?.url || file?.filePath || file?.file_path || null;
    return rawUrl ? normalizeExternalUrl(rawUrl) : null;
};

export const normalizeFileContract = (file) => {
    const normalizedFile = file || {};
    const fileId = getFileId(normalizedFile);
    const filePath = normalizedFile.filePath || normalizedFile.file_path || null;
    const publicUrl = normalizedFile.publicUrl || normalizedFile.public_url || null;
    const url = normalizeExternalUrl(normalizedFile.url || null);
    const externalUrl = getExternalFileUrl(normalizedFile);
    const rawFileType = String(normalizedFile.fileType || normalizedFile.file_type || '').toLowerCase();
    const derivedFileType = rawFileType || (url && !fileId ? 'link' : 'file');

    return {
        ...normalizedFile,
        fileId,
        name: getFileName(normalizedFile),
        filePath,
        publicUrl,
        url,
        fileType: derivedFileType,
        mimeType: getFileMimeType(normalizedFile) || null,
        sourceJobId: normalizedFile.sourceJobId || normalizedFile.source_job_id || null,
        sourceDjId: normalizedFile.sourceDjId || normalizedFile.source_dj_id || null,
        externalUrl,
    };
};

export const buildStorageFileUrl = (file, action = 'download') => {
    const fileId = getFileId(file);
    if (!fileId) return null;
    const suffix = action === 'view' ? '/view' : '';
    return `/storage/files/${fileId}${suffix}`;
};

export const resolveFileAccess = (file) => {
    const normalized = normalizeFileContract(file);
    const pdf = isPdfFile(normalized);
    const isExternalLink = normalized.fileType === 'link' || (!normalized.fileId && Boolean(normalized.externalUrl));
    const previewPath = normalized.fileId && !isExternalLink
        ? buildStorageFileUrl(normalized, 'view')
        : normalized.externalUrl;
    const downloadPath = normalized.fileId && !isExternalLink
        ? buildStorageFileUrl(normalized, 'download')
        : normalized.externalUrl;

    return {
        fileId: normalized.fileId,
        fileName: normalized.name,
        isPdf: pdf,
        isExternalLink,
        externalUrl: normalized.externalUrl,
        previewPath,
        downloadPath,
    };
};

const openInNewTab = (targetUrl) => {
    if (!targetUrl) return false;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return true;
};

const getBlobUrl = async (path, file) => {
    const response = await httpClient.get(path, { responseType: 'blob' });
    const responseType = response.data?.type || getFileMimeType(file) || 'application/octet-stream';
    const blob = response.data instanceof Blob && response.data.type
        ? response.data
        : new Blob([response.data], { type: responseType });

    return URL.createObjectURL(blob);
};

export const openFilePreview = async (file) => {
    const access = resolveFileAccess(file);
    if (!access.previewPath) return false;

    if (access.isExternalLink) {
        return openInNewTab(String(access.previewPath));
    }

    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) return false;

    try {
        previewWindow.opener = null;
        const blobUrl = await getBlobUrl(String(access.previewPath), file);
        previewWindow.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return true;
    } catch (error) {
        previewWindow.close();
        throw error;
    }
};

export const downloadFile = async (file) => {
    const access = resolveFileAccess(file);
    if (!access.downloadPath) return false;

    if (access.isExternalLink) {
        return openInNewTab(String(access.downloadPath));
    }

    const blobUrl = await getBlobUrl(String(access.downloadPath), file);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = access.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return true;
};
