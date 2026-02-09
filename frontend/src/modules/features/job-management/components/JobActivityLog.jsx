import React, { useEffect, useState } from 'react';
import { api } from '@shared/services/apiService';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const JobActivityLog = ({ jobId }) => {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (jobId) {
            loadActivities();
        }
    }, [jobId]);

    const loadActivities = async () => {
        setIsLoading(true);
        try {
            const result = await api.getJobActivities(jobId);
            if (result.success) {
                setActivities(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Failed to load activities:', err);
            setError('ไม่สามารถโหลดประวัติกิจกรรมได้');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="text-red-500 text-sm p-4 text-center">{error}</div>;
    if (activities.length === 0) return <div className="text-gray-500 text-sm p-4 text-center">ยังไม่มีกิจกรรม</div>;

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {activities.map((activity, activityIdx) => (
                    <li key={activity.id}>
                        <div className="relative pb-8">
                            {activityIdx !== activities.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                        {activity.user?.avatarUrl ? (
                                            <img
                                                className="h-8 w-8 rounded-full"
                                                src={activity.user.avatarUrl}
                                                alt=""
                                            />
                                        ) : (
                                            <UserIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                                        )}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            <span className="font-medium text-gray-900">
                                                {activity.user?.displayName || 'Unknown User'}
                                            </span>{' '}
                                            {translateAction(activity.action)}
                                        </p>
                                        {activity.message && (
                                            <p className="mt-1 text-sm text-gray-600 italic">
                                                "{activity.message}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        <div className="flex items-center">
                                            <ClockIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                            <time dateTime={activity.createdAt}>
                                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: th })}
                                            </time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Helper function to translate actions
const translateAction = (action) => {
    const map = {
        'job_created': 'สร้างงาน',
        'status_updated': 'อัปเดตสถานะ',
        'comment_added': 'แสดงความคิดเห็น',
        'comment_deleted': 'ลบความคิดเห็น',
        'file_uploaded': 'อัปโหลดไฟล์',
        'assigned': 'มอบหมายงาน',
        'reassigned': 'ย้ายงาน',
        'approved': 'อนุมัติงาน',
        'rejected': 'ส่งกลับแก้ไข',
        'started': 'เริ่มงาน',
        'completed': 'ส่งงาน',
        'closed': 'ปิดงาน'
    };
    return map[action] || action;
};

export default JobActivityLog;
