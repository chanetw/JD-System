import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import { formatDateToThai } from '@shared/utils/dateUtils';
import { UserIcon } from '@heroicons/react/24/outline';

const SubJobsList = ({ jobs }) => {
    if (!jobs || jobs.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                <p className="text-gray-500">ไม่มีงานย่อย</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {jobs.map((job) => (
                    <li key={job.id}>
                        <Link to={`/jobs/${job.id}`} className="block hover:bg-gray-50">
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                        {job.djId} {job.subject}
                                    </p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <Badge status={job.status} />
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            <UserIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                                            {job.assignee?.displayName || 'Unassigned'}
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
