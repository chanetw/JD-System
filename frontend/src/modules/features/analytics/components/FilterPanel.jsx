/**
 * @file FilterPanel.jsx
 * @description Component ตัวกรองข้อมูลแบบ Inline - ใช้งานง่าย ไม่ต้องพับ/กาง
 */

import { useState } from 'react';
import { Calendar, Filter, RotateCcw, X } from 'lucide-react';
import { ANALYTICS_FILTER_OPTIONS, WORK_STATUS_LABEL } from '@shared/constants/jobStatus';
import ResponsiveSelect from '@shared/components/ResponsiveSelect';

/**
 * @component FilterPanel
 * @description แผงตัวกรองข้อมูลแบบ Inline พร้อม Active Filters
 */
export default function FilterPanel({ filters, onFiltersChange, projects = [], users = [] }) {
    const [showCustomDate, setShowCustomDate] = useState(filters.period === 'custom');

    const getUserLabel = (user) => {
        if (!user) return '';
        if (user.name && String(user.name).trim()) return String(user.name).trim();
        if (user.displayName && String(user.displayName).trim()) return String(user.displayName).trim();

        const firstName = user.firstName || user.first_name;
        const lastName = user.lastName || user.last_name;
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        if (fullName) return fullName;

        return user.email || 'ไม่ระบุชื่อ';
    };

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
            const user = users.find(u => String(u.id) === String(filters.assigneeId));
            if (user) active.push({ key: 'assigneeId', label: getUserLabel(user) });
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
                            <ResponsiveSelect
                                value={filters.period || 'this_month'}
                                onChange={(e) => handleFilterChange('period', e.target.value)}
                                leadingIcon={Calendar}
                                className="bg-gray-50 border-gray-200 hover:bg-white"
                                options={[
                                    { value: 'this_month', label: 'เดือนนี้' },
                                    { value: 'last_month', label: 'เดือนที่แล้ว' },
                                    { value: 'this_quarter', label: 'ไตรมาสนี้' },
                                    { value: 'last_quarter', label: 'ไตรมาสที่แล้ว' },
                                    { value: 'this_year', label: 'ปีนี้' },
                                    { value: 'last_year', label: 'ปีที่แล้ว' },
                                    { value: 'custom', label: 'กำหนดเอง...' }
                                ]}
                            />
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
                            <ResponsiveSelect
                                value={filters.status || ''}
                                onChange={(e) => handleFilterChange('status', e.target.value || null)}
                                leadingIcon={Filter}
                                className="bg-gray-50 border-gray-200 hover:bg-white"
                                options={[
                                    { value: '', label: 'ทั้งหมด' },
                                    ...ANALYTICS_FILTER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
                                ]}
                            />
                        </div>

                        {/* Project */}
                        {projects.length > 0 && (
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    โปรเจกต์
                                </label>
                                <ResponsiveSelect
                                    value={filters.projectId || ''}
                                    onChange={(e) => handleFilterChange('projectId', e.target.value || null)}
                                    className="bg-gray-50 border-gray-200 hover:bg-white"
                                    options={[
                                        { value: '', label: 'ทั้งหมด' },
                                        ...projects.map(project => ({ value: project.id, label: project.name }))
                                    ]}
                                />
                            </div>
                        )}

                        {/* Assignee */}
                        {users.length > 0 && (
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                    ผู้รับผิดชอบ
                                </label>
                                <ResponsiveSelect
                                    value={filters.assigneeId || ''}
                                    onChange={(e) => handleFilterChange('assigneeId', e.target.value || null)}
                                    className="bg-gray-50 border-gray-200 hover:bg-white"
                                    options={[
                                        { value: '', label: 'ทั้งหมด' },
                                        ...users.map(user => ({ value: user.id, label: getUserLabel(user) }))
                                    ]}
                                />
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
