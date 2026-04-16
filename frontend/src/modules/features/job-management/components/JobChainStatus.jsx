/**
 * Job Chain Status Component
 *
 * Displays the status of sequential job chains (A → B → C).
 * Shows previous job, current job, and next job in the chain.
 */

import React from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PauseCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const JobChainStatus = ({ job }) => {
  const chain = job?.chain;

  if (!chain || !Array.isArray(chain.jobs) || chain.jobs.length <= 1) {
    return null;
  }

  const currentIndex = chain.currentIndex || chain.jobs.findIndex(chainJob => chainJob.isCurrent) + 1;

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: CheckCircleIcon, label: 'Completed' },
      closed: { color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: CheckCircleIcon, label: 'Closed' },
      in_progress: { color: 'bg-sky-100 text-sky-800 border border-sky-200', icon: ClockIcon, label: 'In Progress' },
      assigned: { color: 'bg-violet-100 text-violet-800 border border-violet-200', icon: ClockIcon, label: 'Assigned' },
      approved: { color: 'bg-lime-100 text-lime-800 border border-lime-200', icon: CheckCircleIcon, label: 'Ready' },
      pending_dependency: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: PauseCircleIcon, label: 'Waiting' },
      pending_approval: { color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: ClockIcon, label: 'Pending Approval' },
      rejected: { color: 'bg-rose-100 text-rose-800 border border-rose-200', icon: XCircleIcon, label: 'Rejected' },
      rejected_by_assignee: { color: 'bg-rose-100 text-rose-800 border border-rose-200', icon: XCircleIcon, label: 'Rejected' },
      cancelled: { color: 'bg-slate-100 text-slate-700 border border-slate-200', icon: XCircleIcon, label: 'Cancelled' },
      draft: { color: 'bg-slate-100 text-slate-700 border border-slate-200', icon: ExclamationCircleIcon, label: 'Draft' },
    };

    const config = statusMap[status] || {
      color: 'bg-slate-100 text-slate-700 border border-slate-200',
      icon: ExclamationCircleIcon,
      label: status || 'Unknown'
    };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
        {Icon && <Icon className="mr-1 h-3 w-3" />}
        {config.label}
      </span>
    );
  };

  const getCardTone = (position) => {
    if (position < currentIndex) {
      return {
        card: 'border-emerald-200 bg-emerald-50/70',
        eyebrow: 'text-emerald-700',
        accent: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      };
    }

    if (position === currentIndex) {
      return {
        card: 'border-rose-300 bg-rose-50 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]',
        eyebrow: 'text-rose-700',
        accent: 'bg-rose-100 text-rose-700 border border-rose-200'
      };
    }

    return {
      card: 'border-slate-200 bg-slate-50/80',
      eyebrow: 'text-slate-400',
      accent: 'bg-slate-100 text-slate-600 border border-slate-200'
    };
  };

  const getCardLabel = (position) => {
    if (position < currentIndex) return 'งานก่อนหน้า';
    if (position === currentIndex) return 'งานปัจจุบัน';
    return 'งานถัดไป';
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">ลำดับ Chain</h3>
            <p className="mt-1 text-sm text-slate-500">
              งานนี้อยู่ลำดับที่ {currentIndex} จาก {chain.total} ในเชนงานที่ต่อกัน
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            {currentIndex} / {chain.total}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {chain.jobs.map((chainJob, index) => {
            const position = index + 1;
            const tone = getCardTone(position);

            return (
              <React.Fragment key={chainJob.id}>
                <div className={`min-w-[240px] flex-shrink-0 rounded-2xl border p-4 transition-colors ${tone.card}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${tone.eyebrow}`}>
                        {chainJob.djId}
                        {chainJob.isCurrent ? ' < งานของคุณ >' : ''}
                      </div>
                      <p className="mt-1 text-lg font-semibold leading-tight text-slate-900">
                        {chainJob.jobType || chainJob.subject || 'ไม่ระบุชื่องาน'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {chainJob.assignee || 'ยังไม่ระบุผู้รับผิดชอบ'}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.accent}`}>
                      {getCardLabel(position)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {getStatusBadge(chainJob.status)}
                    <span className="text-xs font-medium text-slate-500">Step {position}</span>
                  </div>
                </div>

                {index < chain.jobs.length - 1 && (
                  <ArrowRightIcon
                    className={`h-6 w-6 flex-shrink-0 ${position < currentIndex ? 'text-emerald-400' : position === currentIndex ? 'text-rose-400' : 'text-slate-300'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JobChainStatus;
