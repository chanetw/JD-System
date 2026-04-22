/**
 * @file Dashboard.jsx
 * @description หน้า Dashboard แสดงภาพรวมงานตาม Role ของผู้ใช้
 *
 * Features:
 * - KPI Cards: New Today, Due Today, Overdue — กดแล้วเปิด Drill-down Panel
 * - Drill-down Panel: Lazy Load / Infinite Scroll (20 รายการต่อครั้ง)
 * - My Queue: กรองและแสดงรายการงานตาม Role
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import api from '@shared/services/apiService';
import httpClient from '@shared/services/httpClient';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { hasAnyRole } from '@shared/utils/permission.utils';
import DraftSubmitModal from '@features/job-management/components/DraftSubmitModal';
import { WORK_STATUS_LABEL, STATUS_COLOR, matchesStatusFilter } from '@shared/constants/jobStatus';
import { getWorkingDays } from '@shared/utils/slaCalculator';

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

const getPersonDisplayName = (person) => {
    if (!person) return '';
    if (typeof person === 'string') return person;

    const fullName = `${person.firstName || person.first_name || ''} ${person.lastName || person.last_name || ''}`.trim();
    if (fullName) return fullName;
    if (person.displayName) return person.displayName;
    if (person.name) return person.name;

    return person.email || '';
};

// ============================================
// Main Component
// ============================================

/**
 * @component Dashboard
 * @description หน้า Dashboard หลัก
 */
