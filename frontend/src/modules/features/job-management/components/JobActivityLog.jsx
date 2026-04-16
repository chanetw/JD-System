import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@shared/services/apiService';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { UserIcon } from '@heroicons/react/24/outline';

const ACTION_STYLE_MAP = {
    job_created: { label: 'สร้างงาน', tone: 'positive', stage: 'Created' },
    parent_child_created: { label: 'สร้างงานกลุ่ม', tone: 'positive', stage: 'Created' },
    draft_saved: { label: 'บันทึกร่าง', tone: 'neutral' },
    job_started: { label: 'เริ่มดำเนินงาน', tone: 'positive' },
    started: { label: 'เริ่มงาน', tone: 'positive' },

    job_approved: { label: 'อนุมัติงาน', tone: 'positive', stage: 'Approved' },
    approved: { label: 'อนุมัติงาน', tone: 'positive', stage: 'Approved' },
    job_auto_approved: { label: 'อนุมัติอัตโนมัติ', tone: 'positive', stage: 'Approved' },
    job_approved_cascade: { label: 'อนุมัติอัตโนมัติ (Cascade)', tone: 'positive', stage: 'Approved' },
    job_approved_cascade_sequential: { label: 'อนุมัติอัตโนมัติตามลำดับ', tone: 'positive', stage: 'Approved' },
    approval_requested: { label: 'ส่งขออนุมัติ', tone: 'neutral', stage: 'Approval' },
    rejection_approved: { label: 'อนุมัติคำขอปฏิเสธ', tone: 'positive' },

    job_rejected: { label: 'ส่งกลับแก้ไข', tone: 'negative' },
    rejected: { label: 'ส่งกลับแก้ไข', tone: 'negative' },
    rejection_requested: { label: 'ขอปฏิเสธงาน', tone: 'negative' },
    rejection_denied: { label: 'ไม่อนุมัติคำขอปฏิเสธ', tone: 'negative' },
    job_rejected_by_assignee: { label: 'ผู้รับงานปฏิเสธ', tone: 'negative' },
    assignee_rejection_denied: { label: 'ไม่ยืนยันการปฏิเสธ', tone: 'negative' },
    draft_rejected: { label: 'มีแก้ไข Draft', tone: 'negative' },

    draft_submitted: { label: 'ส่ง Draft', tone: 'neutral' },
    draft_approved: { label: 'อนุมัติ Draft', tone: 'positive' },
    assigned: { label: 'มอบหมายงาน', tone: 'neutral' },
    reassigned: { label: 'ย้ายผู้รับผิดชอบ', tone: 'neutral' },

    job_completed: { label: 'ส่งมอบงาน', tone: 'positive' },
    completed: { label: 'ส่งงาน', tone: 'positive' },
    closed: { label: 'ปิดงาน', tone: 'positive' },
    parent_job_closed: { label: 'ปิดงานหลัก', tone: 'positive' },

    rebrief_requested: { label: 'ขอข้อมูลเพิ่ม', tone: 'neutral' },
    rebrief_submitted: { label: 'ส่งข้อมูลเพิ่ม', tone: 'neutral' },
    rebrief_accepted: { label: 'รับงานหลัง Rebrief', tone: 'positive' },

    comment_added: { label: 'แสดงความคิดเห็น', tone: 'neutral' },
    comment_deleted: { label: 'ลบความคิดเห็น', tone: 'neutral' },
    file_uploaded: { label: 'อัปโหลดไฟล์', tone: 'neutral' },
    status_updated: { label: 'อัปเดตสถานะ', tone: 'neutral' },
    due_date_adjusted: { label: 'ปรับวันกำหนดส่ง', tone: 'neutral' }
};

