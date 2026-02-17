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
    onOpenExtendModal // เพิ่ม callback สำหรับ Extend Modal
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

        let canApprove = false;
        if (isPending && job.flowSnapshot) {
            const currentLevelConfig = job.flowSnapshot.levels.find(l => l.level === job.currentLevel);
            if (currentLevelConfig && currentLevelConfig.approvers) {
                canApprove = currentLevelConfig.approvers.some(a => a.id === currentUser?.id) ||
                    currentLevelConfig.approvers.some(a => a.userId === currentUser?.id);
            }
        }
        if (isAdmin && isPending) canApprove = true;

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
                        {users.filter(u => u.roles?.includes('Assignee') || u.roles?.includes('senior_designer') || u.roles?.includes('creative')).map(u => (
                            <option key={u.id} value={u.id}>
                                {u.displayName || `${u.firstName} ${u.lastName}`}
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
        if (job.status !== 'assigned' && job.status !== 'in_progress') return null;

        // Technically anyone can see this panel in the old code if status matches, 
        // but typically only assignee or admin buttons work. 
        // The buttons themselves calls API which checks permission.
        // We'll show to everyone as per old UI, but maybe disable if not assignee?
        // Old UI didn't disable button render based on user, it just showed "การดำเนินการของผู้รับงาน"

        return (
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm p-6 mb-6`}>
                <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการของผู้รับงาน</h2>

                {(job.status === 'in_progress' || job.status === 'assigned') && (
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
                        {/* Extend Button */}
                        {onOpenExtendModal && (
                            <button
                                onClick={onOpenExtendModal}
                                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors text-sm"
                            >
                                🔄 ขอ Extend งาน
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // 4. Assignee Rejection Confirmation (Approver)
    const renderAssigneeRejectionConfirm = () => {
        if (job.status !== 'assignee_rejected') return null;

        return (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 bg-red-50 mb-6">
                <h2 className="font-semibold text-red-800 mb-2">ผู้รับงานปฏิเสธงาน</h2>
                <p className="text-sm text-red-700 mb-2">
                    เหตุผล: {job.rejectionComment || 'ไม่ระบุ'}
                </p>
                <button
                    onClick={onConfirmAssigneeRejection}
                    className="w-full py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <XMarkIcon className="w-5 h-5" />
                    ยืนยันปฏิเสธงาน
                </button>
            </div>
        );
    };

    // 5. Close/Revision Actions (Requester)
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
            {renderCloseActions()}
        </>
    );
};

export default JobActionPanel;
