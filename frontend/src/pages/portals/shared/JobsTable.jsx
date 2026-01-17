/**
 * @file JobsTable.jsx
 * @description Jobs Table Component (Shared)
 * โหลดข้อมูลจาก props, clickable rows
 */

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Badge from '@/components/common/Badge';

export default function JobsTable({
    title = "งานล่าสุดของฉัน",
    jobs = [],
    isLoading = false,
    showViewAll = true,
    viewAllLink = "/jobs"
}) {
    const navigate = useNavigate();

    // ฟังก์ชันหา relative time
    const getRelativeTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'เมื่อสักครู่';
        if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
        if (diffDays === 1) return 'เมื่อวาน';
        return `${diffDays} วันที่แล้ว`;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
                {showViewAll && (
                    <Link to={viewAllLink} className="text-rose-600 hover:underline text-sm">ดูทั้งหมด</Link>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DJ ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่องาน</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">อัปเดตล่าสุด</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                    <div className="animate-spin w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full mx-auto"></div>
                                </td>
                            </tr>
                        ) : jobs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                    ไม่มีงาน
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr
                                    key={job.id}
                                    onClick={() => navigate(`/jobs/${job.id}`)}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-rose-600">{job.djId || `DJ-${job.id}`}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm text-slate-800">{job.subject}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge status={job.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-slate-600">{getRelativeTime(job.updatedAt || job.createdAt)}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
