/**
 * Parent Job Children List Component
 *
 * Displays all child jobs of a parent job with their current status.
 * Shows completion progress and allows navigation to child jobs.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const ParentJobChildrenList = ({ job }) => {
  // Only show for parent jobs with children
  if (!job || !job.isParent || !job.childJobs || job.childJobs.length === 0) {
    return null;
  }

  const childJobs = job.childJobs;

  // Calculate statistics
  const totalChildren = childJobs.length;
  const completedCount = childJobs.filter(c =>
    c.status === 'completed' || c.status === 'closed'
  ).length;
  const rejectedCount = childJobs.filter(c =>
    c.status === 'rejected' ||
    c.status === 'rejected_by_assignee' ||
    c.status === 'cancelled'
  ).length;
  const inProgressCount = childJobs.filter(c =>
    c.status === 'in_progress' || c.status === 'assigned' || c.status === 'rework'
  ).length;
  const pendingCount = childJobs.filter(c =>
    c.status === 'pending_approval' ||
    c.status === 'pending_level_1' ||
    c.status === 'pending_level_2' ||
    c.status === 'approved' ||
    c.status === 'draft'
  ).length;

  const completionPercentage = Math.round((completedCount / totalChildren) * 100);

  const getStatusConfig = (status) => {
    const statusMap = {
      completed: {
        color: 'border-green-300 bg-green-50',
        badge: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon,
        iconColor: 'text-green-600',
        label: 'เสร็จสมบูรณ์'
      },
      closed: {
        color: 'border-green-300 bg-green-50',
        badge: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon,
        iconColor: 'text-green-600',
        label: 'ปิดงานแล้ว'
      },
      in_progress: {
        color: 'border-blue-300 bg-blue-50',
        badge: 'bg-blue-100 text-blue-800',
        icon: ClockIcon,
        iconColor: 'text-blue-600',
        label: 'กำลังดำเนินการ'
      },
      assigned: {
        color: 'border-purple-300 bg-purple-50',
        badge: 'bg-purple-100 text-purple-800',
        icon: ClockIcon,
        iconColor: 'text-purple-600',
        label: 'รับงานแล้ว'
      },
      rework: {
        color: 'border-orange-300 bg-orange-50',
        badge: 'bg-orange-100 text-orange-800',
        icon: ExclamationCircleIcon,
        iconColor: 'text-orange-600',
        label: 'แก้ไขงาน'
      },
      pending_approval: {
        color: 'border-yellow-300 bg-yellow-50',
        badge: 'bg-yellow-100 text-yellow-800',
        icon: ClockIcon,
        iconColor: 'text-yellow-600',
        label: 'รออนุมัติ'
      },
      rejected: {
        color: 'border-red-300 bg-red-50',
        badge: 'bg-red-100 text-red-800',
        icon: XCircleIcon,
        iconColor: 'text-red-600',
        label: 'ปฏิเสธ'
      },
      rejected_by_assignee: {
        color: 'border-red-300 bg-red-50',
        badge: 'bg-red-100 text-red-800',
        icon: XCircleIcon,
        iconColor: 'text-red-600',
        label: 'ปฏิเสธโดย Assignee'
      },
      cancelled: {
        color: 'border-gray-300 bg-gray-50',
        badge: 'bg-gray-100 text-gray-800',
        icon: XCircleIcon,
        iconColor: 'text-gray-600',
        label: 'ยกเลิก'
      },
      draft: {
        color: 'border-gray-300 bg-gray-50',
        badge: 'bg-gray-100 text-gray-800',
        icon: ClockIcon,
        iconColor: 'text-gray-600',
        label: 'ร่าง'
      },
    };

    return statusMap[status] || {
      color: 'border-gray-300 bg-gray-50',
      badge: 'bg-gray-100 text-gray-800',
      icon: ClockIcon,
      iconColor: 'text-gray-600',
      label: status
    };
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <h3 className="text-base font-semibold text-gray-900">
            รายการงานลูก ({totalChildren} งาน)
          </h3>
        </div>

        {/* Progress badge */}
        <div className="text-sm font-medium text-gray-700">
          {completionPercentage}% เสร็จสมบูรณ์
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 rounded-md bg-green-50 border border-green-200">
          <div className="text-lg font-bold text-green-700">{completedCount}</div>
          <div className="text-xs text-green-600">เสร็จแล้ว</div>
        </div>
        <div className="text-center p-2 rounded-md bg-blue-50 border border-blue-200">
          <div className="text-lg font-bold text-blue-700">{inProgressCount}</div>
          <div className="text-xs text-blue-600">กำลังทำ</div>
        </div>
        <div className="text-center p-2 rounded-md bg-yellow-50 border border-yellow-200">
          <div className="text-lg font-bold text-yellow-700">{pendingCount}</div>
          <div className="text-xs text-yellow-600">รอดำเนินการ</div>
        </div>
        <div className="text-center p-2 rounded-md bg-red-50 border border-red-200">
          <div className="text-lg font-bold text-red-700">{rejectedCount}</div>
          <div className="text-xs text-red-600">ปฏิเสธ/ยกเลิก</div>
        </div>
      </div>

      {/* Child jobs list */}
      <div className="space-y-2">
        {childJobs.map((child) => {
          const config = getStatusConfig(child.status);
          const Icon = config.icon;

          return (
            <Link
              key={child.id}
              to={`/jobs/${child.id}`}
              className={`block rounded-md border p-3 transition-all hover:shadow-md ${config.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">{child.djId}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1">{child.subject}</p>
                    <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                      <span>📋 {child.jobType}</span>
                      {child.assignee && <span>👤 {child.assignee}</span>}
                      {child.deadline && (
                        <span>📅 {new Date(child.deadline).toLocaleDateString('th-TH')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ParentJobChildrenList;
