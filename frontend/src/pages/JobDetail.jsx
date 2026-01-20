/**
 * @file JobDetail.jsx
 * @description หน้ารายละเอียดงาน DJ (Job Detail Page)
 * 
 * Features:
 * - แสดงข้อมูลงานทั้งหมด
 * - แสดง Timeline/History
 * - แสดง Approval Flow
 * - Actions: Approve, Reject, Edit, Delete
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJobById, approveJob, rejectJob, updateJob } from '@/services/mockApi';
import { formatDateToThai } from '@/utils/dateUtils';
import { useAuthStore } from '@/store/authStore';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';

// Icons
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    UserIcon,
    DocumentTextIcon,
    PaperClipIcon
} from '@heroicons/react/24/outline';

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Comments
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState([]);

    // ============================================
    // Data Loading
    // ============================================
    useEffect(() => {
        loadJob();
    }, [id]);

    const loadJob = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getJobById(id);
            if (!data) {
                setError('ไม่พบงานนี้');
            } else {
                setJob(data);
                setComments(data.comments || []);
            }
        } catch (err) {
            console.error('Failed to load job:', err);
            setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // Approval Actions
    // ============================================
    const handleApprove = async () => {
        try {
            const updatedJob = await approveJob(id, user?.displayName || 'Approver');
            setJob(updatedJob);
            alert('อนุมัติงานสำเร็จ!');

            // ถ้า approved แล้ว ไปหน้า DJ List
            if (updatedJob.status === 'approved') {
                navigate('/jobs');
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            alert('เกิดข้อผิดพลาดในการอนุมัติ');
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('กรุณาระบุเหตุผลในการปฏิเสธ');
            return;
        }

        try {
            const updatedJob = await rejectJob(id, rejectReason, 'return', user?.displayName || 'Approver');
            setJob(updatedJob);
            setShowRejectModal(false);
            setRejectReason('');
            alert('ส่งกลับแก้ไขสำเร็จ!');
            navigate('/jobs');
        } catch (error) {
            console.error('Failed to reject:', error);
            alert('เกิดข้อผิดพลาดในการปฏิเสธ');
        }
    };

    // ============================================
    // Request Close - ขอปิดงาน
    // ============================================
    /**
     * ผู้รับงาน (Assignee) ส่งคำขอปิดงานไปยังผู้ขอ (Requester)
     * ให้ Requester ตรวจสอบและยืนยันการปิดงาน
     */
    const handleRequestClose = async () => {
        if (!confirm('ต้องการส่งคำขอปิดงานนี้หรือไม่? ผู้ขอจะได้รับแจ้งเตือนเพื่อยืนยัน')) return;

        try {
            const updatedJob = await updateJob(id, {
                status: 'pending_close',
                closeRequestedAt: new Date().toISOString(),
                closeRequestedBy: user?.displayName || 'Assignee',
                timeline: [
                    ...(job.timeline || []),
                    {
                        action: 'request_close',
                        by: user?.displayName || 'Assignee',
                        timestamp: new Date().toISOString(),
                        detail: 'ส่งคำขอปิดงานไปยังผู้ขอ'
                    }
                ]
            });
            setJob(updatedJob);
            alert('ส่งคำขอปิดงานเรียบร้อยแล้ว รอผู้ขอยืนยัน');
        } catch (error) {
            console.error('Failed to request close:', error);
            alert('เกิดข้อผิดพลาด');
        }
    };

    /**
     * ผู้ขอ (Requester) ยืนยันการปิดงาน
     */
    const handleConfirmClose = async () => {
        if (!confirm('ยืนยันปิดงานนี้หรือไม่?')) return;

        try {
            const updatedJob = await updateJob(id, {
                status: 'closed',
                closedAt: new Date().toISOString(),
                closedBy: user?.displayName || 'Requester',
                timeline: [
                    ...(job.timeline || []),
                    {
                        action: 'closed',
                        by: user?.displayName || 'Requester',
                        timestamp: new Date().toISOString(),
                        detail: 'งานถูกปิดเรียบร้อยแล้ว'
                    }
                ]
            });
            setJob(updatedJob);
            alert('ปิดงานสำเร็จ!');
            navigate('/jobs');
        } catch (error) {
            console.error('Failed to close job:', error);
            alert('เกิดข้อผิดพลาด');
        }
    };

    /**
     * ผู้ขอ (Requester) ส่งกลับให้แก้ไข (แทนการยืนยันปิด)
     */
    const handleRequestRevision = async () => {
        const reason = prompt('กรุณาระบุสิ่งที่ต้องการให้แก้ไข:');
        if (!reason) return;

        try {
            const updatedJob = await updateJob(id, {
                status: 'in_progress',
                revisionRequestedAt: new Date().toISOString(),
                timeline: [
                    ...(job.timeline || []),
                    {
                        action: 'revision_requested',
                        by: user?.displayName || 'Requester',
                        timestamp: new Date().toISOString(),
                        detail: `ขอให้แก้ไข: ${reason}`
                    }
                ]
            });
            setJob(updatedJob);
            alert('ส่งคำขอแก้ไขเรียบร้อย');
        } catch (error) {
            console.error('Failed to request revision:', error);
            alert('เกิดข้อผิดพลาด');
        }
    };

    // ============================================
    // Comment System
    // ============================================
    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        const comment = {
            id: `comment-${Date.now()}`,
            author: user?.displayName || 'Unknown',
            authorRole: user?.currentRole || user?.roles?.[0] || 'User',
            message: newComment,
            timestamp: new Date().toISOString()
        };

        try {
            const updatedComments = [...comments, comment];
            const updatedJob = await updateJob(id, {
                comments: updatedComments,
                timeline: [
                    ...(job.timeline || []),
                    {
                        action: 'commented',
                        by: comment.author,
                        timestamp: comment.timestamp,
                        detail: comment.message
                    }
                ]
            });

            setComments(updatedComments);
            setJob(updatedJob);
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น');
        }
    };

    // ============================================
    // Loading & Error States
    // ============================================
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-red-500 text-lg">{error || 'ไม่พบงานนี้'}</p>
                <Link to="/jobs" className="mt-4 text-rose-600 hover:underline">
                    กลับไปหน้ารายการงาน
                </Link>
            </div>
        );
    }

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/jobs')}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-gray-900">{job.djId || job.id}</h1>
                                <Badge status={job.status} />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{job.subject} • {job.project}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* SLA Badge */}
                        {job.isOverdue && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                                <ClockIcon className="w-5 h-5 text-red-500" />
                                <div>
                                    <p className="text-sm font-bold text-red-600">Overdue +{job.overdueDays || 0} Days</p>
                                    <p className="text-xs text-red-500">Deadline: {job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}</p>
                                </div>
                            </div>
                        )}
                        {!job.isOverdue && job.deadline && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                                <ClockIcon className="w-5 h-5 text-gray-500" />
                                <div>
                                    <p className="text-sm font-bold text-gray-700">On Track</p>
                                    <p className="text-xs text-gray-500">Deadline: {job.deadline ? formatDateToThai(new Date(job.deadline)) : '-'}</p>
                                </div>
                            </div>
                        )}

                        <div className="h-8 w-px bg-gray-200 mx-2"></div>

                        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                            <ClockIcon className="w-6 h-6" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Revision Alert (Mock logic for demo) */}
            {(job.status === 'rejected' || job.status === 'rework') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <XMarkIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-800">Revision Request / Rejected</h3>
                        <p className="text-sm text-amber-700 mt-1">"งานถูกส่งกลับแก้ไข กรุณาตรวจสอบ Comment ล่าสุด"</p>
                    </div>
                    <button className="text-amber-600 hover:text-amber-800 text-sm font-medium">ดูรายละเอียด</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Preview + Actions + Chat */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Preview Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Preview / Deliverables</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Version {job.version || 1}</span>
                                <button className="text-rose-600 hover:text-rose-700 text-sm font-medium">Download All</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {/* Main Preview Placeholder */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl aspect-video flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 relative overflow-hidden group">
                                <div className="text-center z-10">
                                    <DocumentTextIcon className="w-20 h-20 text-gray-400 mx-auto mb-3" />
                                    <p className="font-medium text-gray-600">Preview Image</p>
                                    <p className="text-sm text-gray-400">Wait for upload...</p>
                                </div>
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all flex items-center justify-center">
                                </div>
                            </div>

                            {/* Version Thumbnails (Mock) */}
                            <div className="flex gap-3">
                                <div className="w-24 aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-rose-500 cursor-pointer relative">
                                    <span className="text-xs text-gray-500">v{job.version || 1}</span>
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full"></span>
                                </div>
                                <div className="w-24 aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-rose-400 transition-colors">
                                    <PaperClipIcon className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons (Prominent) */}
                    {(job.status === 'pending_approval' || job.status === 'review') && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleApprove}
                                    className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    Approve & Close Job
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                    Request Revision
                                </button>
                                <button className="py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                                    <PencilIcon className="w-5 h-5" />
                                    Edit Brief
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ปุ่มขอปิดงาน - สำหรับ Assignee เมื่อสถานะ in_progress หรือ approved */}
                    {(job.status === 'in_progress' || job.status === 'approved') && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการของผู้รับงาน</h2>
                            <button
                                onClick={handleRequestClose}
                                className="w-full py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <CheckIcon className="w-5 h-5" />
                                ขอปิดงาน (Request Close)
                            </button>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                เมื่อส่งผลงานครบแล้ว กดปุ่มนี้เพื่อแจ้งให้ผู้ขอตรวจสอบและยืนยันการปิดงาน
                            </p>
                        </div>
                    )}

                    {/* ปุ่มยืนยัน/ขอแก้ไข - สำหรับ Requester เมื่อสถานะ pending_close */}
                    {job.status === 'pending_close' && (
                        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 bg-amber-50">
                            <h2 className="font-semibold text-amber-800 mb-2">รอยืนยันการปิดงาน</h2>
                            <p className="text-sm text-amber-700 mb-4">
                                ผู้รับงานส่งคำขอปิดงานมาแล้ว กรุณาตรวจสอบผลงานและยืนยัน
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleConfirmClose}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    ยืนยันปิดงาน
                                </button>
                                <button
                                    onClick={handleRequestRevision}
                                    className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                    ขอให้แก้ไข
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Activity & Chat */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Activity & Chat</h2>
                            <span className="text-xs text-gray-500">{(job.timeline?.length || 0) + (comments.length || 0)} activities</span>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {/* Merge timeline and comments, sort by timestamp */}
                                {(() => {
                                    const activities = [
                                        ...(job.timeline || []).map(event => ({
                                            type: 'activity',
                                            timestamp: event.timestamp,
                                            data: event
                                        })),
                                        ...(comments || []).map(comment => ({
                                            type: 'chat',
                                            timestamp: comment.timestamp,
                                            data: comment
                                        }))
                                    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                                    return activities.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <ClockIcon className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-500">ยังไม่มีประวัติกิจกรรม</p>
                                        </div>
                                    ) : activities.map((item, idx) => {
                                        if (item.type === 'activity') {
                                            const event = item.data;
                                            const iconConfig = {
                                                'created': { bg: 'bg-gray-100', text: 'text-gray-600', icon: ClockIcon },
                                                'approved': { bg: 'bg-green-100', text: 'text-green-600', icon: CheckIcon },
                                                'rejected': { bg: 'bg-amber-100', text: 'text-amber-600', icon: XMarkIcon },
                                                'assigned': { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: UserIcon },
                                                'uploaded': { bg: 'bg-blue-100', text: 'text-blue-600', icon: PaperClipIcon },
                                                'commented': { bg: 'bg-purple-100', text: 'text-purple-600', icon: PencilIcon }
                                            };

                                            const config = iconConfig[event.action] || iconConfig['created'];
                                            const Icon = config.icon;

                                            return (
                                                <div key={`activity-${idx}`} className="flex gap-3 group">
                                                    <div className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                                                        <Icon className={`w-5 h-5 ${config.text}`} />
                                                    </div>
                                                    <div className="flex-1 pb-4 border-b border-gray-50 group-last:border-0">
                                                        <p className="text-sm text-gray-900">
                                                            <span className="font-semibold">{event.by}</span> {event.action}
                                                        </p>
                                                        {event.detail && (
                                                            <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg inline-block">{event.detail}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {event.timestamp ? formatDateToThai(new Date(event.timestamp)) : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Chat message
                                            const comment = item.data;
                                            const initial = comment.author?.[0]?.toUpperCase() || 'U';
                                            const colors = ['bg-purple-500', 'bg-rose-500', 'bg-blue-500', 'bg-green-500'];
                                            const bgColor = colors[comment.author.length % colors.length];

                                            return (
                                                <div key={`chat-${idx}`} className="flex gap-3">
                                                    <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ring-4 ring-white`}>
                                                        {initial}
                                                    </div>
                                                    <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-4 hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-bold text-gray-900">{comment.author}</span>
                                                            <span className="text-xs text-gray-400">{comment.timestamp ? formatDateToThai(new Date(comment.timestamp)) : '-'}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    });
                                })()}
                            </div>

                            {/* Chat Input */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        placeholder="พิมพ์ข้อความ... (@mention)"
                                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Brief */}
                <div className="space-y-6">
                    {/* Job Info Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Job Details</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <InfoRow label="Project" value={job.project} />
                            <InfoRow label="BUD" value={job.bud || 'BUD 1 - สายงานขาย'} />
                            <InfoRow label="Job Type" value={job.jobType} subValue={`SLA: ${job.slaWorkingDays} Working Days`} />
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Priority</label>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    ${job.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                        job.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {job.priority || 'Normal'}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <label className="text-sm text-gray-500 block mb-2">Assignee</label>
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {job.assigneeName?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{job.assigneeName || 'Unassigned'}</p>
                                        <p className="text-xs text-gray-500">Graphic Designer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Brief Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Brief</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objective</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{job.brief?.objective || '-'}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Headline</p>
                                    <p className="text-sm font-medium text-gray-900">{job.brief?.headline || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sub-headline</p>
                                    <p className="text-sm text-gray-700">{job.brief?.subHeadline || '-'}</p>
                                </div>
                            </div>

                            {/* Selling Points */}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Selling Points / Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {(job.brief?.sellingPoints || ['Modern', 'Promotion', 'Premium']).map((tag, i) => (
                                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs border border-gray-200">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Attachments</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                                        <DocumentTextIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-rose-600 transition-colors">CI-guideline.pdf</p>
                                        <p className="text-xs text-gray-400">2.1 MB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-rose-600">
                                    <PaperClipIcon className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
                                        <PaperClipIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-rose-600 transition-colors">logo-pack.zip</p>
                                        <p className="text-xs text-gray-400">5.4 MB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-rose-600">
                                    <PaperClipIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Approval Flow (Compact) */}
                    {job.flowSnapshot && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-hidden">
                            <h2 className="font-semibold text-gray-900 mb-4">Approval Chain</h2>
                            <div className="relative pl-4 space-y-6 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {job.flowSnapshot.levels.map((level, i) => (
                                    <div key={i} className="relative flex items-start gap-4">
                                        <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 
                                            ${job.currentLevel > level.level ? 'bg-green-500 ring-green-500' :
                                                job.currentLevel === level.level ? 'bg-rose-500 ring-rose-500' : 'bg-gray-200 ring-gray-300'}`}>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                    Level {level.level} : {level.role}
                                                </p>
                                                {level.approvers?.length > 1 && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${level.logic === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {level.logic === 'all' ? 'ALL' : 'ANY'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-1 space-y-1">
                                                {level.approvers && level.approvers.length > 0 ? (
                                                    level.approvers.map((app, idx) => (
                                                        <p key={idx} className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                            <UserIcon className="w-3 h-3 text-gray-400" />
                                                            {app.name}
                                                        </p>
                                                    ))
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900">{level.name || 'Any User'}</p>
                                                )}
                                            </div>

                                            {job.currentLevel > level.level && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium mt-1">
                                                    <CheckIcon className="w-3 h-3" /> Approved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-auto transform transition-all scale-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <XMarkIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
                                <p className="text-sm text-gray-500">ส่งกลับแก้ไข / ปฏิเสธงาน</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">เหตุผล / สิ่งที่ต้องแก้ไข</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="ระบุสิ่งที่ต้องการให้แก้ไข..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none h-32 text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 border-transparent text-white shadow-lg shadow-red-200"
                                onClick={handleReject}
                            >
                                ยืนยันส่งกลับ
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Component
function InfoRow({ label, value, subValue }) {
    return (
        <div>
            <label className="text-sm text-gray-500 block mb-0.5">{label}</label>
            <p className="text-gray-900 font-medium text-sm">{value || '-'}</p>
            {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
        </div>
    );
}
