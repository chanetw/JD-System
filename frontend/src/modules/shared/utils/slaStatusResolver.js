import { getWorkingDays } from './slaCalculator.js';

const DAY_MS = 1000 * 60 * 60 * 24;

const CLOSED_STATUSES = new Set(['completed', 'closed', 'cancelled']);

const toStartOfDay = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const getDayDiffFromToday = (deadline, now = new Date()) => {
    const dueDate = toStartOfDay(deadline);
    if (!dueDate) return null;

    const today = toStartOfDay(now);
    return Math.floor((dueDate.getTime() - today.getTime()) / DAY_MS);
};

const asStatusKey = (status) => String(status || '').toLowerCase();

export const resolveSlaBadgePresentation = ({
    status,
    deadline,
    completedAt,
    holidays = [],
    now = new Date()
}) => {
    const statusKey = asStatusKey(status);
    const dueDate = toStartOfDay(deadline);

    if (!dueDate) {
        return {
            key: 'no_deadline',
            text: 'ไม่กำหนด',
            className: 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700',
            isActiveOverdue: false,
            isCompletedLate: false,
            dayDiff: null,
            lateWorkingDays: 0
        };
    }

    const completedDate = toStartOfDay(completedAt);

    if (CLOSED_STATUSES.has(statusKey)) {
        if (completedDate && completedDate.getTime() > dueDate.getTime()) {
            const lateWorkingDays = Math.max(1, getWorkingDays(dueDate, completedDate, holidays) - 1);
            return {
                key: 'completed_late',
                text: `เสร็จแล้ว เกิน SLA (${lateWorkingDays} วันทำงาน)`,
                className: 'px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium',
                isActiveOverdue: false,
                isCompletedLate: true,
                dayDiff: null,
                lateWorkingDays
            };
        }

        return {
            key: 'completed_on_time',
            text: 'เสร็จแล้ว',
            className: 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium',
            isActiveOverdue: false,
            isCompletedLate: false,
            dayDiff: null,
            lateWorkingDays: 0
        };
    }

    const dayDiff = getDayDiffFromToday(dueDate, now);

    if (dayDiff < 0) {
        return {
            key: 'overdue',
            text: `เกิน SLA (${Math.abs(dayDiff)} วัน)`,
            className: 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium',
            isActiveOverdue: true,
            isCompletedLate: false,
            dayDiff,
            lateWorkingDays: 0
        };
    }

    if (dayDiff === 0) {
        return {
            key: 'due_today',
            text: 'ครบ SLA วันนี้',
            className: 'px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium',
            isActiveOverdue: false,
            isCompletedLate: false,
            dayDiff,
            lateWorkingDays: 0
        };
    }

    if (dayDiff === 1) {
        return {
            key: 'due_tomorrow',
            text: 'อยู่ใน SLA (1 วัน)',
            className: 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium',
            isActiveOverdue: false,
            isCompletedLate: false,
            dayDiff,
            lateWorkingDays: 0
        };
    }

    return {
        key: 'within_sla',
        text: 'อยู่ใน SLA',
        className: 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700',
        isActiveOverdue: false,
        isCompletedLate: false,
        dayDiff,
        lateWorkingDays: 0
    };
};