const TONE_STYLE = {
    positive: {
        dotOuter: 'border-emerald-500',
        dotInner: 'bg-emerald-500',
        badge: 'bg-emerald-500 text-white',
        accent: 'text-emerald-700'
    },
    negative: {
        dotOuter: 'border-red-500',
        dotInner: 'bg-red-500',
        badge: 'bg-red-500 text-white',
        accent: 'text-red-700'
    },
    neutral: {
        dotOuter: 'border-amber-500',
        dotInner: 'bg-amber-500',
        badge: 'bg-amber-500 text-white',
        accent: 'text-amber-700'
    }
};

const getActivityMeta = (activity) => {
    const serverMeta = activity?.activityMeta;
    const mapped = serverMeta?.label
        ? {
            label: serverMeta.label,
            tone: serverMeta.tone || 'neutral',
            stage: serverMeta.stage || 'Activity'
        }
        : (ACTION_STYLE_MAP[activity?.action] || { label: activity?.action || 'กิจกรรม', tone: 'neutral', stage: 'Activity' });
    const style = TONE_STYLE[mapped.tone] || TONE_STYLE.neutral;

    return {
        ...mapped,
        ...style,
        toneLabel: mapped.tone === 'positive' ? 'สำเร็จ' : mapped.tone === 'negative' ? 'ปฏิเสธ' : 'กำลังดำเนินการ'
    };
};

const formatTimelineDate = (date) => {
    const day = date.toLocaleDateString('en-GB', { day: '2-digit' });
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return { day, month };
};

const getUserName = (activity) => {
    if (activity.user?.firstName) {
        return `${activity.user.firstName}${activity.user.lastName ? ` ${activity.user.lastName}` : ''}`;
    }
    return 'ระบบ';
};

const getDetailObject = (detail) => {
    if (!detail) return null;
    if (typeof detail === 'object') return detail;
    if (typeof detail === 'string') {
        try {
            return JSON.parse(detail);
        } catch {
            return null;
        }
    }
    return null;
};

const getTrackingHint = (entry) => {
    const detail = getDetailObject(entry.detail);

    if (entry.action === 'job_created') return 'เริ่มต้นจากผู้สั่งงานสร้างงาน';
    if (entry.action === 'approval_requested') return 'ส่งเข้า Approval Flow';
    if (entry.action === 'job_auto_approved') return 'ข้ามอนุมัติอัตโนมัติ (ผู้สร้างเป็นผู้อนุมัติ)';
    if (entry.action === 'job_approved') return 'อนุมัติผ่านผู้อนุมัติ';
    if (entry.action === 'job_approved_cascade') return 'อนุมัติอัตโนมัติแบบ Cascade จากความสัมพันธ์งาน';
    if (entry.action === 'job_approved_cascade_sequential') return 'อนุมัติอัตโนมัติตามลำดับขั้น';

    if (detail?.isChildJob) return 'กิจกรรมของงานลูกใน Parent-Child';
    return null;
};

const shouldMergeTimelineEntry = (previous, current) => {
    if (!previous || !current) return false;
    if (previous.action !== 'job_auto_approved' || current.action !== 'job_auto_approved') return false;
    if ((previous.user?.id || null) !== (current.user?.id || null)) return false;

    const prevTime = new Date(previous.createdAt).getTime();
    const currentTime = new Date(current.createdAt).getTime();
    const withinOneMinute = Math.abs(currentTime - prevTime) <= 60 * 1000;

    return withinOneMinute;
};

const aggregateTimelineActivities = (sourceActivities) => {
    const result = [];

    sourceActivities.forEach((activity) => {
        const previous = result[result.length - 1];

        if (shouldMergeTimelineEntry(previous, activity)) {
            const mergedMessages = [...(previous.mergedMessages || [previous.message]), activity.message]
                .filter(Boolean);
            previous.mergedMessages = mergedMessages;
            previous.mergeCount = (previous.mergeCount || 1) + 1;
            previous.message = `${mergedMessages[0]} และอีก ${mergedMessages.length - 1} รายการ`;
            previous.detail = {
                ...(getDetailObject(previous.detail) || {}),
                merged: true,
                mergedCount: mergedMessages.length
            };
            return;
        }

        result.push({ ...activity, mergeCount: 1, mergedMessages: activity.message ? [activity.message] : [] });
    });

    return result;
};

