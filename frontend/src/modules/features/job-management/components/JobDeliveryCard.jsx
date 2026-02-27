import React from 'react';
import { CheckCircleIcon, LinkIcon, DocumentTextIcon, UserIcon } from '@heroicons/react/24/outline';
import { formatDateToThai } from '@shared/utils/dateUtils';

export default function JobDeliveryCard({ job }) {
    // Show only if job is completed or closed, and has final files or completion info
    if (!['completed', 'closed'].includes(job.status)) return null;

    console.log('[JobDeliveryCard] raw data:', {
        finalFiles: job.finalFiles,
        completedAt: job.completedAt,
        completedBy: job.completedByUser,
        comments: job.comments
    });

    // finalFiles is expected to be an array of objects: { name, url }
    let finalFiles = [];
    if (Array.isArray(job.finalFiles)) {
        finalFiles = job.finalFiles;
    } else if (typeof job.finalFiles === 'string') {
        try {
            finalFiles = JSON.parse(job.finalFiles);
            if (!Array.isArray(finalFiles)) finalFiles = [];
        } catch (e) {
            console.error("Failed to parse finalFiles", e);
        }
    }

    // Find completion comment (usually starts with [ส่งงาน] or [Job Completed])
    const completionComment = job.comments?.find(c =>
        c.comment?.includes('[ส่งงาน]') || c.comment?.includes('[Job Completed]') || c.message?.includes('[Job Completed]')
    );

    const note = completionComment ? (completionComment.comment || completionComment.message)?.replace(/\[(.*?)\]\s*/, '') : '-';

    const completedBy = job.completedByUser?.displayName || job.assignee?.displayName || 'System';
    const completedAt = job.completedAt ? formatDateToThai(new Date(job.completedAt)) : '-';

    // If no files and no note, maybe just a simple badge, but usually we have note at least
    if (finalFiles.length === 0 && !completionComment) return null;

    return (
        <div className="bg-white rounded-xl border border-emerald-400 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                    <h2 className="font-semibold text-gray-900">ผลงานที่ส่งมอบ (Delivered Work)</h2>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                    ส่งเมื่อ: <span className="text-gray-900">{completedAt}</span> • โดย: <span className="text-gray-900">{completedBy}</span>
                </p>
            </div>

            <div className="p-6 space-y-4">
                {/* Note Section */}
                {completionComment && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 border border-gray-200">
                        <div className="flex gap-2 items-start">
                            <DocumentTextIcon className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 mb-1">หมายเหตุการส่งงาน:</span>
                                <p className="whitespace-pre-wrap">{note}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Files / Links Section */}
                {finalFiles.length > 0 && (
                    <div>
                        <span className="block text-sm font-semibold text-gray-500 mb-2">ลิงก์ผลงาน:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {finalFiles.map((file, index) => (
                                <a
                                    key={index}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <LinkIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name || 'ลิงก์ผลงาน'}</p>
                                        <p className="text-xs text-gray-500 truncate">{file.url}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
