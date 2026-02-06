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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { api } from '@shared/services/apiService';
import { adminService } from '@shared/services/modules/adminService';
import { useAuthStore } from '@core/stores/authStore';
import { ROLES, ROLE_LABELS, ROLE_V1_DISPLAY } from '@shared/utils/permission.utils';
import { formatDateToThai } from '@shared/utils/dateUtils';

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

    // Reassignment
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [reassignReason, setReassignReason] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedAssignee, setSelectedAssignee] = useState('');

    // Complete Job
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeNote, setCompleteNote] = useState('');
    const [finalLink, setFinalLink] = useState('');

    // Custom Alert State
    const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'success' });

    // History Dropdown State
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const historyDropdownRef = useRef(null);

    // ============================================
    // Data Loading
    // ============================================
    useEffect(() => {
        loadJob();
        loadUsers();
    }, [id]);

    // Load users for manual assignment
    const loadUsers = async () => {
        try {
            const usersData = await adminService.getUsers();
            // Fix: getUsers returns { data: [], pagination: {} }, extract the array
            const usersList = usersData?.data || usersData || [];
            setUsers(Array.isArray(usersList) ? usersList : []);
        } catch (error) {
            console.error('Failed to load users:', error);
            setUsers([]); // Ensure users is always an array
        }
    };

    // Click outside to close History Dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target)) {
                setShowHistoryDropdown(false);
            }
        };
        if (showHistoryDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHistoryDropdown]);

    // Auto-Start (Immediate Access)
    useEffect(() => {
        if (job && user && job.status === 'assigned') {
            const isAssignee = String(job.assigneeId) === String(user.id);
            if (isAssignee) {
                // Trigger Auto-Start
                console.log('[Auto-Start] Triggering start job (view event)...');
                api.startJob(job.id, 'view').then(updatedJob => {
                    if (updatedJob.status === 'in_progress') {
                        setJob(prev => ({ ...prev, status: 'in_progress', startedAt: updatedJob.startedAt }));
                        // Optional: Show toast "Job Started Automatically"
                    }
                }).catch(err => console.error('Auto-start failed:', err));
            }
        }
    }, [job, user]);

    const loadJob = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Parse ID: accept both integer (21) and partial DJ ID (2026-0004)
            let jobId = null;

            if (!id) {
                throw new Error('ไม่มีรหัสงาน');
            }

            // Try parsing as integer first
            const parsed = parseInt(id, 10);
            if (!isNaN(parsed) && parsed.toString() === id.trim()) {
                // Pure integer: 21
                jobId = parsed;
                console.log(`[JobDetail] loadJob called. IDparam: ${id} (integer)`);
            } else {
                // Try to extract number from DJ ID or similar format (e.g., "2026-0004", "0004")
                // For now, reject non-integer - ensure DJList always passes pkId
                console.warn(`[JobDetail] ID format unclear: ${id}. Expected integer ID from DJList.`);
                throw new Error('รหัสงานไม่ถูกต้อง - กรุณาเข้าผ่านรายการงาน');
            }

            const result = await api.getJobById(jobId);
            console.log(`[JobDetail] api.getJobById result:`, result);

            // Handle response wrapper if any
            const jobData = result?.data || result;

            if (!jobData) {
                console.warn(`[JobDetail] Job NOT Found!`);
                setError('ไม่พบงานนี้');
            } else {
                console.log(`[JobDetail] Job Found:`, jobData);

                // Fetch Approval Flow (Real DB)
                let flowSnapshot = null;
                if (jobData.projectId) {
                    try {
                        // Use correct method name: getApprovalFlowByProject
                        const flowResult = await api.getApprovalFlowByProject(jobData.projectId);
                        if (flowResult && flowResult.levels) {
                            flowSnapshot = {
                                levels: flowResult.levels.map(l => ({
                                    level: l.level,
                                    role: ROLE_V1_DISPLAY[l.role] || l.role || 'Approver',
                                    name: l.approvers.map(a => a.name).join(', '),
                                    approvers: l.approvers, // Keep full approver objects for permission check
                                    logic: l.logic || 'any'
                                }))
                            };
                        }
                    } catch (flowErr) {
                        console.warn('Failed to load approval flow:', flowErr);
                    }
                }

                if (flowSnapshot) {
                    jobData.flowSnapshot = flowSnapshot;
                }

                // Calculate Current Level based on status
                // Logic:
                // pending_approval -> Level 1
                // pending_level_X  -> Level X
                // approved / in_progress -> Completed (Max Level + 1)
                if (jobData.status === 'pending_approval') {
                    jobData.currentLevel = 1;
                } else if (jobData.status && jobData.status.startsWith('pending_level_')) {
                    jobData.currentLevel = parseInt(jobData.status.split('_')[2]);
                } else if (jobData.status === 'approved' || jobData.status === 'in_progress' || jobData.status === 'completed') {
                    jobData.currentLevel = 999; // Finished
                } else {
                    jobData.currentLevel = 0; // Unknown or Rejected/Rework
                }

                setJob(jobData);

                // Load comments and activities from job object
                if (jobData.comments) {
                    const mappedComments = jobData.comments.map(c => ({
                        id: c.id,
                        author: c.user?.name || 'Unknown',
                        authorRole: 'User',
                        avatar: c.user?.avatar,
                        message: c.comment,
                        timestamp: c.createdAt,
                        userId: c.user?.id
                    }));
                    setComments(mappedComments);
                }
            }
        } catch (err) {
            console.error('Failed to load job:', err);
            setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    // Load Users for Reassignment
    useEffect(() => {
        if (showReassignModal && users.length === 0) {
            adminService.getUsers().then(data => {
                // Fix: Extract data array from response { data: [], pagination: {} }
                const usersList = data?.data || data || [];
                setUsers(Array.isArray(usersList) ? usersList : []);
            });
        }
    }, [showReassignModal]);

    const handleReassign = async () => {
        if (!selectedAssignee) {
            setAlertState({ isOpen: true, title: 'กรุณาเลือก', message: 'กรุณาเลือกผู้รับงานใหม่', type: 'error' });
            return;
        }

        try {
            await api.reassignJob(job.id, selectedAssignee, reassignReason, user?.id || 1);
            setAlertState({ isOpen: true, title: 'ย้ายงานสำเร็จ', message: 'ระบบได้ทำการย้ายผู้รับงานเรียบร้อยแล้ว', type: 'success' });
            setShowReassignModal(false);
            setReassignReason('');
            loadJob(); // Reload
        } catch (error) {
            console.error('Failed to reassign:', error);
            setAlertState({ isOpen: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถย้ายงานได้ กรุณาลองใหม่อีกครั้ง', type: 'error' });
        }
    };

    const handleStartJob = async () => {
        try {
            const updated = await api.startJob(job.id, 'manual');
            setJob(prev => ({ ...prev, status: 'in_progress', startedAt: updated.startedAt }));
            setAlertState({
                isOpen: true,
                title: 'เริ่มงานแล้ว! (Job Started)',
                message: 'สถานะงานเปลี่ยนเป็นกำลังดำเนินงาน',
                type: 'success'
            });
        } catch (err) {
            console.error(err);
            setAlertState({
                isOpen: true,
                title: 'ไม่สามารถเริ่มงานได้',
                message: 'เกิดข้อผิดพลาด หรือคุณไม่มีสิทธิ์ในการเริ่มงานนี้',
                type: 'error'
            });
        }
    };

    const handleCompleteJob = async () => {
        if (!finalLink.trim()) {
            alert('กรุณาระบุลิงก์ผลงาน (Final Link)');
            return;
        }

        try {
            await api.completeJob(job.id, {
                note: completeNote,
                attachments: [{ name: 'Final Link', url: finalLink }]
            });
            alert('ส่งงานเรียบร้อย! (Job Completed)');
            setShowCompleteModal(false);
            loadJob();
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการส่งงาน');
        }
    };

    // ============================================
    // Approval Actions
    // ============================================
    const handleApprove = async () => {
        try {
            // Updated to use api.approveJob (Real DB)
            await api.approveJob(job.id, user?.id || 1, 'Approved via Web');
            alert('อนุมัติงานสำเร็จ!');

            // Reload Job to refresh status
            loadJob();
        } catch (error) {
            console.error('Failed to approve:', error);
            alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.message);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('กรุณาระบุเหตุผลในการปฏิเสธ');
            return;
        }

        try {
            // Updated to use api.rejectJob (Real DB)
            // type 'return' maps to 'rework' status usually, or 'reject' if strict rejection
            // This UI implies 'Request Revision' -> 'return' logic
            await api.rejectJob(job.id, rejectReason, 'return', user?.id || 1);

            setShowRejectModal(false);
            setRejectReason('');
            alert('ส่งกลับแก้ไขสำเร็จ!');

            // Reload Job to refresh status
            loadJob();
        } catch (error) {
            console.error('Failed to reject:', error);
            alert('เกิดข้อผิดพลาดในการปฏิเสธ: ' + error.message);
        }
    };

    /**
     * Manual Assign Job - สำหรับ Department Manager หรือ Admin
     * เมื่องานผ่านการอนุมัติแล้วแต่ยังไม่มี Assignee
     */
    const handleManualAssign = async (jobId, assigneeId) => {
        if (!assigneeId) {
            alert('กรุณาเลือกผู้รับงาน');
            return;
        }

        // Check permission (only admin or dept manager can assign)
        const isAdmin = user?.roles?.includes('admin');
        const isDeptManager = user?.roles?.includes('dept_manager'); // Adjust role name as needed

        if (!isAdmin && !isDeptManager) {
            alert('คุณไม่มีสิทธิ์มอบหมายงาน (เฉพาะ Admin หรือ Department Manager)');
            return;
        }

        setIsLoading(true);
        try {
            const result = await api.assignJobManually(jobId, assigneeId, user?.id);
            if (result.success) {
                alert('มอบหมายงานสำเร็จ');
                setSelectedAssignee('');
                // Reload job data
                loadJob();
            } else {
                alert('เกิดข้อผิดพลาด: ' + result.error);
            }
        } catch (error) {
            console.error('Manual assign failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsLoading(false);
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
    // Comment System (Real API)
    // ============================================

    // Load comments from real API
    const loadComments = async () => {
        try {
            const result = await api.getJobComments(id);
            if (result.success) {
                // Map API response to display format
                const mappedComments = result.data.map(c => ({
                    id: c.id,
                    author: c.user?.displayName || 'Unknown',
                    authorRole: 'User',
                    message: c.comment,
                    timestamp: c.createdAt,
                    mentions: c.mentions,
                    userId: c.userId
                }));
                setComments(mappedComments);
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    };

    // Load comments when job is loaded
    useEffect(() => {
        if (job?.id) {
            loadComments();
        }
    }, [job?.id]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            const result = await api.addJobComment(id, newComment);

            if (result.success) {
                // Add new comment to the list
                const newCommentData = {
                    id: result.data.id,
                    author: result.data.user?.displayName || user?.displayName || 'Unknown',
                    authorRole: 'User',
                    message: result.data.comment,
                    timestamp: result.data.createdAt,
                    mentions: result.data.mentions,
                    userId: result.data.userId
                };
                setComments(prev => [...prev, newCommentData]);
                setNewComment('');

                // Show success message with mention info
                if (result.meta?.mentionsFound > 0) {
                    setAlertState({
                        isOpen: true,
                        title: 'เพิ่ม Comment สำเร็จ',
                        message: `ส่งการแจ้งเตือนถึง ${result.meta.notificationsSent} คน`,
                        type: 'success'
                    });
                }
            } else {
                setAlertState({
                    isOpen: true,
                    title: 'เกิดข้อผิดพลาด',
                    message: result.error || 'ไม่สามารถเพิ่มความคิดเห็นได้',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            setAlertState({
                isOpen: true,
                title: 'เกิดข้อผิดพลาด',
                message: 'ไม่สามารถเพิ่มความคิดเห็นได้',
                type: 'error'
            });
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('ต้องการลบความคิดเห็นนี้หรือไม่?')) return;

        try {
            const result = await api.deleteJobComment(id, commentId);
            if (result.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            } else {
                alert(result.error || 'ไม่สามารถลบความคิดเห็นได้');
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('เกิดข้อผิดพลาดในการลบความคิดเห็น');
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
                            <p className="text-sm text-gray-500 mt-1">
                                {job.subject} • {job.project}
                                {job.parentJob && (
                                    <Link to={`/jobs/${job.parentJob.id}`} className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 hover:underline text-xs font-medium border border-blue-100 transition-colors">
                                        <DocumentTextIcon className="w-3 h-3" />
                                        Parent: {job.parentJob.djId}
                                    </Link>
                                )}
                            </p>
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

                        <button
                            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <ClockIcon className="w-6 h-6" />
                            {((job.activities?.length || 0) + (comments.length || 0)) > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {Math.min((job.activities?.length || 0) + (comments.length || 0), 99)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* History Dropdown */}
            {showHistoryDropdown && (
                <div
                    ref={historyDropdownRef}
                    className="absolute top-20 right-8 w-96 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fadeIn">
                    {/* Dropdown Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-800">ประวัติการทำงาน (History)</h3>
                            <button
                                onClick={() => setShowHistoryDropdown(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* History List */}
                    <div className="p-4 space-y-3">
                        {(() => {
                            // Merge activities and comments
                            const historyItems = [
                                ...(job.activities || []).map(activity => ({
                                    type: 'activity',
                                    timestamp: activity.createdAt,
                                    data: activity
                                })),
                                ...(comments || []).map(comment => ({
                                    type: 'comment',
                                    timestamp: comment.timestamp,
                                    data: comment
                                }))
                            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

                            if (historyItems.length === 0) {
                                return (
                                    <div className="text-center py-8 text-gray-400">
                                        <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">ยังไม่มีประวัติ</p>
                                    </div>
                                );
                            }

                            return historyItems.map((item, idx) => {
                                if (item.type === 'activity') {
                                    const activity = item.data;
                                    const iconConfig = {
                                        'status_change': { bg: 'bg-gray-100', text: 'text-gray-600', icon: ClockIcon },
                                        'approved': { bg: 'bg-green-100', text: 'text-green-600', icon: CheckIcon },
                                        'rejected': { bg: 'bg-amber-100', text: 'text-amber-600', icon: XMarkIcon },
                                        'assigned': { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: UserIcon },
                                        'reassigned': { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: UserIcon }
                                    };
                                    const config = iconConfig[activity.type] || iconConfig['status_change'];
                                    const IconComponent = config.icon;

                                    return (
                                        <div key={`activity-${idx}`} className="flex gap-3 items-start hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                            <div className={`w-8 h-8 ${config.bg} rounded-full flex items-center justify-center ${config.text} flex-shrink-0`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 leading-snug">
                                                    {activity.user ? (
                                                        <><span className="font-semibold">{activity.user.name}</span> {activity.description || activity.type}</>
                                                    ) : (
                                                        <>{activity.description || activity.type}</>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {activity.createdAt ? formatDateToThai(new Date(activity.createdAt)) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    const comment = item.data;
                                    return (
                                        <div key={`comment-${idx}`} className="flex gap-3 items-start hover:bg-blue-50 p-2 rounded-lg transition-colors">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {comment.author?.[0] || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{comment.author}</p>
                                                <p className="text-sm text-gray-600 line-clamp-2">{comment.message}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {comment.timestamp ? formatDateToThai(new Date(comment.timestamp)) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            });
                        })()}
                    </div>

                    {/* View All Link */}
                    {((job.activities?.length || 0) + (comments.length || 0)) > 15 && (
                        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-blue-50 px-5 py-3 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowHistoryDropdown(false);
                                    document.getElementById('activity-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                                ดูประวัติทั้งหมด ({(job.activities?.length || 0) + (comments.length || 0)} รายการ)
                            </button>
                        </div>
                    )}
                </div>
            )}

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

            {/* Parent Rejected Alert */}
            {job.parentJob?.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <XMarkIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-800">⚠️ งานแม่ถูกยกเลิก/ปฏิเสธ (Parent Job Rejected)</h3>
                        <p className="text-sm text-red-700 mt-1">
                            งานแม่ <strong>{job.parentJob.djId}</strong> ถูกปฏิเสธ โปรดตรวจสอบกับหัวหน้าทีมหรือผู้มอบหมายงานก่อนดำเนินการต่อ
                        </p>
                    </div>
                    <Link to={`/jobs/${job.parentJob.id}`} className="text-red-700 hover:text-red-900 text-sm font-bold underline px-3 py-1">
                        ดูงานแม่
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Activity & Chat */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Brief Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Brief</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Objective & Details */}
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Objective & Details</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {job.objective || '-'}
                                </p>
                            </div>

                            {/* Brief Link Card */}
                            {job.briefLink && (
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Brief Link</p>
                                            <a
                                                href={job.briefLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-green-800 hover:text-green-900 hover:underline break-all block">
                                                {job.briefLink}
                                            </a>
                                        </div>
                                        <a
                                            href={job.briefLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-700 flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons (Strict Permission Check) */}
                    {(() => {
                        // 1. เช็คว่างานอยู่ในสถานะรออนุมัติหรือไม่
                        const isPending = job.currentLevel > 0 && job.currentLevel < 999;

                        // 2. เช็คว่าเป็นผู้อนุมัติใน Level นี้หรือไม่
                        let canApprove = false;
                        if (isPending && job.flowSnapshot) {
                            const currentLevelConfig = job.flowSnapshot.levels.find(l => l.level === job.currentLevel);
                            if (currentLevelConfig && currentLevelConfig.approvers) {
                                // เช็คว่า User ID ของเราอยู่ในรายการ Approvers ของ Level นี้หรือไม่
                                canApprove = currentLevelConfig.approvers.some(a => a.id === user?.id) ||
                                    currentLevelConfig.approvers.some(a => a.userId === user?.id); // Handle different naming (id vs userId)
                            }
                        }

                        // Admin Bypass (Optional: ให้ Admin กดอนุมัติได้ทุก Level)
                        const isAdmin = user?.roles?.includes('admin');
                        if (isAdmin && isPending) canApprove = true;

                        if (!canApprove) return null;

                        return (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-900 mb-4">Actions (Level {job.currentLevel})</h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleApprove}
                                        className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                        Approve & Next
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                        Reject / Return
                                    </button>
                                </div>
                            </div>
                        );
                    })()}


                    {/* Child Jobs List (For Parent Job) */}
                    {job.childJobs && job.childJobs.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900">Child Jobs ({job.childJobs.length})</h2>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Group Management</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {job.childJobs.map(child => (
                                    <div key={child.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <Link to={`/jobs/${child.id}`} className="flex items-center gap-4 group flex-1">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                                ${child.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    child.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'}`}>
                                                {child.jobType?.[0] || 'J'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 group-hover:text-rose-600">{child.djId}</p>
                                                <p className="text-xs text-gray-500">{child.jobType} • {child.assignee || 'Unassigned'}</p>
                                            </div>
                                        </Link>
                                        <Badge status={child.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Assignment Section - สำหรับ Jobs ที่ Approved แต่ยังไม่ Assign */}
                    {job.status === 'approved' && !job.assigneeId && (
                        <div className="bg-orange-50 border-l-4 border-l-orange-500 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                        <UserIcon className="w-5 h-5" />
                                        ต้องมอบหมายงาน (Pending Assignment)
                                    </h3>
                                    <p className="text-sm text-orange-600 mt-1">
                                        งานผ่านการอนุมัติแล้ว แต่ยังต้องเลือกผู้รับผิดชอบ
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <select
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-orange-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    disabled={isLoading}
                                >
                                    <option value="">-- เลือกผู้รับงาน --</option>
                                    {users.filter(u => u.roles?.includes('assignee')).map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.displayName || `${u.firstName} ${u.lastName}`}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => handleManualAssign(job.id, selectedAssignee)}
                                    disabled={!selectedAssignee || isLoading}
                                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {isLoading ? 'กำลังบันทึก...' : 'มอบหมาย'}
                                </button>
                            </div>

                            <p className="text-xs text-orange-600 mt-3 flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                เฉพาะ Department Manager หรือ Admin เท่านั้นที่สามารถมอบหมายงานได้
                            </p>
                        </div>
                    )}

                    {/* ปุ่มสำหรับ Assignee (Start / Complete) */}
                    {(job.status === 'assigned' || job.status === 'in_progress') && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการของผู้รับงาน</h2>

                            {/* Start Job Button (Optional if Auto-Start fails or needed manual) */}
                            {job.status === 'assigned' && (
                                <button
                                    onClick={handleStartJob}
                                    className="w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors shadow-sm mb-3"
                                >
                                    <ClockIcon className="w-5 h-5" />
                                    กดเริ่มงาน (Start Job)
                                </button>
                            )}

                            {/* Complete Job Button */}
                            {job.status === 'in_progress' && (
                                <button
                                    onClick={() => setShowCompleteModal(true)}
                                    className="w-full py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    ส่งงาน (Complete Job)
                                </button>
                            )}

                            {job.status === 'approved' && (
                                <p className="text-center text-gray-500 text-sm">งานอนุมัติแล้ว รอส่งมอบไฟล์ (ถ้ามี)</p>
                            )}
                        </div>
                    )}

                    {/* ปุ่มขอปิดงาน (Legacy Phase 3 Logic - Hidden if Phase 4 Active) */}
                    {/* {(job.status === 'in_progress' || job.status === 'approved') && ( ... )} */}

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
                    <div id="activity-section" className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Activity & Chat</h2>
                            <span className="text-xs text-gray-500">{((job.activities?.length || 0) + (comments.length || 0))} activities</span>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {/* Merge activities and comments, sort by timestamp */}
                                {(() => {
                                    const activities = [
                                        ...(job.activities || []).map(activity => ({
                                            type: 'activity',
                                            timestamp: activity.createdAt,
                                            data: activity
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
                                            const activity = item.data;
                                            const iconConfig = {
                                                'status_change': { bg: 'bg-gray-100', text: 'text-gray-600', icon: ClockIcon },
                                                'approved': { bg: 'bg-green-100', text: 'text-green-600', icon: CheckIcon },
                                                'rejected': { bg: 'bg-amber-100', text: 'text-amber-600', icon: XMarkIcon },
                                                'assigned': { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: UserIcon },
                                                'reassigned': { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: UserIcon },
                                                'uploaded': { bg: 'bg-blue-100', text: 'text-blue-600', icon: PaperClipIcon },
                                                'comment_added': { bg: 'bg-purple-100', text: 'text-purple-600', icon: PencilIcon },
                                                'created': { bg: 'bg-gray-100', text: 'text-gray-600', icon: ClockIcon }
                                            };

                                            const config = iconConfig[activity.type] || iconConfig['status_change'];
                                            const Icon = config.icon;

                                            return (
                                                <div key={`activity-${idx}`} className="flex gap-3 group">
                                                    <div className={`w-10 h-10 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                                                        <Icon className={`w-5 h-5 ${config.text}`} />
                                                    </div>
                                                    <div className="flex-1 pb-4 border-b border-gray-50 group-last:border-0">
                                                        <p className="text-sm text-gray-900">
                                                            {activity.user ? (
                                                                <><span className="font-semibold">{activity.user.name}</span> {activity.description || activity.type}</>
                                                            ) : (
                                                                <>{activity.description || activity.type}</>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {activity.createdAt ? formatDateToThai(new Date(activity.createdAt)) : '-'}
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

                {/* Right Column: Brief & Details */}
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
                                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {job.assigneeName?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{job.assigneeName || 'Unassigned'}</p>
                                            <p className="text-xs text-gray-500">Graphic Designer</p>
                                        </div>
                                    </div>
                                    {/* Permission Check for Reassignment */}
                                    {(user?.roles?.includes('admin') || user?.roles?.includes('manager') || user?.role === 'admin') && (
                                        <button
                                            onClick={() => setShowReassignModal(true)}
                                            className="ml-auto px-3 py-1.5 text-xs font-medium bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 hover:border-purple-300 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                                            title="ย้ายผู้รับงาน (Reassign)"
                                        >
                                            <PencilIcon className="w-3 h-3" />
                                            Change
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Approval Flow (Detailed) */}
                    {job.flowSnapshot && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-hidden">
                            <h2 className="font-semibold text-gray-900 mb-4">Approval Chain (เส้นทางการอนุมัติ)</h2>
                            <div className="relative pl-4 space-y-6 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {job.flowSnapshot.levels.map((level, i) => {
                                    // Status Logic
                                    const isPassed = job.currentLevel > level.level;
                                    const isCurrent = job.currentLevel === level.level;
                                    const isPending = job.currentLevel < level.level;

                                    return (
                                        <div key={i} className="relative flex items-start gap-4">
                                            {/* Status Dot */}
                                            <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10 
                                                ${isPassed ? 'bg-green-500 ring-green-500' :
                                                    isCurrent ? 'bg-rose-500 ring-rose-500' : 'bg-gray-200 ring-gray-300'}`}>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-rose-600' : 'text-gray-500'}`}>
                                                        Level {level.level} : {level.role}
                                                    </p>
                                                    {level.approvers?.length > 1 && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${level.logic === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {level.logic === 'all' ? 'WaitFor ALL' : 'ANY OK'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1 space-y-1">
                                                    {level.approvers && level.approvers.length > 0 ? (
                                                        level.approvers.map((app, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold
                                                                    ${isPassed ? 'bg-green-500' : isCurrent ? 'bg-rose-500' : 'bg-gray-300'}`}>
                                                                    {app.name ? app.name[0] : '?'}
                                                                </div>
                                                                <p className={`text-sm ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                                    {app.name}
                                                                </p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm font-medium text-gray-500 italic">No specific approver</p>
                                                    )}
                                                </div>

                                                {/* Status Badge */}
                                                {isPassed && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium mt-2 border border-green-100">
                                                        <CheckIcon className="w-3 h-3" /> Approved
                                                    </span>
                                                )}
                                                {isCurrent && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-medium mt-2 border border-rose-100 animate-pulse">
                                                        <ClockIcon className="w-3 h-3" /> Waiting for Action...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Final Destination */}
                                <div className="relative flex items-start gap-4">
                                    <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ring-1 z-10 
                                            ${job.currentLevel === 999 ? 'bg-green-600 ring-green-600' : 'bg-gray-200 ring-gray-300'}`}>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">End Process</p>
                                        <p className="text-sm font-medium text-gray-900">Start Job (In Progress)</p>
                                        {job.currentLevel === 999 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-bold mt-2">
                                                <CheckIcon className="w-3 h-3" /> Ready to Work
                                            </span>
                                        )}
                                    </div>
                                </div>
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
                                <h3 className="text-lg font-bold text-gray-900">ปฏิเสธงาน (Reject Job)</h3>
                                <p className="text-sm text-red-600 font-medium">⚠️ การปฏิเสธจะปิดงานนี้ทันที</p>
                            </div>
                        </div>

                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800">
                                <strong>หมายเหตุ:</strong> การปฏิเสธงานจะทำให้งานนี้ถูกปิดถาวร
                                หากต้องการดำเนินการต่อ ผู้ขอต้องเปิดใบงานใหม่
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="กรุณาระบุเหตุผลที่ปฏิเสธงานนี้..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none h-32 text-sm"
                                required
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
                                disabled={!rejectReason || rejectReason.trim() === ''}
                            >
                                ยืนยันปฏิเสธ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reassign Modal */}
            {showReassignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-purple-600" />
                            ย้ายผู้รับงาน (Reassign)
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับงานใหม่</label>
                                <select
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="">-- เลือกผู้รับงาน --</option>
                                    {Array.isArray(users) && users
                                        .filter(u =>
                                            u.isActive &&
                                            u.roleName === 'assignee' // เฉพาะผู้รับงาน (Assignee/V1) เท่านั้น
                                        )
                                        .map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.fullName || u.name || `${u.firstName} ${u.lastName}`} ({u.department?.name || u.department || 'General'})
                                            </option>
                                        ))
                                    }

                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผล / หมายเหตุ</label>
                                <textarea
                                    value={reassignReason}
                                    onChange={(e) => setReassignReason(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
                                    rows="3"
                                    placeholder="ระบุเหตุผลในการย้ายงาน..."
                                ></textarea>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <Button variant="secondary" onClick={() => setShowReassignModal(false)}>ยกเลิก</Button>
                                <Button onClick={handleReassign}>ยืนยันการย้าย</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert Modal */}
            {alertState.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center transform transition-all scale-100">
                        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${alertState.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            {alertState.type === 'success' ? (
                                <CheckIcon className="h-8 w-8 text-green-600" />
                            ) : (
                                <XMarkIcon className="h-8 w-8 text-red-600" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {alertState.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {alertState.message}
                        </p>
                        <Button
                            onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                            className={`w-full justify-center ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            ตกลง (OK)
                        </Button>
                    </div>
                </div>
            )}

            {/* Complete Job Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-auto transform transition-all scale-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">ส่งมอบงาน (Complete Job)</h3>
                                <p className="text-sm text-gray-500">กรอกรายละเอียดเพื่อส่งมอบงาน</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์ผลงาน (Final Link Job/File) <span className="text-red-500">*</span></label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow text-sm"
                                    placeholder="https://drive.google.com/..."
                                    value={finalLink}
                                    onChange={(e) => setFinalLink(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ / Message to Requester</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 h-24 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow resize-none text-sm"
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    value={completeNote}
                                    onChange={(e) => setCompleteNote(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => setShowCompleteModal(false)}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 border-transparent text-white shadow-lg shadow-green-200"
                                onClick={handleCompleteJob}
                            >
                                ส่งงาน (Complete)
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