const JobActivityLog = ({ jobId }) => {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (jobId) loadActivities();
    }, [jobId]);

    const loadActivities = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getJobActivities(jobId);
            if (result.success) {
                setActivities(Array.isArray(result.data) ? result.data : []);
            } else {
                setError(result.error || 'ไม่สามารถโหลดประวัติกิจกรรมได้');
            }
        } catch (err) {
            console.error('Failed to load activities:', err);
            setError('ไม่สามารถโหลดประวัติกิจกรรมได้');
        } finally {
            setIsLoading(false);
        }
    };

    const timelineEntries = useMemo(() => {
        const aggregatedActivities = aggregateTimelineActivities(activities);

        return aggregatedActivities.map((activity, index) => {
            const createdAt = new Date(activity.createdAt);
            const date = formatTimelineDate(createdAt);
            const time = createdAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const userName = getUserName(activity);
            const meta = getActivityMeta(activity);
            const prev = aggregatedActivities[index - 1];
            const prevDateKey = prev ? new Date(prev.createdAt).toDateString() : null;
            const currentDateKey = createdAt.toDateString();

            return {
                ...activity,
                date,
                time,
                userName,
                meta,
                showDate: prevDateKey !== currentDateKey
            };
        });
    }, [activities]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="p-4 text-center text-sm text-red-500">{error}</div>;
    if (timelineEntries.length === 0) {
        return (
            <div className="py-10 text-center text-gray-400">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm">ยังไม่มีกิจกรรม</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-2 px-1 sm:space-y-2.5">
            <div className="absolute bottom-4 left-[78px] top-4 hidden w-px bg-slate-300 sm:block" aria-hidden="true" />

            {timelineEntries.map((entry) => (
                <div key={entry.id} className="relative grid grid-cols-1 gap-2 sm:grid-cols-[58px_20px_minmax(0,1fr)] sm:gap-4">
                    <div className="hidden pt-1 text-right sm:block">
                        {entry.showDate ? (
                            <>
                                <p className="text-2xl font-semibold leading-none text-slate-900">{entry.date.day}</p>
                                <p className="mt-0.5 text-lg leading-none text-slate-400">{entry.date.month}</p>
                            </>
                        ) : (
                            <p className="pt-2 text-[10px] font-medium uppercase tracking-wide text-transparent select-none">same day</p>
                        )}
                    </div>

                    <div className="hidden justify-center pt-3 sm:flex">
                        <span className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white ${entry.meta.dotOuter}`}>
                            <span className={`h-2 w-2 rounded-full ${entry.meta.dotInner}`} />
                        </span>
                    </div>

                    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${entry.meta.badge}`}>
                                {entry.meta.toneLabel}
                            </span>
                            <time className="pt-1 text-xs font-medium text-slate-400">{entry.time} น.</time>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">{entry.meta.label}</h4>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                {entry.meta.stage}
                            </span>
                        </div>

                        {entry.message && (
                            <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm leading-5 text-slate-600">
                                {entry.message}
                            </p>
                        )}

                        {entry.mergeCount > 1 && (
                            <p className="mt-1 text-xs text-slate-500">รวมเหตุการณ์อนุมัติอัตโนมัติ {entry.mergeCount} รายการในช่วงเวลาเดียวกัน</p>
                        )}

                        {getTrackingHint(entry) && (
                            <p className="mt-1.5 text-xs font-medium text-indigo-600">{getTrackingHint(entry)}</p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                            <span>โดย {entry.userName}</span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.meta.accent} border-current/20 bg-white`}>
                                {entry.action}
                            </span>
                        </div>
                    </article>
                </div>
            ))}
        </div>
    );
};

export default JobActivityLog;
