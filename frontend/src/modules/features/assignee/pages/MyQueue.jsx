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
import httpClient from '@shared/services/httpClient';
import { resolveSlaBadgePresentation } from '@shared/utils/slaStatusResolver';
import Swal from 'sweetalert2';

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
        statuses: '(approved, assigned, in_progress, correction, rework, returned, pending_dependency, draft_review)',
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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('deadline'); // 'deadline', 'priority', 'newest'
    const [filterProject, setFilterProject] = useState('all');

    // Draft & Rebrief Modal State
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showRebriefModal, setShowRebriefModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [rebriefReason, setRebriefReason] = useState('');

    // Complete Modal State
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [finalLink, setFinalLink] = useState('');
    const [completeNote, setCompleteNote] = useState('');
    const [completeUploadedFiles, setCompleteUploadedFiles] = useState([]);
    const [completeUploadingFile, setCompleteUploadingFile] = useState(false);
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
    const handleOpenCompleteModal = (job, e) => {
        if (e) e.stopPropagation();
        setSelectedJob(job);
        setFinalLink('');
        setCompleteNote('');
        setCompleteUploadedFiles([]);
        setShowCompleteModal(true);
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
            Swal.fire({
                icon: 'warning',
                title: 'ขนาดไฟล์รวมเกินกำหนด',
                text: `ขนาดรวม ${((existingSize + newSize) / 1024 / 1024).toFixed(1)}MB เกินขีดจำกัด 10MB สำหรับไฟล์ส่งมอบ`,
                confirmButtonColor: '#e11d48'
            });
            e.target.value = '';
            return;
        }

        setCompleteUploadingFile(true);
        try {
            const result = await fileUploadService.uploadMultipleFiles(files, {
                jobId: selectedJob?.id,
                tenantId: user?.tenantId,
                userId: user?.id,
                attachmentType: 'complete',
                maxFileSize: COMPLETE_MAX_TOTAL
            });
            if (result.successfulFiles?.length) {
                setCompleteUploadedFiles(prev => [...prev, ...result.successfulFiles]);
            }
            if (result.errors?.length) {
                Swal.fire({ icon: 'warning', title: 'บางไฟล์ไม่สามารถอัปโหลดได้', text: result.errors.join('\n'), confirmButtonColor: '#e11d48' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'อัปโหลดไฟล์ไม่สำเร็จ', text: err.message, confirmButtonColor: '#e11d48' });
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
            Swal.fire({ icon: 'error', title: 'ลบไฟล์ไม่สำเร็จ', text: result.error || 'ไม่สามารถลบไฟล์นี้ได้', confirmButtonColor: '#e11d48' });
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
        setSelectedJob(null);
    };

    /**
     * ส่งงาน (Complete Job) — รองรับทั้ง link และ ไฟล์แนบ
     */
    const handleCompleteJob = async () => {
        if (!finalLink.trim() && completeUploadedFiles.length === 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุลิงก์หรือแนบไฟล์',
                text: 'ต้องการลิงก์ผลงาน หรือแนบเอกสารส่งมอบอย่างน้อย 1 ไฟล์',
                confirmButtonColor: '#e11d48'
            });
        }
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

            await api.completeJob(selectedJob.id, { note: completeNote, attachments });
            await Swal.fire({
                icon: 'success',
                title: 'ส่งมอบงานสำเร็จ!',
                text: 'ระบบได้แจ้งเตือนไปยังผู้สั่งงานเรียบร้อยแล้ว',
                confirmButtonColor: '#e11d48'
            });
            setShowCompleteModal(false);
            setFinalLink('');
            setCompleteNote('');
            setCompleteUploadedFiles([]);
            setSelectedJob(null);
            setActiveTab('completed');
            fetchAllTabCounts();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'ส่งงานไม่สำเร็จ',
                text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์',
                confirmButtonColor: '#e11d48'
            });
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
            return Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุเหตุผล',
                confirmButtonColor: '#e11d48'
            });
        }
        try {
            await httpClient.post(`/jobs/${selectedJob.id}/rebrief`, {
                reason: rebriefReason.trim()
            });
            await Swal.fire({
                icon: 'success',
                title: 'ขอ Rebrief สำเร็จ',
                text: 'ระบบได้แจ้งเตือนไปยัง Requester แล้ว',
                confirmButtonColor: '#e11d48'
            });
            setShowRebriefModal(false);
            setRebriefReason('');
            setSelectedJob(null);
            fetchJobs();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'ขอ Rebrief ไม่สำเร็จ',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#e11d48'
            });
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
     * Helper: แสดงข้อความ SLA
     */
    const renderSLAText = (job) => {
        const slaBadge = resolveSlaBadgePresentation({
            status: job.status,
            deadline: job.deadline,
            completedAt: job.completedAt
        });

        if (slaBadge.key === 'completed_on_time') return <span className="text-green-600 font-medium">เสร็จสิ้น</span>;
        if (slaBadge.key === 'completed_late') return <span className="text-orange-600 font-medium">{slaBadge.text}</span>;

        if (job.hoursRemaining === null) return <span className="text-gray-400">ไม่มี deadline</span>;

        const style = job.healthStatus === 'critical' ? 'text-red-600 font-bold'
            : job.healthStatus === 'warning' ? 'text-yellow-600 font-medium'
                : 'text-green-600';

        let text;
        if (job.hoursRemaining < 0) {
            text = `เลยกำหนด ${Math.abs(job.hoursRemaining).toFixed(1)} ชม.`;
        } else if (job.hoursRemaining < 24) {
            text = `เหลือ ${job.hoursRemaining.toFixed(1)} ชม.`;
        } else {
            const daysLeft = Math.floor(job.hoursRemaining / 24);
            const hrsLeft = Math.round(job.hoursRemaining % 24);
            text = `เหลือ ${daysLeft} วัน ${hrsLeft} ชม.`;
        }

        return <span className={style}>{text}</span>;
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
        const acceptedStr = job.acceptanceDate
            ? new Date(job.acceptanceDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
            : null;
        const shouldStartStr = job.shouldStartBy
            ? new Date(job.shouldStartBy).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : null;
        const isPastShouldStart = job.shouldStartBy && new Date() > new Date(job.shouldStartBy) && activeTab !== 'completed';

        return (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                {acceptedStr && (
                    <span title="วันที่รับงาน">
                        📥 รับงาน: {acceptedStr}
                    </span>
                )}
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

    const filteredJobs = jobs
        .filter(job => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (job.subject || '').toLowerCase().includes(searchLower) ||
                (job.djId || '').toLowerCase().includes(searchLower);
            const matchesProject = filterProject === 'all' || job.projectName === filterProject;
            return matchesSearch && matchesProject;
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

    // แบ่งกลุ่มงาน: urgent, risk (overdue + shouldStart passed), normal
    const urgentJobs = filteredJobs.filter(j => j.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed');
    const riskJobs = filteredJobs.filter(j => {
        if (j.priority?.toLowerCase() === 'urgent') return false;
        if (activeTab === 'completed') return false;
        return (j.hoursRemaining !== null && j.hoursRemaining < 0) ||
            (j.shouldStartBy && new Date() > new Date(j.shouldStartBy)) ||
            j.healthStatus === 'critical';
    });
    const normalJobs = filteredJobs.filter(j => {
        if (j.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed') return false;
        const isRisk = (j.hoursRemaining !== null && j.hoursRemaining < 0) ||
            (j.shouldStartBy && new Date() > new Date(j.shouldStartBy)) ||
            j.healthStatus === 'critical';
        if (isRisk && activeTab !== 'completed') return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">คิวงานของฉัน (My Queue)</h1>
                    <p className="text-gray-500">จัดการงานที่ได้รับมอบหมายและตรวจสอบกำหนดส่ง</p>
                </div>
                {/* Stats Summary */}
                <div className="flex gap-4">
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
                <div className="bg-white p-4 rounded-xl border border-gray-400 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="flex-1 relative">
                        <DocumentMagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา DJ ID, ชื่องาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-40">
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 appearance-none bg-white"
                            >
                                <option value="all">ทุกโปรเจกต์</option>
                                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="w-40">
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
                <nav className="-mb-px flex space-x-1 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = tabCounts[tab.id] || 0;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
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
                /* Job List View */
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-400">
                            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">ไม่มีงานในหมวดนี้</h3>
                            <p className="text-gray-500">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Section: งานด่วน */}
                            {urgentJobs.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                                        <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">งานด่วน ({urgentJobs.length})</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {urgentJobs.map((job) => <JobCard key={job.id} job={job} activeTab={activeTab} onView={handleViewDetail} onOpenCompleteModal={handleOpenCompleteModal} onOpenDraftModal={handleOpenDraftModal} onOpenRebriefModal={handleOpenRebriefModal} renderSLAText={renderSLAText} renderSLABar={renderSLABar} renderDateInfo={renderDateInfo} getHealthBorderColor={getHealthBorderColor} />)}
                                    </div>
                                </div>
                            )}

                            {/* Section: ใกล้เลย SLA / เกินกำหนด */}
                            {riskJobs.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ClockIcon className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide">ต้องดำเนินการ / ใกล้เลย SLA ({riskJobs.length})</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {riskJobs.map((job) => <JobCard key={job.id} job={job} activeTab={activeTab} onView={handleViewDetail} onOpenCompleteModal={handleOpenCompleteModal} onOpenDraftModal={handleOpenDraftModal} onOpenRebriefModal={handleOpenRebriefModal} renderSLAText={renderSLAText} renderSLABar={renderSLABar} renderDateInfo={renderDateInfo} getHealthBorderColor={getHealthBorderColor} />)}
                                    </div>
                                </div>
                            )}

                            {/* Section: งานปกติ */}
                            {normalJobs.length > 0 && (
                                <div>
                                    {(urgentJobs.length > 0 || riskJobs.length > 0) && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <ClipboardDocumentListIcon className="w-4 h-4 text-gray-500" />
                                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">งานปกติ ({normalJobs.length})</h3>
                                        </div>
                                    )}
                                    <div className="grid gap-3">
                                        {normalJobs.map((job) => <JobCard key={job.id} job={job} activeTab={activeTab} onView={handleViewDetail} onOpenCompleteModal={handleOpenCompleteModal} onOpenDraftModal={handleOpenDraftModal} onOpenRebriefModal={handleOpenRebriefModal} renderSLAText={renderSLAText} renderSLABar={renderSLABar} renderDateInfo={renderDateInfo} getHealthBorderColor={getHealthBorderColor} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Draft Submit Modal */}
            <DraftSubmitModal
                isOpen={showDraftModal}
                onClose={() => { setShowDraftModal(false); setSelectedJob(null); }}
                job={selectedJob}
                onSuccess={fetchJobs}
                currentUser={user}
            />

            {/* Rebrief Modal */}
            {showRebriefModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-orange-600">🔄 ขอข้อมูลเพิ่มเติม (Rebrief)</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            ระบุเหตุผลที่ต้องการข้อมูลเพิ่มเติมจาก Requester
                        </p>
                        <label className="block mb-2 text-sm font-medium">
                            เหตุผล <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border rounded p-2 mb-4"
                            rows={4}
                            value={rebriefReason}
                            onChange={e => setRebriefReason(e.target.value)}
                            placeholder="เช่น ข้อมูล brief ไม่ชัดเจน, ต้องการ reference เพิ่มเติม..."
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => {
                                setShowRebriefModal(false);
                                setRebriefReason('');
                                setSelectedJob(null);
                            }}>ยกเลิก</Button>
                            <Button variant="primary" onClick={handleRebrief}>ส่งคำขอ</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-green-600">✅ ส่งงาน (Complete)</h3>
                            <button onClick={handleCloseCompleteModal} className="text-gray-400 hover:text-gray-600">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500">
                                ระบุลิงก์ผลงาน หรือแนบไฟล์ส่งมอบ <span className="font-medium text-gray-700">(อย่างใดอย่างหนึ่ง)</span>
                            </p>

                            {/* Link */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <LinkIcon className="w-4 h-4 text-gray-400" />
                                    ลิงก์ผลงาน <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                            : 'cursor-pointer border-gray-300 hover:border-green-400 hover:bg-green-50/30'
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

                            {/* Note */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                                    หมายเหตุ <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
                                </label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    rows={3}
                                    value={completeNote}
                                    onChange={e => setCompleteNote(e.target.value)}
                                    placeholder="บันทึกเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                            <Button variant="ghost" onClick={handleCloseCompleteModal} className="flex-1">ยกเลิก</Button>
                            <Button
                                variant="primary"
                                onClick={handleCompleteJob}
                                disabled={completeUploadingFile || (!finalLink.trim() && completeUploadedFiles.length === 0)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                ส่งงาน
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

function JobCard({ job, activeTab, onView, onOpenCompleteModal, onOpenDraftModal, onOpenRebriefModal, renderSLAText, renderSLABar, renderDateInfo, getHealthBorderColor }) {
    const isUrgent = job.priority?.toLowerCase() === 'urgent' && activeTab !== 'completed';
    const isDraftReview = job.status === 'draft_review';
    const draftReviewReason = 'รอผู้ตรวจพิจารณา Draft ล่าสุด';
    const isPredecessorPending = job.predecessorDjId && job.predecessorStatus &&
        !['completed', 'approved'].includes(job.predecessorStatus);

    // สถานะที่แสดงปุ่มดำเนินการ (เหมือน JobActionPanel)
    const actionStatuses = ['approved', 'assigned', 'in_progress', 'rework', 'correction', 'returned', 'draft_review'];
    const canDoActions = actionStatuses.includes(job.status);

    return (
        <div
            onClick={() => onView(job.id)}
            className={`
                bg-white rounded-lg shadow-sm border border-gray-200 p-4
                hover:shadow-md transition-shadow cursor-pointer relative
                ${getHealthBorderColor(job.healthStatus)}
                ${isUrgent ? 'bg-red-50/40' : ''}
            `}
        >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* DJ ID + Type + Badges */}
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            {job.djId}
                        </span>
                        {job.jobTypeName && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {job.jobTypeName}
                            </span>
                        )}
                        {isUrgent && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
                                🔥 Urgent
                            </span>
                        )}
                        {isPredecessorPending && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200" title={`รอ ${job.predecessorDjId}`}>
                                ⛓ รอ {job.predecessorDjId}
                            </span>
                        )}
                        {isDraftReview && (
                            <Badge status="draft_review" className="min-w-0" />
                        )}
                    </div>

                    {/* Subject */}
                    <h3 className="text-base font-bold text-gray-900 truncate">{job.subject}</h3>

                    {/* Project + SLA time */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                        {job.projectName && (
                            <span className="flex items-center gap-1">
                                <FolderIcon className="w-3.5 h-3.5" /> {job.projectName}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {renderSLAText(job)}
                        </span>
                        {job.deadline && activeTab !== 'completed' && (
                            <span className="text-xs text-gray-400" title="กำหนดส่ง">
                                📅 {new Date(job.deadline).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                        )}
                    </div>

                    {/* Date info: accepted + shouldStartBy */}
                    {renderDateInfo(job)}

                    {isDraftReview && (
                        <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                            ⏳ ส่ง Draft แล้ว และอยู่ระหว่างการตรวจสอบ
                        </div>
                    )}

                    {/* SLA Progress Bar */}
                    {renderSLABar(job)}
                </div>

                {/* Action Section */}
                <div className="flex items-center md:flex-col md:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <img
                            src={job.requesterAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.requesterName || 'U')}&background=random&size=32`}
                            alt={job.requesterName}
                            className="w-6 h-6 rounded-full border border-gray-200"
                            title={`ผู้สั่งงาน: ${job.requesterName}`}
                        />
                        <span className="text-xs text-gray-400 hidden md:block">{job.requesterName}</span>
                    </div>

                    {activeTab === 'in_progress' && onOpenCompleteModal && (
                        <button
                            onClick={(e) => onOpenCompleteModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ส่งงาน'}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600'
                            }`}
                        >
                            <CheckCircleIcon className="w-3.5 h-3.5" /> ส่งงาน
                        </button>
                    )}
                    {activeTab === 'waiting' && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                            ⏳ รอตรวจ
                        </span>
                    )}
                </div>
            </div>

            {/* Action Buttons Row - ส่ง Draft / ขอ Rebrief (เหมือนกล่องดำเนินการใน JobDetail) */}
            {canDoActions && activeTab === 'in_progress' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {onOpenDraftModal && (
                        <button
                            onClick={(e) => onOpenDraftModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ส่ง Draft'}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            <PencilSquareIcon className="w-3.5 h-3.5" /> ส่ง Draft
                        </button>
                    )}
                    {onOpenRebriefModal && (
                        <button
                            onClick={(e) => onOpenRebriefModal(job, e)}
                            disabled={isDraftReview}
                            title={isDraftReview ? draftReviewReason : 'ขอ Rebrief'}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg shadow-sm transition-colors ${
                                isDraftReview
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600'
                            }`}
                        >
                            <ArrowPathIcon className="w-3.5 h-3.5" /> ขอ Rebrief
                        </button>
                    )}
                </div>
            )}

            {isDraftReview && activeTab === 'in_progress' && (
                <p className="mt-2 text-xs text-gray-500">ปุ่มดำเนินการถูกปิดชั่วคราว: {draftReviewReason}</p>
            )}
        </div>
    );
}
