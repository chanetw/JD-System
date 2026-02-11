/**
 * @file FilterPanel.jsx
 * @description Component สำหรับแผงตัวกรองข้อมูล
 * 
 * วัตถุประสงค์:
 * - ให้ผู้ใช้กรองข้อมูลตามช่วงเวลา, แผนก, พนักงาน
 * - รองรับการเลือก Period ที่หลากหลาย (เดือนนี้, ไตรมาส, ปี, Custom)
 * - แสดงตัวกรองที่เหมาะสมตาม Role ของผู้ใช้
 */

import { useState } from 'react';

/**
 * @component FilterPanel
 * @description แผงตัวกรองข้อมูล
 * @param {object} props
 * @param {object} props.filters - Filters ปัจจุบัน
 * @param {function} props.onFiltersChange - Callback เมื่อ Filters เปลี่ยน
 * @param {array} props.projects - รายการโปรเจกต์
 * @param {array} props.users - รายการผู้ใช้
 */
export default function FilterPanel({ filters, onFiltersChange, projects = [], users = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    /**
     * จัดการเมื่อ Filter เปลี่ยน
     */
    const handleFilterChange = (key, value) => {
        onFiltersChange({
            ...filters,
            [key]: value
        });
    };

    /**
     * จัดการเมื่อเลือก Custom Date Range
     */
    const handleCustomDateChange = (field, value) => {
        onFiltersChange({
            ...filters,
            period: 'custom',
            [field]: value
        });
    };

    /**
     * Reset Filters
     */
    const handleReset = () => {
        onFiltersChange({
            period: 'this_month',
            startDate: null,
            endDate: null,
            status: null,
            projectId: null,
            assigneeId: null
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-400 shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-400">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">ตัวกรองข้อมูล</h3>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUpIcon />
                        ) : (
                            <ChevronDownIcon />
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Period Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ช่วงเวลา
                        </label>
                        <select
                            value={filters.period || 'this_month'}
                            onChange={(e) => handleFilterChange('period', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        >
                            <option value="this_month">เดือนนี้</option>
                            <option value="last_month">เดือนที่แล้ว</option>
                            <option value="this_quarter">ไตรมาสนี้</option>
                            <option value="last_quarter">ไตรมาสที่แล้ว</option>
                            <option value="this_year">ปีนี้</option>
                            <option value="last_year">ปีที่แล้ว</option>
                            <option value="custom">กำหนดเอง</option>
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {filters.period === 'custom' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    วันที่เริ่มต้น
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    วันที่สิ้นสุด
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            สถานะงาน
                        </label>
                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="completed">เสร็จสมบูรณ์</option>
                            <option value="in_progress">กำลังดำเนินการ</option>
                            <option value="pending_approval">รออนุมัติ</option>
                            <option value="rejected">ถูกปฏิเสธ</option>
                        </select>
                    </div>

                    {/* Project Filter */}
                    {projects.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                โปรเจกต์
                            </label>
                            <select
                                value={filters.projectId || ''}
                                onChange={(e) => handleFilterChange('projectId', e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            >
                                <option value="">ทั้งหมด</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Assignee Filter */}
                    {users.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ผู้รับผิดชอบ
                            </label>
                            <select
                                value={filters.assigneeId || ''}
                                onChange={(e) => handleFilterChange('assigneeId', e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            >
                                <option value="">ทั้งหมด</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.displayName || user.firstName || user.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-400">
                        <button
                            onClick={handleReset}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            รีเซ็ต
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
                        >
                            ใช้ตัวกรอง
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Icons
// ============================================

function ChevronUpIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}
