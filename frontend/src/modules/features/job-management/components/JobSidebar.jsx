import React from 'react';
import { UserIcon, PencilIcon, CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import Badge from '@shared/components/Badge';

const isParentJob = (job) => job?.isParent === true || job?.isParent === 1;

const getAssigneeName = (assignee) => {
    if (!assignee) return null;
    if (typeof assignee === 'string') return assignee.trim() || null;

    return assignee.displayName || assignee.name || [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim() || null;
};

const getParentJobAssignees = (job) => {
    const childJobs = Array.isArray(job?.childJobs) ? job.childJobs : [];
    const names = childJobs
        .map((child) => getAssigneeName(child?.assignee))
        .filter(Boolean);

    return [...new Set(names)];
};

const JobSidebar = ({ job, currentUser, theme, onReassign }) => {
    if (!job) return null;

    const parentJob = isParentJob(job);
    const isAdmin = currentUser?.roles?.some(r => (typeof r === 'string' ? r : r?.name)?.toLowerCase() === 'admin') || currentUser?.roleName?.toLowerCase() === 'admin';
    const isManager = currentUser?.roles?.some(r => (typeof r === 'string' ? r : r?.name)?.toLowerCase() === 'manager') || currentUser?.roleName?.toLowerCase() === 'manager';
    const isAssignee = String(job.assigneeId) === String(currentUser?.id);
    const parentAssignees = getParentJobAssignees(job);
    const singleAssigneeName = getAssigneeName(job.assignee);
    
    // สถานะที่ไม่ควรให้เปลี่ยนผู้รับผิดชอบ
    const lockedStatuses = ['draft_review', 'completed', 'pending_rebrief', 'rejected', 'closed'];
    const isStatusLocked = lockedStatuses.includes(job.status);
    
    const canReassign = !parentJob && (isAdmin || isManager || isAssignee) && !isStatusLocked;

    return (
        <div className="space-y-6">
            {/* Job Info Card */}
            <div className={`bg-white rounded-xl border ${theme?.borderClass || 'border-gray-400'} shadow-sm`}>
                <div className="px-6 py-4 border-b border-gray-400">
                    <h2 className="font-semibold text-gray-900">รายละเอียดงาน (Job Details)</h2>
                </div>
                <div className="p-6 space-y-4">
                    <InfoRow label="Project" value={job.project?.name || job.project} />
                    <InfoRow label="Job Type" value={job.jobType?.name || job.jobType} subValue={`SLA: ${job.slaWorkingDays || '-'} Working Days`} />

                    <div>
                        <label className="text-sm text-gray-500 block mb-1">Priority</label>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${job.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                job.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {job.priority || 'Normal'}
                        </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="text-sm text-gray-500 block mb-2">ผู้รับผิดชอบ (Assignee)</label>
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg group">
                            {parentJob ? (
                                <div className="w-full">
                                    {parentAssignees.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {parentAssignees.map((name) => (
                                                <span
                                                    key={name}
                                                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700"
                                                >
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                                                        {name?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">ยังไม่มีผู้รับผิดชอบในงานลูก</p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {singleAssigneeName?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{singleAssigneeName || 'Unassigned'}</p>
                                        <p className="text-xs text-gray-500">Graphic Designer</p>
                                    </div>
                                </div>
                            )}
                            {canReassign && (
                                <button
                                    onClick={onReassign}
                                    className="ml-auto px-3 py-1.5 text-xs font-medium bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                    title="ย้ายผู้รับงาน (Reassign)"
                                >
                                    <PencilIcon className="w-3 h-3" />
                                    Change
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="text-sm text-gray-500 block mb-2">ผู้สั่งงาน (Requester)</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(job.requesterName || job.requester)?.[0]?.toUpperCase() || 'R'}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{job.requesterName || job.requester || '-'}</p>
                                <p className="text-xs text-gray-500">Requester</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Chain Visualization */}
            {job.flowSnapshot && (
                <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-6 overflow-hidden">
                    <h2 className="font-semibold text-gray-900 mb-4">เส้นทางการอนุมัติ (Approval Chain)</h2>

                    {(!job.flowSnapshot.levels || job.flowSnapshot.levels.length === 0) ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-400 border-dashed">
                            <p className="text-sm text-gray-500">ไม่ต้องผ่านการอนุมัติ</p>
                            <p className="text-lg font-bold text-green-600 mt-1">✨ อนุมัติ(Auto)</p>
                        </div>
                    ) : (
                        <div className="relative pl-4 space-y-6 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                            {job.flowSnapshot.levels.map((level, i) => {
                                const approval = job.approvals?.find(a => a.stepNumber === level.level);
                                const isPassed = job.currentLevel > level.level;
                                const isCurrent = job.currentLevel === level.level;
                                const isInferredPassed = isPassed && !approval;

                                return (
                                    <div key={i} className="relative flex items-start gap-4">
                                        <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10 
                                            ${isPassed ? 'bg-green-500 ring-green-500' :
                                                isCurrent ? 'bg-rose-500 ring-rose-500' : 'bg-gray-200 ring-gray-300'}`}>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-rose-600' : 'text-gray-500'}`}>
                                                    Level {level.level} : {level.role}
                                                </p>
                                            </div>

                                            {isPassed && (
                                                <div className="flex flex-wrap gap-3 mt-2">
                                                    {approval ? (
                                                        // ✅ ตรวจสอบ: มี approval record จริง → แสดงข้อมูลผู้อนุมัติจริง
                                                        <div className="flex flex-col items-start gap-1 p-2 bg-green-50/50 rounded-lg border border-green-100">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {approval.approver?.firstName
                                                                    ? `${approval.approver.firstName} ${approval.approver.lastName || ''}`
                                                                    : (level.approvers?.[0]?.name || 'ผู้อนุมัติ')}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-100">
                                                                <CheckIcon className="w-3 h-3" /> Approved
                                                                {approval.comment?.includes('Auto-approved') && (
                                                                    <span className="text-[9px] font-bold text-green-800 ml-1">✨ Auto</span>
                                                                )}
                                                            </span>
                                                            {approval.approvedAt && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {new Date(approval.approvedAt).toLocaleDateString('th-TH', {
                                                                        day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : level.approvers && level.approvers.length > 0 ? (
                                                        // Fallback: ไม่มี record → ใช้ template
                                                        level.approvers.map((app, idx) => (
                                                            <div key={idx} className="flex flex-col items-start gap-1 p-2 bg-green-50/50 rounded-lg border border-green-100">
                                                                <span className="text-sm font-semibold text-gray-900">{app.name}</span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-100">
                                                                    <CheckIcon className="w-3 h-3" /> {isInferredPassed ? 'Passed (Legacy)' : 'Approved'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-100 mt-1">
                                                            <CheckIcon className="w-3 h-3" /> {isInferredPassed ? 'Passed (Legacy)' : 'Approved'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {isCurrent && (
                                                <div className="flex flex-wrap gap-3 mt-2">
                                                    {level.approvers && level.approvers.length > 0 ? (
                                                        level.approvers.map((app, idx) => (
                                                            <div key={idx} className="flex flex-col items-start gap-1 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                                                                <span className="text-sm font-semibold text-gray-900">{app.name}</span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-medium border border-rose-100 animate-pulse">
                                                                    <ClockIcon className="w-3 h-3" /> Waiting
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-medium border border-rose-100 animate-pulse mt-1">
                                                            <ClockIcon className="w-3 h-3" /> Waiting for Approval
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {!isPassed && !isCurrent && (
                                                <div className="flex flex-wrap gap-3 mt-2">
                                                    {level.approvers && level.approvers.length > 0 ? (
                                                        level.approvers.map((app, idx) => (
                                                            <div key={idx} className="flex flex-col items-start gap-1 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                                                                <span className="text-sm text-gray-600">{app.name}</span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-medium border border-gray-200">
                                                                    Pending
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-medium border border-gray-200 mt-1">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* End Process */}
                            <div className="relative flex items-start gap-4">
                                <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10 
                                        ${job.currentLevel === 999 ? 'bg-green-600 ring-green-600' : 'bg-gray-200 ring-gray-300'}`}>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">End Process</p>
                                    <p className="text-sm font-medium text-gray-900">Start Job</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper Component
function InfoRow({ label, value, subValue }) {
    return (
        <div>
            <label className="text-sm text-gray-500 block mb-0.5">{label}</label>
            <p className="text-gray-900 font-medium text-sm">{value || '-'}</p>
            {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
        </div>
    );
}

export default JobSidebar;
