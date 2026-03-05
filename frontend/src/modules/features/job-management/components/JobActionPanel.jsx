import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';

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

        console.log('[JobActionPanel] 🔍 Approval Check:', {
            jobStatus: job.status,
            currentLevel: job.currentLevel,
            isPending,
            isPendingStatus,
            isAdmin,
            hasFlowSnapshot: !!job.flowSnapshot,
            currentUserId: currentUser?.id,
            currentUserIdType: typeof currentUser?.id,
            currentUserEmail: currentUser?.email
        });

        let canApprove = false;
        
        // ✅ Admin/Superadmin can approve ALL pending jobs (Superuser mode)
        if (isAdmin && isPendingStatus) {
            canApprove = true;
            console.log('[JobActionPanel] ✅ Admin Superuser - can approve all pending jobs');
        } else if (isPending && job.flowSnapshot) {
            // Normal approver: check if in current level
            const currentLevelConfig = job.flowSnapshot.levels.find(l => l.level === job.currentLevel);
            console.log('[JobActionPanel] 🔍 Current Level Config:', {
                level: job.currentLevel,
                found: !!currentLevelConfig,
                approversCount: currentLevelConfig?.approvers?.length,
                approvers: currentLevelConfig?.approvers?.map(a => ({
                    id: a.id,
                    idType: typeof a.id,
                    userId: a.userId,
                    userIdType: typeof a.userId,
                    name: a.name
                }))
            });
            if (currentLevelConfig && currentLevelConfig.approvers) {
                // ✅ FIX: Use loose equality (==) to handle string vs number comparison
                // Backend may return userId as string '4', currentUser.id is number 4
                canApprove = currentLevelConfig.approvers.some(a => a.id == currentUser?.id) ||
                    currentLevelConfig.approvers.some(a => a.userId == currentUser?.id);

                console.log('[JobActionPanel] ✅ Can Approve Result:', {
                    canApprove,
                    currentUserId: currentUser?.id,
                    approvers: currentLevelConfig.approvers.map(a => a.userId || a.id)
                });
            }
        }

        if (!canApprove) {
            console.log('[JobActionPanel] ❌ Cannot approve - no buttons shown');
            return null;
        }

        console.log('[JobActionPanel] ✅ Can approve - showing buttons');

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
        // Allow assignment if:
        // 1. Job is not yet assigned
        // 2. User is admin or manager
        // Can assign at any job status (pending, pending dependency, etc.) before approval
        if (job.assigneeId) return null; // Already assigned - show reassign instead

        const canAssign = isAdmin || isDeptManager;
        if (!canAssign) return null;

        const handleAssignClick = async () => {
            if (!selectedAssignee) return alert('กรุณาเลือกผู้รับงาน');
            setIsLoading(true);
            try {
                await onManualAssign(job.id, selectedAssignee);
                setSelectedAssignee('');
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="bg-orange-50 border-l-4 border-l-orange-500 rounded-xl p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-orange-800 flex items-center gap-2">
                            <UserIcon className="w-5 h-5" />
                            ต้องมอบหมายงาน (Pending Assignment)
                        </h3>
                        <p className="text-sm text-orange-600 mt-1">
                            งานผ่านการอนุมัติแล้ว แต่ยังต้องเลือกผู้รับผิดชอบ
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <select
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        className="flex-1 px-4 py-3 border border-orange-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={isLoading}
                    >
                        <option value="">-- เลือกผู้รับงาน --</option>
                        {users.filter(u => u.roles?.some(r => ['assignee', 'senior_designer', 'creative'].includes((typeof r === 'string' ? r : r?.name)?.toLowerCase()))).map(u => (
                            <option key={u.id} value={u.id}>
                                {`${u.firstName} ${u.lastName}`}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleAssignClick}
                        disabled={!selectedAssignee || isLoading}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isLoading ? 'กำลังบันทึก...' : 'มอบหมาย'}
                    </button>
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
