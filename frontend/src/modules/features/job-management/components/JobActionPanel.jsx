import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, UserIcon, ExclamationCircleIcon, CheckCircleIcon, TrashIcon, PencilIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ACTION_BUTTON_STYLES } from '@shared/utils/alertHelper';
import ResponsiveSelect from '@shared/components/ResponsiveSelect';
import {
    ASSIGNEE_COMPLETE_ACTION_STATUSES,
    ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES,
    ASSIGNEE_REJECTABLE_STATUSES,
} from '@shared/constants/jobStatus';

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
    onOpenAssigneeRejectModal,
    onConfirmAssigneeRejection,
    onDenyRejection, // เพิ่ม callback สำหรับ Deny Rejection
    onOpenDraftModal, // ส่ง Draft ให้ตรวจ
    onOpenRebriefModal, // ขอ Rebrief
    onAcceptRebrief, // รับงานหลัง Rebrief
    onOpenSubmitRebriefModal, // Requester ส่งข้อมูลเพิ่ม
    onHardDeleteJob, // Admin: ลบงานถาวร
    onEditJobPriority, // Admin: แก้ไข priority
    onAdminExtendDeadline, // Admin: ขยายกำหนดส่ง
    isRejectingByAssignee = false, // Prevent double-submission during reject
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
        // Parent jobs do not go through approval
        if (job.isParent === true || job.isParent === 1) return null;
        if (job.status === 'assignee_rejected') return null;

        const isPending = job.currentLevel > 0 && job.currentLevel < 999;
        const isPendingStatus = job.status === 'pending_approval' ||
            job.status?.startsWith('pending_level_');

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
                        className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm ${ACTION_BUTTON_STYLES.complete}`}
                    >
                        <CheckIcon className="w-5 h-5" />
                        Approve & Next
                    </button>
                    <button
                        onClick={onOpenRejectModal}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm ${ACTION_BUTTON_STYLES.reject}`}
                    >
                        Reject / Return
                    </button>
                </div>
            </div>
        );
    };

    // 2. Manual Assignment (Admin/Mgr)
    const renderManualAssignment = () => {
        // Parent jobs cannot be assigned
        if (job.isParent === true || job.isParent === 1) return null;

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
                        <ResponsiveSelect
                            value={selectedAssignee}
                            onChange={(e) => { setSelectedAssignee(e.target.value); setAssignError(''); setAssignSuccess(''); }}
                            className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:outline-none transition-colors ${assignError
                                    ? 'border-red-400 focus:ring-red-300'
                                    : 'border-orange-300 focus:ring-orange-400 focus:border-orange-400'
                                }`}
                            disabled={isLoading}
                            options={[
                                { value: '', label: `-- เลือกผู้ดำเนินการ (${assignableUsers.length} คน) --` },
                                ...assignableUsers.map(u => ({
                                    value: u.id,
                                    label: `${u.firstName} ${u.lastName}${u.displayName && u.displayName !== `${u.firstName} ${u.lastName}` ? ` (${u.displayName})` : ''}`
                                }))
                            ]}
                        />

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
        // Parent jobs cannot have assignee actions
        if (job.isParent === true || job.isParent === 1) return null;
        // ✅ FIX: Check role first - only assignee or admin can see these buttons
        if (jobRole !== 'assignee' && jobRole !== 'admin') return null;

        const normalStatuses = ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES;
        const pendingRebriefStatus = job.status === 'pending_rebrief';
        const rebriefSubmittedStatus = job.status === 'rebrief_submitted';
        const canComplete = ASSIGNEE_COMPLETE_ACTION_STATUSES.includes(job.status);
        const canRejectByAssignee = ASSIGNEE_REJECTABLE_STATUSES.includes(job.status);

        if (!normalStatuses.includes(job.status) && !pendingRebriefStatus && !rebriefSubmittedStatus) return null;

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการของผู้รับงาน</h2>

                {/* Normal Actions */}
                {normalStatuses.includes(job.status) && (
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={onOpenCompleteModal}
                                disabled={!canComplete}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm ${ACTION_BUTTON_STYLES.complete}`}
                            >
                                <CheckIcon className="w-5 h-5" />
                                ส่งงาน
                            </button>
                            {canRejectByAssignee && (
                                <button
                                    onClick={onOpenAssigneeRejectModal}
                                    disabled={isRejectingByAssignee}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm ${ACTION_BUTTON_STYLES.reject} ${isRejectingByAssignee ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    ปฏิเสธงาน
                                </button>
                            )}
                        </div>

                        {/* Draft & Rebrief Buttons */}
                        <div className="flex gap-3">
                            {onOpenDraftModal && (
                                <button
                                    onClick={onOpenDraftModal}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm ${ACTION_BUTTON_STYLES.draft}`}
                                >
                                    📝 ส่ง Draft ให้ตรวจ
                                </button>
                            )}
                            {onOpenRebriefModal && (
                                <button
                                    onClick={onOpenRebriefModal}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm ${ACTION_BUTTON_STYLES.rebrief}`}
                                >
                                    🔄 ขอ Rebrief
                                </button>
                            )}
                        </div>

                    </div>
                )}

                {pendingRebriefStatus && (
                    <div className="space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-amber-800">
                                งานกำลังรอผู้เปิดงานตอบกลับคำขอ Rebrief หากติดค้างต่อเนื่อง คุณยังสามารถส่งคำขอปฏิเสธงานได้
                            </p>
                        </div>
                        {canRejectByAssignee && (
                            <div className="flex gap-3">
                                <button
                                    onClick={onOpenAssigneeRejectModal}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm ${ACTION_BUTTON_STYLES.reject}`}
                                >
                                    ปฏิเสธงาน
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
                                className={`py-3 px-3 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-sm ${ACTION_BUTTON_STYLES.complete}`}
                            >
                                <CheckIcon className="w-4 h-4" />
                                รับงาน
                            </button>
                            <button
                                onClick={onOpenRebriefModal}
                                className={`py-3 px-3 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-sm ${ACTION_BUTTON_STYLES.rebrief}`}
                            >
                                🔄 Rebrief อีก
                            </button>
                            {canRejectByAssignee && (
                                <button
                                    onClick={onOpenAssigneeRejectModal}
                                    className={`py-3 px-3 rounded-lg font-medium flex items-center justify-center transition-colors text-sm ${ACTION_BUTTON_STYLES.reject}`}
                                >
                                    ปฏิเสธ
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 3b. Assignee Universal Reject Action (ทุกสถานะ Active ที่รองรับการปฏิเสธ)
    const renderAssigneeUniversalRejectAction = () => {
        if (job.isParent === true || job.isParent === 1) return null;
        if (jobRole !== 'assignee' && jobRole !== 'admin') return null;

        const normalStatuses = ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES;
        const pendingRebriefStatus = job.status === 'pending_rebrief';
        const rebriefSubmittedStatus = job.status === 'rebrief_submitted';
        const hasRejectInPrimaryPanel = normalStatuses.includes(job.status) || pendingRebriefStatus || rebriefSubmittedStatus;

        if (hasRejectInPrimaryPanel) return null;
        if (!ASSIGNEE_REJECTABLE_STATUSES.includes(job.status)) return null;

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-2">การดำเนินการของผู้รับงาน</h2>
                <p className="text-sm text-gray-600 mb-4">สถานะปัจจุบันยังเป็นงานที่ดำเนินการอยู่ คุณสามารถส่งคำขอปฏิเสธงานได้</p>
                <button
                    onClick={onOpenAssigneeRejectModal}
                    className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm ${ACTION_BUTTON_STYLES.reject}`}
                >
                    ปฏิเสธงาน
                </button>
            </div>
        );
    };

    // 4. Assignee Rejection Confirmation (Approver/Requester)
    const renderAssigneeRejectionConfirm = () => {
        if (job.isParent === true || job.isParent === 1) return null;
        if (job.status !== 'assignee_rejected') return null;

        // ✅ Permission Check: Only show to Approver, Requester, or Admin
        // NOT to the assignee who rejected the job
        const isRequester = String(job.requesterId) === String(currentUser?.id);
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
                <p className="text-sm text-red-700 mb-2">
                    <strong>เหตุผล:</strong> {job.rejectionComment || 'ไม่ระบุ'}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-amber-800">
                        ⏰ <strong>กำหนด 1 วันทำการ:</strong> ผู้อนุมัติจะต้องตัดสินใจว่า approve
                        คำขอปฏิเสธนี้ หรือไม่ ภายในเวลา 1 วันทำการ
                        หากเกินกำหนดระบบจะยืนยันคำขอปฏิเสธอัตโนมัติ (งานจะถูกปฏิเสธ)
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onConfirmAssigneeRejection}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm ${ACTION_BUTTON_STYLES.reject}`}
                    >
                        ยืนยันปฏิเสธงาน
                    </button>
                    <button
                        onClick={onDenyRejection}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm ${ACTION_BUTTON_STYLES.neutral}`}
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
        if (job.isParent === true || job.isParent === 1) return null;
        if (job.status !== 'pending_rebrief') return null;

        // Check if current user is requester (String comparison เพื่อป้องกัน type mismatch)
        const isRequester = String(job.requesterId) === String(currentUser?.id);
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
        return null;
    };

    // ==========================================
    // Admin Actions: Hard Delete + Edit Priority
    // ==========================================
    const renderAdminActions = () => {
        if (!isAdmin) return null;

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-4">
                    Admin Actions
                </h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onAdminExtendDeadline}
                        className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors shadow-sm"
                    >
                        <ClockIcon className="w-4 h-4" />
                        ขยายกำหนดส่ง (Admin)
                    </button>
                    <button
                        onClick={onEditJobPriority}
                        className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-[#0f4c81] text-white hover:bg-[#0a3a63] transition-colors shadow-sm"
                    >
                        <PencilIcon className="w-4 h-4" />
                        แก้ไข Priority / SLA
                    </button>
                    <button
                        onClick={onHardDeleteJob}
                        className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-[#d92d20] text-white hover:bg-[#b91c1c] transition-colors shadow-sm"
                    >
                        <TrashIcon className="w-4 h-4" />
                        ลบงานถาวร
                    </button>
                </div>
                {job.isParent && (
                    <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        งานนี้เป็นงานพ่วง — การลบจะลบงานลูกทั้งหมดตามไปด้วย
                    </p>
                )}
            </div>
        );
    };

    return (
        <>
            {renderApprovalActions()}
            {renderManualAssignment()}
            {renderReassignment()}
            {renderAssigneeActions()}
            {renderAssigneeUniversalRejectAction()}
            {renderAssigneeRejectionConfirm()}
            {renderRebriefPanel()}
            {renderCloseActions()}
            {renderAdminActions()}
        </>
    );
};

export default JobActionPanel;
