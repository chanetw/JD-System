/**
 * @file MyQueue.jsx
 * @description Dashboard สำหรับ Assignee (Graphic/Editor) เพื่อดูงานที่ต้องทำ
 * รองรับการแบ่ง Tab (To Do, In Progress, Waiting, Done) และแสดง SLA Health Color
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@shared/services/apiService';
import { useAuthStore } from '@core/stores/authStore';
import { Card } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useSocket, useNotifications } from '@shared/hooks';
import {
    ClipboardDocumentListIcon,
    PlayCircleIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    DocumentMagnifyingGlassIcon,
    FunnelIcon,
    ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { FormInput, FormSelect } from '@shared/components/FormInput';

/**
 * แถบเมนูสถานะงาน (Tabs Configuration)
 */
const TABS = [
    { id: 'todo', label: 'งานมาใหม่ (To Do)', icon: ClipboardDocumentListIcon, color: 'text-blue-600' },
    { id: 'in_progress', label: 'กำลังทำ (In Progress)', icon: PlayCircleIcon, color: 'text-amber-600' },
    { id: 'waiting', label: 'รอตรวจ/แก้ (Waiting)', icon: ClockIcon, color: 'text-purple-600' },
    { id: 'done', label: 'เสร็จแล้ว (Done)', icon: CheckCircleIcon, color: 'text-green-600' },
];

