/**
 * @file Dashboard.jsx
 * @description หน้า Dashboard แสดงภาพรวมงานตาม Role ของผู้ใช้
 *
 * Features:
 * - KPI Cards: New Today, Due Today, Overdue — กดแล้วเปิด Drill-down Panel
 * - Drill-down Panel: Lazy Load / Infinite Scroll (20 รายการต่อครั้ง)
 * - My Queue: กรองและแสดงรายการงานตาม Role
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import api from '@shared/services/apiService';
import httpClient from '@shared/services/httpClient';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { hasAnyRole } from '@shared/utils/permission.utils';

// ============================================
// Constants
// ============================================

/** ชื่อแสดงผลและ config สีของแต่ละ KPI Type */
const KPI_CONFIG = {
    newToday: {
        title: 'งานมาใหม่วันนี้',
        titleEn: 'New Jobs',
        emptyText: 'ไม่มีงานสร้างวันนี้',
        color: 'blue',
        borderColor: 'border-blue-300',
        bgHeader: 'bg-blue-50',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-500',
    },
    dueToday: {
        title: 'งานครบกำหนดวันนี้',
        titleEn: 'Due Today',
        emptyText: 'ไม่มีงานครบกำหนดวันนี้',
        color: 'orange',
        borderColor: 'border-orange-300',
        bgHeader: 'bg-orange-50',
        textColor: 'text-orange-700',
        iconColor: 'text-orange-500',
    },
    overdue: {
        title: 'งานเกินกำหนด',
        titleEn: 'Overdue',
        emptyText: 'ไม่มีงานเกินกำหนด 🎉',
        color: 'red',
        borderColor: 'border-red-300',
        bgHeader: 'bg-red-50',
        textColor: 'text-red-700',
        iconColor: 'text-red-500',
    },
};

// ============================================
// Main Component
// ============================================

/**
 * @component Dashboard
 * @description หน้า Dashboard หลัก
 */
