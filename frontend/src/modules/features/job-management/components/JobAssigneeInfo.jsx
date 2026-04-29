import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

/**
 * @file JobAssigneeInfo.jsx
 * @description แสดงข้อมูลผู้รับผิดชอบ (Assignee) ของงาน
 */

export default function JobAssigneeInfo({ job }) {
    const isParentJob = job?.isParent === true || job?.isParent === 1;
    const getAssigneeName = (assignee) => {
        if (!assignee) return null;
        if (typeof assignee === 'string') return assignee.trim() || null;

        return assignee.displayName || assignee.name || [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim() || null;
    };

    const parentAssignees = isParentJob
        ? [...new Set((job.childJobs || []).map((child) => getAssigneeName(child?.assignee)).filter(Boolean))]
        : [];

    if (isParentJob && parentAssignees.length === 0) {
        return null;
    }

    if (!isParentJob && !job?.assignee && !job?.assigneeId) {
        return null;
    }

    const assigneeName = getAssigneeName(job.assignee) || 'ไม่ระบุชื่อ';
    const assigneeRole = job.assignee?.role || 'Team Member';

    return (
        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">
                <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    ผู้รับผิดชอบ (Assignee)
                </div>
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {isParentJob ? (
                    <div className="flex flex-wrap gap-2">
                        {parentAssignees.map((name) => (
                            <span
                                key={name}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                                    {name?.[0]?.toUpperCase() || 'A'}
                                </span>
                                {name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {assigneeName?.[0]?.toUpperCase() || 'A'}
                        </div>

                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{assigneeName}</p>
                            {assigneeRole && (
                                <p className="text-xs text-gray-500">{assigneeRole}</p>
                            )}
                        </div>
                    </div>
                )}
            </dd>
        </div>
    );
}
