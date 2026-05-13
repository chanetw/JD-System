import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WORK_STATUS_LABEL } from '@shared/constants/jobStatus';

const isDone = (status) => status === 'completed' || status === 'closed';

const REJECTED_STATUS_SET = new Set([
    'rejected',
    'rejected_by_assignee',
    'assignee_rejected'
]);

const DOT_COLOR = {
    completed:          'bg-emerald-400 border-emerald-500',
    closed:             'bg-emerald-400 border-emerald-500',
    in_progress:        'bg-blue-400 border-blue-500',
    assigned:           'bg-violet-400 border-violet-500',
    approved:           'bg-lime-400 border-lime-500',
    pending_dependency: 'bg-amber-400 border-amber-500',
    assignee_rejected:  'bg-orange-400 border-orange-500',
    rejected:           'bg-rose-400 border-rose-500',
    rejected_by_assignee: 'bg-rose-400 border-rose-500',
    cancelled:          'bg-slate-300 border-slate-400',
    partially_completed: 'bg-amber-300 border-amber-400',
};

const TERMINAL_STATUS_SET = new Set([
    'completed',
    'closed',
    'rejected',
    'rejected_by_assignee',
    'cancelled',
    'partially_completed'
]);

const getStatusLabel = (status) => {
    if (!status) return '-';
    return WORK_STATUS_LABEL[status] || status.replace(/_/g, ' ');
};

const getStatusPillClassName = (status) => {
    if (status === 'completed' || status === 'closed') {
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
    if (status === 'rejected' || status === 'rejected_by_assignee') {
        return 'bg-rose-50 text-rose-600 border-rose-200';
    }
    if (status === 'cancelled') {
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
    if (status === 'assignee_rejected' || status === 'partially_completed') {
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return 'bg-blue-50 text-blue-700 border-blue-200';
};

const getMiniChainDisplayStatus = ({ chainJobs, index, currentIndex }) => {
    const currentJobStatus = chainJobs?.[Math.max((currentIndex || 1) - 1, 0)]?.status;
    const isImmediatePredecessor = index === Math.max((currentIndex || 1) - 2, -1);
    const rawStatus = chainJobs?.[index]?.status;

    // When current chained job is rejected, show the immediate predecessor as rejected in mini chain.
    if (isImmediatePredecessor && REJECTED_STATUS_SET.has(currentJobStatus) && isDone(rawStatus)) {
        return 'rejected';
    }

    return rawStatus;
};

const MiniJobChain = ({ job }) => {
    const navigate = useNavigate();
    const chain = job?.chain;

    if (!chain || !Array.isArray(chain.jobs) || chain.jobs.length <= 1) return null;

    const currentIndex = chain.currentIndex ?? (chain.jobs.findIndex(j => j.isCurrent) + 1);

    return (
        <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">ลำดับ Chain</p>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    {currentIndex} / {chain.total}
                </span>
            </div>

            <div className="space-y-0">
                {chain.jobs.map((chainJob, index) => {
                    const position = index + 1;
                    const isCurrent = position === currentIndex;
                    const isPast = position < currentIndex;
                    const isLast = index === chain.jobs.length - 1;
                    const displayStatus = getMiniChainDisplayStatus({ chainJobs: chain.jobs, index, currentIndex });
                    const hasFinalStatus = TERMINAL_STATUS_SET.has(displayStatus);
                    const dotColor = DOT_COLOR[displayStatus] || 'bg-slate-300 border-slate-400';
                    const statusLabel = getStatusLabel(displayStatus);
                    const statusPillClassName = getStatusPillClassName(displayStatus);

                    return (
                        <div key={chainJob.id} className={`flex gap-3 ${position > currentIndex && !hasFinalStatus ? 'opacity-40' : ''}`}>
                            {/* Dot + vertical connector */}
                            <div className="flex flex-col items-center flex-shrink-0">
                                {isCurrent ? (
                                    <div className="w-6 h-6 rounded-full bg-rose-500 border-2 border-rose-300 ring-2 ring-rose-100 flex items-center justify-center shadow-sm">
                                        <span className="text-white text-[9px] font-bold">▶</span>
                                    </div>
                                ) : (isPast || hasFinalStatus) ? (
                                    <button
                                        onClick={() => navigate(`/jobs/${chainJob.id}`)}
                                        title={`ไปงาน ${chainJob.djId}`}
                                        className={`w-5 h-5 rounded-full border-2 ${dotColor} cursor-pointer hover:opacity-75 transition-opacity flex items-center justify-center`}
                                    >
                                        {isDone(displayStatus) ? (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                        ) : (
                                            <span className="text-[10px] font-bold text-white">!</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-slate-300" />
                                )}
                                {/* Connector: turn red if this job is a rejected predecessor */}
                                {!isLast && (
                                    <div
                                        className={
                                            (() => {
                                                // If this job is a rejected predecessor, connector below is red
                                                if (REJECTED_STATUS_SET.has(displayStatus)) {
                                                    return 'w-0.5 h-6 mt-0.5 bg-rose-300';
                                                }
                                                // Otherwise, use existing logic
                                                return (isPast || hasFinalStatus)
                                                    ? 'w-0.5 h-6 mt-0.5 bg-emerald-200'
                                                    : 'w-0.5 h-6 mt-0.5 bg-slate-200';
                                            })()
                                        }
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-3'} -mt-0.5`}>
                                {isCurrent ? (
                                    <>
                                        <p className="text-xs font-bold text-rose-700 leading-tight">
                                            {chainJob.djId}{' '}
                                            <span className="text-[9px] text-rose-400 font-normal">← คุณ</span>
                                        </p>
                                        {chainJob.jobType && (
                                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{chainJob.jobType}</p>
                                        )}
                                        <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${statusPillClassName}`}>
                                            {statusLabel}
                                        </span>
                                    </>
                                ) : (isPast || hasFinalStatus) ? (
                                    <button
                                        onClick={() => navigate(`/jobs/${chainJob.id}`)}
                                        className="text-left w-full hover:opacity-75 cursor-pointer transition-opacity"
                                    >
                                        <p className={`text-xs font-semibold leading-tight ${isDone(displayStatus) ? 'text-emerald-700' : 'text-rose-700'}`}>{chainJob.djId}</p>
                                        {chainJob.jobType && (
                                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{chainJob.jobType}</p>
                                        )}
                                        <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${statusPillClassName}`}>
                                            {statusLabel}
                                        </span>
                                    </button>
                                ) : (
                                    <>
                                        <p className="text-xs font-medium text-slate-500 leading-tight">{chainJob.djId}</p>
                                        {chainJob.jobType && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{chainJob.jobType}</p>
                                        )}
                                        <span className="text-[9px] bg-slate-50 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                            รอ
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniJobChain;
