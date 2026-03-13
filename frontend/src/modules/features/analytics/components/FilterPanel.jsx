/**
 * @file FilterPanel.jsx
 * @description Component ตัวกรองข้อมูลแบบ Inline - ใช้งานง่าย ไม่ต้องพับ/กาง
 */

import { useState } from 'react';
import { Calendar, Filter, RotateCcw, ChevronDown, X } from 'lucide-react';
import { ANALYTICS_FILTER_OPTIONS, WORK_STATUS_LABEL } from '@shared/constants/jobStatus';

/**
 * @component FilterPanel
 * @description แผงตัวกรองข้อมูลแบบ Inline พร้อม Active Filters
 */
export default function FilterPanel({ filters, onFiltersChange, projects = [], users = [] }) {
    const [showCustomDate, setShowCustomDate] = useState(filters.period === 'custom');

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'period' && value === 'custom') {
            setShowCustomDate(true);
        } else if (key === 'period' && value !== 'custom') {
            setShowCustomDate(false);
            newFilters.startDate = null;
            newFilters.endDate = null;
        }
        onFiltersChange(newFilters);
    };

    const handleReset = () => {
        setShowCustomDate(false);
        onFiltersChange({
            period: 'this_month',
            startDate: null,
            endDate: null,
            status: null,
            projectId: null,
            assigneeId: null
        });
    };

    // สร้าง Active Filters Badge
    const getActiveFilters = () => {
        const active = [];
        
        // Period
        const periodLabels = {
            this_month: 'เดือนนี้',
            last_month: 'เดือนที่แล้ว',
            this_quarter: 'ไตรมาสนี้',
            last_quarter: 'ไตรมาสที่แล้ว',
            this_year: 'ปีนี้',
            last_year: 'ปีที่แล้ว',
            custom: 'กำหนดเอง'
        };
        if (filters.period && filters.period !== 'this_month') {
            active.push({ key: 'period', label: periodLabels[filters.period] || filters.period, icon: Calendar });
        }

        // Status
        if (filters.status) {
            active.push({ key: 'status', label: WORK_STATUS_LABEL[filters.status] || filters.status });
        }

        // Project
        if (filters.projectId) {
            const project = projects.find(p => p.id === filters.projectId);
            if (project) active.push({ key: 'projectId', label: project.name });
        }

        // Assignee
        if (filters.assigneeId) {
            const user = users.find(u => u.id === filters.assigneeId);
            if (user) active.push({ key: 'assigneeId', label: user.firstName || user.email });
        }

        return active;
    };

    const activeFilters = getActiveFilters();
    const hasActiveFilters = activeFilters.length > 0;

    const removeFilter = (key) => {
        handleFilterChange(key, key === 'period' ? 'this_month' : null);
    };

    return (
        <div className="space-y-3">
            {/* Filter Controls - Inline Layout */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Row 1: Period & Custom Date */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        {/* Period */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                ช่วงเวลา
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={filters.period || 'this_month'}
                                    onChange={(e) => handleFilterChange('period', e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white transition-colors"
                                >
                                    <option value="this_month">เดือนนี้</option>
                                    <option value="last_month">เดือนที่แล้ว</option>
                                    <option value="this_quarter">ไตรมาสนี้</option>
                                    <option value="last_quarter">ไตรมาสที่แล้ว</option>
                                    <option value="this_year">ปีนี้</option>
                                    <option value="last_year">ปีที่แล้ว</option>
                                    <option value="custom">กำหนดเอง...</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        {showCustomDate && (
                            <>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                        จากวันที่
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.startDate || ''}
                                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent hover:bg-white transition-colors"
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                        ถึงวันที่
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.endDate || ''}
                                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent hover:bg-white transition-colors"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block w-px h-12 bg-gray-200" />

                    {/* Row 2: Status, Project, Assignee */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        {/* Status */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                สถานะ
                            </label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={filters.status || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value || null)}
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white transition-colors"
                                >
                                    <option value="">ทั้งหมด</option>
                                    {ANALYTICS_FILTER_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Project */}
                        {projects.length > 0 && (
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    โปรเจกต์
                                </label>
                                <div className="relative">
                                    <select
                                        value={filters.projectId || ''}
                                        onChange={(e) => handleFilterChange('projectId', e.target.value || null)}
                                        className="w-full px-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white transition-colors"
                                    >
                                        <option value="">ทั้งหมด</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Assignee */}
                        {users.length > 0 && (
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    ผู้รับผิดชอบ
                                </label>
                                <div className="relative">
                                    <select
                                        value={filters.assigneeId || ''}
                                        onChange={(e) => handleFilterChange('assigneeId', e.target.value || null)}
                                        className="w-full px-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none cursor-pointer hover:bg-white transition-colors"
                                    >
                                        <option value="">ทั้งหมด</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstName || user.email}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">
                                รีเซ็ต
                            </label>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="รีเซ็ตตัวกรอง"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="hidden sm:inline">รีเซ็ต</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-xs text-gray-500">ตัวกรองที่ใช้:</span>
                    {activeFilters.map((filter, index) => (
                        <button
                            key={`${filter.key}-${index}`}
                            onClick={() => removeFilter(filter.key)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 text-sm rounded-full hover:bg-rose-100 transition-colors group"
                        >
                            {filter.icon && <filter.icon className="w-3.5 h-3.5" />}
                            <span>{filter.label}</span>
                            <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
