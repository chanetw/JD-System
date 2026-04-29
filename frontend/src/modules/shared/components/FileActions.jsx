import React from 'react';
import {
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { downloadFile, openFilePreview, resolveFileAccess } from '@shared/utils/fileUrlUtils';

export default function FileActions({
    file,
    onAction,
    className = '',
    buttonClassName = '',
    compact = false,
    stopPropagation = true
}) {
    const access = resolveFileAccess(file);
    if (!access.previewPath && !access.downloadPath) return null;

    const handleAction = async (event, action, runner) => {
        if (stopPropagation) event.stopPropagation();
        onAction?.(file, action === 'preview' ? 'view' : action);
        try {
            await runner(file);
        } catch (error) {
            console.error(`[FileActions] ${action} failed:`, error);
        }
    };

    const baseButtonClass = [
        'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-rose-300',
        buttonClassName
    ].filter(Boolean).join(' ');

    const primaryClass = `${baseButtonClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;
    const secondaryClass = `${baseButtonClass} border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50`;

    if (access.isPdf) {
        return (
            <div className={`flex flex-wrap items-center gap-2 ${className}`}>
                <button
                    type="button"
                    onClick={(event) => handleAction(event, 'preview', openFilePreview)}
                    className={primaryClass}
                    title="ดู PDF"
                >
                    <EyeIcon className="h-4 w-4" />
                    {!compact && 'ดู PDF'}
                </button>
                <button
                    type="button"
                    onClick={(event) => handleAction(event, 'download', downloadFile)}
                    className={secondaryClass}
                    title="ดาวน์โหลด"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {!compact && 'ดาวน์โหลด'}
                </button>
            </div>
        );
    }

    const canPreview = Boolean(access.previewPath);
    const canDownload = Boolean(access.downloadPath && !access.isExternalLink);

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {canPreview && (
                <button
                    type="button"
                    onClick={(event) => handleAction(event, 'preview', openFilePreview)}
                    className={primaryClass}
                    title="เปิดไฟล์"
                >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    {!compact && 'เปิดไฟล์'}
                </button>
            )}
            {canDownload && (
                <button
                    type="button"
                    onClick={(event) => handleAction(event, 'download', downloadFile)}
                    className={secondaryClass}
                    title="ดาวน์โหลด"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {!compact && 'ดาวน์โหลด'}
                </button>
            )}
        </div>
    );
}
