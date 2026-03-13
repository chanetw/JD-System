/**
 * @file TimelineBar.jsx
 * @description แถบงานใน Timeline แสดงเป็น bar ตามช่วงเวลา พร้อม Smart Tooltip
 */

import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { differenceInDays, format, isWeekend, eachDayOfInterval, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { WORK_STATUS_LABEL } from '@shared/constants/jobStatus';

// นับวันทำงาน (ยกเว้นเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)
const countWorkingDays = (startDate, endDate, holidays = []) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter(day => {
        if (isWeekend(day)) return false;
        if (holidays.some(h => isSameDay(new Date(h.date), day))) return false;
        return true;
    }).length;
};


const PRIORITY_LABEL = {
    urgent: '🔴 ด่วนมาก',
    high: '🟠 สูง',
    normal: '🔵 ปกติ',
    low: '🟢 ต่ำ',
};

const PRIORITY_GRADIENT = {
    urgent: 'linear-gradient(90deg, #fca5a5 0%, #ef4444 50%, #dc2626 100%)',
    high: 'linear-gradient(90deg, #fdba74 0%, #f97316 50%, #ea580c 100%)',
    normal: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 50%, #2563eb 100%)',
    low: 'linear-gradient(90deg, #86efac 0%, #22c55e 50%, #16a34a 100%)',
};

const PRIORITY_BORDER = {
    urgent: 'border-red-500',
    high: 'border-orange-500',
    normal: 'border-blue-500',
    low: 'border-green-500',
};

