/**
 * @file ApprovalStatsWidget.jsx
 * @description แสดงสถิติการอนุมัติของ Approver (แทน SLAWidget)
 * 
 * ข้อมูลที่แสดง:
 * - จำนวนงานรออนุมัติ
 * - จำนวนงานที่อนุมัติแล้ว
 * - จำนวนงานที่ปฏิเสธ
 * - อัตราการอนุมัติ
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getJobs } from '@/services/mockApi';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

export default function ApprovalStatsWidget() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const jobs = await getJobs();

                // นับงานรออนุมัติ (ที่ตรงกับ currentApproverId หรือทั้งหมด)
                const pending = jobs.filter(j =>
                    j.status === 'pending_approval' || j.status === 'waiting_approval'
                ).length;

                // นับงานที่อนุมัติแล้ว (status approved หรือหลังจากนั้น)
                const approved = jobs.filter(j =>
                    ['approved', 'in_progress', 'review', 'completed'].includes(j.status)
                ).length;

                // นับงานที่ปฏิเสธ
                const rejected = jobs.filter(j => j.status === 'rejected').length;

                setStats({
                    pending,
                    approved,
                    rejected,
                    total: pending + approved + rejected
                });
            } catch (err) {
                console.error('Error loading stats:', err);
            }
        };
        loadStats();
    }, [user]);

    // คำนวณอัตราการอนุมัติ
    const approvalRate = stats.total > 0
        ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100) || 0
        : 0;

    const statItems = [
        {
            icon: ClockIcon,
            iconColor: 'bg-amber-100 text-amber-600',
            title: 'รอดำเนินการ',
            value: stats.pending,
            suffix: 'งาน'
        },
        {
            icon: CheckCircleIcon,
            iconColor: 'bg-green-100 text-green-600',
            title: 'อนุมัติแล้ว',
            value: stats.approved,
            suffix: 'งาน'
        },
        {
            icon: XCircleIcon,
            iconColor: 'bg-red-100 text-red-600',
            title: 'ปฏิเสธ',
            value: stats.rejected,
            suffix: 'งาน'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Approval Stats */}
            <div>
                <h3 className="font-semibold text-slate-800 text-lg mb-4">สถิติการอนุมัติ</h3>
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-slate-200">
                    {statItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">{item.title}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-slate-800">{item.value}</span>
                                <span className="text-xs text-slate-500 ml-1">{item.suffix}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Approval Rate */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-indigo-800 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5" /> อัตราการอนุมัติ
                    </h4>
                    <span className="text-2xl font-bold text-indigo-600">{approvalRate}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-3 bg-indigo-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${approvalRate}%` }}
                    />
                </div>
                <p className="text-xs text-indigo-600 mt-2">
                    จากงานทั้งหมด {stats.approved + stats.rejected} รายการที่ดำเนินการแล้ว
                </p>
            </div>
        </div>
    );
}
