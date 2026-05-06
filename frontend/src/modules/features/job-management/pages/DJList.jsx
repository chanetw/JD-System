/**
 * @file DJList.jsx
 * @description หน้ารายการงาน DJ ทั้งหมด (DJ Job List)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายการงาน Design Job (DJ) ทั้งหมดในระบบ พร้อมระบบคัดกรองข้อมูล (Filters)
 * - ค้นหางานด้วยเลขที่ DJ ID หรือหัวข้องาน (Subject)
 * - สนับสนุนการจัดเรียงข้อมูล (Sorting) ตามวันที่สร้างและวันกำหนดส่ง (Deadline)
 * - มีระบบจัดการหน้าข้อมูล (Pagination) เพื่อประสิทธิภาพในการแสดงผล
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { api } from '@shared/services/apiService';
import { formatDateToThai } from '@shared/utils/dateUtils';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { useSuperSearchStore } from '@core/stores/superSearchStore';
import { getUserScopes } from '@shared/utils/scopeHelpers';
import { hasRole } from '@shared/utils/permission.utils';
import { DJ_LIST_FILTER_OPTIONS, matchesStatusFilter } from '@shared/constants/jobStatus';
import { resolveSlaBadgePresentation } from '@shared/utils/slaStatusResolver';
import { matchesSuperSearch } from '@shared/utils/superSearch';

// Icons
import {
    PlusIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const collectUserSearchValues = (value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];

    const fullName = [
        value.firstName || value.first_name,
        value.lastName || value.last_name
    ].filter(Boolean).join(' ');

    return [
        value.name,
        value.displayName,
        value.display_name,
        value.email,
        fullName
    ].filter(Boolean);
};

const getRequesterSearchValues = (job) => [
    job.requester,
    job.requesterName,
    job.requester_name,
    ...collectUserSearchValues(job.requester),
].filter(Boolean);

const getAssigneeSearchValues = (job) => [
    job.assignee,
    job.assigneeName,
    job.assignee_name,
    ...collectUserSearchValues(job.assignee),
].filter(Boolean);

export default function DJList() {
    // === Auth State ===
    const { user } = useAuthStoreV2();
    const [searchParams, setSearchParams] = useSearchParams();

    // === My Jobs Mode (จาก URL param ?myJobs=true) ===
    const [myJobsOnly, setMyJobsOnly] = useState(() => searchParams.get('myJobs') === 'true');

    // === สถานะข้อมูล (Data Management States) ===
    const [jobs, setJobs] = useState([]);          // ข้อมูลงานต้นฉบับทั้งหมดจาก API
    const [filteredJobs, setFilteredJobs] = useState([]); // ข้อมูลงานที่ผ่านการคัดกรองแล้ว
    const [masterData, setMasterData] = useState({ projects: [], jobTypes: [], buds: [] }); // ข้อมูลอ้างอิงสำหรับ Filter
    const [isLoading, setIsLoading] = useState(true); // สถานะการโหลดข้อมูล

    // === สถานะการคัดกรอง (Filter States) ===
    const [filters, setFilters] = useState({
        project: '',
        jobType: '',
        status: '',
        assignee: '',
        priority: ''
    });

    // === สถานะการค้นหาและจัดเรียง (Search & Sort States) ===
    const searchQuery = useSuperSearchStore(state => state.query); // ข้อความที่ใช้ค้นหา
    const setSearchQuery = useSuperSearchStore(state => state.setQuery);
    const setSuperSearchMeta = useSuperSearchStore(state => state.setResultMeta);
    const [sortBy, setSortBy] = useState('createdDate'); // รูปแบบการจัดเรียง (วันที่สร้าง หรือ Deadline)
    const [includeCompleted, setIncludeCompleted] = useState(false); // false = ซ่อน completed/closed เป็นค่าเริ่มต้น
    const shouldIncludeCompletedInQuery = includeCompleted || filters.status === 'completed';

    // === สถานะการจัดการหน้า (Pagination States) ===
    const [currentPage, setCurrentPage] = useState(1); // หน้าปัจจุบันที่แสดงผล
    const itemsPerPage = 10;                         // จำนวนรายการต่อหนึ่งหน้า

    // === สถานะ Accordion ===
    const [expandedRows, setExpandedRows] = useState(new Set()); // เก็บ ID ของแถวที่กางอยู่

    // ============================================
    // Data Loading
    // ============================================
    useEffect(() => {
        // Only load data when user is authenticated
        if (user) {
            loadData();
        }
    }, [user, shouldIncludeCompletedInQuery]);

    /** โหลดข้อมูลงานและข้อมูลอ้างอิงจาก API */
    const loadData = async () => {
        setIsLoading(true);
        try {
            // 🔥 Security: Fetch jobs based on Role (Least Privilege)
            // Always use getJobsByRole to pass correct role parameter to backend
            // getJobs() without role defaults to 'requester' on backend, which is incorrect for admin
            const [jobsResponse, masterDataResult] = await Promise.all([
                api.getJobsByRole(user, { includeCompleted: shouldIncludeCompletedInQuery ? 'true' : 'false' }),
                api.getMasterData()
            ]);

            // ✅ JobService.getJobsByRole ส่งกลับมาได้สองรูปแบบตามว่า Backend มี stats หรือไม่:
            // 1. Array โดยตรง (กรณีไม่มี stats)
            // 2. Object { data: [...], stats: {...} } (กรณีมี stats)
            // ต้อง Unwrap ก่อนใช้งาน
            const jobsData = Array.isArray(jobsResponse) ? jobsResponse : (jobsResponse?.data || []);

            console.log(`[DJList] Loaded ${jobsData.length} jobs. First job:`, jobsData[0]);

            // === Scope-based Filtering ===
            // ⚡ Performance: ดึง scopes 1 ครั้ง แล้วใช้ซ้ำ (ไม่เรียก getUserScopes ซ้ำใน getAllowedProjectIds)
            let scopeFilteredJobs = jobsData;
            if (user?.id && user?.tenantId) {
                const scopes = await getUserScopes(user.id);
                const hasTenantScope = scopes.some(s => s.scope_level?.toLowerCase() === 'tenant');

                if (!hasTenantScope && scopes.length > 0) {
                    // ใช้ scopes ที่ดึงมาแล้วเพื่อคำนวณ allowedProjectIds ตรงนี้ แทนการเรียก getAllowedProjectIds ที่จะดึงซ้ำ
                    const allowedProjectIds = new Set();
                    scopes.forEach(scope => {
                        if (scope.scope_level?.toLowerCase() === 'project' && scope.project_id) {
                            allowedProjectIds.add(scope.project_id);
                        }
                    });
                    if (allowedProjectIds.size > 0) {
                        scopeFilteredJobs = jobsData.filter(job => allowedProjectIds.has(job.projectId || job.project_id));
                        console.log('📋 [DJList] Filtered by scope:', scopeFilteredJobs.length, 'jobs');
                    }
                }
            }

            setJobs(scopeFilteredJobs);
            setFilteredJobs(scopeFilteredJobs);
            setMasterData(masterDataResult);
        } catch (error) {
            console.error('ไม่สามารถโหลดข้อมูลรายการงานได้:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // Filter & Search Logic
    // ============================================
    useEffect(() => {
        applyFiltersAndSearch();
    }, [jobs, filters, searchQuery, sortBy, myJobsOnly]);

    useEffect(() => {
        const queryFromUrl = searchParams.get('search');
        if (queryFromUrl) {
            setSearchQuery(queryFromUrl);
        }
    }, [searchParams, setSearchQuery]);

    /** ประมวลผลการคัดกรอง การค้นหา และการจัดเรียงข้อมูล */
    const applyFiltersAndSearch = () => {
        let result = [...jobs];

        // 0. My Jobs filter — แสดงเฉพาะงานที่ user เป็น requester หรือ assignee
        if (myJobsOnly && user?.id) {
            result = result.filter(j =>
                String(j.requesterId) === String(user.id) ||
                String(j.assigneeId) === String(user.id)
            );
        }

        // 1. นำ Filters มาใช้งาน
        if (filters.project) {
            result = result.filter(j => j.project === filters.project);
        }
        if (filters.jobType) {
            result = result.filter(j => j.jobType === filters.jobType);
        }
        if (filters.assignee) {
            result = result.filter(j => j.assignee === filters.assignee);
        }
        if (filters.priority) {
            result = result.filter(j => j.priority === filters.priority);
        }

        if (filters.status) {
            const childrenByParentId = result.reduce((map, job) => {
                if (job.parentJobId) {
                    if (!map[job.parentJobId]) map[job.parentJobId] = [];
                    map[job.parentJobId].push(job);
                }
                return map;
            }, {});

            result = result.filter(job => {
                const children = childrenByParentId[job.id] || [];
                const hasChildren = job.isParent && children.length > 1;
                const calculatedApprovalStatus = hasChildren ? calculateParentApprovalStatus(children) : null;
                const calculatedJobStatus = hasChildren ? calculateParentJobStatus(children) : null;
                const display = resolveDisplayStatuses(
                    job.status,
                    job.isParent,
                    hasChildren,
                    Boolean(job.parentJobId),
                    calculatedApprovalStatus,
                    calculatedJobStatus
                );

                return [job.status, display.approval, display.work].some(status =>
                    matchesStatusFilter(status, filters.status)
                );
            });
        }

        // 2. นำ Search Query มาใช้งาน (ค้นจากเลขที่ DJ หรือหัวข้องาน)
        if (searchQuery.trim()) {
            result = result.filter(j => matchesSuperSearch(j, searchQuery, [
                job => job.djId,
                job => job.id,
                job => job.subject,
                job => job.project,
                job => job.jobType,
                getRequesterSearchValues,
                getAssigneeSearchValues,
                job => job.status,
                job => job.priority,
            ]));
        }

        // 3. จัดเรียงข้อมูล (Sort)
        result.sort((a, b) => {
            // 3.1 งาน Urgent ที่ยังไม่เสร็จให้อยู่บนสุด
            const aIsActiveUrgent = a.priority?.toLowerCase() === 'urgent' && !['completed', 'rejected', 'cancelled'].includes(a.status?.toLowerCase());
            const bIsActiveUrgent = b.priority?.toLowerCase() === 'urgent' && !['completed', 'rejected', 'cancelled'].includes(b.status?.toLowerCase());

            if (aIsActiveUrgent && !bIsActiveUrgent) return -1;
            if (!aIsActiveUrgent && bIsActiveUrgent) return 1;

            // 3.2 จัดเรียงตามเงื่อนไขปกติ
            if (sortBy === 'createdDate') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            if (sortBy === 'deadline') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            }
            return 0;
        });

        // 4. จัดกลุ่มงานตาม Parent-Child Relationship และซ่อน Parent ที่มี Child เดียว
        const parentChildCount = {};
        const childrenMap = {}; // เพื่อการคำนวณสถานะ

        // นับจำนวน Child และเก็บความสัมพันธ์
        result.forEach(job => {
            if (job.parentJobId) {
                parentChildCount[job.parentJobId] = (parentChildCount[job.parentJobId] || 0) + 1;
                if (!childrenMap[job.parentJobId]) childrenMap[job.parentJobId] = [];
                childrenMap[job.parentJobId].push(job);
            }
        });

        // คำนวณสถานะและกรองงาน
        result = result.filter(job => {
            if (job.isParent) {
                const childCount = parentChildCount[job.id] || 0;

                // ซ่อน Parent ที่มี Child เดียว (ให้แสดง Child เดี่ยวๆ ไปเลย)
                if (childCount === 1) {
                    console.log(`[DJList] Hidden parent ${job.djId} (has only 1 child)`);
                    return false;
                }

                // คำนวณสถานะใหม่สำหรับ Parent ที่มี Child > 1
                if (childCount > 1) {
                    const children = childrenMap[job.id] || [];
                    job.calculatedApprovalStatus = calculateParentApprovalStatus(children);
                    job.calculatedJobStatus = calculateParentJobStatus(children);
                    job.children = children; // เก็บ children ไว้แสดงใน Accordion
                }
            } else if (job.parentJobId) {
                // ซ่อน Child jobs จากรายการหลัก (จะไปแสดงใต้ Parent แทน)
                // *ยกเว้น* กรณีที่ Parent ถูกซ่อน (เพราะมี Child เดียว) ให้แสดง Child นี้ในรายการหลัก
                const siblingCount = parentChildCount[job.parentJobId] || 0;
                if (siblingCount > 1) {
                    return false; // ซ่อนไปแสดงใน Accordion
                }
            }
            return true;
        });

        setFilteredJobs(result);
        setSuperSearchMeta({ resultCount: result.length, totalCount: jobs.length });
        setCurrentPage(1); // เมื่อเริ่มคัดกรองใหม่ ให้กลับไปที่หน้า 1 เสมอ
    };

    // ============================================
    // Status Calculation Logic
    // ============================================

    /** คำนวณ Approval Status ของงานแม่จากงานลูกโดยตรง */
    const calculateParentApprovalStatus = (children) => {
        if (!children || children.length === 0) return null;

        // 1. ถ้ามีลูกที่ถูกปฏิเสธ
        if (children.some(j => j.status === 'rejected' || j.status === 'returned')) {
            return 'rejected';
        }

        // 2. ถ้ามีลูกที่ยังรออนุมัติ
        if (children.some(j => j.status?.includes('pending') && j.status !== 'pending_dependency')) {
            return 'pending_approval';
        }

        // 3. ลูกทั้งหมดได้รับการอนุมัติแล้ว
        return 'approved';
    };

    /** คำนวณ Job Status ของงานแม่จากงานลูกโดยตรง */
    const calculateParentJobStatus = (children) => {
        if (!children || children.length === 0) return null;

        // 1. ถ้ามีลูกที่กำลังทำ
        if (children.some(j => j.status === 'in_progress')) {
            return 'in_progress';
        }

        // 2. ถ้าลูกทั้งหมด "สิ้นสุด" แล้ว (เสร็จ/ถูกปฏิเสธ/อนุมัติผ่านแล้วแต่ไม่มีใครทำ)
        const terminalStatuses = ['completed', 'rejected', 'returned', 'approved', 'closed'];
        const allFinished = children.every(j => terminalStatuses.includes(j.status));
        if (allFinished) {
            return 'completed';
        }

        // 3. ลูกทั้งหมดรอคิว (ยังไม่เริ่ม)
        return 'pending_dependency';
    };

    /** สลับสถานะการกาง/ยุบแถว Accordion */
    const toggleRowExpansion = (jobId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    };

    // ============================================
    // Event Handlers
    // ============================================
    /** เปลี่ยนค่าใน Filter */
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    /** ล้างค่าการคัดกรองทั้งหมด */
    const handleClearFilters = () => {
        setFilters({
            project: '',
            jobType: '',
            status: '',
            assignee: '',
            priority: ''
        });
        setSearchQuery('');
        setIncludeCompleted(false);
        setMyJobsOnly(false);
        setSearchParams({});
    };

    // ============================================
    // Pagination Logic
    // ============================================
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentJobs = filteredJobs.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // ============================================
    // Helper: Calculate SLA Badge
    // ============================================
    /** คำนวณสถานะ SLA เพื่อแสดงผลไอคอนหรือข้อความแจ้งเตือน */
    const calculateSLA = (job) => {
        if (job.status === 'scheduled') {
            return <span className="text-xs text-violet-600">ตั้งเวลาส่ง {job.scheduledTime || '08:00'} น.</span>;
        }

        const slaBadge = resolveSlaBadgePresentation({
            status: job.status,
            deadline: job.deadline,
            completedAt: job.completedAt
        });

        if (slaBadge.key === 'no_deadline') {
            return <span className="text-xs text-gray-400">-</span>;
        }

        if (slaBadge.key === 'overdue') {
            return <Badge status="overdue" count={Math.abs(slaBadge.dayDiff)} />;
        }

        return <span className={slaBadge.className}>{slaBadge.text}</span>;
    };

    // ============================================
    // Get Unique Values for Filters
    // ============================================
    const uniqueProjects = [...new Set(jobs.map(j => j.project))]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    const uniqueAssignees = [...new Set(
        jobs
            .filter(j => j.assigneeIsActive !== false)
            .map(j => j.assignee)
    )]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    const uniqueJobTypes = [...new Set(masterData.jobTypes.map(jt => jt.name))]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* ส่วนหัวของหน้าจอ */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900">รายการงาน DJ (DJ List)</h1>
                    <p className="text-gray-500">ค้นหาและติดตามสถานะงาน Design Job ทั้งหมด</p>
                </div>
                {!hasRole(user, 'assignee') && (
                    <Link to="/create" className="sm:shrink-0">
                        <Button className="w-full sm:w-auto">
                            <PlusIcon className="w-5 h-5" />
                            สร้างงานใหม่ (Create DJ)
                        </Button>
                    </Link>
                )}
            </div>

            {/* My Jobs Banner */}
            {myJobsOnly && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-medium text-indigo-700">
                        กำลังแสดงเฉพาะงานของคุณ (งานที่คุณเปิดหรือได้รับมอบหมาย)
                    </span>
                    <button
                        onClick={() => { setMyJobsOnly(false); setSearchParams({}); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                    >
                        แสดงงานทั้งหมด
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา DJ ID หรือ Subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                </div>
            </div>

            {/* ส่วนคัดกรองข้อมูล (Filters Section) */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <FilterSelect
                        label="โครงการ (Project)"
                        value={filters.project}
                        onChange={(val) => handleFilterChange('project', val)}
                        options={uniqueProjects}
                    />
                    <FilterSelect
                        label="ประเภทงาน (Job Type)"
                        value={filters.jobType}
                        onChange={(val) => handleFilterChange('jobType', val)}
                        options={uniqueJobTypes}
                    />
                    <FilterSelect
                        label="สถานะ"
                        value={filters.status}
                        onChange={(val) => handleFilterChange('status', val)}
                        options={DJ_LIST_FILTER_OPTIONS.map(o => o.value)}
                        optionLabels={Object.fromEntries(DJ_LIST_FILTER_OPTIONS.map(o => [o.value, o.label]))}
                    />
                    <FilterSelect
                        label="ผู้ออกแบบ (Assignee)"
                        value={filters.assignee}
                        onChange={(val) => handleFilterChange('assignee', val)}
                        options={uniqueAssignees}
                    />
                    <FilterSelect
                        label="ความสำคัญ (Priority)"
                        value={filters.priority}
                        onChange={(val) => handleFilterChange('priority', val)}
                        options={['Normal', 'Urgent', 'High']}
                    />
                </div>

                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={includeCompleted}
                            onChange={(e) => setIncludeCompleted(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-300"
                        />
                        แสดงงานสำเร็จ
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button variant="ghost" className="text-sm" onClick={handleClearFilters}>ล้างค่า (Clear)</Button>
                        <Button className="text-sm" onClick={applyFiltersAndSearch}>ใช้งานการคัดกรอง (Apply)</Button>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-gray-400 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-400 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:px-6 lg:py-4">
                    <p className="text-sm text-gray-600">
                        แสดง <strong>{filteredJobs.length}</strong> รายการ
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">เรียงตาม:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-2"
                        >
                            <option value="createdDate">Created Date (ล่าสุด)</option>
                            <option value="deadline">Deadline (ใกล้สุด)</option>
                        </select>
                    </div>
                </div>

                <div>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
                        </div>
                    ) : currentJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-gray-500">ไม่พบข้อมูล</p>
                            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยน filter หรือ search query</p>
                        </div>
                    ) : (
                        <>
                        <div className="divide-y divide-gray-200 lg:hidden">
                            {currentJobs.map((job) => (
                                <React.Fragment key={job.id}>
                                    <JobMobileCard
                                        id={job.djId || `DJ-${job.id}`}
                                        pkId={job.id}
                                        priority={job.priority}
                                        project={job.project}
                                        type={job.jobType}
                                        subject={job.subject}
                                        status={job.status}
                                        calculatedApprovalStatus={job.calculatedApprovalStatus}
                                        calculatedJobStatus={job.calculatedJobStatus}
                                        submitDate={job.createdAt ? formatDateToThai(new Date(job.createdAt)) : '-'}
                                        deadline={job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}
                                        sla={calculateSLA(job)}
                                        assignee={job.assignee || '-'}
                                        isParent={job.isParent}
                                        hasChildren={job.children && job.children.length > 0}
                                        isExpanded={expandedRows.has(job.id)}
                                        onToggleExpand={() => toggleRowExpansion(job.id)}
                                    />
                                    {job.children && job.children.length > 0 && expandedRows.has(job.id) && job.children.map((child) => (
                                        <JobMobileCard
                                            key={child.id}
                                            id={child.djId || `DJ-${child.id}`}
                                            pkId={child.id}
                                            priority={child.priority}
                                            project={child.project || job.project}
                                            type={child.jobType}
                                            subject={child.subject}
                                            status={child.status}
                                            submitDate={child.createdAt ? formatDateToThai(new Date(child.createdAt)) : '-'}
                                            deadline={child.deadline ? formatDateToThai(new Date(child.deadline)) : '-'}
                                            sla={calculateSLA(child)}
                                            assignee={child.assignee || '-'}
                                            isChild
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>เลขที่ DJ</Th>
                                    <Th>โครงการ</Th>
                                    <Th>ประเภทงาน</Th>
                                    <Th>หัวข้อ</Th>
                                    <Th>สถานะอนุมัติ</Th>
                                    <Th>สถานะงาน</Th>
                                    <Th>วันที่สร้าง</Th>
                                    <Th>กำหนดส่ง</Th>
                                    <Th>สถานะ SLA</Th>
                                    <Th>ผู้ออกแบบ</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-400">
                                {currentJobs.map((job) => (
                                    <React.Fragment key={job.id}>
                                        <JobRow
                                            id={job.djId || `DJ-${job.id}`}
                                            pkId={job.id}
                                            priority={job.priority}
                                            project={job.project}
                                            type={job.jobType}
                                            subject={job.subject}
                                            status={job.status}
                                            calculatedApprovalStatus={job.calculatedApprovalStatus}
                                            calculatedJobStatus={job.calculatedJobStatus}
                                            submitDate={job.createdAt ? formatDateToThai(new Date(job.createdAt)) : '-'}
                                            deadline={job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}
                                            sla={calculateSLA(job)}
                                            assignee={job.assignee || '-'}
                                            isParent={job.isParent}
                                            hasChildren={job.children && job.children.length > 0}
                                            isExpanded={expandedRows.has(job.id)}
                                            onToggleExpand={() => toggleRowExpansion(job.id)}
                                            rowClass={
                                                job.status === 'scheduled' ? 'bg-violet-50/30 hover:bg-violet-50' :
                                                    (job.priority?.toLowerCase() === 'urgent' && !['completed', 'rejected', 'cancelled'].includes(job.status?.toLowerCase())) ? 'bg-red-50/50 hover:bg-red-100/50' :
                                                        'hover:bg-gray-50'
                                            }
                                        />
                                        {/* Child Jobs (Accordion) */}
                                        {job.children && job.children.length > 0 && expandedRows.has(job.id) && (
                                            (() => {
                                                // 1. Build a map of job dependencies
                                                const childrenMap = new Map();
                                                job.children.forEach(c => childrenMap.set(c.id, c));

                                                // 2. Find chains by tracing from jobs with no successors (leaves) backwards
                                                // First, find all jobs that are a predecessor to someone
                                                const predecessorIds = new Set(job.children.map(c => c.predecessorId).filter(Boolean));

                                                // Leaves are jobs that are NOT predecessors to any other job
                                                const leaves = job.children.filter(c => !predecessorIds.has(c.id));

                                                // Build chains from leaves to roots
                                                const jobChains = new Map(); // jobId -> { index, total }

                                                leaves.forEach(leaf => {
                                                    const chain = [];
                                                    let current = leaf;

                                                    // Trace backwards
                                                    while (current) {
                                                        chain.unshift(current.id); // Add to front so root is at index 0
                                                        if (current.predecessorId && childrenMap.has(current.predecessorId)) {
                                                            current = childrenMap.get(current.predecessorId);
                                                        } else {
                                                            current = null;
                                                        }
                                                    }

                                                    // Only assign sequence numbers if chain length > 1
                                                    // (Standalone jobs like EDM will have chain length 1, so they won't get x/y numbering)
                                                    if (chain.length > 1) {
                                                        chain.forEach((jobId, idx) => {
                                                            // Avoid overwriting if a job belongs to multiple chains (though rare in linear chains)
                                                            // Keep the longest chain total if multiple exist
                                                            if (!jobChains.has(jobId) || jobChains.get(jobId).total < chain.length) {
                                                                jobChains.set(jobId, { index: idx + 1, total: chain.length });
                                                            }
                                                        });
                                                    }
                                                });

                                                return job.children.map((child) => {
                                                    // Get pre-calculated chain info for this specific job
                                                    // If it's a standalone job (chain length 1), this will be undefined
                                                    const chainInfo = jobChains.get(child.id);

                                                    return (
                                                        <JobRow
                                                            key={child.id}
                                                            id={child.djId || `DJ-${child.id}`}
                                                            pkId={child.id}
                                                            priority={child.priority}
                                                            project={child.project || job.project}
                                                            type={child.jobType}
                                                            subject={child.subject}
                                                            status={child.status}
                                                            submitDate={child.createdAt ? formatDateToThai(new Date(child.createdAt)) : '-'}
                                                            deadline={child.deadline ? formatDateToThai(new Date(child.deadline)) : '-'}
                                                            sla={calculateSLA(child)}
                                                            assignee={child.assignee || '-'}
                                                            isParent={false}
                                                            isChild={true}
                                                            childInfo={chainInfo} // Pass undefined for standalone jobs
                                                            rowClass={
                                                                (child.priority?.toLowerCase() === 'urgent' && !['completed', 'rejected', 'cancelled'].includes(child.status?.toLowerCase()))
                                                                    ? 'bg-red-50/80 hover:bg-red-100/80'
                                                                    : 'bg-gray-50/80 hover:bg-gray-100'
                                                            }
                                                        />
                                                    );
                                                });
                                            })()
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && filteredJobs.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-400 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            แสดง {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} จาก {filteredJobs.length} รายการ
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &laquo;
                            </Button>
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                // Show first, last, current, and adjacent pages
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <Button
                                            key={page}
                                            variant={page === currentPage ? 'primary' : 'secondary'}
                                            className="px-3"
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="px-2 text-gray-400">...</span>;
                                }
                                return null;
                            })}
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Helper Components
// ============================================

/**
 * @component FilterSelect
 * @description Dropdown สำหรับ filter
 */
function FilterSelect({ label, value, onChange, options, optionLabels }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
                <option value="">ทั้งหมด</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{optionLabels?.[opt] || opt}</option>
                ))}
            </select>
        </div>
    );
}

/**
 * @component Th
 * @description Table header cell
 */
function Th({ children }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{children}</th>
    );
}

function resolveDisplayStatuses(status, isParent, hasChildren, isChild, calculatedApprovalStatus, calculatedJobStatus) {
    if (isParent && hasChildren) {
        return {
            approval: calculatedApprovalStatus || status,
            work: calculatedJobStatus || status
        };
    }

    if (isChild) {
        if (status?.includes('pending') && status !== 'pending_dependency') {
            return { approval: status, work: 'pending_dependency' };
        }
        if (status === 'pending_dependency') {
            return { approval: 'approved', work: 'pending_dependency' };
        }
        return {
            approval: status === 'rejected' ? 'rejected' : 'approved',
            work: status
        };
    }

    if (status?.includes('pending') && status !== 'pending_dependency') {
        return { approval: status, work: status };
    }
    if (['approved', 'assigned', 'in_progress', 'completed', 'rejected_by_assignee'].includes(status)) {
        return { approval: 'approved', work: status };
    }
    if (status === 'rejected') {
        return { approval: 'rejected', work: status };
    }
    return { approval: status, work: status };
}

function JobMobileCard({
    id, pkId, project, type, subject, status, priority,
    calculatedApprovalStatus, calculatedJobStatus,
    submitDate, deadline, sla, assignee,
    isParent, hasChildren, isExpanded, onToggleExpand, isChild
}) {
    const display = resolveDisplayStatuses(status, isParent, hasChildren, isChild, calculatedApprovalStatus, calculatedJobStatus);

    return (
        <article className={`p-4 ${isChild ? 'bg-gray-50 pl-8' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {isParent && hasChildren && (
                            <button
                                type="button"
                                onClick={onToggleExpand}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                                aria-label={isExpanded ? 'ยุบงานย่อย' : 'กางงานย่อย'}
                            >
                                <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                        <Link to={`/jobs/${pkId}`} className="font-semibold text-rose-600 hover:underline">
                            {id}
                        </Link>
                        {priority?.toLowerCase() === 'urgent' && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">ด่วน</span>
                        )}
                        {isParent && hasChildren && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Parent Job</span>}
                        {isChild && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">งานย่อย</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-900">{subject}</p>
                    <p className="mt-1 text-xs text-gray-500">{project} · {type}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                    <div>สร้าง: {submitDate}</div>
                    <div className="mt-1 font-medium text-gray-700">ส่ง: {deadline}</div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="mb-1 text-xs text-gray-500">สถานะอนุมัติ</p>
                    <Badge status={display.approval} isApprovalStatus />
                </div>
                <div>
                    <p className="mb-1 text-xs text-gray-500">สถานะงาน</p>
                    <Badge status={display.work} />
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-gray-600">ผู้ออกแบบ: <span className="font-medium text-gray-900">{assignee}</span></span>
                <span>{sla}</span>
            </div>
        </article>
    );
}

/**
 * JobRow Component: แสดงแถวข้อมูลงาน DJ ในตาราง
 */
function JobRow({
    id, pkId, project, type, subject, status, priority,
    calculatedApprovalStatus, calculatedJobStatus,
    submitDate, deadline, sla, assignee,
    isParent, hasChildren, isExpanded, onToggleExpand,
    isChild, childInfo, rowClass = 'hover:bg-gray-50'
}) {
    const display = resolveDisplayStatuses(status, isParent, hasChildren, isChild, calculatedApprovalStatus, calculatedJobStatus);

    return (
        <tr className={rowClass}>
            <td className="px-4 py-3">
                <div className={`flex items-center ${isChild ? 'pl-6 border-l-2 border-gray-300' : ''}`}>
                    {isParent && hasChildren && (
                        <button
                            onClick={onToggleExpand}
                            className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-transform duration-200"
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <Link to={`/jobs/${pkId}`} className="text-rose-600 font-medium hover:underline">
                                {id}
                            </Link>
                            {priority?.toLowerCase() === 'urgent' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 ml-2">
                                    ด่วน
                                </span>
                            )}
                        </div>
                        {isParent && hasChildren && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded inline-block w-fit mt-1">Parent Job</span>}
                        {isChild && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block w-fit mt-1">
                                {childInfo ? `งานย่อย ${childInfo.index}/${childInfo.total}` : 'งานย่อย'}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-sm">{project}</td>
            <td className="px-4 py-3 text-sm">{type}</td>
            <td className="px-4 py-3 text-sm max-w-[200px] truncate" title={subject}>{subject}</td>
            <td className="px-4 py-3">
                {/* Approval Status */}
                <Badge status={display.approval} isApprovalStatus={true} />
            </td>
            <td className="px-4 py-3">
                {/* Job Status */}
                <Badge status={display.work} />
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">{submitDate}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-700">{deadline}</td>
            <td className="px-4 py-3 text-center">{sla}</td>
            <td className="px-4 py-3 text-sm">
                <span>{assignee}</span>
            </td>
        </tr>
    );
}
