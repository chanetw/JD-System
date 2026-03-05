/**
 * @file TimelineBar.jsx
 * @description แถบงานใน Timeline แสดงเป็น bar ตามช่วงเวลา
 */

import React, { useState, useMemo } from 'react';
import { differenceInDays, format, isWeekend, isToday, eachDayOfInterval, addDays } from 'date-fns';
import { th } from 'date-fns/locale';

// Helper function to count working days (exclude weekends)
const countWorkingDays = (startDate, endDate) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter(day => !isWeekend(day)).length;
};

// Helper function to add working days (skip weekends)
const addWorkingDays = (startDate, workingDays) => {
    let currentDate = new Date(startDate);
    let daysAdded = 0;
    
    while (daysAdded < workingDays) {
        currentDate = addDays(currentDate, 1);
        if (!isWeekend(currentDate)) {
            daysAdded++;
        }
    }
    
    return currentDate;
};

export default function TimelineBar({ job, dateRange, rowIndex, totalRows, onClick }) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate working days and calendar duration for display
    const { workingDays, calendarDuration } = useMemo(() => {
        const jobStart = new Date(job.startedAt || job.createdAt);
        // วันสิ้นสุด = deadline (วันที่ลูกค้าต้องการงาน/วันครบกำหนด SLA)
        const jobEnd = new Date(job.deadline || job.dueDate);
        
        return {
            workingDays: countWorkingDays(jobStart, jobEnd),
            calendarDuration: differenceInDays(jobEnd, jobStart)
        };
    }, [job]);

    // Calculate bar position and width
    const barStyle = useMemo(() => {
        // วันเริ่มต้น = วันที่เริ่มทำงาน หรือวันที่สร้างงาน
        const jobStart = new Date(job.startedAt || job.createdAt);
        // วันสิ้นสุด = deadline (วันที่ลูกค้าต้องการงาน/วันครบกำหนด SLA)
        const jobEnd = new Date(job.deadline || job.dueDate);
        
        console.log(`[TimelineBar] 📏 Calculating bar for job ${job.djId}:`, {
            jobStart: jobStart.toISOString(),
            jobEnd: jobEnd.toISOString(),
            acceptanceDate: job.acceptanceDate,
            dateRangeStart: dateRange.start.toISOString(),
            dateRangeEnd: dateRange.end.toISOString()
        });
        
        const timelineStart = dateRange.start;
        const timelineEnd = dateRange.end;
        const totalDays = differenceInDays(timelineEnd, timelineStart);

        // Calculate position (calendar days for positioning on timeline)
        const startOffset = differenceInDays(jobStart, timelineStart);
        const calendarDuration = differenceInDays(jobEnd, jobStart);
        
        // Calculate working days for display
        const workingDays = countWorkingDays(jobStart, jobEnd);

        // Clamp to timeline bounds
        const clampedStartOffset = Math.max(0, startOffset);
        const clampedEndOffset = Math.min(totalDays, startOffset + calendarDuration);
        const clampedDuration = clampedEndOffset - clampedStartOffset;

        // Convert to percentage
        const left = (clampedStartOffset / totalDays) * 100;
        const width = (clampedDuration / totalDays) * 100;

        // Vertical position (stack multiple jobs)
        const barHeight = 24; // px
        const barGap = 4; // px
        const top = rowIndex * (barHeight + barGap) + 8; // 8px top padding

        const result = {
            left: `${left}%`,
            width: `${Math.max(width, 2)}%`, // Minimum 2% width
            top: `${top}px`,
            height: `${barHeight}px`,
        };
        
        console.log(`[TimelineBar] ✅ Bar style for ${job.djId}:`, result);
        return result;
    }, [job, dateRange, rowIndex]);

    // Get color based on priority
    const getBarColor = () => {
        const priority = job.priority?.toLowerCase();
        const status = job.status?.toLowerCase();

        // Status-based colors (border)
        let borderColor = 'border-gray-300';
        if (status === 'completed' || status === 'closed') {
            borderColor = 'border-green-500';
        } else if (status === 'rejected' || status === 'rejected_by_assignee') {
            borderColor = 'border-red-500';
        } else if (status === 'in_progress') {
            borderColor = 'border-blue-500';
        }

        // Priority-based background
        let bgColor = 'bg-blue-400';
        let textColor = 'text-white';
        
        switch (priority) {
            case 'urgent':
                bgColor = 'bg-red-500';
                textColor = 'text-white';
                break;
            case 'high':
                bgColor = 'bg-orange-500';
                textColor = 'text-white';
                break;
            case 'normal':
                bgColor = 'bg-blue-500';
                textColor = 'text-white';
                break;
            case 'low':
                bgColor = 'bg-green-500';
                textColor = 'text-white';
                break;
            default:
                bgColor = 'bg-gray-400';
                textColor = 'text-white';
        }

        // Completed jobs: lighter shade
        if (status === 'completed' || status === 'closed') {
            bgColor = bgColor.replace('500', '300').replace('400', '200');
            textColor = 'text-gray-700';
        }

        return { bgColor, textColor, borderColor };
    };

    const { bgColor, textColor, borderColor } = getBarColor();

    return (
        <>
            <div
                className={`absolute ${bgColor} ${textColor} ${borderColor} border-2 rounded px-2 py-1 cursor-pointer hover:shadow-lg transition-all z-10 hover:z-20`}
                style={barStyle}
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title={job.subject}
            >
                <div className="text-xs font-medium truncate">
                    {job.djId}
                </div>
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none"
                    style={{
                        left: barStyle.left,
                        top: `calc(${barStyle.top} + 32px)`,
                        minWidth: '220px',
                        maxWidth: '300px',
                    }}
                >
                    <div className="font-bold mb-1">{job.djId}</div>
                    <div className="mb-1">{job.subject}</div>
                    <div className="text-gray-300 space-y-0.5">
                        <div>ประเภท: {job.jobTypeName || '-'}</div>
                        <div>สถานะ: {job.status}</div>
                        <div>ความสำคัญ: {job.priority || 'normal'}</div>
                        <div>
                            เริ่มทำ: {format(new Date(job.startedAt || job.createdAt), 'dd MMM yyyy', { locale: th })}
                        </div>
                        <div>
                            วันครบกำหนด: {job.deadline ? format(new Date(job.deadline), 'dd MMM yyyy', { locale: th }) : '-'}
                        </div>
                        <div className="font-semibold text-yellow-300 mt-1">
                            SLA: {workingDays} วันทำงาน ({calendarDuration} วันปฏิทิน)
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
