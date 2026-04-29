/**
 * @file DraftCard.jsx
 * @description Component แสดง Draft ที่ Assignee ส่งมาให้ตรวจสอบ
 * - แสดงรายการ Draft แต่ละครั้ง พร้อม link + หมายเหตุ + วันที่
 * - บันทึก read log เมื่อ "คลิก link" เท่านั้น (ไม่ใช่ page load)
 * - แสดงสถานะการอ่านของ Requester สำหรับ Assignee/Admin
 */

import React, { useCallback, useState } from 'react';
import {
    DocumentTextIcon,
    LinkIcon,
    ChatBubbleLeftEllipsisIcon,
    PaperClipIcon,
} from '@heroicons/react/24/outline';
import DraftReadStatus from './DraftReadStatus';
import DraftApprovalModal from './DraftApprovalModal';
import { draftReadLogService } from '@shared/services/modules/draftReadLogService';
import FileActions from '@shared/components/FileActions';
import { getFileName } from '@shared/utils/fileUrlUtils';

export default function DraftCard({ job, currentUser, onSuccess }) {
    const [showApprovalModal, setShowApprovalModal] = useState(false);

    const isDraftReview = job?.status === 'draft_review';
    const jobId = job?.id;

    const isRequester = String(job?.requesterId) === String(currentUser?.id);
    const isAssignee = String(job?.assigneeId) === String(currentUser?.id);
    const userRoles = currentUser?.roles || (currentUser?.roleName ? [currentUser.roleName] : []);
    const normalizedRoles = userRoles.map(r => (typeof r === 'string' ? r : r?.name || '').toLowerCase());
    const isAdminOrManager = normalizedRoles.some(r => ['admin', 'manager'].includes(r));
    const canSeeReadStatus = isAssignee || isAdminOrManager;

    // Parse draftFiles — รองรับ array หรือ JSON string
    let draftFiles = [];
    if (Array.isArray(job?.draftFiles)) {
        draftFiles = job.draftFiles;
    } else if (typeof job?.draftFiles === 'string') {
        try {
            const parsed = JSON.parse(job.draftFiles);
            if (Array.isArray(parsed)) draftFiles = parsed;
        } catch {
            draftFiles = [];
        }
    }

    const hasDraftHistory = draftFiles.length > 0 || Number(job?.draftCount || 0) > 0 || Boolean(job?.draftSubmittedAt);
    const latestDraft = draftFiles.length > 0 ? draftFiles[draftFiles.length - 1] : null;
    const previousDrafts = draftFiles.length > 1 ? draftFiles.slice(0, -1).reverse() : [];
    const latestReview = latestDraft?.review || null;

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatFileSize = (size) => {
        if (!size || Number.isNaN(Number(size))) return null;
        const sizeInMb = Number(size) / (1024 * 1024);
        return sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.max(1, Math.round(Number(size) / 1024))} KB`;
    };

    const recordDraftRead = useCallback(() => {
        if (!isRequester || !jobId) return;

        draftReadLogService.recordRead(jobId)
            .then(r => r?.success && console.log('[DraftCard] ✅ Read log recorded'))
            .catch(err => console.warn('[DraftCard] ⚠️ Could not record read log:', err));
    }, [jobId, isRequester]);

    const handleLinkClick = useCallback(() => {
        recordDraftRead();
    }, [recordDraftRead]);

    const handleAttachmentClick = useCallback((attachment) => {
        recordDraftRead();
        const attachmentId = attachment?.fileId || attachment?.id;

        if (!isRequester || !jobId || !attachmentId) {
            return;
        }

        draftReadLogService.recordAttachmentView(jobId, attachmentId)
            .catch(err => console.warn('[DraftCard] ⚠️ Could not record draft attachment view:', err));
    }, [isRequester, jobId, recordDraftRead]);

    const getHref = (url) => {
        if (!url) return '#';
        return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    };

    const renderAttachmentList = (attachments, {
        label = 'ไฟล์แนบ',
        emptyLabel = null,
        onAttachmentClick = null,
        fallbackText = 'ไฟล์แนบ'
    } = {}) => {
        const safeAttachments = Array.isArray(attachments) ? attachments : [];

        if (safeAttachments.length === 0) {
            return emptyLabel ? <p className="text-sm text-gray-400 italic">{emptyLabel}</p> : null;
        }

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <PaperClipIcon className="w-4 h-4" />
                    <span>{label} {safeAttachments.length} ไฟล์</span>
                </div>
                <ul className="overflow-hidden rounded-lg border border-gray-200 divide-y divide-gray-200 bg-white">
                    {safeAttachments.map((attachment, attachmentIndex) => {
                        const fileName = getFileName(attachment, `${fallbackText} ${attachmentIndex + 1}`);
                        const fileSize = formatFileSize(attachment.fileSize);

                        return (
                            <li key={`${attachment.fileId || attachment.id || fileName}-${attachmentIndex}`} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0 flex items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                        <PaperClipIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900">{fileName}</p>
                                        <p className="truncate text-xs text-gray-400">
                                            {fileSize || 'ไฟล์แนบ Draft'}
                                        </p>
                                    </div>
                                </div>
                                <FileActions
                                    file={attachment}
                                    onAction={() => onAttachmentClick?.(attachment)}
                                    className="justify-end"
                                    compact
                                />
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    const renderReviewSection = (draftEntry) => {
        const review = draftEntry?.review;
        if (!review) return null;

        const isApproved = review.action === 'approve';
        const reviewerName = job?.requester?.name || 'Requester';

        return (
            <div className={`rounded-lg border p-4 space-y-3 ${isApproved ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isApproved ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                            {isApproved ? 'อนุมัติแล้ว' : 'ขอแก้ไขแล้ว'}
                        </span>
                        <span className="text-sm font-medium text-gray-700">ผลการตรวจจาก {reviewerName}</span>
                    </div>
                    {review.reviewedAt && (
                        <span className="text-xs text-gray-500">{formatDate(review.reviewedAt)}</span>
                    )}
                </div>

                {review.reason && (
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="whitespace-pre-wrap">{review.reason}</p>
                    </div>
                )}

                {review.reviewLink && (
                    <a
                        href={getHref(review.reviewLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-md group-hover:bg-rose-500 group-hover:text-white transition-colors flex-shrink-0">
                            <LinkIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">ลิงก์อ้างอิงจากผู้ตรวจ</p>
                            <p className="text-xs text-gray-400 truncate">{review.reviewLink}</p>
                        </div>
                        <span className="text-xs text-rose-500 flex-shrink-0 group-hover:text-rose-700">เปิด →</span>
                    </a>
                )}

                {renderAttachmentList(review.attachments, {
                    label: 'ไฟล์แนบจากผู้ตรวจ',
                    fallbackText: 'Review Attachment'
                })}
            </div>
        );
    };

    const renderDraftEntry = (file, { isLatest = false } = {}) => {
        const draftNum = file?.iteration || 1;

        return (
            <div className={`rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-gray-50/40'} overflow-hidden`}>
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-dashed border-gray-200">
                    <span className={`text-sm font-semibold ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                        Draft ครั้งที่ {draftNum}
                    </span>
                    <div className="flex items-center gap-2">
                        {file?.submittedAt && (
                            <span className="text-xs text-gray-400">{formatDate(file.submittedAt)}</span>
                        )}
                        {isLatest && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">ล่าสุด</span>
                        )}
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {file?.url ? (
                        <a
                            href={getHref(file.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleLinkClick}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all group"
                        >
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-md group-hover:bg-blue-500 group-hover:text-white transition-colors flex-shrink-0">
                                <LinkIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.name || `Draft Link ${draftNum}`}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{file.url}</p>
                            </div>
                            <span className="text-xs text-blue-500 flex-shrink-0 group-hover:text-blue-700">เปิด →</span>
                        </a>
                    ) : null}

                    {renderAttachmentList(file?.attachments, {
                        label: 'ไฟล์แนบ Draft',
                        emptyLabel: null,
                        onAttachmentClick: handleAttachmentClick,
                        fallbackText: `Draft File ${draftNum}`
                    })}

                    {file?.note && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="whitespace-pre-wrap">{file.note}</p>
                        </div>
                    )}

                    {renderReviewSection(file)}

                    {!file?.url && (!Array.isArray(file?.attachments) || file.attachments.length === 0) && !file?.note && (
                        <p className="text-sm text-gray-400 italic">ไม่มีลิงก์หรือไฟล์แนบใน Draft นี้</p>
                    )}
                </div>
            </div>
        );
    };

    if (!job || (!isDraftReview && !hasDraftHistory)) return null;

    const headerBadge = isDraftReview
        ? 'pending'
        : latestReview?.action === 'reject'
            ? 'needs_changes'
            : latestReview?.action === 'approve'
                ? 'reviewed'
                : 'history';

    return (
        <div className="bg-white rounded-xl border border-blue-300 shadow-sm mb-6">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-gray-900">Draft ที่ส่งมา</h2>
                    {headerBadge === 'pending' && (
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            รอตรวจสอบ
                        </span>
                    )}
                    {headerBadge === 'needs_changes' && (
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            มี feedback ล่าสุด
                        </span>
                    )}
                    {headerBadge === 'reviewed' && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                            ตรวจแล้ว
                        </span>
                    )}
                    {headerBadge === 'history' && (
                        <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                            ประวัติ Draft
                        </span>
                    )}
                </div>
                {job.draftCount > 0 && (
                    <span className="text-xs text-gray-500">
                        ส่งมาแล้ว <span className="font-semibold text-blue-600">{job.draftCount}</span> ครั้ง
                    </span>
                )}
            </div>

            <div className="p-6 space-y-5">
                {latestDraft ? (
                    <>
                        {renderDraftEntry(latestDraft, { isLatest: true })}

                        {previousDrafts.length > 0 && (
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                    <p className="text-sm font-semibold text-gray-700">Draft ก่อนหน้า</p>
                                    <p className="text-xs text-gray-500 mt-0.5">เรียงจากรอบล่าสุดย้อนหลัง</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    {previousDrafts.map((file) => (
                                        <div key={file.id || file.iteration}>
                                            {renderDraftEntry(file)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Assignee ส่ง Draft มาแล้ว แต่ยังไม่มีข้อมูลให้แสดง</p>
                        {job.draftSubmittedAt && (
                            <p className="text-xs mt-1">ส่งเมื่อ {formatDate(job.draftSubmittedAt)}</p>
                        )}
                    </div>
                )}

                {/* Action Buttons — แสดงเฉพาะ Requester */}
                {isRequester && isDraftReview && (
                    <div className="pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setShowApprovalModal(true)}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            ตรวจสอบ Draft
                        </button>
                    </div>
                )}

                {/* Read Status — แสดงเฉพาะ Assignee/Admin ว่า Requester อ่านแล้วหรือยัง */}
                {canSeeReadStatus && hasDraftHistory && (
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">สถานะการตรวจสอบ</p>
                        <DraftReadStatus jobId={job.id} isRequester={false} showDetails={true} />
                    </div>
                )}
            </div>

            {/* Draft Approval Modal */}
            <DraftApprovalModal
                isOpen={showApprovalModal}
                onClose={() => setShowApprovalModal(false)}
                job={job}
                onSuccess={onSuccess}
                currentUser={currentUser}
            />
        </div>
    );
}
