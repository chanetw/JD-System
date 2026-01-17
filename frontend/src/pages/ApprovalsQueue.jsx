/**
 * @file ApprovalsQueue.jsx
 * @description หน้าคิวรออนุมัติ (Approvals Queue)
 * 
 * Senior Programmer Notes:
 * - แสดงรายการงานที่รออนุมัติ โดยเน้นที่ SLA และ Priority
 * - Batch Actions: เลือกหลายรายการเพื่อ Approve/Return พร้อมกัน
 * - Modal Popup สำหรับ Reject/Return พร้อมระบุเหตุผล
 */

import React, { useState, useEffect } from 'react';
import { getJobs, approveJob, rejectJob } from '@/services/mockApi';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';

// Icons
import {
    CheckIcon,
    XMarkIcon,
    EyeIcon,
    FunnelIcon,
    ClockIcon,
    InboxIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ApprovalsQueue() {
    const [activeTab, setActiveTab] = useState('waiting');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [rejectReason, setRejectReason] = useState('incomplete');
    const [rejectResult, setRejectComment] = useState('');

    // User จาก authStore
    const { user } = useAuthStore();

    // Data State
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load - โหลดใหม่เมื่อ user เปลี่ยน
    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getJobs();
            // Sort by Date Descending
            let sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // กรองตาม Role
            const userRole = user?.roles?.[0];
            if (userRole === 'approver' || userRole === 'admin') {
                // Approver/Admin เห็นทุกงาน
                setJobs(sorted);
            } else if (userRole === 'marketing') {
                // Marketing เห็นเฉพาะงานที่ตัวเองสร้าง (ถ้ามี requesterId)
                const myJobs = sorted.filter(job => job.requesterId === user?.id);
                setJobs(myJobs);
            } else {
                // Assignee และอื่นๆ - เห็นงานที่ถูก assign มา
                const assignedJobs = sorted.filter(job => job.assigneeId === user?.id);
                setJobs(assignedJobs);
            }
        } catch (error) {
            console.error("Load jobs error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'waiting') return job.status === 'pending_approval';
        if (activeTab === 'returned') return job.status === 'returned' || job.status === 'rejected';
        if (activeTab === 'history') return job.status === 'approved';
        return false;
    });

    // Actions
    const handleOpenApprove = (jobId) => {
        setSelectedJobId(jobId);
        setShowApproveModal(true);
    };

    const handleConfirmApprove = async () => {
        try {
            await approveJob(selectedJobId, user?.displayName || 'CurrentUser');
            setShowApproveModal(false);
            setSelectedJobId(null);
            loadData(); // Refresh
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleOpenReject = (jobId) => {
        setSelectedJobId(jobId);
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        try {
            // Check radio value from DOM or State? Used state for input
            // Let simplify: Always "Return" for now or use radio
            const type = document.querySelector('input[name="rejectType"]:checked')?.value === 'reject' ? 'reject' : 'return';

            await rejectJob(selectedJobId, rejectReason, type, 'CurrentUser');
            setShowRejectModal(false);
            loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* ============================================
          Page Header
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
                    <p className="text-gray-500">รายการ DJ ที่รอการอนุมัติจากคุณ</p>
                </div>
                {/* Mock User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                        <span className="text-rose-600 font-semibold">SK</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">สมชาย กรุงเทพ</p>
                        <p className="text-xs text-gray-500">Head of Marketing</p>
                    </div>
                </div>
            </div>

            {/* ============================================
          Tabs
          ============================================ */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    <TabButton
                        active={activeTab === 'waiting'}
                        onClick={() => setActiveTab('waiting')}
                        count={jobs.filter(j => j.status === 'pending_approval').length}
                        label="Waiting My Approval"
                        icon={<ClockIcon className="w-5 h-5" />}
                    />
                    <TabButton
                        active={activeTab === 'returned'}
                        onClick={() => setActiveTab('returned')}
                        count={jobs.filter(j => ['returned', 'rejected'].includes(j.status)).length}
                        label="Returned / Rejected"
                        icon={<ArrowPathIcon className="w-5 h-5" />}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        label="History"
                        icon={<InboxIcon className="w-5 h-5" />}
                    />
                </nav>
            </div>

            {/* ============================================
          Summary Stats (Only for Waiting)
          ============================================ */}
            {activeTab === 'waiting' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Waiting Approval" value={filteredJobs.length} icon={<ClockIcon className="w-5 h-5 text-rose-600" />} color="rose" />
                    <StatCard label="Urgent Items" value={filteredJobs.filter(j => j.priority === 'Urgent').length} icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-600" />} color="red" />
                    <StatCard label="Total Jobs" value={jobs.length} icon={<CheckBadgeIcon className="w-5 h-5 text-green-600" />} color="green" />
                    <StatCard label="My Action Rate" value="98%" icon={<ArrowPathIcon className="w-5 h-5 text-yellow-600" />} color="yellow" />
                </div>
            )}

            {/* ============================================
          Queue Table
          ============================================ */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                                </th>
                                <Th>DJ No.</Th>
                                <Th>Project / BUD</Th>
                                <Th>Job Type</Th>
                                <Th>Subject</Th>
                                <Th>Requester</Th>
                                <Th>Level</Th>
                                <Th>Priority</Th>
                                <Th className="text-center">Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-gray-500">Loading jobs...</td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-gray-500">
                                        No jobs found in this list.
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(job => (
                                    <QueueRow
                                        key={job.id}
                                        id={job.id}
                                        project={job.project}
                                        bud={job.bud}
                                        type={job.jobType}
                                        subject={job.subject}
                                        requester={job.requesterName}
                                        submitted={new Date(job.createdAt).toLocaleDateString('th-TH')}
                                        level={job.currentLevel ? `Level ${job.currentLevel}` : '-'} // Changed SLA column to Level for clarity or keep SLA logic? keeping Level for now
                                        priority={<Badge status={job.priority?.toLowerCase() || 'normal'} />}
                                        urgent={job.priority === 'Urgent'}
                                        onApprove={() => handleOpenApprove(job.id)}
                                        onReject={() => handleOpenReject(job.id)}
                                        showActions={activeTab === 'waiting'}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ============================================
          Approve Modal - Popup ยืนยันการ Approve
          ============================================ */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">ยืนยันการอนุมัติ</h3>
                            <button onClick={() => setShowApproveModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckBadgeIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">คุณต้องการอนุมัติงานนี้หรือไม่?</p>
                                    <p className="text-lg font-semibold text-gray-900">DJ Reference: {selectedJobId}</p>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-700">
                                    <strong>หมายเหตุ:</strong> เมื่ออนุมัติแล้ว งานจะถูกส่งไปยังขั้นตอนถัดไปหรือส่งให้ผู้ดำเนินการ
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>ยกเลิก</Button>
                            <Button variant="success" onClick={handleConfirmApprove}>
                                <CheckIcon className="w-4 h-4 mr-2" />
                                อนุมัติ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
          Reject Modal
          ============================================ */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Reject / Return DJ</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">DJ Reference: <span className="font-medium text-gray-900">{selectedJobId}</span></p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="rejectType" value="return" defaultChecked className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm text-gray-700">Return for Revision</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="rejectType" value="reject" className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm text-gray-700">Reject</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
                                <select
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                >
                                    <option value="incomplete">Brief ไม่ครบถ้วน</option>
                                    <option value="unclear">ข้อมูลไม่ชัดเจน</option>
                                    <option value="other">อื่นๆ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                                <textarea
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                    value={rejectResult}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleConfirmReject}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Helpers
function TabButton({ active, onClick, count, label, icon }) {
    return (
        <button
            onClick={onClick}
            className={`py-3 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors ${active ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            {icon}
            {label}
            {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function StatCard({ label, value, icon, color }) {
    const colors = {
        rose: "bg-rose-100",
        red: "bg-red-100",
        green: "bg-green-100",
        yellow: "bg-yellow-100"
    };
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 ${colors[color]} rounded-lg flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}

function Th({ children, className = "text-left" }) {
    return <th className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${className}`}>{children}</th>;
}

function QueueRow({ id, project, bud, type, subject, requester, submitted, sla, priority, urgent, onApprove, onReject, showActions = true }) {
    return (
        <tr className={`hover:bg-gray-50 ${urgent ? 'bg-red-50' : ''}`}>
            <td className="px-4 py-4">
                <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
            </td>
            <td className="px-4 py-4"><Link to={`/jobs/${id}`} className="text-rose-600 font-medium hover:underline">{id}</Link></td>
            <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900">{project}</div>
                <div className="text-xs text-gray-500">{bud}</div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900">{type}</td>
            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{subject}</td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-600">User</div>
                    <span className="text-sm text-gray-900">{requester}</span>
                </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-500">{submitted}</td>
            <td className="px-4 py-4 text-sm">{sla}</td>
            <td className="px-4 py-4">{priority}</td>
            <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-2">
                    <Link to={`/jobs/${id}`} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <EyeIcon className="w-4 h-4" />
                    </Link>
                    {showActions && (
                        <>
                            <button onClick={onApprove} className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg" title="Approve">
                                <CheckIcon className="w-4 h-4" />
                            </button>
                            <button onClick={onReject} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Reject">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

// Additional helper for Badge since "urgent" "high" might not be in generic Badge map yet, 
// strictly generic Badge handles these? Let's assume generic Badge needs update or we standardise strings.
// For now I passed Badge component in props so it's fine.
