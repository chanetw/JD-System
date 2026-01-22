/**
 * @file ReportsDashboard.jsx
 * @description หน้าจอรายงานสรุปผลและวิเคราะห์ข้อมูล (Admin Reports & Analytics)
 *
 * วัตถุประสงค์หลัก:
 * - แสดงตัวชี้วัดประสิทธิภาพ (KPI) เช่น จำนวนงานรวม, งานที่ตรงเวลา, และงานที่ล่าช้า
 * - วิเคราะห์การกระจายภาระงาน (Workload Distribution) ตามตัวบุคคล
 * - สรุปสถิติประเภทงาน (Job Type Analytics) ที่ถูกสั่งงานมากที่สุด
 * - แสดงประสิทธิภาพการทำงานตามเป้าหมาย (SLA Performance)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import {
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';

export default function ReportsDashboard() {
    // === สถานะข้อมูล (Data States) ===
    const [jobs, setJobs] = useState([]); // รายการงานทั้งหมดที่ดึงมาคำนวณ
    const [stats, setStats] = useState({
        total: 0,   // จำนวนงานทั้งหมด
        onTime: 0,  // งานที่ทำเสร็จทันเวลา
        overdue: 0, // งานที่เกินกำหนด
        avgDays: 0  // ระยะเวลาทำงานเฉลี่ย (วัน)
    });
    const [workload, setWorkload] = useState([]); // ข้อมูลการกระจายงานรายบุคคล
    const [jobTypeStats, setJobTypeStats] = useState([]); // ข้อมูลสรุปตามประเภทงาน

    useEffect(() => {
        loadData();
    }, []);

    /** ฟังก์ชันโหลดและคำนวณสถิติเพื่อนำมาแสดงผล */
    const loadData = async () => {
        const allJobs = await api.getJobs();
        setJobs(allJobs);

        // 1. คำนวณภาพรวม (Overall Stats)
        const completed = allJobs.filter(j => j.status === 'completed');
        const onTime = completed.filter(j => !j.isOverdue);
        const overdue = allJobs.filter(j => j.isOverdue);

        setStats({
            total: allJobs.length,
            onTime: onTime.length,
            overdue: overdue.length,
            // คำนวณวันทำงานเฉลี่ย (กรณีที่มีงานเสร็จแล้ว)
            avgDays: completed.length > 0 ? Math.round(completed.reduce((sum, j) => sum + (j.actualDays || 7), 0) / completed.length) : 0
        });

        // 2. คำนวณภาระงานแยกตามผู้รับผิดชอบ (Workload by Assignee)
        const assigneeMap = {};
        allJobs.forEach(j => {
            if (j.assigneeName) {
                if (!assigneeMap[j.assigneeName]) {
                    assigneeMap[j.assigneeName] = { name: j.assigneeName, count: 0 };
                }
                assigneeMap[j.assigneeName].count++;
            }
        });
        setWorkload(Object.values(assigneeMap));

        // 3. คำนวณสถิติแยกตามประเภทงาน (Job Type Stats)
        const typeMap = {};
        allJobs.forEach(j => {
            if (j.jobType) {
                if (!typeMap[j.jobType]) {
                    typeMap[j.jobType] = { type: j.jobType, count: 0 };
                }
                typeMap[j.jobType].count++;
            }
        });
        setJobTypeStats(Object.values(typeMap));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">ตัวชี้วัดและรายงานสรุป (Reports & Analytics)</h1>
                <p className="text-gray-500">ติดตามภาพรวมการทำงานและประสิทธิภาพของทีมในระบบ DJ</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    icon={<ChartBarIcon className="w-6 h-6" />}
                    label="งานทั้งหมด"
                    value={stats.total}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={<CheckCircleIcon className="w-6 h-6" />}
                    label="ทำเสร็จตรงเวลา"
                    value={stats.onTime}
                    color="bg-green-500"
                />
                <StatCard
                    icon={<ExclamationTriangleIcon className="w-6 h-6" />}
                    label="เกินกำหนด"
                    value={stats.overdue}
                    color="bg-red-500"
                />
                <StatCard
                    icon={<ClockIcon className="w-6 h-6" />}
                    label="เวลาเฉลี่ย (วัน)"
                    value={stats.avgDays}
                    color="bg-amber-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ส่วนแสดงภาระงาน (Workload Distribution) */}
                <Card>
                    <CardHeader title="การกระจายภาระงาน (Workload Distribution)">
                        <UserGroupIcon className="w-5 h-5 text-gray-400" />
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {workload.map((w, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-24 text-sm font-medium text-gray-700">{w.name}</div>
                                    <div className="flex-1">
                                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="bg-rose-500 h-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                                                style={{ width: `${Math.min((w.count / stats.total) * 100, 100)}%` }}
                                            >
                                                {w.count}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* สถิติตามประเภทงาน (Job Type Analytics) */}
                <Card>
                    <CardHeader title="สถิติจำแนกตามประเภทงาน (Job Type Analytics)">
                        <ChartBarIcon className="w-5 h-5 text-gray-400" />
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {jobTypeStats.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{t.type}</span>
                                    <span className="text-lg font-bold text-gray-900">{t.count} งาน</span>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* ส่วนวัดประสิทธิภาพตาม SLA (SLA Performance) */}
            <Card>
                <CardHeader title="ประสิทธิภาพการทำงานตามเป้าหมาย (SLA Performance)" />
                <CardBody>
                    <div className="flex items-center justify-around py-8">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-green-500">{stats.onTime}</div>
                            <div className="text-sm text-gray-500 mt-2">ตรงเวลา (On-time)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-red-500">{stats.overdue}</div>
                            <div className="text-sm text-gray-500 mt-2">เกินกำหนด (Overdue)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-blue-500">
                                {stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0}%
                            </div>
                            <div className="text-sm text-gray-500 mt-2">อัตราความสำเร็จ</div>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

/**
 * StatCard: การ์ดแสดงผลตัวเลขสถิติ (KPI)
 * @param {object} props
 * @param {React.ReactNode} props.icon - ไอคอนประจำการ์ด
 * @param {string} props.label - หัวข้อตัวชี้วัด
 * @param {string|number} props.value - ค่าตัวเลขที่จะแสดง
 * @param {string} props.color - คลาสสีพื้นหลังของไอคอน
 */
function StatCard({ icon, label, value, color }) {
    return (
        <Card>
            <CardBody>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        <p className="text-sm text-gray-500">{label}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
