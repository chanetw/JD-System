import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

/**
 * @file JobAssigneeInfo.jsx
 * @description แสดงข้อมูลผู้รับผิดชอบ (Assignee) ของงาน
 */

export default function JobAssigneeInfo({ job }) {
    // Early return ถ้าไม่มี assignee
    if (!job?.assignee && !job?.assigneeId) {
        return null;
    }

    const assigneeName = job.assignee?.displayName || job.assignee?.name || 'ไม่ระบุชื่อ';
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
                <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {assigneeName?.[0]?.toUpperCase() || 'A'}
                    </div>

                    {/* Info inline */}
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">{assigneeName}</p>
                        {assigneeRole && (
                            <p className="text-xs text-gray-500">{assigneeRole}</p>
                        )}
                    </div>
                </div>
            </dd>
        </div>
    );
}