export default function MyQueue() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // =====================================
    // Socket.io Integration สำหรับ Real-time Updates
    // =====================================
    const { socket, connected } = useSocket();
    const { markAsRead } = useNotifications();

    // State
    const [activeTab, setActiveTab] = useState('todo');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, critical: 0 });

    // Filter & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('deadline'); // 'deadline', 'priority', 'newest'
    const [filterProject, setFilterProject] = useState('all');

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
          const handleJobAssigned = (data) => {
            console.log('[MyQueue] Received job:assigned event:', data);

            // Refresh jobs list เพื่อแสดงงานใหม่
            // ไม่ต้อง toast ที่นี่เพราะ useNotifications จะจัดการ
            if (activeTab === 'todo') {
              fetchJobs();
            }
          };

          // =====================================
          // Event: job:status-changed - สถานะงานเปลี่ยน
          // =====================================
          const handleJobStatusChanged = (data) => {
            console.log('[MyQueue] Received job:status-changed event:', data);

            // Refresh jobs list เพื่อให้ updated status
            fetchJobs();
          };

          // =====================================
          // Event: job:completed - งานเสร็จสิ้น
          // =====================================
          const handleJobCompleted = (data) => {
            console.log('[MyQueue] Received job:completed event:', data);

            // Refresh jobs list เพื่อให้ completed status
            fetchJobs();
          };

          // ตั้งค่า Socket Listeners
          socket.on('job:assigned', handleJobAssigned);
          socket.on('job:status-changed', handleJobStatusChanged);
          socket.on('job:completed', handleJobCompleted);

          console.log('[MyQueue] Socket event listeners set up');

          // =====================================
          // Cleanup: ลบ listeners ตอน unmount
          // =====================================
          return () => {
            socket.off('job:assigned', handleJobAssigned);
            socket.off('job:status-changed', handleJobStatusChanged);
            socket.off('job:completed', handleJobCompleted);
            console.log('[MyQueue] Socket event listeners cleaned up');
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
            // เรียก API getAssigneeJobs (ที่เพิ่มไปใหม่)
            const data = await api.getAssigneeJobs(user.id, activeTab);
            setJobs(data || []);

            // Calculate simple stats based on current view
            const criticalCount = data.filter(j => j.healthStatus === 'critical').length;
            setStats({ total: data.length, critical: criticalCount });
        } catch (error) {
            console.error('Failed to fetch My Queue:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * เริ่มงาน (Start Job)
     */
    const handleStartJob = async (jobId, e) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm('ยืนยันเพื่อเริ่มนับเวลาทำงาน? (Start Job)')) return;

        try {
            await api.startJob(jobId, 'manual');
            // Refresh logic: ย้ายจาก To Do -> In Progress
            // Reload jobs to reflect change
            fetchJobs();
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    /**
     * ส่งงาน (Finish Job)
     */
    const handleFinishJob = async (jobId, e) => {
        e.stopPropagation();
        const note = prompt('บันทึกเพิ่มเติม (ถ้ามี):', '');
        if (note === null) return; // Cancelled

        if (!confirm('ยืนยันเพื่อส่งงานหรือไม่?')) return;

        try {
            // เรียก API completeJob (Alias ที่เพิ่มใน jobService / mockApi)
            await api.completeJob(jobId, { note, userId: user.id });
            alert('ส่งงานเรียบร้อยแล้ว');
            fetchJobs();
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    /**
     * คลิกการ์ดเพื่อดูรายละเอียด
     */
    const handleViewDetail = (jobId) => {
        navigate(`/job/${jobId}`);
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
        if (activeTab === 'done') return <span className="text-gray-500">เสร็จสิ้น</span>;

        const style = job.healthStatus === 'critical' ? 'text-red-600 font-bold'
            : job.healthStatus === 'warning' ? 'text-yellow-600 font-medium'
                : 'text-green-600';

        let text = `${job.hoursRemaining} ชม.`;
        if (job.hoursRemaining < 0) text = `เลยกำหนด ${Math.abs(job.hoursRemaining)} ชม.`;

        return <span className={style}>{text}</span>;
    };

    /**
     * Filter & Sort Logic
     */
    const filteredJobs = jobs
        .filter(job => {
            // Text Search
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = job.subject.toLowerCase().includes(searchLower) ||
                job.djId.toLowerCase().includes(searchLower);

            // Project Filter
            const matchesProject = filterProject === 'all' || job.projectName === filterProject;

            return matchesSearch && matchesProject;
        })
        .sort((a, b) => {
            if (sortBy === 'priority') {
                const priorityWeight = { 'Urgent': 3, 'High': 2, 'Normal': 1, 'Low': 0 };
                return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
            }
            if (sortBy === 'deadline') {
                return new Date(a.deadline) - new Date(b.deadline);
            }
            if (sortBy === 'newest') {
                return b.id - a.id; // Assuming ID correlates with creation time or use createdAt
            }
            return 0;
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
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                        <span className="text-sm text-gray-500 block">งานทั้งหมด</span>
                        <span className="text-xl font-bold text-indigo-600">{jobs.length}</span>
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

            {/* Toolbar: Search & Filter */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
                <div className="flex-1 relative">
                    <DocumentMagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา DJ ID, ชื่องาน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="w-40">
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                        >
                            <option value="all">ทุกโปรเจกต์</option>
                            {projects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="w-40">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                        >
                            <option value="deadline">📅 เรียงตามกำหนดส่ง</option>
                            <option value="priority">🔥 เรียงตามความด่วน</option>
                            <option value="newest">✨ เรียงตามงานใหม่</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${isActive
                                        ? `border-indigo-500 text-indigo-600`
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Job List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">ไม่มีงานที่ตรงกับเงื่อนไข</h3>
                        <p className="text-gray-500">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                        {filteredJobs.map((job) => (
                            <div
                                key={job.id}
                                onClick={() => handleViewDetail(job.id)}
                                className={`
                                    bg-white rounded-lg shadow-sm border border-gray-200 p-5 
                                    hover:shadow-md transition-shadow cursor-pointer relative
                                    ${getHealthBorderColor(job.healthStatus)}
                                    ${job.priority === 'Urgent' ? 'bg-red-50/30' : ''}
                                `}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                {job.djId}
                                            </span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {job.jobTypeName}
                                            </span>
                                            {job.priority === 'Urgent' && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
                                                    🔥 Urgent
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
                                            {job.subject}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FolderIcon className="w-4 h-4" /> {job.projectName}
                                            </span>
                                            <span className="flex items-center gap-1" title={new Date(job.deadline).toLocaleString('th-TH')}>
                                                <ClockIcon className="w-4 h-4" />
                                                เหลือเวลา: {renderSLAText(job)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Section */}
                                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 min-w-[140px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">ผู้สั่งงาน</span>
                                            <img
                                                src={job.requesterAvatar || `https://ui-avatars.com/api/?name=${job.requesterName}&background=random`}
                                                alt={job.requesterName}
                                                className="w-6 h-6 rounded-full"
                                                title={job.requesterName}
                                            />
                                        </div>

                                        {/* Dynamic Action Button */}
                                        {activeTab === 'todo' && (
                                            <Button
                                                size="sm"
                                                onClick={(e) => handleStartJob(job.id, e)}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                            >
                                                <PlayCircleIcon className="w-4 h-4" /> เริ่มงาน
                                            </Button>
                                        )}
                                        {activeTab === 'in_progress' && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={(e) => handleFinishJob(job.id, e)}
                                                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" /> ส่งงาน
                                            </Button>
                                        )}
                                        {activeTab === 'waiting' && (
                                            <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                                ⏳ รอตรวจ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
