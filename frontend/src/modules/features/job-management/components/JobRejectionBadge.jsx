/**
 * @file JobRejectionBadge.jsx
 * @description แสดง rejection status พร้อมแยกประเภทการปฏิเสธ
 */

import React from 'react';
import {
  XCircleIcon,
  LinkIcon,
  ArrowRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const REJECTION_CONFIG = {
  approver: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    title: '❌ งานถูกปฏิเสธ',
    subtitle: 'Approver ปฏิเสธโดยตรง'
  },
  assignee: {
    icon: UserCircleIcon,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
    title: '🔄 งานถูกส่งกลับ',
    subtitle: 'Assignee ขอปฏิเสธงาน'
  },
  cascade_parent: {
    icon: LinkIcon,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-600',
    title: '🔗 ปฏิเสธอัตโนมัติ (Parent)',
    subtitle: 'ปฏิเสธเนื่องจาก Parent Job ถูกปฏิเสธ'
  },
  cascade_predecessor: {
    icon: ArrowRightIcon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    title: '⛓️ ปฏิเสธอัตโนมัติ (Sequential)',
    subtitle: 'ปฏิเสธเนื่องจากงานก่อนหน้าถูกปฏิเสธ'
  }
};

export default function JobRejectionBadge({ job }) {
  // Early return if not rejected
  if (job?.status !== 'rejected') {
    return null;
  }

  // Determine rejection type (default to 'approver' if not specified)
  const rejectionType = job.rejectionSource || 'approver';
  const config = REJECTION_CONFIG[rejectionType] || REJECTION_CONFIG.approver;
  const Icon = config.icon;

  return (
    <div className={`rounded-lg p-4 border ${config.bgColor} ${config.borderColor}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Icon className={`w-6 h-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h4 className={`font-semibold ${config.textColor} mb-1`}>
            {config.title}
          </h4>
          <p className="text-sm text-gray-600">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Rejection Details */}
      <div className="ml-9 space-y-2">
        {/* Reason */}
        {job.rejectionComment && (
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">เหตุผล:</p>
            <p className="text-sm text-gray-700 bg-white/50 rounded px-3 py-2">
              {job.rejectionComment}
            </p>
          </div>
        )}

        {/* Rejected By & Time */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {job.rejectedBy && (
            <span>
              ปฏิเสธโดย: <strong>{job.rejectedBy.firstName} {job.rejectedBy.lastName}</strong>
            </span>
          )}
          {job.rejectedAt && (
            <span>
              เมื่อ: {new Date(job.rejectedAt).toLocaleString('th-TH')}
            </span>
          )}
        </div>

        {/* Parent Job Link (for cascade_parent) */}
        {rejectionType === 'cascade_parent' && job.parentJob && (
          <div className={`flex items-center gap-2 text-xs ${config.textColor} mt-3 p-2 bg-white/70 rounded`}>
            <LinkIcon className="w-4 h-4" />
            <span>
              งานนี้ถูกปฏิเสธอัตโนมัติเนื่องจาก Parent Job
              <a
                href={`/jobs/${job.parentJobId}`}
                className="font-semibold underline ml-1 hover:opacity-70"
              >
                "{job.parentJob.subject}"
              </a> ถูกปฏิเสธ
            </span>
          </div>
        )}

        {/* Predecessor Job Link (for cascade_predecessor) */}
        {rejectionType === 'cascade_predecessor' && job.predecessorJob && (
          <div className={`flex items-center gap-2 text-xs ${config.textColor} mt-3 p-2 bg-white/70 rounded`}>
            <ArrowRightIcon className="w-4 h-4" />
            <span>
              งานนี้ถูกปฏิเสธอัตโนมัติเนื่องจากงานก่อนหน้า
              <a
                href={`/jobs/${job.predecessorId}`}
                className="font-semibold underline ml-1 hover:opacity-70"
              >
                "{job.predecessorJob.subject}"
              </a> ถูกปฏิเสธ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