export default function Dashboard() {
    const { user } = useAuthStoreV2();

    // KPI Stats
    const [stats, setStats] = useState({ newToday: 0, dueToday: 0, overdue: 0 });

    // My Queue jobs list — Lazy Load
    const [jobs, setJobs] = useState([]);
    const [queuePage, setQueuePage] = useState(1);
    const [queueHasMore, setQueueHasMore] = useState(false);
    const [queueLoading, setQueueLoading] = useState(false);
    const [queueTotal, setQueueTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('');  // string ชื่อ assignee ที่กรอง
    const [statusFilter, setStatusFilter] = useState('');      // status ที่ต้องการกรอง
    const [showParent, setShowParent] = useState(false);       // เปิด/ปิดการแสดง Parent Jobs

    // Drill-down Panel state (KPI Cards)
    const [activePanel, setActivePanel] = useState(null); // 'newToday' | 'dueToday' | 'overdue' | null
    const [panelJobs, setPanelJobs] = useState([]);
    const [panelPage, setPanelPage] = useState(1);
    const [panelTotal, setPanelTotal] = useState(0);
    const [panelHasMore, setPanelHasMore] = useState(false);
    const [panelLoading, setPanelLoading] = useState(false);

    // IntersectionObserver sentinel refs
    const sentinelRef = useRef(null);     // KPI Drill-down panel sentinel
    const queueSentinelRef = useRef(null); // My Queue sentinel

    // ============================================
    // Helper: สร้าง role param เดียวกับ getJobsByRole
    // ============================================
    const getRoleParam = useCallback(() => {
        let allRoles = [];
        if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
            allRoles = user.roles.map(r => (typeof r === 'string' ? r : r?.name || '')).filter(Boolean);
        }
        if (allRoles.length === 0) {
            allRoles = [user?.roleName || user?.role?.name || user?.role || 'requester'];
        }
        return allRoles.map(r => r.toLowerCase()).join(',');
    }, [user]);

    // ============================================
    // Load Dashboard Stats on mount
    // ============================================
    useEffect(() => {
        if (!user) return;
        const loadStats = async () => {
            try {
                const statsData = await api.getDashboardStats(user);
                setStats(statsData);
            } catch (err) {
                console.error('Error loading stats:', err);
            }
        };
        loadStats();
    }, [user]);

    // ============================================
    // Load My Queue (ครั้งแรก และเมื่อ filter เปลี่ยน)
    // ============================================
    const fetchQueueJobs = useCallback(async (pageNum, append = false) => {
        if (!user || queueLoading) return;
        setQueueLoading(true);
        if (!append) setIsLoading(true);
        try {
            const roleParam = getRoleParam();
            const response = await httpClient.get('/jobs', {
                params: { role: roleParam, page: pageNum, limit: 20 }
            });
            if (response.data.success) {
                const newJobs = Array.isArray(response.data.data) ? response.data.data : [];
                const total = response.data.pagination?.total || 0;
                const totalPages = response.data.pagination?.totalPages || 1;
                setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
                setQueuePage(pageNum);
                setQueueTotal(total);
                setQueueHasMore(pageNum < totalPages);
            }
        } catch (err) {
            console.error('Error loading queue jobs:', err);
        } finally {
            setQueueLoading(false);
            if (!append) setIsLoading(false);
        }
    }, [user, queueLoading, getRoleParam]);

    // โหลดครั้งแรกเมื่อ user หรือ filter เปลี่ยน
    useEffect(() => {
        if (!user) return;
        setJobs([]);
        setQueuePage(1);
        fetchQueueJobs(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, filter]);

    // ============================================
    // Fetch Page of Drill-down Jobs
    // ============================================
    const fetchPanelJobs = useCallback(async (type, page, append = false) => {
        if (!type || panelLoading) return;
        setPanelLoading(true);
        try {
            const response = await httpClient.get('/jobs/dashboard-jobs', {
                params: { type, page, limit: 20 }
            });
            if (response.data.success) {
                const { jobs: newJobs, total, hasMore } = response.data.data;
                setPanelJobs(prev => append ? [...prev, ...newJobs] : newJobs);
                setPanelTotal(total);
                setPanelHasMore(hasMore);
                setPanelPage(page);
            }
        } catch (err) {
            console.error('fetchPanelJobs error:', err);
        } finally {
            setPanelLoading(false);
        }
    }, [panelLoading]);

    // ============================================
    // Toggle Panel เมื่อกด KPI Card
    // ============================================
    const handleKpiClick = useCallback((type) => {
        if (activePanel === type) {
            // คลิกซ้ำที่เดิม → ปิด Panel
            setActivePanel(null);
            setPanelJobs([]);
        } else {
            // เปิด Panel ใหม่และดึงหน้าแรก
            setActivePanel(type);
            setPanelJobs([]);
            setPanelPage(1);
            setPanelHasMore(false);
            fetchPanelJobs(type, 1, false);
        }
    }, [activePanel, fetchPanelJobs]);

    // ============================================
    // IntersectionObserver: โหลดเพิ่ม เมื่อ scroll ถึง sentinel
    // ============================================
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && panelHasMore && !panelLoading && activePanel) {
                    fetchPanelJobs(activePanel, panelPage + 1, true);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [sentinelRef, panelHasMore, panelLoading, activePanel, panelPage, fetchPanelJobs]);

    // ============================================
    // IntersectionObserver: My Queue infinite scroll
    // ============================================
    useEffect(() => {
        if (!queueSentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && queueHasMore && !queueLoading) {
                    fetchQueueJobs(queuePage + 1, true);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(queueSentinelRef.current);
        return () => observer.disconnect();
    }, [queueSentinelRef, queueHasMore, queueLoading, queuePage, fetchQueueJobs]);

    const filteredJobs = jobs.filter(job => {
        // ซ่อน Parent Jobs สำหรับงานพึ่ง (default = ซ่อน)
        if (!showParent && job.isParent) return false;

        // กรองตาม status dropdown
        if (statusFilter && job.status) {
            if (job.status !== statusFilter) return false;
        }
        // กรองตาม assignee dropdown
        if (assigneeFilter && job.assignee) {
            if (job.assignee !== assigneeFilter) return false;
        }
        return true;
    });

    // รวบรวม assignee ที่มีในรายการงาน (unique)
    const assigneeOptions = [...new Set(jobs.map(j => j.assignee).filter(Boolean))].sort();

    // รายการ status ที่มีในรายการงาน (unique)
    const STATUS_LABELS = {
        pending_approval: 'Pending Approval',
        approved: 'Approved',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        draft_review: 'Draft Review',
        completed: 'Completed',
        rejected: 'Rejected',
        rejected_by_assignee: 'Rejected (Assignee)',
        correction: 'Correction',
        rework: 'Rework',
        returned: 'Returned',
        pending_dependency: 'Pending Dependency',
        pending_rebrief: 'Pending Rebrief',
        rebrief_submitted: 'Rebrief Submitted',
    };
    // สีของแต่ละ status (text + background) เหมือนกับ badge
    const STATUS_COLORS = {
        pending_approval: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        assigned: 'bg-cyan-100 text-cyan-700',
        in_progress: 'bg-blue-100 text-blue-700',
        draft_review: 'bg-purple-100 text-purple-700',
        completed: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        rejected_by_assignee: 'bg-red-100 text-red-700',
        correction: 'bg-orange-100 text-orange-700',
        rework: 'bg-yellow-100 text-yellow-700',
        returned: 'bg-gray-100 text-gray-700',
        pending_dependency: 'bg-slate-100 text-slate-700',
        pending_rebrief: 'bg-yellow-100 text-yellow-700',
        rebrief_submitted: 'bg-indigo-100 text-indigo-700',
    };
    const statusOptions = [...new Set(jobs.filter(j => !j.isParent || showParent).map(j => j.status).filter(Boolean))].sort();

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
          Page Title
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">
                        สวัสดี, {user?.firstName || 'ผู้ใช้งาน'}{' '}
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                            ({user?.roleName || 'User'})
                        </span>
                    </p>
                </div>
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
          KPI Cards — คลิกเพื่อ Drill-down
          ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* New Today */}
                <StatCard
                    title="New Today"
                    subtitle="งานมาใหม่วันนี้"
                    value={stats.newToday}
                    icon={<SparklesIcon />}
                    color="blue"
                    active={activePanel === 'newToday'}
                    onClick={() => handleKpiClick('newToday')}
                />
                {/* Due Today */}
                <StatCard
                    title="Due Today"
                    subtitle="ครบกำหนดวันนี้"
                    value={stats.dueToday}
                    icon={<ClockIcon />}
                    color="orange"
                    active={activePanel === 'dueToday'}
                    onClick={() => handleKpiClick('dueToday')}
                />
                {/* Overdue */}
                <StatCard
                    title="Overdue"
                    subtitle="เกินกำหนดแล้ว"
                    value={stats.overdue}
                    icon={<ExclamationIcon />}
                    color="red"
                    active={activePanel === 'overdue'}
                    onClick={() => handleKpiClick('overdue')}
                />
            </div>

            {/* ============================================
          KPI Drill-down Panel (Lazy Load / Infinite Scroll)
          ============================================ */}
            {
                activePanel && (
                    <div className={`bg-white rounded-xl border-2 shadow-md overflow-hidden transition-all ${KPI_CONFIG[activePanel].borderColor}`}>
                        {/* Panel Header */}
                        <div className={`px-5 py-3 flex items-center justify-between ${KPI_CONFIG[activePanel].bgHeader}`}>
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold text-base ${KPI_CONFIG[activePanel].textColor}`}>
                                    {KPI_CONFIG[activePanel].title}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-white/70 ${KPI_CONFIG[activePanel].textColor}`}>
                                    {panelTotal} รายการ
                                </span>
                            </div>
                            <button
                                onClick={() => { setActivePanel(null); setPanelJobs([]); }}
                                className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-white/60 transition-colors"
                                aria-label="ปิด"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Panel Job Table */}
                        <div
                            className="overflow-x-auto max-h-[480px] overflow-y-auto"
                            id="drill-down-scroll"
                        >
                            {panelJobs.length === 0 && !panelLoading ? (
                                <div className="text-center py-12 text-gray-400">
                                    {KPI_CONFIG[activePanel].emptyText}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DJ ID</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">หัวข้อ</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ประเภท</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">สถานะ</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">กำหนดส่ง</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ผู้รับงาน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {panelJobs.map((job) => (
                                            <PanelJobRow key={job.id} job={job} />
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Sentinel div — IntersectionObserver จะสังเกตจุดนี้ */}
                            <div ref={sentinelRef} className="py-2 flex justify-center">
                                {panelLoading && (
                                    <span className="flex items-center gap-2 text-xs text-gray-400">
                                        <LoadingIcon /> กำลังโหลดเพิ่มเติม...
                                    </span>
                                )}
                                {!panelLoading && !panelHasMore && panelJobs.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                        แสดงครบทั้งหมด {panelTotal} รายการ ✓
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ============================================
          My Queue
          ============================================ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-400">
                <div className="p-4 border-b border-gray-400">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900">รายการงานของฉัน</h2>
                            {queueTotal > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {jobs.length} / {queueTotal} รายการ
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Toggle แสดง Parent Jobs */}
                            <button
                                onClick={() => setShowParent(v => !v)}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${showParent
                                        ? 'border-rose-400 bg-rose-50 text-rose-700 font-medium'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {showParent ? '▣ ซ่อน Parent Jobs' : '□ แสดง Parent Jobs'}
                            </button>

                            {/* Status Dropdown Filter */}
                            {statusOptions.length > 0 && (
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer"
                                >
                                    <option value="">Status</option>
                                    {statusOptions.map(s => (
                                        <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                                    ))}
                                </select>
                            )}
                            {/* Assignee Dropdown Filter */}
                            {assigneeOptions.length > 0 && (
                                <select
                                    value={assigneeFilter}
                                    onChange={e => setAssigneeFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer"
                                >
                                    <option value="">Assignee</option>
                                    {assigneeOptions.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

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
                            {filteredJobs.length === 0 && !queueLoading ? (
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

                    {/* Sentinel div — IntersectionObserver จับตรงนี้เพื่อโหลดเพิ่ม */}
                    <div ref={queueSentinelRef} className="py-3 flex justify-center">
                        {queueLoading && jobs.length > 0 && (
                            <span className="flex items-center gap-2 text-xs text-gray-400">
                                <LoadingIcon /> กำลังโหลดเพิ่มเติม...
                            </span>
                        )}
                        {!queueLoading && !queueHasMore && jobs.length > 0 && (
                            <span className="text-xs text-gray-400">
                                แสดงครบทั้งหมด {queueTotal} รายการ ✓
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

// ============================================
// StatCard Component
// ============================================

/**
 * @component StatCard
 * @description KPI Card — คลิกได้เพื่อเปิด Drill-down Panel
 *
 * @param {string} title - ชื่อ KPI (ภาษาอังกฤษ)
 * @param {string} subtitle - คำอธิบายเพิ่มเติม (ภาษาไทย)
 * @param {number} value - ค่าตัวเลข
 * @param {ReactNode} icon - ไอคอน
 * @param {string} color - สี (blue, amber, orange, red)
 * @param {boolean} active - กำลังเปิด Panel อยู่หรือไม่
 * @param {Function|null} onClick - null = ไม่ให้กดได้
 */
function StatCard({ title, subtitle, value, icon, color, active = false, onClick = null }) {
    const colorMap = {
        blue: {
            icon: 'bg-blue-50 text-blue-600',
            border: active ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-400',
            bg: active ? 'bg-blue-50' : 'bg-white',
            hint: 'text-blue-500',
        },
        amber: {
            icon: 'bg-amber-50 text-amber-600',
            border: 'border-gray-400',
            bg: 'bg-white',
            hint: 'text-amber-500',
        },
        orange: {
            icon: 'bg-orange-50 text-orange-600',
            border: active ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-400',
            bg: active ? 'bg-orange-50' : 'bg-white',
            hint: 'text-orange-500',
        },
        red: {
            icon: 'bg-red-50 text-red-600',
            border: active ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-400',
            bg: active ? 'bg-red-50' : 'bg-white',
            hint: 'text-red-500',
        },
    };
    const c = colorMap[color] || colorMap.blue;
    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick || undefined}
            className={`rounded-xl p-4 border shadow-sm transition-all select-none
                ${c.bg} ${c.border}
                ${isClickable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : 'cursor-default'}
            `}
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium truncate">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                    <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                </div>
            </div>
            {isClickable && (
                <p className={`mt-2 text-xs ${c.hint} flex items-center gap-1`}>
                    {active ? (
                        <><ChevronUpIcon /> ปิดรายการ</>
                    ) : (
                        <><ChevronDownIcon /> คลิกดูรายละเอียด</>
                    )}
                </p>
            )}
        </div>
    );
}

// ============================================
// PanelJobRow Component
// ============================================

/**
 * @component PanelJobRow
 * @description แถวรายการงานภายใน Drill-down Panel
 * @param {Object} job - ข้อมูลงาน
 */
function PanelJobRow({ job }) {
    const STATUS_LABEL = {
        draft: 'Draft',
        pending_approval: 'รออนุมัติ',
        approved: 'อนุมัติแล้ว',
        assigned: 'มอบหมายแล้ว',
        in_progress: 'กำลังดำเนินการ',
        draft_review: 'ตรวจสอบ Draft',
        pending_rebrief: 'รอ Rebrief',
        rebrief_submitted: 'ส่ง Rebrief แล้ว',
        completed: 'เสร็จแล้ว',
        rejected: 'ถูกปฏิเสธ',
        overdue: 'เกินกำหนด',
    };
    const STATUS_COLOR = {
        draft: 'bg-gray-100 text-gray-600',
        pending_approval: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        assigned: 'bg-cyan-100 text-cyan-700',
        in_progress: 'bg-blue-100 text-blue-700',
        draft_review: 'bg-purple-100 text-purple-700',
        pending_rebrief: 'bg-yellow-100 text-yellow-700',
        rebrief_submitted: 'bg-indigo-100 text-indigo-700',
        completed: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
    };

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-';

    return (
        <tr className={`hover:bg-gray-50 transition-colors ${job.isOverdue ? 'bg-red-50/40' : ''}`}>
            <td className="px-4 py-3 whitespace-nowrap">
                <Link to={`/jobs/${job.id}`} className="text-rose-600 font-semibold hover:underline">
                    {job.djId}
                </Link>
            </td>
            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{job.project || '-'}</td>
            <td className="px-4 py-3 max-w-[200px]">
                <p className="truncate text-gray-900">{job.subject}</p>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-gray-500">{job.jobType || '-'}</td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[job.status] || job.status}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {job.isOverdue ? (
                    <span className="text-red-600 font-medium text-xs">
                        ⚠ {formatDate(job.deadline)} (+{job.overdueDays} วัน)
                    </span>
                ) : (
                    <span className="text-gray-600 text-xs">{formatDate(job.deadline)}</span>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {job.assignee ? (
                    <div className="flex items-center gap-1.5">
                        {job.assigneeAvatar ? (
                            <img src={job.assigneeAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center font-bold">
                                {job.assignee.charAt(0)}
                            </span>
                        )}
                        <span className="text-gray-700 text-xs">{job.assignee}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">ยังไม่มอบหมาย</span>
                )}
            </td>
        </tr>
    );
}

// ============================================
// JobRow Component (My Queue)
// ============================================

/**
 * @component JobRow
 * @description แถวแสดงข้อมูลงานใน My Queue
 * @param {Object} job - ข้อมูลงาน
 */
function JobRow({ job }) {
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

    const getSLABadge = () => {
        if (job.isOverdue) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                    Overdue +{job.overdueDays}d
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                {job.slaWorkingDays} days
            </span>
        );
    };

    const fmtDate = (d) => d
        ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
        : '-';

    return (
        <tr className={`hover:bg-gray-50 ${job.status === 'scheduled' ? 'bg-violet-50' : ''}`}>
            <td className="px-4 py-3">
                <Link to={`/jobs/${job.id}`} className="text-rose-600 font-medium hover:underline">
                    {job.djId}
                </Link>
            </td>
            <td className="px-4 py-3 text-sm text-gray-900">{job.project || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{job.jobType || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{job.subject}</td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                    {job.status?.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(job.deadline)}</td>
            <td className="px-4 py-3">{getSLABadge()}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{job.assignee || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-500">
                {job.updatedAt
                    ? new Date(job.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    + ' '
                    + new Date(job.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
            </td>
            <td className="px-4 py-3">
                <Link to={`/jobs/${job.id}`} className="text-sm text-rose-600 hover:text-rose-700 font-medium">
                    View
                </Link>
            </td>
        </tr>
    );
}

// ============================================
// Icons
// ============================================

function PlusIcon({ className = 'w-5 h-5' }) {
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

function CloseIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

function ChevronUpIcon() {
    return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}
