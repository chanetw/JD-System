/**
 * @file MyQueue.jsx
 * @description Dashboard สำหรับ Assignee (Graphic/Editor) เพื่อดูงานที่ต้องทำ
 * รองรับการแบ่ง Tab (กำลังทำ, เสร็จแล้ว, ปฏิเสธ, ปฏิทิน) และแสดง SLA Health Color
 * พร้อม Timeline View แบบ Gantt Chart
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@shared/services/apiService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { fileUploadService } from '@shared/services/modules/fileUploadService';
import { Card } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useSocket } from '@shared/hooks';
import {
    ClipboardDocumentListIcon,
    PlayCircleIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentMagnifyingGlassIcon,
    FunnelIcon,
    ArrowsUpDownIcon,
    XCircleIcon,
    CalendarDaysIcon,
    PencilSquareIcon,
    ArrowPathIcon,
    PaperClipIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import TimelineView from '../components/TimelineView';
import DraftSubmitModal from '@features/job-management/components/DraftSubmitModal';
import DeliveredItemsEditor from '@features/job-management/components/DeliveredItemsEditor';
import httpClient from '@shared/services/httpClient';
import { ACTION_BUTTON_STYLES, showAlert } from '@shared/utils/alertHelper';
import {
    ASSIGNEE_COMPLETE_ACTION_STATUSES,
    ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES,
    ASSIGNEE_REJECTABLE_STATUSES,
} from '@shared/constants/jobStatus';

/**
 * แถบเมนูสถานะงาน (Tabs Configuration)
 * ปรับโครงสร้างใหม่: กำลังทำ | เสร็จแล้ว | ปฏิเสธ | ปฏิทิน
 */
const TABS = [
    { id: 'in_progress', label: 'กำลังทำ', icon: PlayCircleIcon, color: 'text-amber-600' },
    { id: 'completed', label: 'เสร็จแล้ว', icon: CheckCircleIcon, color: 'text-green-600' },
    { id: 'rejected', label: 'ปฏิเสธ', icon: XCircleIcon, color: 'text-red-600' },
    { id: 'timeline', label: 'ปฏิทิน', icon: CalendarDaysIcon, color: 'text-blue-600' },
];

const TAB_DESCRIPTIONS = {
    in_progress: {
        icon: '▶️',
        title: 'กำลังทำ',
        desc: 'งานที่อยู่ระหว่างดำเนินการ รวมงานที่ได้รับมอบหมาย กำลังทำ รอตรวจ Draft และรอแก้ไข (งานที่ approved แล้วหรือข้าม flow มาถึงผู้รับงานแล้ว)',
        statuses: '(approved, assigned, in_progress, correction, rework, returned, pending_dependency, draft_review, pending_rebrief, rebrief_submitted)',
    },
    completed: {
        icon: '✅',
        title: 'เสร็จแล้ว',
        desc: 'งานที่ส่งมอบเรียบร้อยแล้ว',
        statuses: '(completed, closed)',
    },
    rejected: {
        icon: '❌',
        title: 'ปฏิเสธ',
        desc: 'งานที่ปฏิเสธรับหรือถูกปฏิเสธ',
        statuses: '(rejected, rejected_by_assignee)',
    },
    timeline: {
        icon: '📅',
        title: 'ปฏิทิน',
        desc: 'มุมมองภาพรวมของกำหนดเวลางานทั้งหมดในรูปแบบ Timeline',
        statuses: '(all jobs)',
    },
};

const isValidTab = (value) => TABS.some(tab => tab.id === value);