export default function TimelineBar({ job, dateRange, rowIndex, onClick, holidays = [] }) {
    const [tooltipState, setTooltipState] = useState(null);
    const [markerTooltip, setMarkerTooltip] = useState(null);
    const [slaMarkerTooltip, setSlaMarkerTooltip] = useState(null);

    const { workingDays, calendarDuration, overrunDays, dueDateFrac, priorityBorder } = useMemo(() => {
        const jobStart = new Date(job.acceptanceDate || job.startedAt || job.createdAt);
        const jobEnd = new Date(job.deadline || job.dueDate);
        const today = new Date();
        const isOverrun = today > jobEnd && !['completed', 'closed', 'rejected', 'rejected_by_assignee'].includes(job.status?.toLowerCase());
        
        // Calculate fractions for positioning markers
        const totalDays = differenceInDays(dateRange.end, dateRange.start);
        const endOffset = differenceInDays(jobEnd, dateRange.start);
        
        const priority = job.priority?.toLowerCase() || 'normal';
        
        return {
            workingDays: countWorkingDays(jobStart, jobEnd, holidays),
            calendarDuration: differenceInDays(jobEnd, jobStart),
            overrunDays: isOverrun ? differenceInDays(today, jobEnd) : 0,
            dueDateFrac: endOffset >= 0 && endOffset <= totalDays ? endOffset / totalDays : null,
            priorityBorder: PRIORITY_BORDER[priority] || PRIORITY_BORDER.normal,
        };
    }, [job, holidays, dateRange]);

    const barStyle = useMemo(() => {
        const jobStart = new Date(job.acceptanceDate || job.startedAt || job.createdAt);
        const jobEnd = new Date(job.deadline || job.dueDate);
        const totalDays = differenceInDays(dateRange.end, dateRange.start);
        const startOffset = differenceInDays(jobStart, dateRange.start);
        const endOffset = differenceInDays(jobEnd, dateRange.start);
        
        // Bar should extend to cover the due date cell completely
        // endOffset gives us the start of the due date cell, we need to extend to the end of it
        const duration = endOffset - startOffset + 1;

        const clampedStart = Math.max(0, startOffset);
        const clampedEnd = Math.min(totalDays, startOffset + duration);
        const clampedDuration = clampedEnd - clampedStart;

        const barHeight = 28;
        const top = rowIndex * (barHeight + 4) + 12;

        return {
            left: `${(clampedStart / totalDays) * 100}%`,
            width: `${Math.max((clampedDuration / totalDays) * 100, 1.5)}%`,
            top: `${top}px`,
            height: `${barHeight}px`,
        };
    }, [job, dateRange, rowIndex]);

    const { overrunStyle, todayFrac } = useMemo(() => {
        if (overrunDays <= 0) return { overrunStyle: null, todayFrac: null };
        const jobEnd = new Date(job.deadline || job.dueDate);
        const today = new Date();
        const totalDays = differenceInDays(dateRange.end, dateRange.start);
        const endOffset = differenceInDays(jobEnd, dateRange.start) + 1; // ต่อจากแถบ timeline
        const todayOffset = differenceInDays(today, dateRange.start);

        const clampedEndOffset = Math.max(0, endOffset);
        const clampedTodayOffset = Math.min(totalDays, todayOffset);
        const overrunWidth = clampedTodayOffset - clampedEndOffset;

        if (overrunWidth <= 0) return { overrunStyle: null, todayFrac: null };

        const barHeight = 28;
        const top = rowIndex * (barHeight + 4) + 12 + barHeight / 2 - 1;

        return {
            overrunStyle: {
                left: `${(clampedEndOffset / totalDays) * 100}%`,
                width: `${(overrunWidth / totalDays) * 100}%`,
                top: `${top}px`,
            },
            todayFrac: clampedTodayOffset / totalDays,
        };
    }, [job, dateRange, rowIndex, overrunDays]);

    const getBarStyles = () => {
        const priority = job.priority?.toLowerCase() || 'normal';
        const status = job.status?.toLowerCase();
        const gradient = PRIORITY_GRADIENT[priority] || PRIORITY_GRADIENT.normal;
        
        let opacity = 1;
        if (status === 'completed' || status === 'closed') {
            opacity = 0.7;
        }
        
        return {
            background: gradient,
            opacity,
        };
    };

    const barStyles = getBarStyles();

    const handleMouseEnter = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const TOOLTIP_H = 195;
        const TOOLTIP_W = 260;
        const flipUp = rect.bottom + TOOLTIP_H + 8 > window.innerHeight;
        let x = rect.left;
        if (x + TOOLTIP_W > window.innerWidth - 8) {
            x = window.innerWidth - TOOLTIP_W - 8;
        }
        setTooltipState({ x: Math.max(8, x), y: rect.top, barH: rect.height, flipUp });
    }, []);

    const handleMouseLeave = useCallback(() => setTooltipState(null), []);

    return (
        <>
            {/* Main Bar - Modern Gradient */}
            <div
                className="absolute text-white rounded-lg px-2 cursor-pointer hover:brightness-110 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 z-10 hover:z-20 flex items-center shadow-lg border border-white/20"
                style={{...barStyle, background: barStyles.background, opacity: barStyles.opacity}}
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="text-xs font-semibold truncate leading-none drop-shadow-sm">
                    {job.djId}
                </div>
            </div>

            {/* Due Date Marker - White circle with priority border (centered in day cell) */}
            {dueDateFrac !== null && (
                <>
                    <div
                        className={`absolute z-20 w-5 h-5 bg-white rounded-full border-2 ${priorityBorder} shadow-md cursor-pointer transition-transform hover:scale-125`}
                        style={{ 
                            left: `calc(${dueDateFrac * 100}% + 10px)`,
                            top: `${parseInt(barStyle.top) + 14 - 10}px` // กึ่งกลางแถบ: top + barHeight/2 - markerSize/2
                        }}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMarkerTooltip({
                                x: rect.left + rect.width / 2,
                                y: rect.top
                            });
                        }}
                        onMouseLeave={() => setMarkerTooltip(null)}
                    />
                    {/* Marker Tooltip */}
                    {markerTooltip && createPortal(
                        <div
                            className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-[10000] pointer-events-none whitespace-nowrap"
                            style={{
                                left: `${markerTooltip.x}px`,
                                top: `${markerTooltip.y - 30}px`,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            ส่งงาน: {format(new Date(job.deadline || job.dueDate), 'dd MMM yyyy', { locale: th })}
                        </div>,
                        document.body
                    )}
                </>
            )}

            {/* SLA Overrun Segment (red dashed line + red circle at end) */}
            {overrunStyle && (
                <>
                    <div
                        className="absolute border-t-2 border-dashed border-red-500 z-10 pointer-events-none opacity-80"
                        style={overrunStyle}
                    />
                    {/* SLA End Marker - Red circle (centered in today's day cell) */}
                    {todayFrac !== null && (
                        <>
                            <div
                                className="absolute z-20 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
                                style={{
                                    left: `calc(${todayFrac * 100}% + 10px)`,
                                    top: `${parseInt(barStyle.top) + 14 - 10}px` // กึ่งกลางแถบ: top + barHeight/2 - markerSize/2
                                }}
                                onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setSlaMarkerTooltip({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top
                                    });
                                }}
                                onMouseLeave={() => setSlaMarkerTooltip(null)}
                            />
                            {slaMarkerTooltip && createPortal(
                                <div
                                    className="fixed bg-red-800 text-white text-xs px-2 py-1 rounded shadow-lg z-[10000] pointer-events-none whitespace-nowrap"
                                    style={{
                                        left: `${slaMarkerTooltip.x}px`,
                                        top: `${slaMarkerTooltip.y - 30}px`,
                                        transform: 'translateX(-50%)'
                                    }}
                                >
                                    เกิน SLA: {overrunDays} วัน
                                </div>,
                                document.body
                            )}
                        </>
                    )}
                </>
            )}

            {/* Tooltip — rendered via Portal เพื่อไม่ให้ถูก clip โดย overflow */}
            {tooltipState && createPortal(
                <div
                    className="fixed bg-gray-900 text-white text-xs rounded-xl px-3 py-3 shadow-2xl z-[9999] pointer-events-none border border-gray-700"
                    style={{
                        left: `${tooltipState.x}px`,
                        top: tooltipState.flipUp
                            ? `${tooltipState.y - 195 - 4}px`
                            : `${tooltipState.y + tooltipState.barH + 8}px`,
                        minWidth: '240px',
                        maxWidth: '300px',
                    }}
                >
                    <div className="font-bold text-sm mb-0.5">{job.djId}</div>
                    <div className="text-gray-300 text-[11px] mb-2 leading-snug">{job.subject}</div>
                    <div className="border-t border-gray-700 pt-2 space-y-1.5">
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">โปรเจกต์</span>
                            <span className="text-white text-right truncate max-w-[140px]">{job.projectName || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">ประเภท</span>
                            <span className="text-white text-right truncate max-w-[140px]">{job.jobTypeName || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">สถานะ</span>
                            <span className="text-white">{WORK_STATUS_LABEL[job.status] || job.status}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">ความสำคัญ</span>
                            <span className="text-white">{PRIORITY_LABEL[job.priority?.toLowerCase()] || job.priority || 'ปกติ'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">วันสั่งงาน</span>
                            <span className="text-white">
                                {format(new Date(job.createdAt), 'dd MMM yyyy', { locale: th })}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">วันเริ่มงาน</span>
                            <span className="text-blue-300 font-semibold">
                                {format(new Date(job.acceptanceDate || job.startedAt || job.createdAt), 'dd MMM yyyy', { locale: th })}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">ครบกำหนด</span>
                            <span className="text-yellow-300 font-semibold">
                                {job.deadline ? format(new Date(job.deadline), 'dd MMM yyyy', { locale: th }) : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-gray-700 pt-1.5 mt-0.5">
                            <span className="text-gray-400 shrink-0">SLA</span>
                            <span className="text-green-400 font-semibold">
                                {workingDays} วันทำงาน ({calendarDuration} วันปฏิทิน)
                            </span>
                        </div>
                        {overrunDays > 0 && (
                            <div className="flex justify-between gap-3 border-t border-red-700 pt-1.5 mt-0.5">
                                <span className="text-red-400 shrink-0">เกิน SLA</span>
                                <span className="text-red-300 font-bold">
                                    🔴 {overrunDays} วัน
                                </span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
