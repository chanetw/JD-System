/**
 * @file TimelineHeader.jsx
 * @description Header สำหรับ Timeline แสดงสัปดาห์และวัน รวมถึงวันหยุดนักขัตฤกษ์
 */

import React, { useMemo } from 'react';
import { eachWeekOfInterval, eachDayOfInterval, format, isSameDay, isWeekend, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';

export default function TimelineHeader({ dateRange, holidays = [], dayCellWidth = 40 }) {
    const weeks = useMemo(() => {
        return eachWeekOfInterval(
            { start: dateRange.start, end: dateRange.end },
            { weekStartsOn: 0 }
        );
    }, [dateRange]);

    const days = useMemo(() => {
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }, [dateRange]);

    const today = new Date();

    return (
        <div className="border-b-2 border-gray-300 sticky top-0 z-10">
            {/* Week Row */}
            <div className="flex border-b border-gray-200 bg-gray-100">
                <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-gray-300">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">งาน / โปรเจกต์</span>
                </div>
                <div className="flex-1 flex">
                    {weeks.map((weekStart, idx) => {
                        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
                            day => day >= dateRange.start && day <= dateRange.end
                        );
                        return (
                            <div
                                key={idx}
                                className="flex-1 px-2 py-1.5 text-center border-r border-gray-200 last:border-r-0"
                                style={{ minWidth: `${daysInWeek.length * dayCellWidth}px` }}
                            >
                                <div className="text-xs font-bold text-gray-700">
                                    สัปดาห์ {format(weekStart, 'w', { locale: th })}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {format(weekStart, 'dd MMM', { locale: th })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Row */}
            <div className="flex bg-gray-50">
                <div className="w-64 flex-shrink-0 border-r border-gray-300"></div>
                <div className="flex-1 flex">
                    {days.map((day, idx) => {
                        const isToday = isSameDay(day, today);
                        const isWknd = isWeekend(day);
                        const holiday = holidays.find(h => isSameDay(new Date(h.date), day));

                        let cellBg = '';
                        if (isToday) cellBg = 'bg-rose-100 ring-1 ring-inset ring-rose-400';
                        else if (holiday) cellBg = 'bg-red-100';
                        else if (isWknd) cellBg = 'bg-gray-200';

                        let dayColor = isToday ? 'text-rose-700 font-bold' : holiday ? 'text-red-600' : isWknd ? 'text-gray-500' : 'text-gray-600';
                        let dateColor = isToday ? 'text-rose-700 font-extrabold text-sm' : holiday ? 'text-red-600 font-semibold' : isWknd ? 'text-gray-400' : 'text-gray-500';

                        return (
                            <div
                                key={idx}
                                className={`flex-1 px-0.5 py-1.5 text-center border-r border-gray-200 last:border-r-0 ${cellBg}`}
                                style={{ minWidth: `${dayCellWidth}px` }}
                                title={holiday ? holiday.name : undefined}
                            >
                                <div className={`text-[10px] ${dayColor}`}>
                                    {format(day, 'EEEEE', { locale: th })}
                                </div>
                                <div className={`${dateColor}`}>
                                    {format(day, 'd')}
                                </div>
                                {holiday && (
                                    <div className="text-[8px] text-red-500 truncate leading-none mt-0.5" title={holiday.name}>
                                        🎌
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
