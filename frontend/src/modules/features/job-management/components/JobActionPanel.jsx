import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, UserIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const JobActionPanel = ({
    job,
    currentUser,
    users, // for manual assign dropdown
    theme,
    jobRole,
    onApprove,
    onOpenRejectModal,
    onOpenCompleteModal,
    onManualAssign,
    onConfirmClose,
    onRequestRevision,
    onOpenAssigneeRejectModal,
    onConfirmAssigneeRejection,
    onDenyRejection, // เพิ่ม callback สำหรับ Deny Rejection
    onOpenExtendModal, // เพิ่ม callback สำหรับ Extend Modal
    onOpenDraftModal, // ส่ง Draft ให้ตรวจ
    onOpenRebriefModal, // ขอ Rebrief
    onAcceptRebrief, // รับงานหลัง Rebrief
    onOpenSubmitRebriefModal // Requester ส่งข้อมูลเพิ่ม
}) => {
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [assignSuccess, setAssignSuccess] = useState('');

    // Permission Helpers
    // ✅ FIX: Improved role normalization with null safety
    const rawRoles = currentUser?.roles;
    const normalizedRoles = (() => {
        if (!rawRoles) return [];
        if (!Array.isArray(rawRoles)) return [];

        return rawRoles.map(r => {
            if (typeof r === 'string') return r.toLowerCase();
            if (typeof r === 'object' && r !== null) {
                return (r?.roleName || r?.name || '').toLowerCase();
            }
            return '';
        }).filter(Boolean);  // Remove empty strings
    })();

    const isAdmin = normalizedRoles.includes('admin');
    const isDeptManager = normalizedRoles.includes('manager') || normalizedRoles.includes('dept_manager');
    const isApprover = normalizedRoles.includes('approver');
    const isAssignee = normalizedRoles.includes('assignee');

    // 1. Approval Actions
    const renderApprovalActions = () => {
        const isPending = job.currentLevel > 0 && job.currentLevel < 999;
        const isPendingStatus = job.status === 'pending_approval' ||
            job.status?.startsWith('pending_level_') ||
            job.status === 'assignee_rejected';

        let canApprove = false;

        if (isAdmin && isPendingStatus) {
            canApprove = true;
        } else if (isPending && job.flowSnapshot) {
            const currentLevelConfig = job.flowSnapshot.levels.find(l => l.level === job.currentLevel);
            if (currentLevelConfig && currentLevelConfig.approvers) {
                canApprove = currentLevelConfig.approvers.some(a => a.id == currentUser?.id) ||
                    currentLevelConfig.approvers.some(a => a.userId == currentUser?.id);
            }
        }

        if (!canApprove) return null;

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-4">Actions (Level {job.currentLevel})</h2>
                <div className="flex gap-3">
                    <button
                        onClick={onApprove}
                        className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <CheckIcon className="w-5 h-5" />
                        Approve & Next
                    </button>
                    <button
                        onClick={onOpenRejectModal}
                        className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <XMarkIcon className="w-5 h-5" />
                        Reject / Return
                    </button>
                </div>
            </div>
        );
    };

    // 2. Manual Assignment (Admin/Mgr)
    const renderManualAssignment = () => {
        if (job.assigneeId) return null;

        const canAssign = isAdmin || isDeptManager;
        if (!canAssign) return null;

        const assignableUsers = (users || []).filter(u =>
            u.roles?.some(r => [
                'assignee', 'senior_designer', 'creative'
            ].includes((typeof r === 'string' ? r : r?.name || r?.roleName || '').toLowerCase()))
        );

        const selectedUser = assignableUsers.find(u => String(u.id) === String(selectedAssignee));

        const handleAssignClick = async () => {
            setAssignError('');
            setAssignSuccess('');
            if (!selectedAssignee) {
                setAssignError('กรุณาเลือกผู้รับงาน');
                return;
            }
            setIsLoading(true);
            try {
                const result = await onManualAssign(job.id, selectedAssignee);
                if (result?.success === false) {
                    setAssignError(result.error || 'มอบหมายไม่สำเร็จ');
                } else {
                    setAssignSuccess(`มอบหมายงานให้ ${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''} เรียบร้อยแล้ว`);
                    setSelectedAssignee('');
                }
            } catch (err) {
                setAssignError(err?.message || 'เกิดข้อผิดพลาด');
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="rounded-xl shadow-sm mb-6 overflow-hidden border border-orange-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">ต้องมอบหมายงาน</h3>
                        <p className="text-orange-100 text-xs">งานยังไม่มีผู้รับผิดชอบ กรุณาเลือกผู้ดำเนินการ</p>
                    </div>
                </div>

                {/* Body */}
                <div className="bg-orange-50 p-5 space-y-4">
                    {/* Success Banner */}
                    {assignSuccess && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 text-sm">
                            <CheckCircleIcon className="w-4 h-4 shrink-0" />
                            {assignSuccess}
                        </div>
                    )}

                    {/* Assignee Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">เลือกผู้รับงาน</label>
                        <select
                            value={selectedAssignee}
                            onChange={(e) => { setSelectedAssignee(e.target.value); setAssignError(''); setAssignSuccess(''); }}
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:outline-none transition-colors ${assignError
                                    ? 'border-red-400 focus:ring-red-300'
                                    : 'border-orange-300 focus:ring-orange-400 focus:border-orange-400'
                                }`}
                            disabled={isLoading}
                        >
                            <option value="">-- เลือกผู้ดำเนินการ ({assignableUsers.length} คน) --</option>
                            {assignableUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                    {u.displayName && u.displayName !== `${u.firstName} ${u.lastName}` ? ` (${u.displayName})` : ''}
                                </option>
                            ))}
                        </select>

                        {/* Inline error */}
                        {assignError && (
                            <div className="flex items-center gap-1.5 text-red-600 text-sm">
                                <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                                {assignError}
                            </div>
                        )}
                    </div>

                    {/* Preview + Confirm button */}
                    <div className="flex items-center gap-3">
                        {selectedUser && (
                            <div className="flex-1 flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2">
                                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                                    {(selectedUser.firstName || '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-800 truncate">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </div>
                                </div>
                                <CheckCircleIcon className="w-4 h-4 text-orange-400 ml-auto shrink-0" />
                            </div>
                        )}
                        <button
                            onClick={handleAssignClick}
                            disabled={!selectedAssignee || isLoading}
                            className="shrink-0 px-5 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-orange-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-4 h-4" />
                                    ยืนยันมอบหมาย
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 2b. Reassign Job - MOVED TO SIDEBAR ONLY
    // The reassignment UI is now in the sidebar's "Change" button to avoid duplication
    // This method is kept for reference but returns null
    const renderReassignment = () => {
        return null; // Reassignment is handled via sidebar only
    };

    // 3. Assignee Actions (Start/Complete)
    const renderAssigneeActions = () => {
        // ✅ FIX: Check role first - only assignee or admin can see these buttons
        if (jobRole !== 'assignee' && jobRole !== 'admin') return null;

        const normalStatuses = ['assigned', 'in_progress', 'rework', 'approved', 'correction', 'returned', 'draft_review'];
        const rebriefSubmittedStatus = job.status === 'rebrief_submitted';

        if (!normalStatuses.includes(job.status) && !rebriefSubmittedStatus) return null;

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการของผู้รับงาน</h2>

                {/* Normal Actions */}
                {normalStatuses.includes(job.status) && (
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={onOpenCompleteModal}
                                className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <CheckIcon className="w-5 h-5" />
                                ส่งงาน
                            </button>
                            <button
                                onClick={onOpenAssigneeRejectModal}
                                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <XMarkIcon className="w-5 h-5" />
                                ปฏิเสธงาน
                            </button>
                        </div>

                        {/* Draft & Rebrief Buttons */}
                        <div className="flex gap-3">
                            {onOpenDraftModal && (
                                <button
                                    onClick={onOpenDraftModal}
                                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors text-sm"
                                >
                                    📝 ส่ง Draft ให้ตรวจ
                                </button>
                            )}
                            {onOpenRebriefModal && (
                                <button
                                    onClick={onOpenRebriefModal}
                                    className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-2 transition-colors text-sm"
                                >
                                    🔄 ขอ Rebrief
                                </button>
                            )}
                        </div>

                        {/* Extend Button - Only show after rejection denial */}
                        {onOpenExtendModal && job.rejectionDeniedAt && (
                            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                                <p className="text-xs text-rose-700 mb-2">
                                    💡 คำขอปฏิเสธงานไม่ได้รับอนุมัติ หากต้องการเวลาเพิ่มเติม กรุณาขอ Extend
                                </p>
                                <button
                                    onClick={onOpenExtendModal}
                                    className="w-full py-2 px-4 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors text-sm"
                                >
                                    🔄 ขอ Extend งาน
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Rebrief Submitted - 3 Options */}
                {rebriefSubmittedStatus && (
                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-800">
                                ✅ ผู้สั่งงานส่งข้อมูลเพิ่มเติมมาแล้ว กรุณาตรวจสอบและตัดสินใจ
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={onAcceptRebrief}
                                className="py-3 px-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-1 transition-colors text-sm"
                            >
                                <CheckIcon className="w-4 h-4" />
                                รับงาน
                            </button>
                            <button
                                onClick={onOpenRebriefModal}
                                className="py-3 px-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-1 transition-colors text-sm"
                            >
                                🔄 Rebrief อีก
                            </button>
                            <button
                                onClick={onOpenAssigneeRejectModal}
                                className="py-3 px-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-1 transition-colors text-sm"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                ปฏิเสธ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 4. Assignee Rejection Confirmation (Approver/Requester)
    const renderAssigneeRejectionConfirm = () => {
        if (job.status !== 'assignee_rejected') return null;

        // ✅ Permission Check: Only show to Approver, Requester, or Admin
        // NOT to the assignee who rejected the job
        const isRequester = job.requesterId === currentUser?.id;
        const canApproveRejection = isAdmin || isApprover || isRequester;

        if (!canApproveRejection) return null;

        console.log('[JobActionPanel] 🔍 Assignee Rejection:', {
            status: job.status,
            rejectionComment: job.rejectionComment,
            rejectedAt: job.rejectedAt,
            rejectedBy: job.rejectedBy,
            canApprove: canApproveRejection
        });

        return (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 bg-red-50 mb-6">
                <h2 className="font-semibold text-red-800 mb-2">ผู้รับงานปฏิเสธงาน</h2>
                <p className="text-sm text-red-700 mb-4">
                    <strong>เหตุผล:</strong> {job.rejectionComment || 'ไม่ระบุ'}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onConfirmAssigneeRejection}
                        className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <XMarkIcon className="w-5 h-5" />
                        ยืนยันปฏิเสธงาน
                    </button>
                    <button
                        onClick={onDenyRejection}
                        className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <CheckIcon className="w-5 h-5" />
                        ไม่อนุมัติคำขอ (ให้ทำต่อ)
                    </button>
                </div>
            </div>
        );
    };

    // 5. Rebrief Panel (Requester)
    const renderRebriefPanel = () => {
        if (job.status !== 'pending_rebrief') return null;

        // Check if current user is requester
        const isRequester = job.requesterId === currentUser?.id;
        if (!isRequester && !isAdmin) return null;

        return (
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 bg-orange-50 mb-6">
                <h2 className="font-semibold text-orange-800 mb-2">🔄 ผู้รับงานขอข้อมูลเพิ่มเติม</h2>
                <div className="bg-white border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700 mb-1">
                        <strong>เหตุผล:</strong>
                    </p>
                    <p className="text-sm text-gray-800">
                        {job.rebriefReason || 'ไม่ระบุ'}
                    </p>
                </div>
                <p className="text-sm text-orange-700 mb-4">
                    กรุณาเพิ่มข้อมูลหรือแก้ไข brief แล้วส่งกลับไปยังผู้รับงาน
                </p>
                <button
                    onClick={onOpenSubmitRebriefModal}
                    className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    📤 ส่งข้อมูลเพิ่มเติม
                </button>
            </div>
        );
    };

    // 6. Close/Revision Actions (Requester)
    const renderCloseActions = () => {
        if (job.status !== 'pending_close') return null;

        return (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 bg-amber-50 mb-6">
                <h2 className="font-semibold text-amber-800 mb-2">รอยืนยันการปิดงาน</h2>
                <p className="text-sm text-amber-700 mb-4">
                    ผู้รับงานส่งคำขอปิดงานมาแล้ว กรุณาตรวจสอบผลงานและยืนยัน
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onConfirmClose}
                        className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <CheckIcon className="w-5 h-5" />
                        ยืนยันปิดงาน
                    </button>
                    <button
                        onClick={onRequestRevision}
                        className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <XMarkIcon className="w-5 h-5" />
                        ขอให้แก้ไข
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderApprovalActions()}
            {renderManualAssignment()}
            {renderReassignment()}
            {renderAssigneeActions()}
            {renderAssigneeRejectionConfirm()}
            {renderRebriefPanel()}
            {renderCloseActions()}
        </>
    );
};

export default JobActionPanel;
