/**
 * Job Chain Status Component
 *
 * Displays the status of sequential job chains (A → B → C).
 * Shows previous job, current job, and next job in the chain.
 */

import React from 'react';
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const JobChainStatus = ({ job }) => {
  // Only show for jobs that are part of a chain
  if (!job || (!job.previousJobId && !job.nextJobId)) {
    return null;
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'เสร็จสมบูรณ์' },
      closed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'ปิดงานแล้ว' },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: null, label: 'กำลังดำเนินการ' },
      assigned: { color: 'bg-purple-100 text-purple-800', icon: null, label: 'รับงานแล้ว' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', icon: null, label: 'รออนุมัติ' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: 'ปฏิเสธ' },
      rejected_by_assignee: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: 'ปฏิเสธโดย Assignee' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon, label: 'ยกเลิก' },
      draft: { color: 'bg-gray-100 text-gray-800', icon: null, label: 'ร่าง' },
    };

    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: null, label: status };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
        {Icon && <Icon className="mr-1 h-3 w-3" />}
        {config.label}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-center mb-3">
        <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">งานต่อเนื่อง (Job Chain)</h3>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto">
        {/* Previous Job */}
        {job.previousJob && (
          <>
            <div className="flex-shrink-0 rounded-md border border-gray-300 bg-white p-3 shadow-sm min-w-[200px]">
              <div className="text-xs text-gray-500 mb-1">งานก่อนหน้า</div>
              <div className="font-medium text-sm text-gray-900 mb-1">{job.previousJob.djId}</div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-1">{job.previousJob.subject}</div>
              {getStatusBadge(job.previousJob.status)}
            </div>
            <ArrowRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </>
        )}

        {/* Current Job */}
        <div className="flex-shrink-0 rounded-md border-2 border-purple-500 bg-purple-100 p-3 shadow-md min-w-[200px]">
          <div className="text-xs text-purple-700 font-semibold mb-1">งานปัจจุบัน</div>
          <div className="font-semibold text-sm text-gray-900 mb-1">{job.djId}</div>
          <div className="text-xs text-gray-700 mb-2 line-clamp-1">{job.subject}</div>
          {getStatusBadge(job.status)}
        </div>

        {/* Next Job */}
        {job.nextJob && (
          <>
            <ArrowRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-shrink-0 rounded-md border border-gray-300 bg-white p-3 shadow-sm min-w-[200px]">
              <div className="text-xs text-gray-500 mb-1">งานถัดไป</div>
              <div className="font-medium text-sm text-gray-900 mb-1">{job.nextJob.djId}</div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-1">{job.nextJob.subject}</div>
              {getStatusBadge(job.nextJob.status)}
            </div>
          </>
        )}
      </div>

      {/* Chain info */}
      <div className="mt-3 text-xs text-gray-600">
        <p>
          {job.previousJobId && !job.nextJobId && '📍 งานสุดท้ายในสายงาน'}
          {!job.previousJobId && job.nextJobId && '📍 งานแรกในสายงาน'}
          {job.previousJobId && job.nextJobId && '📍 งานกลางสายงาน'}
        </p>
        {job.status === 'cancelled' && job.cancellationReason && (
          <p className="mt-1 text-red-600">
            ⚠️ เหตุผลยกเลิก: {job.cancellationReason}
          </p>
        )}
      </div>
    </div>
  );
};

export default JobChainStatus;