export default function MyQueue() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuthStoreV2();

    // =====================================
    // Socket.io Integration สำหรับ Real-time Updates
    // =====================================
    const { socket, connected } = useSocket();
    const queryTab = searchParams.get('tab');
    const activeTab = isValidTab(queryTab) ? queryTab : 'in_progress';

    const setActiveTab = (nextTab) => {
        if (!isValidTab(nextTab) || nextTab === activeTab) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams);
        if (nextTab === 'in_progress') {
            nextParams.delete('tab');
        } else {
            nextParams.set('tab', nextTab);
        }

        setSearchParams(nextParams, { replace: true });
    };

    // State
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, critical: 0 });
    const [tabCounts, setTabCounts] = useState({ in_progress: 0, completed: 0, rejected: 0, timeline: 0 });

    // Filter & Sort State
    const [localSearch, setLocalSearch] = useState('');
    const [sortBy, setSortBy] = useState('deadline'); // 'deadline', 'priority', 'newest'
    const [filterProject, setFilterProject] = useState('all');

    // Draft & Rebrief Modal State
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showRebriefModal, setShowRebriefModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [rebriefReason, setRebriefReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Complete Modal State
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [finalLink, setFinalLink] = useState('');
    const [completeNote, setCompleteNote] = useState('');
    const [completeUploadedFiles, setCompleteUploadedFiles] = useState([]);
    const [completeUploadingFile, setCompleteUploadingFile] = useState(false);
    const [completeItemsLoading, setCompleteItemsLoading] = useState(false);
    const [completeDeliveredItems, setCompleteDeliveredItems] = useState({});
    const [isCompleting, setIsCompleting] = useState(false);
    const completeFileInputRef = useRef(null);
    // 10MB รวมสำหรับ final delivery (draft ใช้ global 50MB)
    const COMPLETE_MAX_TOTAL = 10 * 1024 * 1024;

    // Derived Data for Filters
    const projects = [...new Set(jobs.map(j => j.projectName))].filter(Boolean);

    /**
     * ดึงข้อมูลงานเมื่อ Tab หรือ User เปลี่ยน
     */
    useEffect(() => {
        if (user?.id) {
            fetchJobs();
        }
    }, [user?.id, activeTab]);

    useEffect(() => {
        if (user?.id) {
            fetchAllTabCounts();
        }
    }, [user?.id]);

    /**
     * =====================================
     * Socket.io Event Listener สำหรับ Real-time Job Updates
     * =====================================
     * ตั้งค่า Socket.io listeners เมื่อ Socket เชื่อมต่อ
     * - job:assigned: งานใหม่ได้รับมอบหมาย
     * - job:status-changed: สถานะงานเปลี่ยน
     * 
     * เมื่อเกิด Event ให้ Auto-refresh jobs list
     */
    useEffect(() => {
        if (!connected || !socket) {
            return;
        }

        try {
            // =====================================
            // Event: job:assigned - งานใหม่ได้รับมอบหมาย
            // =====================================
            const handleJobAssigned = () => {
                // Refresh jobs list เพื่อแสดงงานใหม่
                // ไม่ต้อง toast ที่นี่เพราะ useNotifications จะจัดการ
                if (activeTab === 'in_progress') {
                    fetchJobs();
                }
            };

            // =====================================
            // Event: job:status-changed - สถานะงานเปลี่ยน
            // =====================================
            const handleJobStatusChanged = () => {
                // Refresh jobs list เพื่อให้ updated status
                fetchJobs();
            };

            // =====================================
            // Event: job:completed - งานเสร็จสิ้น
            // =====================================
            const handleJobCompleted = () => {
                // Refresh jobs list เพื่อให้ completed status
                fetchJobs();
            };

            // ตั้งค่า Socket Listeners
            socket.on('job:assigned', handleJobAssigned);
            socket.on('job:status-changed', handleJobStatusChanged);
            socket.on('job:completed', handleJobCompleted);

            // =====================================
            // Cleanup: ลบ listeners ตอน unmount
            // =====================================
            return () => {
                socket.off('job:assigned', handleJobAssigned);
                socket.off('job:status-changed', handleJobStatusChanged);
                socket.off('job:completed', handleJobCompleted);
            };
        } catch (err) {
            console.error('[MyQueue] Error setting up socket listeners:', err);
        }
    }, [socket, connected, activeTab]);

    /**
     * Fetch Jobs Function
     */
    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Timeline tab ดึงงานที่กำลังทำ (เหมือน in_progress tab)
            const filterStatus = activeTab === 'timeline' ? 'in_progress' : activeTab;
            const data = await api.getAssigneeJobs(user.id, filterStatus);
            setJobs(data || []);

            const criticalCount = (data || []).filter(j => j.healthStatus === 'critical').length;
            const urgentCount = (data || []).filter(j => j.priority?.toLowerCase() === 'urgent').length;
            setStats({ total: (data || []).length, critical: criticalCount, urgent: urgentCount });
        } catch (error) {
            console.error('[MyQueue] ❌ Failed to fetch My Queue:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllTabCounts = async () => {
        try {
            // ⚡ Performance: ใช้ getJobCounts (1 API call) แทน 4 API calls
            const counts = await api.getJobCounts();
            setTabCounts({
                in_progress: counts.in_progress || 0,
                completed: counts.completed || 0,
                rejected: counts.rejected || 0,
                timeline: counts.in_progress || 0, // ให้ปฏิทินเท่ากับกำลังทำ
            });
        } catch (err) {
            console.error('[MyQueue] fetchAllTabCounts error:', err);
        }
    };

    /**
     * เปิด Complete Modal
     */
    const handleDeliveredItemChange = (itemId, value) => {
        if (!/^\d*$/.test(value)) return;
        setCompleteDeliveredItems(prev => ({ ...prev, [itemId]: value }));
    };

    const buildDeliveredItemsPayload = (values) => {
        return Object.entries(values)
            .filter(([, value]) => value !== '' && value !== null && value !== undefined)
            .map(([itemId, value]) => ({
                itemId: Number(itemId),
                deliveredQty: Number(value)
            }));
    };

    const handleOpenCompleteModal = async (job, e) => {
        if (e) e.stopPropagation();
        setSelectedJob(job);
        setFinalLink('');
        setCompleteNote('');
        setCompleteUploadedFiles([]);
        setCompleteDeliveredItems({});
        setShowCompleteModal(true);

        setCompleteItemsLoading(true);
        try {
            const detail = await api.getJobById(job.id);
            const jobDetail = detail?.data || detail;
            if (jobDetail?.id === job.id) {
                setSelectedJob(jobDetail);
            }
        } catch (error) {
            console.error('[MyQueue] Failed to load complete modal job detail:', error);
            showAlert('warning', 'โหลดรายการชิ้นงานไม่สำเร็จ', 'ยังสามารถส่งงานได้ แต่ระบบอาจไม่แสดงช่องกรอกจำนวนชิ้นงานในครั้งนี้');
        } finally {
            setCompleteItemsLoading(false);
        }
    };

    /**
     * อัปโหลดไฟล์ใน Complete Modal (จำกัด 10MB รวม)
     */
    const handleCompleteFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // ตรวจขนาดรวม (existing + new) ≤ 10MB
        const existingSize = completeUploadedFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0);
        const newSize = files.reduce((sum, f) => sum + f.size, 0);
        if (existingSize + newSize > COMPLETE_MAX_TOTAL) {
            showAlert('warning', 'ขนาดไฟล์รวมเกินกำหนด', `ขนาดรวม ${((existingSize + newSize) / 1024 / 1024).toFixed(1)}MB เกินขีดจำกัด 10MB สำหรับไฟล์ส่งมอบ`);
            e.target.value = '';
            return;
        }

        setCompleteUploadingFile(true);
        try {
            const result = await fileUploadService.uploadMultipleFiles(files, {
                jobId: selectedJob?.id,
                projectId: selectedJob?.projectId,
                tenantId: user?.tenantId,
                userId: user?.id,
                attachmentType: 'complete',
                maxFileSize: COMPLETE_MAX_TOTAL
            });
            if (result.successfulFiles?.length) {
                setCompleteUploadedFiles(prev => [...prev, ...result.successfulFiles]);
            }
            if (result.errors?.length) {
                showAlert('warning', 'บางไฟล์ไม่สามารถอัปโหลดได้', result.errors.join('\n'));
            }
        } catch (err) {
            showAlert('error', 'อัปโหลดไฟล์ไม่สำเร็จ', err.message);
        } finally {
            setCompleteUploadingFile(false);
            e.target.value = '';
        }
    };

    /**
     * ลบไฟล์ที่แนบในรายการ
     */
    const handleCompleteRemoveFile = async (fileId) => {
        const result = await fileUploadService.deleteFile(fileId, user?.id);
        if (!result.success) {
            showAlert('error', 'ลบไฟล์ไม่สำเร็จ', result.error || 'ไม่สามารถลบไฟล์นี้ได้');
            return;
        }
        setCompleteUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    /**
     * ปิด Complete Modal พร้อม cleanup ไฟล์ที่อัปโหลดแล้วแต่ยังไม่ submit
     */
    const handleCloseCompleteModal = async () => {
        if (completeUploadedFiles.length > 0) {
            await Promise.allSettled(
                completeUploadedFiles.map(f => fileUploadService.deleteFile(f.id, user?.id))
            );
        }
        setShowCompleteModal(false);
        setFinalLink('');
        setCompleteNote('');
        setCompleteUploadedFiles([]);
        setCompleteItemsLoading(false);
        setCompleteDeliveredItems({});
        setIsCompleting(false);
        setSelectedJob(null);
    };

    /**
     * ส่งงาน (Complete Job) — รองรับทั้ง link และ ไฟล์แนบ
     */
    const handleCompleteJob = async () => {
        if (!finalLink.trim() && completeUploadedFiles.length === 0) {
            return showAlert('warning', 'กรุณาระบุลิงก์หรือแนบไฟล์', 'ต้องการลิงก์ผลงาน หรือแนบเอกสารส่งมอบอย่างน้อย 1 ไฟล์');
        }
        if (isCompleting) return;

        setIsCompleting(true);
        try {
            const attachments = [];
            if (finalLink.trim()) {
                attachments.push({ name: 'Final Link', url: finalLink.trim() });
            }
            completeUploadedFiles.forEach(f => {
                attachments.push({
                    fileId: f.id,
                    name: f.file_name || f.fileName,
                    filePath: f.file_path || f.filePath,
                    publicUrl: f.publicUrl
                });
            });

            await api.completeJob(selectedJob.id, {
                note: completeNote,
                attachments,
                deliveredItems: buildDeliveredItemsPayload(completeDeliveredItems)
            });
            await showAlert('success', 'ส่งมอบงานสำเร็จ!', 'ระบบได้แจ้งเตือนไปยังผู้สั่งงานเรียบร้อยแล้ว');
            setShowCompleteModal(false);
            setFinalLink('');
            setCompleteNote('');
            setCompleteUploadedFiles([]);
            setSelectedJob(null);
            fetchJobs();
            fetchAllTabCounts();
        } catch (err) {
            showAlert('error', 'ส่งงานไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        } finally {
            setIsCompleting(false);
        }
    };

    /**
     * เปิด Draft Submit Modal
     */
    const handleOpenDraftModal = (job, e) => {
        if (e) e.stopPropagation();
        setSelectedJob(job);
        setShowDraftModal(true);
    };

    /**
     * เปิด Rebrief Modal
     */
    const handleOpenRebriefModal = (job, e) => {
        if (e) e.stopPropagation();
        setSelectedJob(job);
        setRebriefReason('');
        setShowRebriefModal(true);
    };

    /**
     * ส่ง Rebrief Request
     */
    const handleRebrief = async () => {
        if (!rebriefReason.trim()) {
            return showAlert('warning', 'กรุณาระบุเหตุผล');
        }
        try {
            await httpClient.post(`/jobs/${selectedJob.id}/rebrief`, {
                reason: rebriefReason.trim()
            });
            await showAlert('success', 'ขอ Rebrief สำเร็จ', 'ระบบได้แจ้งเตือนไปยัง Requester แล้ว');
            setShowRebriefModal(false);
            setRebriefReason('');
            setSelectedJob(null);
            fetchJobs();
            fetchAllTabCounts();
        } catch (err) {
            showAlert('error', 'ขอ Rebrief ไม่สำเร็จ', err.response?.data?.message || err.message);
        }
    };

    const handleRejectByAssignee = async (job, e) => {
        if (e) e.stopPropagation();

        setSelectedJob(job);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            showAlert('warning', 'กรุณาระบุเหตุผลในการปฏิเสธงาน');
            return;
        }

        if (!selectedJob?.id || isRejecting) {
            return;
        }

        setIsRejecting(true);

        try {
            await api.rejectJobByAssignee(selectedJob.id, rejectReason.trim());
            await showAlert('success', 'ส่งคำขอปฏิเสธงานแล้ว', 'ระบบได้ส่งคำขอไปยังผู้อนุมัติเรียบร้อยแล้ว');
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedJob(null);
            fetchJobs();
            fetchAllTabCounts();
        } catch (err) {
            showAlert('error', 'ปฏิเสธงานไม่สำเร็จ', err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsRejecting(false);
        }
    };

    /**
     * คลิกการ์ดเพื่อดูรายละเอียด
     */
    const handleViewDetail = (jobId) => {
        navigate(`/jobs/${jobId}`);
    };

    /**
     * Helper: เลือกสีขอบการ์ดตาม Health Status
     */
    const getHealthBorderColor = (status) => {
        switch (status) {
            case 'critical': return 'border-l-4 border-l-red-500';
            case 'warning': return 'border-l-4 border-l-yellow-400';
            default: return 'border-l-4 border-l-green-500';
        }
    };

    /**
     * Helper: แสดง SLA Progress Bar
     */
    const renderSLABar = (job) => {
        if (activeTab === 'completed' || job.slaProgress === null) return null;
        const pct = job.slaProgress;
        const barColor = job.healthStatus === 'critical' ? 'bg-red-500'
            : job.healthStatus === 'warning' ? 'bg-yellow-400'
                : 'bg-green-500';
        return (
            <div className="w-full mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                    <span>SLA</span>
                    <span>{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    /**
     * Helper: แสดงวันที่รับงาน และ ควรเริ่มงานภายใน
     */
    const renderDateInfo = (job) => {
        const shouldStartStr = job.shouldStartBy
            ? new Date(job.shouldStartBy).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : null;
        const isPastShouldStart = job.shouldStartBy && new Date() > new Date(job.shouldStartBy) && activeTab !== 'completed';

        return (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                {shouldStartStr && (
                    <span className={isPastShouldStart ? 'text-orange-600 font-semibold' : ''} title="ควรเริ่มงานภายในวันที่นี้เพื่อให้ทันส่งตาม SLA">
                        {isPastShouldStart ? '⚡' : '🎯'} ควรเริ่มภายใน: {shouldStartStr}
                    </span>
                )}
            </div>
        );
    };

    /**
     * Filter & Sort Logic (SLA-Aware)
     * ลำดับ: urgent → overdue → shouldStart passed → critical → warning → normal
     */
    const getSortWeight = (job) => {
        if (activeTab === 'completed') return 0;
        const isUrgent = job.priority?.toLowerCase() === 'urgent';
        const isOverdue = job.hoursRemaining !== null && job.hoursRemaining < 0;
        const isPastShouldStart = job.shouldStartBy && new Date() > new Date(job.shouldStartBy);
        if (isUrgent && isOverdue) return 7;
        if (isUrgent) return 6;
        if (isOverdue) return 5;
        if (isPastShouldStart) return 4;
        if (job.healthStatus === 'critical') return 3;
        if (job.healthStatus === 'warning') return 2;
        return 1;
    };

    const projectFilteredJobs = jobs.filter(job => filterProject === 'all' || job.projectName === filterProject);
    const normalizedSearch = localSearch.trim().toLowerCase();

    const filteredJobs = projectFilteredJobs
        .filter(job => {
            if (!normalizedSearch) return true;
            const djId = String(job.djId || '').toLowerCase();
            const subject = String(job.subject || '').toLowerCase();
            return djId.includes(normalizedSearch) || subject.includes(normalizedSearch);
        })
        .sort((a, b) => {
            const weightDiff = getSortWeight(b) - getSortWeight(a);
            if (weightDiff !== 0) return weightDiff;

            if (sortBy === 'priority') {
                const priorityWeight = { 'urgent': 3, 'high': 2, 'normal': 1, 'low': 0 };
                return (priorityWeight[b.priority?.toLowerCase()] || 0) - (priorityWeight[a.priority?.toLowerCase()] || 0);
            }
            if (sortBy === 'deadline') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            }
            if (sortBy === 'newest') {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            }
            return 0;
        });

    const canSubmitComplete = Boolean(finalLink.trim()) || completeUploadedFiles.length > 0;

    return (
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">คิวงานของฉัน (My Queue)</h1>
                    <p className="text-gray-500">จัดการงานที่ได้รับมอบหมายและตรวจสอบกำหนดส่ง</p>
                </div>
                {/* Stats Summary */}
                <div className="flex flex-wrap gap-3">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-400">
                        <span className="text-sm text-gray-500 block">งานทั้งหมด</span>
                        <span className="text-xl font-bold text-rose-600">{jobs.length}</span>
                    </div>
                    {stats.critical > 0 && (
                        <div className="bg-red-50 px-4 py-2 rounded-lg shadow-sm border border-red-100">
                            <span className="text-sm text-red-600 block flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-4 h-4" /> ด่วน/เลยกำหนด
                            </span>
                            <span className="text-xl font-bold text-red-600">{stats.critical}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Toolbar: Search & Filter (ซ่อนเมื่ออยู่ใน Timeline tab) */}
            {activeTab !== 'timeline' && (
                <div className="bg-white p-4 rounded-xl border border-gray-400 shadow-sm grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
                    <div className="relative">
                        <DocumentMagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา DJ ID หรือหัวข้องาน..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
                        <div className="w-full lg:w-40">
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 appearance-none bg-white"
                            >
                                <option value="all">ทุกโปรเจกต์</option>
                                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="w-full lg:w-40">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 appearance-none bg-white"
                            >
                                <option value="deadline">📅 เรียงตามกำหนดส่ง</option>
                                <option value="priority">🔥 เรียงตามความด่วน</option>
                                <option value="newest">✨ เรียงตามงานใหม่</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="border-b border-gray-400">
                <nav className="-mb-px flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = tabCounts[tab.id] || 0;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex min-h-[44px] items-center gap-2 py-3 sm:py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                                    ${isActive
                                        ? `border-rose-500 text-rose-600`
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-rose-500' : 'text-gray-400'}`} />
                                {tab.label}
                                {count > 0 && (
                                    <span className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold
                                        ${isActive ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Description Banner */}
            {TAB_DESCRIPTIONS[activeTab] && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm">
                    <span className="text-rose-400 text-base leading-snug mt-0.5">{TAB_DESCRIPTIONS[activeTab].icon}</span>
                    <div>
                        <span className="font-semibold text-rose-700">{TAB_DESCRIPTIONS[activeTab].title}: </span>
                        <span className="text-rose-600">{TAB_DESCRIPTIONS[activeTab].desc}</span>
                        <span className="ml-2 text-xs text-rose-400">{TAB_DESCRIPTIONS[activeTab].statuses}</span>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'timeline' ? (
                /* Timeline View */
                <TimelineView jobs={filteredJobs} onJobClick={handleViewDetail} />
            ) : (
                /* Job List View (Responsive) */
                <div className="bg-white rounded-xl border border-gray-300 shadow-sm">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-400">
                            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">ไม่มีงานในหมวดนี้</h3>
                            <p className="text-gray-500">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</p>
                        </div>
                    ) : (
                        <>
                            {/* === Mobile: card list (hidden on md+) === */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {filteredJobs.map((job) => {
                                    const isDraftReview = job.status === 'draft_review';
                                    const isPredecessorPending = job.predecessorDjId && job.predecessorStatus &&
                                        !['completed', 'approved'].includes(job.predecessorStatus);
                                    const isUrgent = job.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed';
                                    const workStatus = getQueueCardStatus({ job, activeTab, isUrgent, isDraftReview, isPredecessorPending });
                                    const canComplete = ASSIGNEE_COMPLETE_ACTION_STATUSES.includes(job.status);
                                    const canDA = ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES.includes(job.status);
                                    const canRej = ASSIGNEE_REJECTABLE_STATUSES.includes(job.status);
                                    const btnBase = 'py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
                                    return (
                                        <div
                                            key={job.id}
                                            onClick={() => handleViewDetail(job.id)}
                                            className="p-4 cursor-pointer hover:bg-rose-50/40 active:bg-rose-50/60"
                                        >
                                            {/* Row 1: DJ ID + project + work status */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                    <span className="font-bold text-rose-700 text-sm">{job.djId || `DJ-${job.id}`}</span>
                                                    {isUrgent && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">URGENT</span>
                                                    )}
                                                    {job.projectName && (
                                                        <span className="text-xs text-gray-400 truncate max-w-[120px]">{job.projectName}</span>
                                                    )}
                                                </div>
                                                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${workStatus.className}`}>
                                                    {workStatus.text}
                                                </span>
                                            </div>
                                            {/* Row 2: subject */}
                                            <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{job.subject || '-'}</p>
                                            {/* Row 3: meta */}
                                            <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1">
                                                <span>{job.requesterName || '-'}</span>
                                                <span>กำหนดส่ง {formatQueueDate(job.deadline || job.dueDate)}</span>
                                            </div>
                                            {/* Row 4: approval badge */}
                                            <div className="mb-3">
                                                <Badge status={job.status} />
                                            </div>
                                            {/* Row 5: action buttons */}
                                            {activeTab === 'in_progress' && (
                                                <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button type="button" onClick={(e) => handleOpenCompleteModal(job, e)} disabled={!canComplete || isDraftReview} className={`${btnBase} ${ACTION_BUTTON_STYLES.complete}`}>ส่งงาน</button>
                                                    <button type="button" onClick={(e) => handleOpenDraftModal(job, e)} disabled={!canDA || isDraftReview} className={`${btnBase} ${ACTION_BUTTON_STYLES.draft}`}>ส่ง Draft</button>
                                                    <button type="button" onClick={(e) => handleOpenRebriefModal(job, e)} disabled={!canDA || isDraftReview} className={`${btnBase} ${ACTION_BUTTON_STYLES.rebrief}`}>Rebrief</button>
                                                    <button type="button" onClick={(e) => handleRejectByAssignee(job, e)} disabled={!canRej} className={`${btnBase} ${ACTION_BUTTON_STYLES.reject}`}>ปฏิเสธงาน</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* === Desktop: table (hidden on mobile) === */}
                            <div className="hidden md:block overflow-x-auto rounded-xl">
                                <table className="min-w-[960px] w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr className="text-left text-gray-700">
                                            <th className="px-4 py-3 font-semibold">เลขที่ DJ</th>
                                            <th className="px-4 py-3 font-semibold">โครงการ</th>
                                            <th className="px-4 py-3 font-semibold">หัวข้อ</th>
                                            <th className="px-4 py-3 font-semibold">สถานะอนุมัติ</th>
                                            <th className="px-4 py-3 font-semibold">สถานะงาน</th>
                                            <th className="px-4 py-3 font-semibold hidden lg:table-cell">วันที่สร้าง</th>
                                            <th className="px-4 py-3 font-semibold">กำหนดส่ง</th>
                                            <th className="px-4 py-3 font-semibold hidden lg:table-cell">คนเปิดงาน</th>
                                            <th className="px-4 py-3 font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredJobs.map((job) => {
                                            const isDraftReview = job.status === 'draft_review';
                                            const isPredecessorPending = job.predecessorDjId && job.predecessorStatus &&
                                                !['completed', 'approved'].includes(job.predecessorStatus);
                                            const isUrgent = job.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed';
                                            const workStatus = getQueueCardStatus({
                                                job,
                                                activeTab,
                                                isUrgent,
                                                isDraftReview,
                                                isPredecessorPending
                                            });

                                            return (
                                                <tr
                                                    key={job.id}
                                                    onClick={() => handleViewDetail(job.id)}
                                                    className="hover:bg-rose-50/30 cursor-pointer align-top"
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="font-semibold text-rose-700">{job.djId || `DJ-${job.id}`}</div>
                                                        {isUrgent && (
                                                            <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">URGENT</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[140px] truncate">{job.projectName || '-'}</td>
                                                    <td className="px-4 py-3 max-w-[280px]">
                                                        <p className="line-clamp-2 font-medium text-gray-900">{job.subject || '-'}</p>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <Badge status={job.status} />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${workStatus.className}`}>
                                                            {workStatus.text}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 hidden lg:table-cell">{formatQueueDate(job.createdAt)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatQueueDate(job.deadline || job.dueDate)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 hidden lg:table-cell">{job.requesterName || '-'}</td>
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <ActionButtonsCell
                                                            job={job}
                                                            activeTab={activeTab}
                                                            onOpenCompleteModal={handleOpenCompleteModal}
                                                            onOpenDraftModal={handleOpenDraftModal}
                                                            onOpenRebriefModal={handleOpenRebriefModal}
                                                            onRejectByAssignee={handleRejectByAssignee}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Draft Submit Modal */}
            <DraftSubmitModal
                isOpen={showDraftModal}
                onClose={() => { setShowDraftModal(false); setSelectedJob(null); }}
                job={selectedJob}
                onSuccess={() => {
                    fetchJobs();
                    fetchAllTabCounts();
                }}
                currentUser={user}
            />

            {/* Rebrief Modal */}
            {showRebriefModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
                            <h3 className="text-lg font-bold text-amber-700">ขอข้อมูลเพิ่มเติม (Rebrief)</h3>
                            <button
                                onClick={() => {
                                    setShowRebriefModal(false);
                                    setRebriefReason('');
                                    setSelectedJob(null);
                                }}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="ปิดหน้าต่าง Rebrief"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                ระบุเหตุผลที่ต้องการข้อมูลเพิ่มเติมจาก Requester
                            </p>
                            <label className="block mb-2 text-sm font-medium">
                                เหตุผล <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm leading-6 mb-3 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 focus:outline-none"
                                rows={5}
                                value={rebriefReason}
                                onChange={e => setRebriefReason(e.target.value)}
                                placeholder="เช่น ข้อมูล brief ไม่ชัดเจน, ต้องการ reference เพิ่มเติม..."
                            />
                            <div className="text-xs text-slate-500 mb-4">
                                ข้อความนี้จะถูกส่งให้ผู้เปิดงานเพื่อปรับ brief และส่งข้อมูลกลับมา
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="secondary" onClick={() => {
                                    setShowRebriefModal(false);
                                    setRebriefReason('');
                                    setSelectedJob(null);
                                }}>ยกเลิก</Button>
                                <Button variant="primary" className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" onClick={handleRebrief}>ส่งคำขอ</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
                            <h3 className="text-lg font-bold text-rose-700">ปฏิเสธงาน</h3>
                            <button
                                onClick={() => {
                                    if (isRejecting) return;
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                    setSelectedJob(null);
                                }}
                                className="text-slate-400 hover:text-slate-600"
                                aria-label="ปิดหน้าต่างปฏิเสธงาน"
                                disabled={isRejecting}
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                ระบุเหตุผลในการปฏิเสธงาน {selectedJob?.djId || (selectedJob?.id ? `DJ-${selectedJob.id}` : '')}
                            </p>
                            <label className="block mb-2 text-sm font-medium">
                                เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm leading-6 mb-3 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 focus:outline-none"
                                rows={5}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="เช่น งานไม่อยู่ในขอบเขตความรับผิดชอบ หรือข้อมูลยังไม่เพียงพอ..."
                                maxLength={500}
                                disabled={isRejecting}
                            />
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                                <span>เหตุผลนี้จะถูกส่งให้ผู้อนุมัติใช้ประกอบการพิจารณา</span>
                                <span>{rejectReason.length}/500</span>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="secondary"
                                    disabled={isRejecting}
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectReason('');
                                        setSelectedJob(null);
                                    }}
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    variant="primary"
                                    className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300"
                                    disabled={isRejecting}
                                    onClick={handleConfirmReject}
                                >
                                    {isRejecting ? 'กำลังส่งคำขอ...' : 'ยืนยันปฏิเสธ'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-emerald-700">ส่งงาน (Complete)</h3>
                            <button onClick={handleCloseCompleteModal} disabled={isCompleting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500">
                                ระบุลิงก์ผลงาน หรือแนบไฟล์ส่งมอบ <span className="font-medium text-gray-700">(อย่างใดอย่างหนึ่ง)</span>
                            </p>

                            <div className={`rounded-lg border px-3 py-2 text-sm ${canSubmitComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                {canSubmitComplete
                                    ? 'พร้อมส่งงานแล้ว: คุณสามารถกดปุ่มส่งงานได้ทันที'
                                    : 'สถานะยังไม่พร้อมส่ง: เพิ่มลิงก์ผลงานหรือแนบไฟล์อย่างน้อย 1 รายการ'}
                            </div>

                            {/* Link */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <LinkIcon className="w-4 h-4 text-gray-400" />
                                    ลิงก์ผลงาน <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 focus:outline-none"
                                    value={finalLink}
                                    onChange={e => setFinalLink(e.target.value)}
                                    placeholder="https://drive.google.com/... หรือ https://figma.com/..."
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <PaperClipIcon className="w-4 h-4 text-gray-400" />
                                    ไฟล์ส่งมอบ <span className="font-normal text-gray-400">(ไม่บังคับ, รวมไม่เกิน 10MB)</span>
                                </label>
                                <div
                                    onClick={() => !completeUploadingFile && completeFileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                        completeUploadingFile
                                            ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                                            : 'cursor-pointer border-slate-300 hover:border-emerald-300 hover:bg-emerald-50/50'
                                    }`}
                                >
                                    <input
                                        ref={completeFileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleCompleteFileChange}
                                        disabled={completeUploadingFile}
                                    />
                                    {completeUploadingFile ? (
                                        <p className="text-sm text-gray-500">⏳ กำลังอัปโหลด...</p>
                                    ) : (
                                        <p className="text-sm text-gray-500">คลิกหรือลากไฟล์มาวางที่นี่</p>
                                    )}
                                </div>
                                {completeUploadedFiles.length > 0 && (
                                    <ul className="space-y-1.5 mt-2">
                                        {completeUploadedFiles.map(f => (
                                            <li key={f.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                                <PaperClipIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="flex-1 truncate text-gray-700">{f.file_name || f.fileName}</span>
                                                <button
                                                    onClick={() => handleCompleteRemoveFile(f.id)}
                                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                                >
                                                    <XCircleIcon className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {completeItemsLoading ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    กำลังโหลดรายการชิ้นงาน...
                                </div>
                            ) : (
                                <DeliveredItemsEditor
                                    items={selectedJob?.items || []}
                                    jobTypeLabel={selectedJob?.jobType}
                                    values={completeDeliveredItems}
                                    onChange={handleDeliveredItemChange}
                                    disabled={isCompleting || completeUploadingFile}
                                    title="Job Type และจำนวนงานที่ส่งจริง"
                                    description="กรอกเฉพาะรายการที่ต้องการนับต่างจากจำนวนเดิม หากเว้นว่าง ระบบจะใช้จำนวนเดิมของชิ้นงานนั้น"
                                />
                            )}

                            {/* Note */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                                    หมายเหตุ <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                                </label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 focus:outline-none"
                                    rows={3}
                                    value={completeNote}
                                    onChange={e => setCompleteNote(e.target.value)}
                                    placeholder="บันทึกเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                            <Button variant="secondary" onClick={handleCloseCompleteModal} disabled={isCompleting} className="flex-1">ยกเลิก</Button>
                            <Button
                                variant="success"
                                onClick={handleCompleteJob}
                                disabled={isCompleting || completeUploadingFile || !canSubmitComplete}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300"
                            >
                                {isCompleting ? 'กำลังส่งงาน...' : 'ส่งงาน'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FolderIcon(props) {
    return (
        <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    );
}

const formatQueueDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

const formatQueueTimeText = (hoursRemaining, mode = 'remaining') => {
    if (hoursRemaining === null || hoursRemaining === undefined) return 'ไม่มี deadline';

    const absoluteHours = Math.abs(Number(hoursRemaining) || 0);
    if (mode === 'overdue') {
        if (absoluteHours < 24) return 'เลยกำหนดแล้ววันนี้';
        return `เลยกำหนดแล้ว ${Math.max(1, Math.floor(absoluteHours / 24))} วัน`;
    }

    if (absoluteHours < 24) return 'ต้องเร่งส่งวันนี้';
    return `เหลือ ${Math.max(1, Math.floor(absoluteHours / 24))} วัน`;
};

const getQueueCardStatus = ({ job, activeTab, isUrgent, isDraftReview, isPredecessorPending }) => {
    if (activeTab === 'completed') {
        return { text: 'ส่งมอบแล้ว', className: 'border-green-200 bg-green-50 text-green-700' };
    }
    if (isDraftReview) {
        return { text: 'รอตรวจ Draft', className: 'border-purple-200 bg-purple-50 text-purple-700' };
    }
    if (isPredecessorPending) {
        return { text: `รอ ${job.predecessorDjId}`, className: 'border-slate-200 bg-slate-50 text-slate-600' };
    }
    if (job.hoursRemaining !== null && job.hoursRemaining < 0) {
        return { text: formatQueueTimeText(job.hoursRemaining, 'overdue'), className: 'border-red-200 bg-red-50 text-red-700' };
    }
    if (isUrgent || (job.hoursRemaining !== null && job.hoursRemaining < 24)) {
        return { text: 'ต้องเร่งส่งวันนี้', className: 'border-red-200 bg-red-50 text-red-700' };
    }
    if (job.healthStatus === 'warning') {
        return { text: 'ใกล้ครบกำหนด', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    return { text: 'กำลังดำเนินการ', className: 'border-blue-200 bg-blue-50 text-blue-700' };
};

function QueueInfoBox({ label, value, children }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-w-0">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                {children || value || '-'}
            </div>
        </div>
    );
}

function ActionButtonsCell({
    job,
    activeTab,
    onOpenCompleteModal,
    onOpenDraftModal,
    onOpenRebriefModal,
    onRejectByAssignee
}) {
    if (activeTab !== 'in_progress') {
        return <span className="text-xs text-gray-400">-</span>;
    }

    const isDraftReview = job.status === 'draft_review';
    const canComplete = ASSIGNEE_COMPLETE_ACTION_STATUSES.includes(job.status);
    const canDraftAndRebrief = ASSIGNEE_DRAFT_REBRIEF_ACTION_STATUSES.includes(job.status);
    const canReject = ASSIGNEE_REJECTABLE_STATUSES.includes(job.status);

    const baseClass = 'w-full min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

    return (
        <div className="grid grid-cols-2 gap-1.5 min-w-[220px]">
            <button
                type="button"
                onClick={(e) => onOpenCompleteModal(job, e)}
                disabled={!canComplete || isDraftReview}
                className={`${baseClass} ${ACTION_BUTTON_STYLES.complete}`}
                title={isDraftReview ? 'รอตรวจ Draft ล่าสุด' : 'ส่งงาน'}
            >
                ส่งงาน
            </button>

            <button
                type="button"
                onClick={(e) => onOpenDraftModal(job, e)}
                disabled={!canDraftAndRebrief || isDraftReview}
                className={`${baseClass} ${ACTION_BUTTON_STYLES.draft}`}
                title={isDraftReview ? 'รอตรวจ Draft ล่าสุด' : 'ส่ง Draft'}
            >
                ส่ง Draft
            </button>

            <button
                type="button"
                onClick={(e) => onOpenRebriefModal(job, e)}
                disabled={!canDraftAndRebrief || isDraftReview}
                className={`${baseClass} ${ACTION_BUTTON_STYLES.rebrief}`}
                title={isDraftReview ? 'รอตรวจ Draft ล่าสุด' : 'Rebrief'}
            >
                Rebrief
            </button>

            <button
                type="button"
                onClick={(e) => onRejectByAssignee(job, e)}
                disabled={!canReject}
                className={`${baseClass} ${ACTION_BUTTON_STYLES.reject}`}
                title="ปฏิเสธงาน"
            >
                ปฏิเสธงาน
            </button>
        </div>
    );
}

function JobCard({ job, activeTab, onView, onOpenCompleteModal, onOpenDraftModal, onOpenRebriefModal, renderSLABar, renderDateInfo, getHealthBorderColor }) {
    const isUrgent = job.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed';
    const isDraftReview = job.status === 'draft_review';
    const draftReviewReason = 'รอผู้ตรวจพิจารณา Draft ล่าสุด';
    const isPredecessorPending = job.predecessorDjId && job.predecessorStatus &&
        !['completed', 'approved'].includes(job.predecessorStatus);

    // สถานะที่แสดงปุ่มดำเนินการ (เหมือน JobActionPanel)
    const actionStatuses = ['approved', 'assigned', 'in_progress', 'rework', 'correction', 'returned', 'draft_review'];
    const canDoActions = actionStatuses.includes(job.status);
    const primaryStatus = getQueueCardStatus({ job, activeTab, isUrgent, isDraftReview, isPredecessorPending });

    return (
        <div
            onClick={() => onView(job.id)}
            className={`
                bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5
                hover:shadow-md transition-shadow cursor-pointer relative
                ${getHealthBorderColor(job.healthStatus)}
                ${isUrgent ? 'bg-red-50/30' : ''}
            `}
        >
            <div className="flex flex-col gap-4">
                <div className="flex-1 min-w-0">
                    {/* DJ ID + Type + Badges */}
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 border border-slate-200">
                            {job.djId}
                        </span>
                        {job.jobTypeName && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {job.jobTypeName}
                            </span>
                        )}
                        {isUrgent && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200">
                                URGENT
                            </span>
                        )}
                        {isPredecessorPending && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200" title={`รอ ${job.predecessorDjId}`}>
                                รอ {job.predecessorDjId}
                            </span>
                        )}
                        {isDraftReview && (
                            <Badge status="draft_review" className="min-w-0" />
                        )}
                    </div>

                    {/* Subject */}
                    <h3 className="mt-3 text-lg sm:text-xl font-bold text-slate-950 leading-snug">{job.subject}</h3>

                    <div className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${primaryStatus.className}`}>
                        <span>{primaryStatus.text}</span>
                        {(job.deadline || job.dueDate) && (
                            <span className="shrink-0 text-right text-xs font-medium opacity-80">
                                กำหนดส่ง {formatQueueDate(job.deadline || job.dueDate)}
                            </span>
                        )}
                    </div>

                    {/* Date info: accepted + shouldStartBy */}
                    {renderDateInfo(job)}

                    {isDraftReview && (
                        <div className="mt-3 text-sm text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                            รอตรวจ Draft
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <QueueInfoBox label="โปรเจกต์" value={job.projectName}>
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                                <FolderIcon className="w-4 h-4 shrink-0 text-slate-400" />
                                <span className="truncate">{job.projectName || '-'}</span>
                            </span>
                        </QueueInfoBox>
                        <QueueInfoBox label="ผู้สั่งงาน" value={job.requesterName}>
                            <span className="inline-flex items-center gap-2 min-w-0">
                                <img
                                    src={job.requesterAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.requesterName || 'U')}&background=random&size=32`}
                                    alt={job.requesterName || 'Requester'}
                                    className="w-5 h-5 rounded-full border border-slate-200 shrink-0"
                                />
                                <span className="truncate">{job.requesterName || '-'}</span>
                            </span>
                        </QueueInfoBox>
                        <QueueInfoBox label="กำหนดส่ง" value={formatQueueDate(job.deadline || job.dueDate)} />
                    </div>

                    {/* SLA Progress Bar */}
                    {renderSLABar(job)}
                </div>
            </div>

            {/* Action Buttons Row — ส่งงาน / ส่ง Draft / ขอ Rebrief */}
            {activeTab === 'in_progress' && (onOpenCompleteModal || canDoActions) && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-100">
                    {/* ส่งงาน — แสดงเสมอเมื่ออยู่ใน in_progress */}
                    {onOpenCompleteModal && (
                        <button
                            onClick={(e) => onOpenCompleteModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ส่งงาน (Complete)'}
                            className={`min-h-[44px] flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600'
                            }`}
                        >
                            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                            ส่งงาน
                        </button>
                    )}
                    {/* ส่ง Draft + ขอ Rebrief — แสดงเฉพาะสถานะที่ทำได้ */}
                    {canDoActions && onOpenDraftModal && (
                        <button
                            onClick={(e) => onOpenDraftModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ส่ง Draft ให้ตรวจสอบ'}
                            className={`min-h-[44px] flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            <PencilSquareIcon className="w-4 h-4 flex-shrink-0" />
                            ส่ง Draft
                        </button>
                    )}
                    {canDoActions && onOpenRebriefModal && (
                        <button
                            onClick={(e) => onOpenRebriefModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ขอข้อมูลเพิ่มเติม (Rebrief)'}
                            className={`min-h-[44px] flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600'
                            }`}
                        >
                            <ArrowPathIcon className="w-4 h-4 flex-shrink-0" />
                            ขอ Rebrief
                        </button>
                    )}
                </div>
            )}

            {isDraftReview && activeTab === 'in_progress' && (
                <p className="mt-2 text-xs text-purple-600 font-medium">{draftReviewReason}</p>
            )}
        </div>
    );
}
