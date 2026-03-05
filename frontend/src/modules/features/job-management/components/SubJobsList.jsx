import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import { formatDateToThai } from '@shared/utils/dateUtils';
import { UserIcon } from '@heroicons/react/24/outline';

const SubJobsList = ({ jobs }) => {
    if (!jobs || jobs.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-400 border-dashed">
                <p className="text-gray-500">ไม่มีงานย่อย</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-400">
                {jobs.map((job) => (
                    <li key={job.id}>
                        <Link to={`/jobs/${job.id}`} className="block hover:bg-gray-50">
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-indigo-600 truncate">
                                            {job.djId} {job.subject}
                                        </p>

                                        {/* 📦 Show Sub-items as Badges */}
                                        {job.items && job.items.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {job.items.map((item, idx) => (
                                                    <span
                                                        key={item.id || idx}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100"
                                                    >
                                                        📦 {item.name} {(item.quantity !== null && item.quantity !== undefined) ? `(${item.quantity} ชิ้น)` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-2 flex-shrink-0 flex items-start">
                                        <Badge status={job.status} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            <UserIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                                            {job.assignee?.firstName || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                        <p>
                                            กำหนดส่ง <time dateTime={job.dueDate}>{formatDateToThai(job.dueDate)}</time>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SubJobsList;
