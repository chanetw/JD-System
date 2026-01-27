/**
 * @file SLAReportTable.jsx
 * @description Component สำหรับแสดงตารางรายงาน SLA
 * 
 * วัตถุประสงค์:
 * - แสดงตารางงานที่เสร็จแล้ว พร้อมข้อมูล SLA
 * - แสดงคอลัมน์: รหัสงาน, ผู้รับผิดชอบ, เวลาที่กำหนด, เวลาที่ใช้จริง, ความคลาดเคลื่อน
 * - รองรับ Pagination
 * - รองรับ Loading และ Error states
 */

import { useState } from 'react';

/**
 * @component SLAReportTable
 * @description ตารางรายงาน SLA
 * @param {object} props
 * @param {array} props.data - ข้อมูลงาน
 * @param {boolean} props.isLoading - สถานะ Loading
 * @param {string} props.error - ข้อความ Error
 * @param {number} props.pageSize - จำนวนรายการต่อหน้า
 */
export default function SLAReportTable({ data = [], isLoading, error, pageSize = 10 }) {
    const [currentPage, setCurrentPage] = useState(1);

    // คำนวณ Pagination
    const totalPages = Math.ceil(data.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    /**
     * จัดรูปแบบวันที่
     */
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
        });
    };

    /**
     * คำนวณความคลาดเคลื่อน (วัน)
     */
    const calculateDeviation = (planned, actual) => {
        if (!planned || !actual) return null;
        const plannedDate = new Date(planned);
        const actualDate = new Date(actual);
        const diffTime = actualDate - plannedDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    /**
     * แสดงสถานะ SLA
     */
    const getSLAStatus = (deviation) => {
        if (deviation === null) return { text: '-', color: 'text-gray-500' };
        if (deviation <= 0) return { text: 'ตรงเวลา', color: 'text-green-600' };
        if (deviation <= 3) return { text: 'ล่าช้าน้อย', color: 'text-amber-600' };
        return { text: 'ล่าช้ามาก', color: 'text-red-600' };
    };

    // แสดง Loading state
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // แสดง Error state
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
                <p className="font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    // แสดง Empty state
    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-center py-8">
                    <EmptyIcon />
                    <p className="text-gray-500 mt-2">ไม่พบข้อมูล</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                รหัสงาน
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ผู้รับผิดชอบ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                เวลาที่กำหนด (Plan)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                เวลาที่ใช้จริง (Actual)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ความคลาดเคลื่อน
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                สถานะ SLA
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedData.map((job) => {
                            const deviation = calculateDeviation(job.deadline, job.completedAt);
                            const slaStatus = getSLAStatus(deviation);

                            return (
                                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {job.djNumber || job.id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {job.assignee?.displayName || job.assignee?.firstName || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {formatDate(job.deadline)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {formatDate(job.completedAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {deviation !== null && (
                                            <div className={`text-sm font-medium ${deviation <= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {deviation > 0 ? '+' : ''}{deviation} วัน
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${slaStatus.color}`}>
                                            {slaStatus.text}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        แสดง {startIndex + 1} ถึง {Math.min(endIndex, data.length)} จากทั้งหมด {data.length} รายการ
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ก่อนหน้า
                        </button>
                        <span className="px-3 py-1 text-gray-700">
                            หน้า {currentPage} จาก {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ถัดไป
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

function EmptyIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}
