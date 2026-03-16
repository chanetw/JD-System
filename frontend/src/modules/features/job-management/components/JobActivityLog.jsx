import React, { useEffect, useState } from 'react';
import { api } from '@shared/services/apiService';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { UserIcon } from '@heroicons/react/24/outline';

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
    if (activities.length === 0) return (
        <div className="text-center py-10 text-gray-400">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm">ยังไม่มีกิจกรรม</p>
        </div>
    );

    // Group activities by date (YYYY-MM-DD)
    const grouped = activities.reduce((acc, activity) => {
        const dateKey = new Date(activity.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(activity);
        return acc;
    }, {});

    const groupKeys = Object.keys(grouped);

    return (
        <div className="space-y-6 px-1">
            {groupKeys.map((dateLabel, groupIdx) => (
                <div key={dateLabel}>
                    {/* Day header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-0.5 bg-gray-100 rounded-full whitespace-nowrap">
                            {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    {/* Activity items */}
                    <ul className="space-y-0">
                        {grouped[dateLabel].map((activity, idx) => {
                            const isLast = idx === grouped[dateLabel].length - 1 && groupIdx === groupKeys.length - 1;
                            const { dotColor, dotBg, label } = getActionStyle(activity.action);
                            const timeStr = new Date(activity.createdAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit', minute: '2-digit'
                            });
                            const userName = activity.user?.firstName
                                ? `${activity.user.firstName}${activity.user.lastName ? ' ' + activity.user.lastName : ''}`
                                : 'ระบบ';

                            return (
                                <li key={activity.id} className="relative flex gap-4">
                                    {/* Timeline line + dot */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white ${dotBg}`}>
                                            {activity.user?.avatarUrl ? (
                                                <img
                                                    src={activity.user.avatarUrl}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className={`text-xs font-bold ${dotColor}`}>
                                                    {userName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {!isLast && (
                                            <div className="w-0.5 flex-1 bg-gray-200 mt-1 mb-1 min-h-[16px]" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 ${!isLast ? 'pb-4' : 'pb-1'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-semibold text-gray-900">{userName}</span>
                                                    {' '}
                                                    <span className={`font-medium ${dotColor}`}>{label}</span>
                                                </p>
                                                {activity.message && (
                                                    <p className="mt-1 text-sm text-gray-500 italic bg-gray-50 rounded-lg px-3 py-1.5 border-l-2 border-gray-300">
                                                        "{activity.message}"
                                                    </p>
                                                )}
                                            </div>
                                            <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                                                {timeStr} น.
                                            </time>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

// คืนค่า style (dotColor, dotBg, label) ตาม action type
const getActionStyle = (action) => {
    const actionMap = {
        // สร้าง — สีเขียว
        job_created:                    { dotColor: 'text-green-700', dotBg: 'bg-green-100', label: 'สร้างงาน' },
        parent_child_created:           { dotColor: 'text-green-700', dotBg: 'bg-green-100', label: 'สร้างงานกลุ่ม (Parent-Child)' },
        draft_saved:                    { dotColor: 'text-green-700', dotBg: 'bg-green-100', label: 'บันทึกร่างงาน' },
        job_started:                    { dotColor: 'text-green-700', dotBg: 'bg-green-100', label: 'เริ่มดำเนินการงาน' },
        started:                        { dotColor: 'text-green-700', dotBg: 'bg-green-100', label: 'เริ่มงาน' },
        // อนุมัติ — สีน้ำเงิน
        job_approved:                   { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติงาน' },
        approved:                       { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติงาน' },
        job_auto_approved:              { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติอัตโนมัติ' },
        job_approved_cascade:           { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติอัตโนมัติ (Cascade)' },
        job_approved_cascade_sequential:{ dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติอัตโนมัติตามลำดับ' },
        approval_requested:             { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'ส่งเรื่องขออนุมัติ' },
        rejection_approved:             { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'อนุมัติคำขอปฏิเสธ' },
        assignee_rejection_confirmed:   { dotColor: 'text-blue-700', dotBg: 'bg-blue-100', label: 'ยืนยันการปฏิเสธของผู้รับงาน' },
        // ปฏิเสธ/ส่งกลับ — สีแดง
        job_rejected:                   { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ส่งกลับแก้ไข' },
        rejected:                       { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ส่งกลับแก้ไข' },
        rejection_requested:            { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ขอปฏิเสธงาน' },
        rejection_denied:               { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ไม่อนุมัติคำขอปฏิเสธ' },
        job_rejected_by_assignee:       { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ผู้รับงานปฏิเสธงาน' },
        assignee_rejection_denied:      { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'ไม่ยืนยันการปฏิเสธของผู้รับงาน' },
        draft_rejected:                 { dotColor: 'text-red-700', dotBg: 'bg-red-100', label: 'มีแก้ไข Draft' },
        // Draft — สีฟ้า
        draft_submitted:                { dotColor: 'text-cyan-700', dotBg: 'bg-cyan-100', label: 'ส่ง Draft' },
        draft_approved:                 { dotColor: 'text-cyan-700', dotBg: 'bg-cyan-100', label: 'อนุมัติ Draft' },
        // มอบหมาย — สีม่วง
        assigned:                       { dotColor: 'text-violet-700', dotBg: 'bg-violet-100', label: 'มอบหมายงาน' },
        reassigned:                     { dotColor: 'text-violet-700', dotBg: 'bg-violet-100', label: 'ย้ายผู้รับผิดชอบ' },
        // ส่งมอบงาน — สีเขียวเข้ม
        job_completed:                  { dotColor: 'text-emerald-700', dotBg: 'bg-emerald-100', label: 'ส่งมอบงาน' },
        completed:                      { dotColor: 'text-emerald-700', dotBg: 'bg-emerald-100', label: 'ส่งงาน' },
        closed:                         { dotColor: 'text-emerald-700', dotBg: 'bg-emerald-100', label: 'ปิดงาน' },
        parent_job_closed:              { dotColor: 'text-emerald-700', dotBg: 'bg-emerald-100', label: 'ปิดงานหลัก' },
        // Rebrief — สีส้ม
        rebrief_requested:              { dotColor: 'text-orange-700', dotBg: 'bg-orange-100', label: 'ขอข้อมูลเพิ่มเติม' },
        rebrief_submitted:              { dotColor: 'text-orange-700', dotBg: 'bg-orange-100', label: 'ส่งข้อมูลเพิ่มเติม' },
        rebrief_accepted:               { dotColor: 'text-orange-700', dotBg: 'bg-orange-100', label: 'รับงานหลัง Rebrief' },
        // Comments / Files — สีเทา
        comment_added:                  { dotColor: 'text-gray-600', dotBg: 'bg-gray-100', label: 'แสดงความคิดเห็น' },
        comment_deleted:                { dotColor: 'text-gray-600', dotBg: 'bg-gray-100', label: 'ลบความคิดเห็น' },
        file_uploaded:                  { dotColor: 'text-gray-600', dotBg: 'bg-gray-100', label: 'อัปโหลดไฟล์' },
        // ทั่วไป
        status_updated:                 { dotColor: 'text-gray-600', dotBg: 'bg-gray-100', label: 'อัปเดตสถานะ' },
        due_date_adjusted:              { dotColor: 'text-amber-700', dotBg: 'bg-amber-100', label: 'ปรับวันกำหนดส่ง' },
    };

    return actionMap[action] || { dotColor: 'text-gray-600', dotBg: 'bg-gray-100', label: action };
};

export default JobActivityLog;
