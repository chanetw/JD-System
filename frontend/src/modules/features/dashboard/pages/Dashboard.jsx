/**
 * @file Dashboard.jsx
 * @description หน้า Dashboard แสดงภาพรวมงานตาม Role ของผู้ใช้
 * 
 * Senior Programmer Notes:
 * - ใช้ useEffect สำหรับ fetch ข้อมูลเมื่อ component โหลด
 * - แสดงข้อมูลแตกต่างกันตาม Role:
 *   - Requester: เห็นเฉพาะงานที่ตัวเองสร้าง
 *   - Assignee: เห็นเฉพาะงานที่ assigned ให้ตัวเอง
 *   - Approver: เห็นเฉพาะงานที่รออนุมัติ
 *   - Admin: เห็นทั้งหมด
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import api from '@shared/services/apiService';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { hasAnyRole } from '@shared/utils/permission.utils';

/**
 * @component Dashboard
 * @description หน้า Dashboard หลัก
 */
export default function Dashboard() {
    // ดึงข้อมูล user จาก authStore
    const { user } = useAuthStoreV2();
    console.log('[Dashboard] Current User:', user);
    console.log('[Dashboard] User Role:', user?.roleName);

    // ============================================
    // State - ข้อมูลที่ใช้ใน Component
    // ============================================

    // สถิติ Dashboard (New Today, Due Tomorrow, etc.)
    const [stats, setStats] = useState({
        newToday: 0,
        dueTomorrow: 0,
        dueToday: 0,
        overdue: 0,
    });

    // รายการงาน
    const [jobs, setJobs] = useState([]);

    // สถานะกำลังโหลด
    const [isLoading, setIsLoading] = useState(true);

    // Filter ที่เลือก (ทั้งหมด, Due in 1 day, Overdue, etc.)
    const [filter, setFilter] = useState('all');

    // ============================================
    // useEffect - โหลดข้อมูลเมื่อ user เปลี่ยน
    // ============================================
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                // โหลดสถิติ Dashboard
                const statsData = await api.getDashboardStats(user);
                setStats(statsData);

                // โหลดรายการงานตาม Role
                const jobsData = await api.getJobsByRole(user);
                setJobs(jobsData);
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user]);

    // ============================================
    // Filter Jobs - กรองรายการงาน
    // ============================================
    const filteredJobs = jobs.filter(job => {
        switch (filter) {
            case 'due1day':
                return !job.isOverdue && job.deadline; // TODO: implement actual logic
            case 'overdue':
                return job.isOverdue;
            case 'pending':
                return job.status === 'pending_approval';
            case 'scheduled':
                return job.status === 'scheduled';
            default:
                return true;
        }
    });

    // แสดง Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="md" color="rose" label="" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ============================================
          Page Title - หัวข้อหน้า
          ============================================ */}
            {/* ============================================
          Page Title - หัวข้อหน้า
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">
                        สวัสดี, {user?.firstName || user?.firstName || 'ผู้ใช้งาน'} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">({user?.roleName || 'User'})</span>
                    </p>
                </div>

                {/* ปุ่ม Create DJ (เฉพาะ Admin และ Requester) */}
                {hasAnyRole(user, ['Admin', 'Requester']) && (
                    <Link
                        to="/create"
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>สร้างงานใหม่</span>
                    </Link>
                )}
            </div>

            {/* ============================================
          KPI Cards - การ์ดสถิติ
          ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="New Today"
                    value={stats.newToday}
                    icon={<SparklesIcon />}
                    color="blue"
                />
                <StatCard
                    title="Due Tomorrow"
                    value={stats.dueTomorrow}
                    icon={<CalendarIcon />}
                    color="amber"
                />
                <StatCard
                    title="Due Today"
                    value={stats.dueToday}
                    icon={<ClockIcon />}
                    color="orange"
                />
                <StatCard
                    title="Overdue"
                    value={stats.overdue}
                    icon={<ExclamationIcon />}
                    color="red"
                />
            </div>

            {/* ============================================
          My Queue - รายการงานของฉัน
          ============================================ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-400">
                {/* Header พร้อม Filters */}
                <div className="p-4 border-b border-gray-400">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">My Queue</h2>

                        {/* Filter Tabs */}
                        <div className="flex gap-2">
                            {[
                                { id: 'all', label: 'ทั้งหมด' },
                                { id: 'due1day', label: 'Due in 1 day' },
                                { id: 'overdue', label: 'Overdue' },
                                { id: 'pending', label: 'Pending Approval' },
                                { id: 'scheduled', label: 'Scheduled' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === tab.id
                                        ? 'bg-rose-100 text-rose-700 font-medium'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Jobs Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-400">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DJ ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Update</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-400">
                            {filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                        ไม่มีรายการงาน
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(job => (
                                    <JobRow key={job.id} job={job} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/**
 * @component StatCard
 * @description การ์ดแสดงสถิติ (KPI Card)
 */
function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-gray-400 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * @component JobRow
 * @description แถวแสดงข้อมูลงานในตาราง
 */
function JobRow({ job }) {
    // กำหนดสีตามสถานะ
    const statusColors = {
        draft: 'bg-gray-100 text-gray-700',
        scheduled: 'bg-violet-100 text-violet-700',
        submitted: 'bg-blue-100 text-blue-700',
        pending_approval: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        assigned: 'bg-cyan-100 text-cyan-700',
        in_progress: 'bg-blue-100 text-blue-700',
        rework: 'bg-yellow-100 text-yellow-700',
        rejected: 'bg-red-100 text-red-700',
        completed: 'bg-green-100 text-green-700',
    };

    // แสดง SLA Badge
    const getSLABadge = () => {
        if (job.isOverdue) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                    Overdue +{job.overdueDays}
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                {job.slaWorkingDays} days
            </span>
        );
    };

    return (
        <tr className={`hover:bg-gray-50 ${job.status === 'scheduled' ? 'bg-violet-50' : ''}`}>
            <td className="px-4 py-3">
                <Link to={`/jobs/${job.id}`} className="text-rose-600 font-medium hover:underline">
                    {job.djId}
                </Link>
            </td>
            <td className="px-4 py-3 text-sm text-gray-900">
                {job.project?.name || '-'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
                {job.jobType?.name || '-'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                {job.subject}
            </td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[job.status]}`}>
                    {job.status.replace('_', ' ')}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
                {job.deadline ? new Date(job.deadline).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
            </td>
            <td className="px-4 py-3">
                {getSLABadge()}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
                {job.assignee?.name || job.assigneeId ? 'Graphic' : '-'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
                {job.updatedAt ? new Date(job.updatedAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
            </td>
            <td className="px-4 py-3">
                <Link
                    to={`/jobs/${job.id}`}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                >
                    View
                </Link>
            </td>
        </tr>
    );
}

// ============================================
// Icons
// ============================================

function PlusIcon({ className = "w-5 h-5" }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function SparklesIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function ExclamationIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}
