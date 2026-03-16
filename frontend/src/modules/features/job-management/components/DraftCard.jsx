/**
 * @file DraftCard.jsx
 * @description Component แสดง Draft ที่ Assignee ส่งมาให้ตรวจสอบ
 * - แสดงรายการ Draft แต่ละครั้ง พร้อม link + หมายเหตุ + วันที่
 * - บันทึก read log เมื่อ "คลิก link" เท่านั้น (ไม่ใช่ page load)
 * - แสดงสถานะการอ่านของ Requester สำหรับ Assignee/Admin
 */

import React, { useCallback, useState } from 'react';
import { DocumentTextIcon, LinkIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import DraftReadStatus from './DraftReadStatus';
import DraftApprovalModal from './DraftApprovalModal';
import { draftReadLogService } from '@shared/services/modules/draftReadLogService';

export default function DraftCard({ job, currentUser, onSuccess }) {
    if (!job || job.status !== 'draft_review') return null;

    const [showApprovalModal, setShowApprovalModal] = useState(false);

    const isRequester = job.requesterId === currentUser?.id;
    const isAssignee = job.assigneeId === currentUser?.id;
    const userRoles = currentUser?.roles || (currentUser?.roleName ? [currentUser.roleName] : []);
    const normalizedRoles = userRoles.map(r => (typeof r === 'string' ? r : r?.name || '').toLowerCase());
    const isAdminOrManager = normalizedRoles.some(r => ['admin', 'manager'].includes(r));
    const canSeeReadStatus = isAssignee || isAdminOrManager;

    // Parse draftFiles — รองรับ array หรือ JSON string
    let draftFiles = [];
    if (Array.isArray(job.draftFiles)) {
        draftFiles = job.draftFiles;
    } else if (typeof job.draftFiles === 'string') {
        try {
            const parsed = JSON.parse(job.draftFiles);
            if (Array.isArray(parsed)) draftFiles = parsed;
        } catch (e) {
            draftFiles = [];
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handleLinkClick = useCallback(() => {
        draftReadLogService.recordRead(job.id)
            .then(r => r?.success && console.log('[DraftCard] ✅ Read log recorded'))
            .catch(err => console.warn('[DraftCard] ⚠️ Could not record read log:', err));
    }, [job.id]);

    const getHref = (url) => {
        if (!url) return '#';
        return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    };

    return (
        <div className="bg-white rounded-xl border border-blue-300 shadow-sm mb-6">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-gray-900">Draft ที่ส่งมา</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        รอตรวจสอบ
                    </span>
                </div>
                {job.draftCount > 0 && (
                    <span className="text-xs text-gray-500">
                        ส่งมาแล้ว <span className="font-semibold text-blue-600">{job.draftCount}</span> ครั้ง
                    </span>
                )}
            </div>

            <div className="p-6 space-y-5">
                {draftFiles.length > 0 ? (
                    draftFiles.map((file, idx) => {
                        const isLatest = idx === draftFiles.length - 1;
                        const draftNum = idx + 1;
                        return (
                            <div key={idx} className={`rounded-lg border ${isLatest ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-gray-50/40'} overflow-hidden`}>
                                {/* Draft entry header */}
                                <div className="px-4 py-2.5 flex items-center justify-between border-b border-dashed border-gray-200">
                                    <span className={`text-sm font-semibold ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                                        Draft ครั้งที่ {draftNum}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {file.submittedAt && (
                                            <span className="text-xs text-gray-400">{formatDate(file.submittedAt)}</span>
                                        )}
                                        {isLatest && (
                                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">ล่าสุด</span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 space-y-3">
                                    {/* Link */}
                                    {file.url ? (
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
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">ไม่มีลิงก์ Draft</p>
                                    )}

                                    {/* Note */}
                                    {file.note && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                            <p className="whitespace-pre-wrap">{file.note}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Assignee ส่ง Draft มาแล้ว แต่ไม่ได้แนบลิงก์</p>
                        {job.draftSubmittedAt && (
                            <p className="text-xs mt-1">ส่งเมื่อ {formatDate(job.draftSubmittedAt)}</p>
                        )}
                    </div>
                )}

                {/* Action Buttons — แสดงเฉพาะ Requester */}
                {isRequester && (
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
                {canSeeReadStatus && (
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
