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
                                                {activity.user?.firstName ? `${activity.user.firstName} ${activity.user.lastName}` : 'Unknown User'}
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
        // Job lifecycle
        'job_created': 'สร้างงาน',
        'parent_child_created': 'สร้างงานกลุ่ม (Parent-Child)',
        'draft_saved': 'บันทึกร่างงาน',
        'job_started': 'เริ่มดำเนินการงาน',
        'job_auto_approved': 'อนุมัติอัตโนมัติ',
        'status_updated': 'อัปเดตสถานะ',
        'due_date_adjusted': 'ปรับวันกำหนดส่ง',
        'closed': 'ปิดงาน',
        'parent_job_closed': 'ปิดงานหลัก',
        // Approval
        'job_approved': 'อนุมัติงาน',
        'job_rejected': 'ส่งกลับแก้ไข',
        'approval_requested': 'ส่งเรื่องขออนุมัติ',
        'job_approved_cascade': 'อนุมัติอัตโนมัติ (Cascade)',
        'job_approved_cascade_sequential': 'อนุมัติอัตโนมัติตามลำดับ',
        'approved': 'อนุมัติงาน',
        'rejected': 'ส่งกลับแก้ไข',
        // Assignment
        'assigned': 'มอบหมายงาน',
        'reassigned': 'ย้ายผู้รับผิดชอบ',
        // Completion
        'job_completed': 'ส่งมอบงาน',
        'completed': 'ส่งงาน',
        // Rejection request flow
        'rejection_requested': 'ขอปฏิเสธงาน',
        'rejection_approved': 'อนุมัติคำขอปฏิเสธ',
        'rejection_denied': 'ไม่อนุมัติคำขอปฏิเสธ',
        'job_rejected_by_assignee': 'ผู้รับงานปฏิเสธงาน',
        'assignee_rejection_confirmed': 'ยืนยันการปฏิเสธของผู้รับงาน',
        'assignee_rejection_denied': 'ไม่ยืนยันการปฏิเสธของผู้รับงาน',
        // Draft review
        'draft_submitted': 'ส่ง Draft',
        'draft_approved': 'อนุมัติ Draft',
        'draft_rejected': 'ปฏิเสธ Draft',
        // Rebrief
        'rebrief_requested': 'ขอข้อมูลเพิ่มเติม',
        'rebrief_submitted': 'ส่งข้อมูลเพิ่มเติม',
        'rebrief_accepted': 'รับงานหลัง Rebrief',
        // Comments
        'comment_added': 'แสดงความคิดเห็น',
        'comment_deleted': 'ลบความคิดเห็น',
        // Files
        'file_uploaded': 'อัปโหลดไฟล์',
        // Legacy
        'started': 'เริ่มงาน',
    };
    return map[action] || action;
};

export default JobActivityLog;
