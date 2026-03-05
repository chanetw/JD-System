/**
 * @file TimelineHeader.jsx
 * @description Header สำหรับ Timeline แสดงสัปดาห์และวัน
 */

import React, { useMemo } from 'react';
import { eachWeekOfInterval, eachDayOfInterval, format, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';

export default function TimelineHeader({ dateRange }) {
    const weeks = useMemo(() => {
        return eachWeekOfInterval(
            { start: dateRange.start, end: dateRange.end },
            { weekStartsOn: 0 } // Sunday
        );
    }, [dateRange]);

    const days = useMemo(() => {
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }, [dateRange]);

    const today = new Date();

    return (
        <div className="border-b border-gray-200">
            {/* Week Row */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-48 flex-shrink-0 px-4 py-2 border-r border-gray-200">
                    <span className="text-xs font-semibold text-gray-600 uppercase">โปรเจกต์</span>
                </div>
                <div className="flex-1 flex">
                    {weeks.map((weekStart, idx) => {
                        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
                            day => day >= dateRange.start && day <= dateRange.end
                        );
                        const weekNumber = format(weekStart, 'w', { locale: th });
                        
                        return (
                            <div
                                key={idx}
                                className="flex-1 px-2 py-2 text-center border-r border-gray-200 last:border-r-0"
                                style={{ minWidth: `${daysInWeek.length * 40}px` }}
                            >
                                <div className="text-xs font-semibold text-gray-700">
                                    สัปดาห์ {weekNumber}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {format(weekStart, 'dd MMM', { locale: th })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Row */}
            <div className="flex bg-gray-50">
                <div className="w-48 flex-shrink-0 border-r border-gray-200"></div>
                <div className="flex-1 flex">
                    {days.map((day, idx) => {
                        const isToday = isSameDay(day, today);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        
                        return (
                            <div
                                key={idx}
                                className={`flex-1 px-1 py-2 text-center border-r border-gray-200 last:border-r-0 ${
                                    isToday ? 'bg-rose-50' : isWeekend ? 'bg-gray-100' : ''
                                }`}
                                style={{ minWidth: '40px' }}
                            >
                                <div className={`text-xs font-medium ${
                                    isToday ? 'text-rose-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {format(day, 'EEEEE', { locale: th })}
                                </div>
                                <div className={`text-xs ${
                                    isToday ? 'text-rose-600 font-bold' : isWeekend ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
