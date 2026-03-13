/**
 * @file TimelineView.jsx
 * @description Timeline View แบบ Gantt Chart สำหรับแสดงภาพรวมงานทั้งหมด
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks, isWeekend, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import TimelineHeader from './TimelineHeader';
import TimelineBar from './TimelineBar';
import TimelineLegend from './TimelineLegend';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { api } from '@shared/services/apiService';

const LEFT_COL_W = 256; // px — ต้องตรงกับ w-64

// Responsive day cell width
const getDayCellWidth = () => {
    if (typeof window === 'undefined') return 40;
    const w = window.innerWidth;
    if (w < 768) return 28;   // mobile
    if (w < 1024) return 32;  // tablet
    return 40;                // desktop
};

const PRIORITY_BADGE = {
    urgent:  { label: 'ด่วน',   cls: 'bg-red-100 text-red-700' },
    high:    { label: 'High',   cls: 'bg-orange-100 text-orange-700' },
    normal:  { label: 'Normal', cls: 'bg-blue-100 text-blue-700' },
    low:     { label: 'Low',    cls: 'bg-green-100 text-green-700' },
};

export default function TimelineView({ jobs, onJobClick }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [holidays, setHolidays] = useState([]);
    const [dayCellWidth, setDayCellWidth] = useState(getDayCellWidth());
    const scrollRef = useRef(null);

    // Responsive: ปรับ day cell width เมื่อ resize
    useEffect(() => {
        const handleResize = () => setDayCellWidth(getDayCellWidth());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ดึงวันหยุดจากระบบ
    useEffect(() => {
        api.getHolidays().then(data => setHolidays(data || [])).catch(() => {});
    }, []);

    // Jobs มาจาก MyQueue แล้ว (filter ตาม tab แล้ว) ไม่ต้อง filter ซ้ำ
    const activeJobs = useMemo(() => jobs, [jobs]);

    // คำนวณ earliest acceptanceDate (วันเริ่มงาน) จาก jobs
    const earliestJobDate = useMemo(() => {
        if (!activeJobs.length) return new Date();
        return new Date(Math.min(...activeJobs.map(j => new Date(j.acceptanceDate || j.startedAt || j.createdAt))));
    }, [activeJobs]);

    // Auto-fit currentDate to earliest job on first load
    useEffect(() => {
        if (activeJobs.length > 0) {
            setCurrentDate(earliestJobDate);
        }
    }, [activeJobs.length]); // Only on jobs count change

    // Calculate date range: fixed 5 weeks
    const dateRange = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(addWeeks(start, 4), { weekStartsOn: 0 }); // 5 สัปดาห์
        return { start, end };
    }, [currentDate]);

    // All days in range (for overlay)
    const days = useMemo(() => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }), [dateRange]);

    // Auto-scroll to today whenever dateRange changes
    useEffect(() => {
        if (!scrollRef.current) return;
        const today = new Date();
        const totalDays = differenceInDays(dateRange.end, dateRange.start);
        const daysToToday = differenceInDays(today, dateRange.start);
        if (daysToToday < 0 || daysToToday > totalDays) return;

        const todayPx = LEFT_COL_W + daysToToday * dayCellWidth;
        const viewportW = scrollRef.current.clientWidth;
        const target = Math.max(0, todayPx - viewportW / 2 + dayCellWidth / 2);
        scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
    }, [dateRange, dayCellWidth]);

    // ตำแหน่งเส้น "วันนี้" (fraction ของ timeline area 0–1)
    const todayFrac = useMemo(() => {
        const today = new Date();
        const totalDays = differenceInDays(dateRange.end, dateRange.start);
        const d = differenceInDays(today, dateRange.start);
        if (d < 0 || d > totalDays) return null;
        return d / totalDays;
    }, [dateRange]);


    // Filter by search
    const filteredJobs = useMemo(() => {
        if (!searchTerm.trim()) return activeJobs;
        const term = searchTerm.toLowerCase();
        return activeJobs.filter(j =>
            j.djId?.toLowerCase().includes(term) ||
            j.subject?.toLowerCase().includes(term)
        );
    }, [activeJobs, searchTerm]);

    // Sort: urgent ก่อน แล้วตาม deadline
    const sortedJobs = useMemo(() => {
        return [...filteredJobs].sort((a, b) => {
            const aUrgent = a.priority?.toLowerCase() === 'urgent';
            const bUrgent = b.priority?.toLowerCase() === 'urgent';
            if (aUrgent && !bUrgent) return -1;
            if (!aUrgent && bUrgent) return 1;
            return new Date(a.deadline || a.dueDate || a.createdAt) - new Date(b.deadline || b.dueDate || b.createdAt);
        });
    }, [filteredJobs]);

    // Navigation: เลื่อนทีละ 1 สัปดาห์
    const handlePrevious = () => setCurrentDate(prev => subWeeks(prev, 1));
    const handleNext     = () => setCurrentDate(prev => addWeeks(prev, 1));
    const handleToday    = () => setCurrentDate(new Date());
    const handleAutoFit  = () => setCurrentDate(earliestJobDate);

    if (jobs.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-400">
                <h3 className="text-lg font-medium text-gray-900">ไม่มีงานในระบบ</h3>
                <p className="text-gray-500">ยังไม่มีงานที่จะแสดงใน Timeline</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-gray-400 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevious} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="ย้อนกลับ">
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors">
                            วันนี้
                        </button>
                        <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="ถัดไป">
                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                            {format(dateRange.start, 'dd MMM yyyy', { locale: th })} – {format(dateRange.end, 'dd MMM yyyy', { locale: th })}
                        </span>
                    </div>

                    {/* Search & Auto-fit */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="ค้นหา DJ ID หรือชื่องาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none w-56"
                        />
                        <button
                            onClick={handleAutoFit}
                            className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
                            title="ดูทั้งหมด (auto-fit)"
                        >
                            ดูทั้งหมด
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <TimelineLegend holidays={holidays} />

            {/* Timeline Grid */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm overflow-hidden">
                <div ref={scrollRef} className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header */}
                        <TimelineHeader dateRange={dateRange} holidays={holidays} dayCellWidth={dayCellWidth} />

                        {/* Grid Body */}
                        <div className="relative">
                            {/* Weekend / Holiday column overlay (ครอบทุกแถว) */}
                            <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: `${LEFT_COL_W}px` }}>
                                {days.map((day, idx) => {
                                    const isHol = holidays.some(h => isSameDay(new Date(h.date), day));
                                    const isWknd = isWeekend(day);
                                    return (
                                        <div
                                            key={idx}
                                            className="flex-1"
                                            style={{
                                                minWidth: `${dayCellWidth}px`,
                                                background: isHol
                                                    ? 'rgba(254, 202, 202, 0.30)'
                                                    : isWknd
                                                        ? 'rgba(0, 0, 0, 0.035)'
                                                        : 'transparent',
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Today vertical line */}
                            {todayFrac !== null && (
                                <div
                                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                                    style={{
                                        // left = (1 - frac)*256px + frac*100%
                                        left: `calc(${(1 - todayFrac) * LEFT_COL_W}px + ${todayFrac * 100}%)`,
                                        width: '2px',
                                        background: 'rgba(239, 68, 68, 0.55)',
                                    }}
                                />
                            )}

                            {/* Job Rows */}
                            <div className="divide-y divide-gray-200">
                                {sortedJobs.map((job, idx) => {
                                    const badge = PRIORITY_BADGE[job.priority?.toLowerCase()];
                                    return (
                                        <div key={job.id} className={idx % 2 === 0 ? 'bg-white/80' : 'bg-gray-50/60'}>
                                            <div className="flex">
                                                {/* Job Info Column */}
                                                <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold text-gray-900 truncate" title={job.djId}>
                                                                {job.djId}
                                                            </div>
                                                            <div className="text-xs text-gray-600 truncate mt-0.5" title={job.subject}>
                                                                {job.subject}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-0.5 truncate" title={job.projectName}>
                                                                {job.projectName || 'ไม่ระบุโปรเจกต์'}
                                                            </div>
                                                        </div>
                                                        {badge && (
                                                            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${badge.cls}`}>
                                                                {badge.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Timeline Bar Column */}
                                                <div className="flex-1 relative" style={{ minHeight: '56px' }}>
                                                    <TimelineBar
                                                        job={job}
                                                        dateRange={dateRange}
                                                        rowIndex={0}
                                                        onClick={() => onJobClick(job.id)}
                                                        holidays={holidays}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="text-sm text-gray-500 text-center">
                แสดง {sortedJobs.length} งาน{searchTerm && ` (กรองจาก ${activeJobs.length} งาน)`}
                {holidays.length > 0 && <span className="ml-2 text-rose-400">• วันหยุด {holidays.length} วัน</span>}
            </div>
        </div>
    );
}
