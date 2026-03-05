/**
 * @file TimelineView.jsx
 * @description Timeline View แบบ Gantt Chart สำหรับแสดงภาพรวมงานทั้งหมด
 */

import React, { useState, useMemo } from 'react';
import { differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from 'date-fns';
import TimelineHeader from './TimelineHeader';
import TimelineBar from './TimelineBar';
import TimelineLegend from './TimelineLegend';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function TimelineView({ jobs, onJobClick }) {
    const [viewMode, setViewMode] = useState('month'); // 'week' | 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    // Log when component mounts/updates
    console.log(`[TimelineView] 🎨 Rendering with ${jobs?.length || 0} jobs`);
    console.log(`[TimelineView] 📊 Jobs data:`, jobs);

    // Calculate date range based on view mode
    const dateRange = useMemo(() => {
        const today = new Date();
        let start, end;

        if (viewMode === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
            end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 0 }); // 4 weeks
        } else {
            // Month view: show 8 weeks (2 months)
            start = startOfWeek(currentDate, { weekStartsOn: 0 });
            end = endOfWeek(addWeeks(start, 7), { weekStartsOn: 0 }); // 8 weeks
        }

        return { start, end };
    }, [viewMode, currentDate]);

    // Filter jobs: only show "in_progress" jobs (same as "กำลังทำ" tab)
    const activeJobs = useMemo(() => {
        // สถานะที่แสดงใน Timeline = สถานะเดียวกับแท็บ "กำลังทำ"
        const inProgressStatuses = ['approved', 'assigned', 'in_progress', 'correction', 'rework', 'returned', 'pending_dependency'];
        const filtered = jobs.filter(j => inProgressStatuses.includes(j.status?.toLowerCase()));
        console.log(`[TimelineView] 🔍 Filtered jobs: ${filtered.length} in-progress jobs from ${jobs.length} total jobs`);
        console.log(`[TimelineView] 📋 Included statuses:`, inProgressStatuses);
        return filtered;
    }, [jobs]);

    // Filter jobs by search term (DJ ID or subject)
    const filteredJobs = useMemo(() => {
        if (!searchTerm.trim()) return activeJobs;
        const term = searchTerm.toLowerCase();
        return activeJobs.filter(j => 
            j.djId?.toLowerCase().includes(term) || 
            j.subject?.toLowerCase().includes(term)
        );
    }, [activeJobs, searchTerm]);

    // Sort jobs: urgent first, then by deadline (earliest first)
    const sortedJobs = useMemo(() => {
        console.log(`[TimelineView] 📦 Sorting ${filteredJobs.length} filtered jobs by priority and deadline`);
        const sorted = [...filteredJobs].sort((a, b) => {
            // งานด่วน (urgent) ขึ้นด้านบนสุด
            const aIsUrgent = a.priority?.toLowerCase() === 'urgent';
            const bIsUrgent = b.priority?.toLowerCase() === 'urgent';
            
            if (aIsUrgent && !bIsUrgent) return -1;
            if (!aIsUrgent && bIsUrgent) return 1;
            
            // ถ้า priority เท่ากัน เรียงตาม deadline
            const aDate = new Date(a.deadline || a.dueDate || a.createdAt);
            const bDate = new Date(b.deadline || b.dueDate || b.createdAt);
            return aDate - bDate;
        });
        console.log(`[TimelineView] ✅ Sorted ${sorted.length} jobs (urgent first, then by deadline)`);
        return sorted;
    }, [filteredJobs]);

    // Navigation handlers
    const handlePrevious = () => {
        if (viewMode === 'week') {
            setCurrentDate(subWeeks(currentDate, 4));
        } else {
            setCurrentDate(subWeeks(currentDate, 8));
        }
    };

    const handleNext = () => {
        if (viewMode === 'week') {
            setCurrentDate(addWeeks(currentDate, 4));
        } else {
            setCurrentDate(addWeeks(currentDate, 8));
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

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
                        <button
                            onClick={handlePrevious}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="ย้อนกลับ"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            วันนี้
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="ถัดไป"
                        >
                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                            {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
                        </span>
                    </div>

                    {/* View Mode & Filters */}
                    <div className="flex items-center gap-2">
                        {/* Search Box */}
                        <input
                            type="text"
                            placeholder="ค้นหา DJ ID หรือชื่องาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none w-64"
                        />

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-3 py-1 text-sm rounded transition-colors ${
                                    viewMode === 'week' 
                                        ? 'bg-white text-gray-900 shadow-sm font-medium' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                4 สัปดาห์
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-3 py-1 text-sm rounded transition-colors ${
                                    viewMode === 'month' 
                                        ? 'bg-white text-gray-900 shadow-sm font-medium' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                8 สัปดาห์
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <TimelineLegend />

            {/* Timeline Grid */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header */}
                        <TimelineHeader dateRange={dateRange} />

                        {/* Job Rows */}
                        <div className="divide-y divide-gray-200">
                            {sortedJobs.map((job, idx) => (
                                <div key={job.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <div className="flex">
                                        {/* Job Info Column */}
                                        <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-gray-900 truncate" title={job.djId}>
                                                        {job.djId}
                                                    </div>
                                                    <div className="text-xs text-gray-600 truncate" title={job.subject}>
                                                        {job.subject}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {job.projectName || 'ไม่ระบุโปรเจกต์'}
                                                    </div>
                                                </div>
                                                {/* Priority Badge */}
                                                {job.priority?.toLowerCase() === 'urgent' && (
                                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                                        ด่วน
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Timeline Bar Column */}
                                        <div className="flex-1 relative" style={{ minHeight: '48px' }}>
                                            <TimelineBar
                                                job={job}
                                                dateRange={dateRange}
                                                rowIndex={0}
                                                totalRows={1}
                                                onClick={() => onJobClick(job.id)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="text-sm text-gray-500 text-center">
                แสดง {sortedJobs.length} งาน{searchTerm && ` (กรองจาก ${jobs.length} งาน)`}
            </div>
        </div>
    );
}