function Dashboard() {
    const { user } = useAuthStoreV2();

    // KPI Stats
    const [stats, setStats] = useState({ newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, totalItems: 0, assigneeSummary: [] });

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
    const [includeCompleted, setIncludeCompleted] = useState(false); // false = ซ่อน completed/closed โดยค่าเริ่มต้น
    const [viewMode, setViewMode] = useState('flat');          // 'flat' | 'parent' — View Mode Toggle
    const [expandedRows, setExpandedRows] = useState(new Set()); // Parent IDs ที่กางอยู่ (Parent View)
    const [sortMode, setSortMode] = useState('sla');     // 'sla' | 'createdAt' | 'updatedAt' — default: SLA น้อยไปมาก

    // Holidays สำหรับคำนวณ working days
    const [holidays, setHolidays] = useState([]);

    // Draft Submit Modal state
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [selectedJobForDraft, setSelectedJobForDraft] = useState(null); // Parent IDs ที่กางอยู่ (Parent View)

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
    // Load Holidays (สำหรับคำนวณ working days SLA)
    // ============================================
    useEffect(() => {
        if (!user) return;
        const loadHolidays = async () => {
            try {
                const response = await httpClient.get('/holidays');
                if (response.data.success) {
                    setHolidays(response.data.data || []);
                }
            } catch (err) {
                console.warn('[Dashboard] Could not load holidays:', err.message);
            }
        };
        loadHolidays();
    }, [user]);

    // ============================================
    // Load Dashboard Stats on mount and filter change
    // ============================================
    useEffect(() => {
        if (!user) return;
        const loadStats = async () => {
            try {
                const statsData = await api.getDashboardStats(user, statusFilter, assigneeFilter);
                setStats(statsData);
            } catch (err) {
                console.error('Error loading stats:', err);
            }
        };
        loadStats();
    }, [user, statusFilter, assigneeFilter]);

    // ============================================
    // Load My Queue (ครั้งแรก และเมื่อ filter เปลี่ยน)
    // ============================================
    const fetchQueueJobs = useCallback(async (pageNum, append = false, overrideStatus, overrideAssignee, overrideIncludeCompleted) => {
        if (!user) return;
        if (append && queueLoading) return; // ป้องกันโหลดซ้ำเฉพาะ infinite scroll
        setQueueLoading(true);
        if (!append) setIsLoading(true);
        try {
            const roleParam = getRoleParam();
            // ใช้ override ถ้ามี (จาก useEffect filter change) มิฉะนั้นใช้ค่าจาก closure
            const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
            const activeAssignee = overrideAssignee !== undefined ? overrideAssignee : assigneeFilter;
            const activeIncludeCompleted = overrideIncludeCompleted !== undefined ? overrideIncludeCompleted : includeCompleted;
            const params = {
                role: roleParam,
                page: pageNum,
                limit: 20,
                includeCompleted: activeIncludeCompleted ? 'true' : 'false'
            };
            if (activeStatus) params.status = activeStatus;
            if (activeAssignee) params.assignee = activeAssignee;
            console.log(`[Dashboard] Fetch params:`, params);
            const response = await httpClient.get('/jobs', { params });
            if (response.data.success) {
                const newJobs = Array.isArray(response.data.data) ? response.data.data : [];
                const total = response.data.pagination?.total || 0;
                const totalPages = response.data.pagination?.totalPages || 1;
                
                // Console log: แสดงจำนวนรายการที่ดึงมา
                console.log(`[Dashboard] Page ${pageNum}: ดึงมา ${newJobs.length} รายการ (จาก API) | ทั้งหมด ${total} รายการ | หน้าทั้งหมด ${totalPages} หน้า`);
                setJobs(prev => {
                    if (!append) return newJobs;
                    // Deduplicate: ใช้ Map เพื่อป้องกัน duplicate key จาก pagination shift
                    const merged = new Map();
                    prev.forEach(j => merged.set(j.id, j));
                    newJobs.forEach(j => merged.set(j.id, j));
                    return Array.from(merged.values());
                });
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
    }, [user, queueLoading, getRoleParam, statusFilter, assigneeFilter, includeCompleted]);

    // โหลดครั้งแรกเมื่อ user หรือ filter เปลี่ยน
    useEffect(() => {
        if (!user) return;
        setJobs([]);
        setQueuePage(1);
        fetchQueueJobs(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, filter]);

    // Reset หน้า 1 เมื่อ statusFilter หรือ assigneeFilter เปลี่ยน
    useEffect(() => {
        if (!user) return;
        setJobs([]);
        setQueuePage(1);
        fetchQueueJobs(1, false, statusFilter, assigneeFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, assigneeFilter, includeCompleted]);

    // ============================================
    // Fetch Page of Drill-down Jobs
    // ============================================
    const fetchPanelJobs = useCallback(async (type, page, append = false, statusFilter, assigneeFilter) => {
        if (!type || panelLoading) return;
        setPanelLoading(true);
        try {
            const params = { type, page, limit: 20, role: getRoleParam() };
            if (statusFilter && statusFilter.trim()) params.status = statusFilter.trim();
            if (assigneeFilter && assigneeFilter.trim()) params.assignee = assigneeFilter.trim();
            
            const response = await httpClient.get('/jobs/dashboard-jobs', { params });
            if (response.data.success) {
                const { jobs: newJobs, total, hasMore } = response.data.data;
                setPanelJobs(prev => {
                    if (!append) return newJobs;
                    const merged = new Map();
                    prev.forEach(j => merged.set(j.id, j));
                    newJobs.forEach(j => merged.set(j.id, j));
                    return Array.from(merged.values());
                });
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
            fetchPanelJobs(type, 1, false, statusFilter, assigneeFilter);
        }
    }, [activePanel, fetchPanelJobs, statusFilter, assigneeFilter]);

    // ============================================
    // IntersectionObserver: โหลดเพิ่ม เมื่อ scroll ถึง sentinel
    // ============================================
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && panelHasMore && !panelLoading && activePanel) {
                    fetchPanelJobs(activePanel, panelPage + 1, true, statusFilter, assigneeFilter);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [sentinelRef, panelHasMore, panelLoading, activePanel, panelPage, fetchPanelJobs, statusFilter, assigneeFilter]);

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

    // ============================================
    // Helper Functions for Parent View
    // ============================================
    
    const toggleRowExpansion = useCallback((jobId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    }, []);

    // Handler สำหรับเปิด Draft Modal
    const handleOpenDraftModal = useCallback((job) => {
        setSelectedJobForDraft(job);
        setShowDraftModal(true);
    }, []);

    // Handler เมื่อส่ง Draft สำเร็จ
    const handleDraftSuccess = useCallback(() => {
        // Reload queue jobs
        setQueuePage(1);
        fetchQueueJobs(false);
    }, [fetchQueueJobs]);

    const calculateParentApprovalStatus = useCallback((children) => {
        if (!children || children.length === 0) return null;
        if (children.some(j => j.status === 'rejected' || j.status === 'returned')) {
            return 'rejected';
        }
        if (children.some(j => j.status?.includes('pending') && j.status !== 'pending_dependency')) {
            return 'pending_approval';
        }
        return 'approved';
    }, []);

    const calculateParentJobStatus = useCallback((children) => {
        if (!children || children.length === 0) return null;
        if (children.some(j => j.status === 'in_progress')) {
            return 'in_progress';
        }
        const terminalStatuses = ['completed', 'rejected', 'returned', 'approved', 'closed'];
        const allFinished = children.every(j => terminalStatuses.includes(j.status));
        if (allFinished) {
            return 'completed';
        }
        return 'pending_dependency';
    }, []);

    // Helper: คำนวณ derived deadline จาก child ที่ยัง active
    const getParentDerivedDeadline = useCallback((children) => {
        if (!children || children.length === 0) return null;
        
        // กรอง child ที่ยัง active (ไม่ใช่ terminal status)
        const terminalStatuses = ['completed', 'closed', 'cancelled'];
        const activeChildren = children.filter(c => !terminalStatuses.includes(c.status));
        
        if (activeChildren.length === 0) return null; // ปิดหมดแล้ว
        
        // หา deadline ที่ใกล้ที่สุดจาก active children
        const deadlines = activeChildren
            .map(c => c.deadline)
            .filter(Boolean)
            .map(d => new Date(d));
        
        if (deadlines.length === 0) return null;
        
        return new Date(Math.min(...deadlines));
    }, []);

    // Helper: คำนวณ derived SLA priority สำหรับ sort
    const getParentSlaPriority = useCallback((children) => {
        if (!children || children.length === 0) return 999999; // ไม่มี child = priority ต่ำสุด
        
        const terminalStatuses = ['completed', 'closed', 'cancelled'];
        const activeChildren = children.filter(c => !terminalStatuses.includes(c.status));
        
        if (activeChildren.length === 0) return 999998; // ปิดหมดแล้ว = priority ต่ำรองลงมา
        
        const now = new Date();
        let minDaysRemaining = 999999;
        let hasOverdue = false;
        
        activeChildren.forEach(child => {
            if (!child.deadline) return;
            
            const deadline = new Date(child.deadline);
            const diffTime = deadline - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                hasOverdue = true;
                minDaysRemaining = Math.min(minDaysRemaining, diffDays);
            } else {
                minDaysRemaining = Math.min(minDaysRemaining, diffDays);
            }
        });
        
        // overdue ให้ค่าติดลบ (จะได้ขึ้นก่อน)
        // ยิ่งติดลบมาก ยิ่ง overdue นาน ยิ่งต้องขึ้นก่อน
        return minDaysRemaining;
    }, []);

    // Helper: สร้าง SLA badge text สำหรับ Parent
    const getParentSlaText = useCallback((children) => {
        if (!children || children.length === 0) return '-';
        
        const terminalStatuses = ['completed', 'closed', 'cancelled'];
        const activeChildren = children.filter(c => !terminalStatuses.includes(c.status));
        
        if (activeChildren.length === 0) return 'Completed';
        
        const now = new Date();
        let minDaysRemaining = 999999;
        let hasOverdue = false;
        let overdueDays = 0;
        
        activeChildren.forEach(child => {
            if (!child.deadline) return;
            
            const deadline = new Date(child.deadline);
            const diffTime = deadline - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                hasOverdue = true;
                if (Math.abs(diffDays) > overdueDays) {
                    overdueDays = Math.abs(diffDays);
                }
            } else {
                minDaysRemaining = Math.min(minDaysRemaining, diffDays);
            }
        });
        
        if (hasOverdue) {
            return `Overdue +${overdueDays}d`;
        }
        
        if (minDaysRemaining === 0) return 'Due today';
        if (minDaysRemaining === 1) return 'Due tomorrow';
        if (minDaysRemaining < 999999) return `${minDaysRemaining} days`;
        
        return '-';
    }, []);

    const getAssigneeName = useCallback((job) => getPersonDisplayName(job?.assignee), []);

    const buildParentViewJobs = useCallback((sourceJobs) => {
        const result = [...sourceJobs];
        const parentChildCount = {};
        const childrenMap = {};

        result.forEach(job => {
            if (job.parentJobId) {
                parentChildCount[job.parentJobId] = (parentChildCount[job.parentJobId] || 0) + 1;
                if (!childrenMap[job.parentJobId]) childrenMap[job.parentJobId] = [];
                childrenMap[job.parentJobId].push(job);
            }
        });

        return result
            .filter(job => {
                if (job.isParent) {
                    const childCount = parentChildCount[job.id] || 0;
                    if (childCount === 1) return false;
                    if (childCount > 1) {
                        job.calculatedApprovalStatus = calculateParentApprovalStatus(childrenMap[job.id]);
                        job.calculatedJobStatus = calculateParentJobStatus(childrenMap[job.id]);
                        job.children = childrenMap[job.id];
                        job.derivedDeadline = getParentDerivedDeadline(childrenMap[job.id]);
                        job.derivedSlaPriority = getParentSlaPriority(childrenMap[job.id]);
                        job.derivedSlaText = getParentSlaText(childrenMap[job.id]);
                    }
                } else if (job.parentJobId) {
                    const siblingCount = parentChildCount[job.parentJobId] || 0;
                    if (siblingCount > 1) return false;
                }
                return true;
            })
            .filter(job => {
                if (statusFilter) {
                    if (job.isParent && job.children?.length > 0) {
                        if (!matchesStatusFilter(job.calculatedJobStatus, statusFilter)) return false;
                    } else if (!matchesStatusFilter(job.status, statusFilter)) {
                        return false;
                    }
                }

                if (assigneeFilter) {
                    if (job.isParent && job.children?.length > 0) {
                        const hasMatchingChild = job.children.some(child => getAssigneeName(child) === assigneeFilter);
                        if (!hasMatchingChild) return false;
                    } else if (getAssigneeName(job) !== assigneeFilter) {
                        return false;
                    }
                }

                return true;
            });
    }, [
        calculateParentApprovalStatus,
        calculateParentJobStatus,
        getParentDerivedDeadline,
        getParentSlaPriority,
        getParentSlaText,
        getAssigneeName,
        statusFilter,
        assigneeFilter
    ]);

    // ============================================
    // Filter Logic with View Mode Support
    // ============================================

    const filteredJobs = useMemo(() => {
        let result = [...jobs];

        // 1. Apply View Mode Logic (แสดงทุก jobs เพื่อให้ครบ 20 รายการ)
        if (viewMode === 'flat') {
            result = result.filter(job => !job.isParent);
        } else if (viewMode === 'parent') {
            result = buildParentViewJobs(result);
        }

        // 3. Apply Sort Logic
        if (sortMode === 'sla') {
            result.sort((a, b) => {
                const aPriority = a.isParent && a.derivedSlaPriority !== undefined 
                    ? a.derivedSlaPriority 
                    : (a.deadline ? Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 999999);
                const bPriority = b.isParent && b.derivedSlaPriority !== undefined 
                    ? b.derivedSlaPriority 
                    : (b.deadline ? Math.ceil((new Date(b.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 999999);
                return aPriority - bPriority;
            });
        } else if (sortMode === 'createdAt') {
            result.sort((a, b) => {
                const aDate = new Date(a.createdAt || 0);
                const bDate = new Date(b.createdAt || 0);
                return bDate - aDate; // desc
            });
        } else if (sortMode === 'updatedAt') {
            result.sort((a, b) => {
                const aDate = new Date(a.updatedAt || 0);
                const bDate = new Date(b.updatedAt || 0);
                return bDate - aDate; // desc
            });
        }

        // Console log: แสดงจำนวนที่แสดงผล
        console.log(`[Dashboard] แสดงผล ${result.length} รายการ (หน้า ${queuePage}) | View Mode: ${viewMode} | Sort: ${sortMode}`);
        
        return result;
    }, [jobs, viewMode, sortMode, buildParentViewJobs, queuePage]);

    const filterableJobs = useMemo(() => {
        return jobs.filter(job => !job.isParent);
    }, [jobs]);

    // รวบรวม assignee ที่มีในรายการงาน (unique)
    const assigneeOptions = [...new Set(filterableJobs.map(j => {
        if (j.isParent && j.children?.length > 0) {
            return j.children.map(child => getAssigneeName(child)).filter(Boolean);
        }
        return getAssigneeName(j);
    }).flat().filter(Boolean))].sort();

    const dashboardScopeLabel = useMemo(() => {
        if (assigneeFilter) return `รายบุคคล: ${assigneeFilter}`;
        if (hasAnyRole(user, ['Admin', 'Superadmin'])) return 'Dashboard รวม';
        return 'ตามสิทธิ์ของคุณ';
    }, [assigneeFilter, user]);

    const dashboardScopeSubtitle = useMemo(() => {
        if (statusFilter) return `${dashboardScopeLabel} • สถานะ ${statusFilter}`;
        return dashboardScopeLabel;
    }, [dashboardScopeLabel, statusFilter]);

    // รายการ status ที่มีในรายการงาน (unique)
    const statusOptions = [...new Set(filterableJobs.map(j => {
        if (j.isParent && j.children?.length > 0) {
            return j.calculatedJobStatus;
        }
        return j.status;
    }).filter(Boolean))].sort();

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
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">กำหนดส่ง</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">ผู้แจ้งงาน</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">ผู้รับผิดชอบ</th>
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
                                    {Math.min((queuePage - 1) * 20 + 1, queueTotal)}-{Math.min(queuePage * 20, queueTotal)} / {queueTotal} รายการ
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5 bg-gray-50">
                                <button
                                    onClick={() => setViewMode('flat')}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                        viewMode === 'flat'
                                            ? 'bg-white text-gray-900 font-medium shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    📋 Flat View
                                </button>
                                <button
                                    onClick={() => setViewMode('parent')}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                        viewMode === 'parent'
                                            ? 'bg-white text-gray-900 font-medium shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🗂️ Parent View
                                </button>
                            </div>


                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer"
                            >
                                <option value="">All Status</option>
                                <option value="draft">draft</option>
                                <option value="scheduled">scheduled</option>
                                <option value="submitted">submitted</option>
                                <option value="pending_approval">pending approval</option>
                                <option value="approved">approved</option>
                                <option value="assigned">assigned</option>
                                <option value="in_progress">in progress</option>
                                <option value="pending_review">pending review</option>
                                <option value="pending_rework">pending rework</option>
                                <option value="completed">completed</option>
                                <option value="rejected">rejected</option>
                                <option value="cancelled">cancelled</option>
                                <option value="on_hold">on hold</option>
                            </select>

                            {/* Assignee Filter */}
                            <select
                                value={assigneeFilter}
                                onChange={e => setAssigneeFilter(e.target.value)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer"
                            >
                                <option value="">ผู้รับผิดชอบทั้งหมด</option>
                                {assigneeOptions.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>

                            {/* Clear Filters */}
                            <label className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={includeCompleted}
                                    onChange={(e) => setIncludeCompleted(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-300"
                                />
                                แสดงงานสำเร็จ
                            </label>

                            {(statusFilter || assigneeFilter || includeCompleted) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('');
                                        setAssigneeFilter('');
                                        setIncludeCompleted(false);
                                    }}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                    ✕ ล้าง filter
                                </button>
                            )}

                            {/* Sort Dropdown */}
                            <select
                                value={sortMode}
                                onChange={e => setSortMode(e.target.value)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-rose-300 cursor-pointer"
                            >
                                <option value="updatedAt">เรียงตาม: อัปเดตล่าสุด</option>
                                <option value="createdAt">เรียงตาม: งานสร้างล่าสุด</option>
                                <option value="sla">เรียงตาม: SLA น้อยไปมาก</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-400">
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DJ ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[220px]">Subject</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Deadline</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">สถานะ SLA</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[140px]">ผู้แจ้งงาน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[140px]">ผู้รับผิดชอบ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[130px]">Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-400">
                            {filteredJobs.length === 0 && !queueLoading ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                        ไม่มีรายการงาน
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map((job, idx) => {
                                    const rowNum = (queuePage - 1) * 20 + idx + 1;
                                    // === FLAT VIEW: แสดงแบบธรรมดา (เดิม) ===
                                    if (viewMode === 'flat') {
                                        return <JobRow key={job.id} job={job} rowIndex={rowNum} holidays={holidays} onOpenDraftModal={handleOpenDraftModal} />;
                                    }
                                    
                                    // === PARENT VIEW: แสดงแบบ Accordion (ใหม่) ===
                                    return (
                                        <React.Fragment key={job.id}>
                                            <JobRow 
                                                job={job}
                                                rowIndex={rowNum}
                                                isParent={job.isParent}
                                                hasChildren={job.children && job.children.length > 0}
                                                isExpanded={expandedRows.has(job.id)}
                                                onToggleExpand={() => toggleRowExpansion(job.id)}
                                                holidays={holidays}
                                                onOpenDraftModal={handleOpenDraftModal}
                                            />
                                            
                                            {/* Child Jobs Accordion — แสดงเฉพาะ Parent View */}
                                            {job.children && job.children.length > 0 && expandedRows.has(job.id) && (
                                                (() => {
                                                    // Chain detection logic (copy from DJList)
                                                    const childrenMap = new Map();
                                                    job.children.forEach(c => childrenMap.set(c.id, c));
                                                    
                                                    const predecessorIds = new Set(job.children.map(c => c.predecessorId).filter(Boolean));
                                                    const leaves = job.children.filter(c => !predecessorIds.has(c.id));
                                                    const jobChains = new Map();
                                                    
                                                    leaves.forEach(leaf => {
                                                        const chain = [];
                                                        let current = leaf;
                                                        while (current) {
                                                            chain.unshift(current.id);
                                                            current = current.predecessorId && childrenMap.has(current.predecessorId)
                                                                ? childrenMap.get(current.predecessorId)
                                                                : null;
                                                        }
                                                        if (chain.length > 1) {
                                                            chain.forEach((jobId, idx) => {
                                                                if (!jobChains.has(jobId) || jobChains.get(jobId).total < chain.length) {
                                                                    jobChains.set(jobId, { index: idx + 1, total: chain.length });
                                                                }
                                                            });
                                                        }
                                                    });
                                                    
                                                    return job.children.map(child => (
                                                        <JobRow
                                                            key={child.id}
                                                            job={child}
                                                            isChild={true}
                                                            childInfo={jobChains.get(child.id)}
                                                            holidays={holidays}
                                                            onOpenDraftModal={handleOpenDraftModal}
                                                        />
                                                    ));
                                                })()
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Bar */}
                    {queueTotal > 0 && (
                        <div className="py-3 px-4 flex items-center justify-between border-t border-gray-200">
                            <span className="text-sm text-gray-500">
                                แสดง {Math.min((queuePage - 1) * 20 + 1, queueTotal)}-{Math.min(queuePage * 20, queueTotal)} จาก {queueTotal} รายการ
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { if (queuePage > 1) fetchQueueJobs(queuePage - 1, false); }}
                                    disabled={queuePage <= 1 || queueLoading}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${queuePage <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer'}`}
                                >
                                    ← ก่อนหน้า
                                </button>
                                <span className="text-sm text-gray-600 font-medium">
                                    หน้า {queuePage} / {Math.ceil(queueTotal / 20)}
                                </span>
                                <button
                                    onClick={() => { 
                                        const totalPages = Math.ceil(queueTotal / 20);
                                        if (queuePage < totalPages) fetchQueueJobs(queuePage + 1, false); 
                                    }}
                                    disabled={queuePage >= Math.ceil(queueTotal / 20) || queueLoading}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${queuePage >= Math.ceil(queueTotal / 20) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer'}`}
                                >
                                    ถัดไป →
                                </button>
                            </div>
                        </div>
                    )}
                    {queueLoading && (
                        <div className="py-3 flex justify-center">
                            <span className="flex items-center gap-2 text-xs text-gray-400">
                                <LoadingIcon /> กำลังโหลด...
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Draft Submit Modal */}
            <DraftSubmitModal
                isOpen={showDraftModal}
                onClose={() => setShowDraftModal(false)}
                job={selectedJobForDraft}
                onSuccess={handleDraftSuccess}
                currentUser={user}
            />
        </div>
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

function SummaryMetricCard({ title, value, unit, subtitle, icon, color = 'slate' }) {
    const colorMap = {
        slate: {
            icon: 'bg-slate-100 text-slate-700',
            border: 'border-slate-300',
            bg: 'bg-white',
            unit: 'text-slate-500'
        },
        rose: {
            icon: 'bg-rose-100 text-rose-700',
            border: 'border-rose-200',
            bg: 'bg-rose-50/40',
            unit: 'text-rose-500'
        }
    };

    const palette = colorMap[color] || colorMap.slate;

    return (
        <div className={`rounded-xl border px-4 py-4 shadow-sm ${palette.border} ${palette.bg}`}>
            <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
                    <div className="mt-1 flex items-end gap-2">
                        <p className="text-3xl font-bold leading-none text-gray-900">{value}</p>
                        <span className={`pb-0.5 text-sm font-medium ${palette.unit}`}>{unit}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function BriefcaseMetricIcon() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 7.5V6a2.25 2.25 0 0 1 2.25-2.25h3A2.25 2.25 0 0 1 15.75 6v1.5m-12 3h16.5m-15 0V9A1.5 1.5 0 0 1 6 7.5h12A1.5 1.5 0 0 1 19.5 9v1.5m-15 0v6.75A2.25 2.25 0 0 0 6.75 19.5h10.5A2.25 2.25 0 0 0 19.5 17.25V10.5" />
        </svg>
    );
}

function ItemsMetricIcon() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.25 7.5 12 3 3.75 7.5m16.5 0V16.5L12 21l-8.25-4.5V7.5m16.5 0L12 12m-8.25-4.5L12 12m0 9V12" />
        </svg>
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

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-';

    const requesterName = getPersonDisplayName(job.requester);
    const assigneeName = getPersonDisplayName(job.assignee);

    return (
        <tr className={`hover:bg-gray-50 transition-colors ${job.isOverdue ? 'bg-red-50/40' : ''}`}>
            <td className="px-4 py-3 whitespace-nowrap">
                <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer" className="text-rose-600 font-semibold hover:underline">
                    {job.djId}
                </a>
            </td>
            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{job.project || '-'}</td>
            <td className="px-4 py-3 max-w-[200px]">
                <p className="truncate text-gray-900">{job.subject}</p>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-gray-500">{job.jobType || '-'}</td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-600'}`}>
                    {WORK_STATUS_LABEL[job.status] || job.status}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {job.isOverdue ? (
                    <span className="text-red-600 font-medium text-xs">
                        ⚠ {formatDate(job.deadline)} (+{job.overdueDays}d)
                    </span>
                ) : (
                    <span className="text-gray-600 text-xs">{formatDate(job.deadline)}</span>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-gray-700 text-xs font-medium">{requesterName || '-'}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {assigneeName ? (
                    <div className="flex items-center gap-1.5">
                        {job.assigneeAvatar ? (
                            <img src={job.assigneeAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center font-bold">
                                {assigneeName.charAt(0)}
                            </span>
                        )}
                        <span className="text-gray-700 text-xs">{assigneeName}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">Unassigned</span>
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
 * @param {boolean} isParent - งาน Parent หรือไม่
 * @param {boolean} hasChildren - มี Child Jobs หรือไม่
 * @param {boolean} isExpanded - กางอยู่หรือไม่
 * @param {Function} onToggleExpand - ฟังก์ชันสลับกาง/ยุบ
 * @param {boolean} isChild - เป็น Child Job หรือไม่
 * @param {Object} childInfo - { index, total } สำหรับ sequence number
 */
function JobRow({ 
    job,
    rowIndex = null,
    isParent = false,
    hasChildren = false,
    isExpanded = false,
    onToggleExpand = null,
    isChild = false,
    childInfo = null,
    holidays = [],
    onOpenDraftModal = null
}) {
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

    // Helper function: คำนวณวันทำการจากวันนี้ถึง dueDate
    const calculateDaysFromToday = useCallback((deadline) => {
        if (!deadline) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // เริ่มต้นวันนี้
        
        const dueDate = new Date(deadline);
        dueDate.setHours(0, 0, 0, 0); // เริ่มต้นวัน due date
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }, []);

    const getSLABadge = useCallback(() => {
        // ถ้าเป็น Parent ให้ใช้ derived SLA (แต่ต้องคำนวณใหม่จากงานย่อยที่นานที่สุด)
        if (isParent && hasChildren && job.children && job.children.length > 0) {
            // หางานย่อยที่มี dueDate ไกลสุด (นานที่สุด)
            const childWithLatestDeadline = job.children.reduce((latest, child) => {
                if (!child.deadline) return latest;
                if (!latest.deadline) return child;
                return new Date(child.deadline) > new Date(latest.deadline) ? child : latest;
            }, {});
            
            if (childWithLatestDeadline.deadline) {
                const daysFromToday = calculateDaysFromToday(childWithLatestDeadline.deadline);
                
                if (daysFromToday < 0) {
                    return (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                            เกิน SLA ({Math.abs(daysFromToday)} วัน)
                        </span>
                    );
                }
                if (daysFromToday === 0) {
                    return (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                            ครบ SLA วันนี้
                        </span>
                    );
                }
                if (daysFromToday === 1) {
                    return (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                            อยู่ใน SLA (1 วัน)
                        </span>
                    );
                }
                return (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        อยู่ใน SLA
                    </span>
                );
            }
        }
        
        // งานปกติและงานย่อย
        if (!job.deadline) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                    ไม่กำหนด
                </span>
            );
        }
        
        if (job.status === 'completed') {
            // ตรวจสอบว่าเสร็จเกิน SLA หรือไม่ โดยใช้ working days
            if (job.deadline && job.completedAt) {
                const dueDate = new Date(job.deadline);
                const completedAt = new Date(job.completedAt);
                dueDate.setHours(0, 0, 0, 0);
                completedAt.setHours(0, 0, 0, 0);
                
                if (completedAt > dueDate) {
                    // เสร็จหลัง deadline — คำนวณจำนวน working days ที่เกิน
                    const overdueDays = getWorkingDays(dueDate, completedAt, holidays) - 1;
                    return (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                            เสร็จแล้ว เกิน SLA ({Math.max(1, overdueDays)} วันทำงาน)
                        </span>
                    );
                }
            }
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                    เสร็จแล้ว
                </span>
            );
        }
        
        const daysFromToday = calculateDaysFromToday(job.deadline);
        
        if (daysFromToday < 0) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                    เกิน SLA ({Math.abs(daysFromToday)} วัน)
                </span>
            );
        }
        if (daysFromToday === 0) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                    ครบ SLA วันนี้
                </span>
            );
        }
        if (daysFromToday === 1) {
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                    อยู่ใน SLA (1 วัน)
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                อยู่ใน SLA
            </span>
        );
    }, [calculateDaysFromToday, isParent, hasChildren, job.children, job.deadline, job.status, job.completedAt, holidays]);

    const fmtDate = (d) => d
        ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
        : '-';
    
    // ถ้าเป็น Parent ให้ใช้ derived deadline
    const displayDeadline = (isParent && hasChildren && job.derivedDeadline) 
        ? fmtDate(job.derivedDeadline) 
        : fmtDate(job.deadline);

    const requesterName = getPersonDisplayName(job.requester);
    const assigneeName = getPersonDisplayName(job.assignee);

    return (
        <tr className={`hover:bg-gray-50 ${job.status === 'scheduled' ? 'bg-violet-50' : ''} ${isChild ? 'bg-gray-50/80' : ''}`}>
            <td className="px-4 py-3 text-center text-sm text-gray-400 w-12">
                {isChild ? '' : (rowIndex || '')}
            </td>
            <td className="px-4 py-3">
                <div className={`flex items-center ${isChild ? 'pl-6 border-l-2 border-gray-300' : ''}`}>
                    {isParent && hasChildren && (
                        <button
                            onClick={onToggleExpand}
                            className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-transform duration-200"
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                            <ChevronRightIcon />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer" className="text-rose-600 font-medium hover:underline">
                                {job.djId}
                            </a>
                        </div>
                        {isParent && hasChildren && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block w-fit mt-1">
                                Parent Job
                            </span>
                        )}
                        {isChild && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block w-fit mt-1">
                                {childInfo ? `งานย่อย ${childInfo.index}/${childInfo.total}` : 'งานย่อย'}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-900">{job.project || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{job.jobType || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{job.subject}</td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                    {job.status?.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{displayDeadline}</td>
            <td className="px-4 py-3 whitespace-nowrap">{getSLABadge()}</td>
            <td className="px-4 py-3 text-sm text-gray-700 min-w-[140px]">
                <span className="block truncate font-medium" title={requesterName || '-'}>{requesterName || '-'}</span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 min-w-[140px]">
                <span className="block truncate" title={assigneeName || 'Unassigned'}>{assigneeName || 'Unassigned'}</span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {job.updatedAt
                    ? new Date(job.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                    + ' '
                    + new Date(job.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
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

function ChevronRightIcon({ className = 'w-4 h-4' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

export default Dashboard;
