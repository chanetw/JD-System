/**
 * @file UserPortal.jsx
 * @description หน้า User Portal (Self-Service) - V1 MVP ตาม Original 100%
 * 
 * ฟีเจอร์:
 * - Hero + Search Bar
 * - Quick Actions (4 การ์ด)
 * - งานล่าสุด (โหลดจาก API)
 * - SLA Info + Contact
 * - Media โครงการ (Grid + Tabs)
 * - เลือกประเภทงาน (6 การ์ด)
 * - เคล็ดลับ (Dark Background)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { getUserScopes } from '@shared/utils/scopeHelpers';
import { api } from '@shared/services/apiService';
import { adminService } from '@shared/services/modules/adminService';
import httpClient from '@shared/services/httpClient';
import { JOB_ICONS } from '@shared/constants/jobIcons';
import UserProfileMenu from '@shared/components/UserProfileMenu';
import { resolveSlaBadgePresentation } from '@shared/utils/slaStatusResolver';

// Icons
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    PhotoIcon,
    QuestionMarkCircleIcon,
    PhoneIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    VideoCameraIcon,
    PrinterIcon,
    ShareIcon,
    ComputerDesktopIcon,
    CalendarDaysIcon,
    DocumentIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
    Bars3BottomLeftIcon,
    ArrowTopRightOnSquareIcon,
    LinkIcon
} from '@heroicons/react/24/outline';

export default function UserPortal() {
    const navigate = useNavigate();
    const { user } = useAuthStoreV2();
    const [recentJobs, setRecentJobs] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeProject, setActiveProject] = useState(0);

    // Real data states
    const [projects, setProjects] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [stats, setStats] = useState({
        totalFiles: 0,
        deliveredFiles: 0,
        totalDownloads: 0
    });
    const [jobTypesList, setJobTypesList] = useState([]);
    const [portalSettings, setPortalSettings] = useState({
        heroTitle: 'ต้องการงาน Design อะไรวันนี้?',
        heroSubtitle: 'ค้นหางานเดิมหรือสร้าง Design Job ใหม่',
        announcementText: '',
        announcementVisible: false
    });

    // โหลด Portal Settings
    useEffect(() => {
        httpClient.get('/tenant-settings/public/portal-settings')
            .then(res => {
                if (res.data.success) {
                    // Filter out empty values to keep default values
                    const filtered = Object.entries(res.data.data).reduce((acc, [key, value]) => {
                        if (value !== '' && value !== null && value !== undefined) {
                            acc[key] = value;
                        }
                        return acc;
                    }, {});
                    setPortalSettings(prev => ({ ...prev, ...filtered }));
                }
            })
            .catch(() => {});
    }, []);

    // Helper: Toggle row expansion
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

    // Helper: Build chain info for children (เรียงตาม dependency)
    const buildChainInfo = (children) => {
        if (!children || children.length === 0) return new Map();
        
        const childrenMap = new Map();
        children.forEach(c => childrenMap.set(c.id, c));
        
        const predecessorIds = new Set(children.map(c => c.predecessorId).filter(Boolean));
        const leaves = children.filter(c => !predecessorIds.has(c.id));
        const jobChains = new Map();
        
        leaves.forEach(leaf => {
            const chain = [];
            let current = leaf;
            while (current) {
                chain.unshift(current.id);
                if (current.predecessorId && childrenMap.has(current.predecessorId)) {
                    current = childrenMap.get(current.predecessorId);
                } else {
                    current = null;
                }
            }
            if (chain.length > 1) {
                chain.forEach((jobId, idx) => {
                    if (!jobChains.has(jobId) || jobChains.get(jobId).total < chain.length) {
                        jobChains.set(jobId, { index: idx + 1, total: chain.length });
                    }
                });
            }
        });
        
        return jobChains;
    };

    // Helper: Calculate SLA
    const calculateSLA = (job) => {
        const slaBadge = resolveSlaBadgePresentation({
            status: job.status,
            deadline: job.deadline,
            completedAt: job.completedAt
        });

        if (slaBadge.key === 'no_deadline') return null;
        return <span className="text-xs text-slate-600">{slaBadge.text}</span>;
    };

    // Helper: Format date to Thai
    const formatDateToThai = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        });
    };

    // โหลดงานล่าสุด (My Requests หรือทั้งหมดสำหรับ Admin)
    useEffect(() => {
        const loadJobs = async () => {
            console.log('[UserPortal] Loading jobs, user:', user);
            try {
                // Admin: ดึงงานทั้งหมด, User อื่นๆ: ดึงเฉพาะงานที่ตัวเองเป็น requester
                const isAdmin = user?.userRoles?.some(role => 
                    role.roleName?.toLowerCase() === 'admin' && role.isActive
                );
                console.log('[UserPortal] Is admin:', isAdmin);
                console.log('[UserPortal] User roles:', user?.userRoles);
                
                const jobs = isAdmin 
                    ? await api.getJobs({}) // Admin ดึงทั้งหมด
                    : await api.getJobsByRole(user); // User ดึงตาม role
                
                console.log('[UserPortal] API response:', jobs);
                const jobsData = Array.isArray(jobs) ? jobs : (jobs?.data || []);
                console.log('[UserPortal] Jobs data:', jobsData.length, 'jobs');
                
                if (jobsData.length > 0) {
                    console.log('[UserPortal] Sample job:', jobsData[0]);
                }
                
                // นับจำนวน Child ของแต่ละ Parent
                const parentChildCount = {};
                const childrenMap = {};
                jobsData.forEach(job => {
                    if (job.parentJobId) {
                        parentChildCount[job.parentJobId] = (parentChildCount[job.parentJobId] || 0) + 1;
                        if (!childrenMap[job.parentJobId]) childrenMap[job.parentJobId] = [];
                        childrenMap[job.parentJobId].push(job);
                    }
                });
                
                // กรองงาน: ซ่อน Parent ที่มี Child เดียว, ซ่อน Child ที่มี siblings > 1
                const filteredJobs = jobsData.filter(job => {
                    if (job.isParent) {
                        const childCount = parentChildCount[job.id] || 0;
                        if (childCount === 1) return false; // ซ่อน Parent ที่มี Child เดียว
                        if (childCount > 1) {
                            job.children = childrenMap[job.id]; // เก็บ children array
                        }
                    } else if (job.parentJobId) {
                        const siblingCount = parentChildCount[job.parentJobId] || 0;
                        if (siblingCount > 1) return false; // ซ่อน Child ที่มี siblings
                    }
                    return true;
                });
                
                // เรียงลำดับ: งานด่วน (priority: high) ขึ้นก่อน แล้วเรียงตาม updatedAt
                const sortedJobs = [...filteredJobs].sort((a, b) => {
                    // เรียงงานด่วนขึ้นก่อน
                    const aPriority = a.priority?.toLowerCase() === 'high' ? 1 : 0;
                    const bPriority = b.priority?.toLowerCase() === 'high' ? 1 : 0;
                    if (bPriority !== aPriority) return bPriority - aPriority;
                    
                    // ถ้า priority เท่ากัน เรียงตาม updatedAt
                    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                });
                
                console.log('[UserPortal] Filtered & sorted jobs (top 5):', sortedJobs.slice(0, 5).map(j => ({
                    id: j.id,
                    djId: j.djId,
                    subject: j.subject,
                    priority: j.priority,
                    status: j.status,
                    isParent: j.isParent,
                    childrenCount: j.children?.length || 0
                })));
                
                setRecentJobs(sortedJobs.slice(0, 5));
            } catch (err) {
                console.error('[UserPortal] Error loading jobs:', err);
                console.error('[UserPortal] Error details:', err.response?.data || err.message);
            } finally {
                setIsLoading(false);
            }
        };
        loadJobs();
    }, [user]);

    // โหลด Projects และ Media Files
    useEffect(() => {
        loadProjectsAndMedia();
    }, []);

    const loadProjectsAndMedia = async () => {
        try {
            // 1. Load Projects (Backend จะกรองตาม User Scope อัตโนมัติแต่นำการกรอง Scope เข้ามาเสริม)
            const projectsData = await adminService.getProjects();
            let filteredProjects = projectsData;

            if (user?.id) {
                const userScopes = await getUserScopes(user.id);
                const hasTenantScope = userScopes.some(s => s.scope_level?.toLowerCase() === 'tenant');
                if (!hasTenantScope && userScopes.length > 0) {
                    const allowedProjectIds = new Set(userScopes.filter(s => s.scope_level?.toLowerCase() === 'project').map(s => s.project_id));
                    if (allowedProjectIds.size > 0) {
                        filteredProjects = projectsData.filter(p => allowedProjectIds.has(p.id));
                    }
                }
            }

            // 1.5 Load Job Types for SLA
            const jtData = await adminService.getJobTypes();
            setJobTypesList(jtData.filter(j => j.isActive !== false));

            // 2. Load Media Files
            const response = await httpClient.get('/storage/files');
            if (response.data.success) {
                const files = response.data.data;
                setMediaFiles(files);

                // คำนวณ Stats
                const totalDownloads = files.reduce((sum, f) => sum + (f.downloadCount || 0), 0);
                setStats({
                    totalFiles: files.length,
                    deliveredFiles: files.filter(f => f.jobId).length,
                    totalDownloads
                });

                // 3. นับจำนวนไฟล์ในแต่ละโครงการและเรียงลำดับ
                const projectFileCounts = {};
                files.forEach(f => {
                    if (f.projectId) {
                        projectFileCounts[f.projectId] = (projectFileCounts[f.projectId] || 0) + 1;
                    }
                });

                // เพิ่มจำนวนไฟล์ให้แต่ละโครงการและเรียงลำดับ (โครงการที่มีไฟล์มากขึ้นก่อน)
                const projectsWithCounts = filteredProjects.map(p => ({
                    ...p,
                    fileCount: projectFileCounts[p.id] || 0
                })).sort((a, b) => b.fileCount - a.fileCount);

                setProjects(projectsWithCounts);
            }
        } catch (error) {
            console.error('[UserPortal] Error loading projects/media:', error);
        }
    };

    // ค้นหา
    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/jobs?search=${encodeURIComponent(searchQuery)}`);
        }
    };



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
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* ============================================
          Top Navigation
          ============================================ */}
            <nav className="bg-white shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-40 h-[90px] sm:h-16">
                <div className="max-w-6xl mx-auto px-3 sm:px-6 h-full">
                    {/* Mobile Header */}
                    <div className="sm:hidden h-full py-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <span className="font-bold text-base">DJ</span>
                                </div>
                                <div className="min-w-0">
                                    <h1 className="font-bold text-base text-slate-800 leading-tight truncate">DJ Request Portal</h1>
                                    <p className="text-[11px] text-slate-500 leading-tight truncate">Design Job Self-Service</p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <UserProfileMenu />
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link to="/jobs" className="text-center rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:border-rose-200">
                                My Jobs
                            </Link>
                            <Link to="/media-portal" className="text-center rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:border-rose-200">
                                Media Portal
                            </Link>
                        </div>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden sm:flex items-center justify-between h-full">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white">
                                <span className="font-bold text-lg">DJ</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-slate-800 leading-tight">DJ Request Portal</h1>
                                <p className="text-xs text-slate-500">Design Job Self-Service</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link to="/jobs" className="text-slate-600 hover:text-rose-600 text-sm font-medium">My Jobs</Link>
                            <Link to="/media-portal" className="text-slate-600 hover:text-rose-600 text-sm font-medium">Media Portal</Link>
                            {/* Profile Menu Dropdown (Shared Component) */}
                            <div className="relative pl-4 border-l border-slate-200">
                                <UserProfileMenu showName />
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ============================================
          Main Content
          ============================================ */}
            <main className="pt-[90px] pb-12 sm:pt-16">

                {/* Announcement Banner - Marquee Scrolling */}
                {portalSettings.announcementVisible && portalSettings.announcementText && (
                    <div className="bg-amber-50 border-b border-amber-200 overflow-hidden">
                        <style>{`
                            @keyframes news-ticker {
                                0%   { transform: translateX(100vw); }
                                100% { transform: translateX(-100%); }
                            }
                            .news-ticker-text {
                                display: inline-block;
                                animation: news-ticker 12s linear infinite;
                                white-space: nowrap;
                            }
                            .news-ticker-text:hover {
                                animation-play-state: paused;
                            }
                        `}</style>
                        <div className="flex items-center">
                            {/* Left badge */}
                            <div className="flex-shrink-0 flex items-center gap-1.5 bg-amber-100 text-amber-700 px-4 py-2.5 text-xs font-semibold border-r border-amber-200">
                                <span>📢</span>
                                <span>ประกาศ</span>
                            </div>
                            {/* Scrolling text */}
                            <div className="flex-1 overflow-hidden py-2.5">
                                <span className="news-ticker-text text-sm text-amber-700 px-8">
                                    {portalSettings.announcementText}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hero Section */}
                <div className="bg-gradient-to-r from-rose-600 to-rose-800 py-16">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                        <h2 className="text-3xl font-bold text-white mb-4">{portalSettings.heroTitle}</h2>
                        <p className="text-rose-100 mb-8">{portalSettings.heroSubtitle}</p>

                        <div className="max-w-2xl mx-auto relative">
                            <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ค้นหา DJ ID หรือชื่องาน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                                className="w-full pl-14 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-rose-300 shadow-lg bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Actions Cards */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 sm:-mt-8 relative z-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickActionCard
                            to="/create"
                            icon={<PlusIcon className="w-7 h-7 text-rose-600" />}
                            bgColor="bg-rose-100 group-hover:bg-rose-200"
                            title="สร้าง DJ ใหม่"
                            desc="เปิดงาน Design Job"
                        />
                        <QuickActionCard
                            to="/jobs"
                            icon={<ClipboardDocumentListIcon className="w-7 h-7 text-indigo-600" />}
                            bgColor="bg-indigo-100 group-hover:bg-indigo-200"
                            title="งานของฉัน"
                            desc="ดูสถานะงานทั้งหมด"
                        />
                        <QuickActionCard
                            to="/dashboard"
                            icon={<ComputerDesktopIcon className="w-7 h-7 text-amber-600" />}
                            bgColor="bg-amber-100 group-hover:bg-amber-200"
                            title="Dashboard"
                            desc="ภาพรวมสถานะงาน"
                        />
                        <QuickActionCard
                            to="/media-portal"
                            icon={<PhotoIcon className="w-7 h-7 text-emerald-600" />}
                            bgColor="bg-emerald-100 group-hover:bg-emerald-200"
                            title="Media Portal"
                            desc="คลังไฟล์งาน Design"
                        />
                    </div>
                </div>

                {/* Content Columns */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left: Recent Jobs */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800 text-lg">งานล่าสุดของฉัน</h3>
                                <Link to="/jobs" className="text-rose-600 hover:underline text-sm">ดูทั้งหมด</Link>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-2 py-3 w-8"></th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DJ ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่องาน</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">อัปเดตล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                    <div className="animate-spin w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full mx-auto"></div>
                                                </td>
                                            </tr>
                                        ) : recentJobs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                    ไม่มีงาน
                                                </td>
                                            </tr>
                                        ) : (
                                            recentJobs.map((job) => (
                                                <React.Fragment key={job.id}>
                                                    {/* Parent Row */}
                                                    <tr
                                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                                    >
                                                        <td className="px-2 py-3">
                                                            {job.isParent && job.children?.length > 0 && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleRowExpansion(job.id);
                                                                    }}
                                                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                                >
                                                                    {expandedRows.has(job.id) ? (
                                                                        <ChevronDownIcon className="w-4 h-4 text-slate-600" />
                                                                    ) : (
                                                                        <ChevronRightIcon className="w-4 h-4 text-slate-600" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
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

                                                    {/* Child Rows (Accordion) */}
                                                    {job.children?.length > 0 && expandedRows.has(job.id) && (
                                                        (() => {
                                                            const jobChains = buildChainInfo(job.children);
                                                            
                                                            // เรียงตาม chain index (เลขน้อยอยู่บน)
                                                            const sortedChildren = [...job.children].sort((a, b) => {
                                                                const aChain = jobChains.get(a.id);
                                                                const bChain = jobChains.get(b.id);
                                                                if (aChain && bChain) {
                                                                    return aChain.index - bChain.index;
                                                                }
                                                                return 0;
                                                            });
                                                            
                                                            return sortedChildren.map((child) => {
                                                                const chainInfo = jobChains.get(child.id);
                                                                const chainLabel = chainInfo 
                                                                    ? `${chainInfo.index}/${chainInfo.total}` 
                                                                    : '';
                                                                
                                                                return (
                                                                    <tr
                                                                        key={child.id}
                                                                        onClick={() => navigate(`/jobs/${child.id}`)}
                                                                        className="bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors"
                                                                    >
                                                                        <td className="px-2 py-3"></td>
                                                                        <td className="px-4 py-3 pl-8">
                                                                            <span className="text-sm text-slate-600">
                                                                                ↳ {child.djId || `DJ-${child.id}`}
                                                                                {chainLabel && (
                                                                                    <span className="ml-2 text-xs text-slate-400">
                                                                                        ({chainLabel})
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {/* ว่างเปล่า - ไม่แสดงชื่องาน */}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <Badge status={child.status} />
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-xs text-slate-600">
                                                                                    {formatDateToThai(child.deadline)}
                                                                                </span>
                                                                                {calculateSLA(child)}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()
                                                    )}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Info & Contact */}
                        <div className="space-y-6">
                            {/* SLA Info */}
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg mb-4">ระยะเวลาดำเนินการ (SLA)</h3>
                                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-slate-200 h-96 overflow-y-auto">
                                    {jobTypesList.length > 0 ? (
                                        jobTypesList
                                            // ซ่อน Project Group JobTypes
                                            .filter(type => {
                                                const name = type.name.toLowerCase();
                                                // ซ่อน JobTypes ที่เป็น Project Group (คำว่า group, project, parent ในชื่อ)
                                                return !name.includes('group') && 
                                                       !name.includes('project') && 
                                                       !name.includes('parent') &&
                                                       !name.includes('โครงการ') &&
                                                       !name.includes('กลุ่ม');
                                            })
                                            .map(type => {
                                                const iconConfig = JOB_ICONS[type.icon] || JOB_ICONS.social;
                                                return (
                                                    <SLAItem
                                                        key={type.id}
                                                        iconConfig={iconConfig}
                                                        title={type.name}
                                                        days={`${type.sla || '-'} วันทำการ`}
                                                    />
                                                );
                                            })
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">กำลังโหลดข้อมูล SLA...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================
              Media โครงการของฉัน
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-800 text-lg">Media โครงการของฉัน</h3>
                            <p className="text-sm text-slate-500">ไฟล์งานล่าสุดจากโครงการที่คุณดูแล</p>
                        </div>
                        <Link to="/media-portal" className="text-rose-600 hover:underline text-sm flex items-center gap-1">
                            ดูทั้งหมด
                            <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Project Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                        {projects.length > 0 ? (
                            projects.map((project, idx) => (
                                <button
                                    key={project.id}
                                    onClick={() => setActiveProject(idx)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeProject === idx
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {project.name} ({project.fileCount || 0})
                                </button>
                            ))
                        ) : (
                            <p className="text-slate-400 text-sm">ไม่มีโครงการ</p>
                        )}
                    </div>

                    {/* Media Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                            // กรองไฟล์ตามโครงการที่เลือก
                            const selectedProject = projects[activeProject];
                            const filteredFiles = selectedProject 
                                ? mediaFiles.filter(f => f.projectId === selectedProject.id)
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                    .slice(0, 3)
                                : [];
                            
                            return filteredFiles.length > 0 ? (
                                filteredFiles.map((file) => (
                                    <MediaCard key={file.id} file={file} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-slate-400">
                                    <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>ยังไม่มีไฟล์ในโครงการนี้</p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Quick Stats - Real Data */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <ArchiveBoxIcon className="w-4 h-4" />
                            รวม {stats.totalFiles} ไฟล์
                        </span>
                        <span className="flex items-center gap-1">
                            <DocumentIcon className="w-4 h-4" />
                            งานส่งมอบแล้ว {stats.deliveredFiles} ชิ้น
                        </span>
                        <span className="flex items-center gap-1">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            ดาวน์โหลด {stats.totalDownloads.toLocaleString()} ครั้ง
                        </span>
                    </div>
                </div>

                {/* ============================================
              เลือกประเภทงาน
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <h3 className="font-semibold text-slate-800 text-lg mb-4">เลือกประเภทงาน</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {jobTypesList.filter(type => type.status === 'active' || type.isActive).map((type) => {
                            const iconConfig = JOB_ICONS[type.icon] || JOB_ICONS.social;
                            return (
                                <Link
                                    key={type.id}
                                    to={`/create?type=${type.id}`}
                                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition text-center group border border-slate-100"
                                >
                                    <div className={`w-12 h-12 ${iconConfig.bg} rounded-xl mx-auto mb-2 flex items-center justify-center group-hover:brightness-95 transition`}>
                                        <svg className={`w-6 h-6 ${iconConfig.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {iconConfig.path}
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">{type.name}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ============================================
              เคล็ดลับการเปิดงาน DJ
              ============================================ */}
                <div className="max-w-6xl mx-auto px-6 mt-12 pb-8">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
                        <h3 className="text-xl font-bold mb-6">เคล็ดลับการเปิดงาน DJ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <TipItem num="1" title="Brief ให้ชัดเจน" desc="ระบุ Objective, Target Audience และ Key Message ให้ครบถ้วน" />
                            <TipItem num="2" title="แนบ Reference" desc="ใส่ตัวอย่างงานที่ต้องการ หรือ Link ภาพอ้างอิงเพื่อให้ทีมเข้าใจ" />
                            <TipItem num="3" title="วางแผนล่วงหน้า" desc="เปิดงานก่อน Deadline จริงอย่างน้อย 2-3 วันสำหรับการแก้ไข" />
                        </div>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-6">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">DJ System v2.0 | SENA Development PCL</p>
                    <Link to="/" className="text-sm text-rose-600 hover:underline flex items-center gap-1">
                        <ArrowRightIcon className="w-4 h-4" />
                        Staff Dashboard
                    </Link>
                </div>
            </footer>
        </div>
    );
}

// ============================================
// Helper Components
// ============================================

function QuickActionCard({ to, icon, bgColor, title, desc }) {
    return (
        <Link to={to} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition text-center group border border-slate-100">
            <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center transition ${bgColor}`}>
                {icon}
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500">{desc}</p>
        </Link>
    );
}

function SLAItem({ icon: Icon, iconConfig, iconColor, title, days }) {
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            {iconConfig ? (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconConfig.bg} ${iconConfig.text}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {iconConfig.path}
                    </svg>
                </div>
            ) : (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                    <Icon className="w-4 h-4" />
                </div>
            )}
            <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{days}</p>
            </div>
        </div>
    );
}

function MediaCard({ file }) {
    const isExternalLink = file.fileType === 'link';
    const jobSubject = file.job?.subject || file.fileName || 'Untitled';
    const dateStr = new Date(file.createdAt || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const projectName = file.project?.name || file.project?.code || 'No Project';

    const handleView = (e) => {
        if (e) e.stopPropagation();
        // เปิดหน้าเว็บทันที (ไม่รอ tracking)
        let urlToOpen = file.publicUrl || file.filePath;
        // เติม https:// ถ้า URL ไม่มี protocol
        if (urlToOpen && !urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://') && !urlToOpen.startsWith('/')) {
            urlToOpen = 'https://' + urlToOpen;
        }
        window.open(urlToOpen, '_blank');
        
        // Track แบบ async (ไม่ block)
        httpClient.post('/analytics/track-click', {
            fileId: file.id,
            action: 'view'
        }).catch(err => console.error('[MediaCard] Track error:', err));
    };

    return (
        <div
            onClick={handleView}
            className="bg-white rounded border border-slate-200 shadow-sm p-3 hover:bg-slate-50 hover:shadow transition-all cursor-pointer flex flex-col justify-between min-h-[100px]"
        >
            <div>
                {/* Project Badge */}
                <div className="flex gap-1.5 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                        {projectName}
                    </span>
                    {isExternalLink && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            Link
                        </span>
                    )}
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug mb-3" title={file.fileName}>
                    {jobSubject}
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-slate-400 mt-auto pt-2">
                <div className="flex items-center gap-3">
                    <Bars3BottomLeftIcon className="w-4 h-4" />
                    <div className="flex items-center gap-1 text-xs font-medium">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {dateStr}
                    </div>
                </div>
                {/* Open Link Icon - ใช้อันเดียว */}
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </div>
        </div>
    );
}

function TipItem({ num, title, desc }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                {num}
            </div>
            <div>
                <h4 className="font-semibold mb-1 text-white">{title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}


