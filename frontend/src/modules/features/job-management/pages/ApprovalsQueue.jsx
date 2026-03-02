/**
 * @file ApprovalsQueue.jsx
 * @description หน้าจอคิวรออนุมัติ (Approvals Queue)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายการงาน DJ (Design Job) ที่รอการตรวจสอบหรืออนุมัติจากผู้ใช้งาน
 * - รองรับการคัดกรองงานตามสถานะ (รออนุมัติ, ตีกลับ/ปฏิเสธ, ประวัติ)
 * - มีระบบ Action ด่วนเพื่อ Approve หรือ Reject งานได้ทันทีจากหน้าคิว
 * - แสดงสถิติเบื้องต้น (Stats) เพื่อช่วยในการติดตามงานที่เร่งด่วน (Urgent)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { Link } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { getUserScopes, getAllowedProjectIds } from '@shared/utils/scopeHelpers';

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
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

/**
 * Component สำหรับหน้าคิวรออนุมัติ
 */
export default function ApprovalsQueue() {
    // === สถานะ UI (UI States) ===
    const [activeTab, setActiveTab] = useState('waiting');         // แท็บที่เลือกอยู่ (waiting, returned, history)
    const [showRejectModal, setShowRejectModal] = useState(false); // ควบคุมการแสดงหน้าต่างแจ้งปฏิเสธ
    const [showApproveModal, setShowApproveModal] = useState(false); // ควบคุมการแสดงหน้าต่างยืนยันการอนุมัติ
    const [selectedJobId, setSelectedJobId] = useState(null);      // DJ-ID ที่กำลังดำเนินการ
    const [rejectReason, setRejectReason] = useState('incomplete'); // สาเหตุของการปฏิเสธ
    const [rejectResult, setRejectComment] = useState('');           // ความคิดเห็นเพิ่มเติมเมื่อปฏิเสธ
    const [expandedRows, setExpandedRows] = useState(new Set());     // เก็บ ID ของแถวที่กางอยู่

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    /** ข้อมูลผู้ใช้งานปัจจุบันจาก Central Store */
    const { user } = useAuthStoreV2();

    // === สถานะข้อมูล (Data States) ===
    const [jobs, setJobs] = useState([]);      // รายการงานทั้งหมดที่โหลดมา
    const [isLoading, setIsLoading] = useState(false); // สถานะการโหลดข้อมูล

    // === การโหลดข้อมูล (Initial Load) ===
    useEffect(() => {
        loadData();
    }, [user]);

    /** จัดกลุ่มงานตาม predecessorId เพื่อแสดงเป็น accordion */
    const groupJobsByPredecessor = (jobs) => {
        const grouped = [];
        const jobMap = new Map();
        
        // สร้าง map ของงานทั้งหมด
        jobs.forEach(job => jobMap.set(job.id, job));
        
        // หางานที่ไม่มี predecessorId (งานหลัก)
        const mainJobs = jobs.filter(job => !job.predecessorId);
        
        mainJobs.forEach(mainJob => {
            // หางานต่อเนื่องทั้งหมดของงานหลักนี้
            const sequentialJobs = jobs.filter(job => job.predecessorId === mainJob.id);
            
            grouped.push({
                ...mainJob,
                children: sequentialJobs
            });
        });
        
        return grouped;
    };

    /** สลับสถานะการกาง/ยุบแถว */
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

    /** ดึงข้อมูลงานจาก API พร้อม Multi-Role Support */
    const loadData = async () => {
        setIsLoading(true);
        try {
            // ✅ NEW: ใช้ getJobsByRole() เพื่อรองรับ multi-role
            // Backend จะส่ง union ของงานจากทุก roles ของ user
            const data = await api.getJobsByRole(user);

            // เรียงลำดับตามวันที่สร้างล่าสุดขึ้นก่อน (Newest first)
            let sorted = (Array.isArray(data) ? data : []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // === Scope-based Filtering ===
            // ดึง scopes ของ user จาก database
            if (user?.id) {
                const scopes = await getUserScopes(user.id);
                const hasTenantScope = scopes.some(s => s.scope_level === 'Tenant');

                if (!hasTenantScope && scopes.length > 0) {
                    // ถ้ามี scope แต่ไม่ใช่ Tenant level ให้ filter ตาม project
                    const allowedProjectIds = await getAllowedProjectIds(user.id, user.tenantId);
                    sorted = sorted.filter(job => allowedProjectIds.has(job.projectId || job.project_id));
                    console.log('📋 [ApprovalsQueue] Filtered by scope:', sorted.length, 'jobs');
                }
            }

            console.log(`[ApprovalsQueue] Loaded ${sorted.length} jobs for user:`, user?.email, 'Roles:', user?.roles || [user?.roleName]);
            setJobs(sorted);
        } catch (error) {
            console.error("[ApprovalsQueue] Error loading jobs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    /** การคัดกรองข้อมูลตามแท็บสถานะ (Tab Filtering) */
    const filteredJobs = jobs.filter(job => {
        // ✅ FIX: แสดงทุก level ของการอนุมัติ (pending_approval, pending_level_2, pending_level_3, ...)
        // ✅ เพิ่ม assignee_rejected - งานที่รอการอนุมัติการปฏิเสธ
        if (activeTab === 'waiting') {
            return job.status === 'pending_approval' ||
                   job.status?.startsWith('pending_level_') ||
                   job.status === 'assignee_rejected';
        }
        if (activeTab === 'returned') return job.status === 'returned' || job.status === 'rejected';
        if (activeTab === 'history') return job.status === 'approved' || job.status === 'pending_dependency'; // รวมถึงงานที่ approve แล้วแต่ยังรอ
        return false;
    });

    // จำนวนงานเร่งด่วนที่ยังไม่เสร็จสิ้น
    const urgentCount = jobs.filter(j => 
        j.priority?.toLowerCase() === 'urgent' && 
        !['completed', 'rejected', 'cancelled'].includes(j.status?.toLowerCase())
    ).length;

    /** การจัดเรียงข้อมูล (Custom Sorting) */
    const sortedFilteredJobs = [...filteredJobs].sort((a, b) => {
        // 1. งานเร่งด่วน (Urgent) ขึ้นบนสุด
        const aIsUrgent = a.priority?.toLowerCase() === 'urgent';
        const bIsUrgent = b.priority?.toLowerCase() === 'urgent';
        
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;

        // 2. งานที่สร้างมาแล้วเกิน 1 วัน (Overdue > 1 day)
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = new Date();
        const aIsOverdue = (now - new Date(a.createdAt)) > ONE_DAY_MS;
        const bIsOverdue = (now - new Date(b.createdAt)) > ONE_DAY_MS;
        
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        // 3. เรียงตามวันที่สร้าง (เก่าสุดขึ้นก่อน = First In, First Out)
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Pagination Logic
    const totalPages = Math.ceil(sortedFilteredJobs.length / itemsPerPage);
    const paginatedJobs = sortedFilteredJobs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // จัดกลุ่มงานสำหรับแสดงผล
    const groupedJobs = groupJobsByPredecessor(paginatedJobs);

    // Reset page when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // === ฟังก์ชันจัดการเหตุการณ์ (Action Handlers) ===

    /** เปิดหน้าต่างยืนยันการอนุมัติ */
    const handleOpenApprove = (jobId) => {
        setSelectedJobId(jobId);
        setShowApproveModal(true);
    };

    /** ดำเนินการอนุมัติผ่าน API */
    const handleConfirmApprove = async () => {
        try {
            await api.approveJob(selectedJobId, user?.id || 1, 'Approved via Approvals Queue');
            setShowApproveModal(false);
            setSelectedJobId(null);
            loadData(); // โหลดข้อมูลใหม่เพื่ออัปเดตสถานะหน้าจอ
        } catch (error) {
            alert('ไม่สามารถอนุมัติงานได้: ' + error.message);
        }
    };

    /** เปิดหน้าต่างแจ้งปฏิเสธงาน */
    const handleOpenReject = (jobId) => {
        setSelectedJobId(jobId);
        setShowRejectModal(true);
    };

    /** ดำเนินการปฏิเสธงานผ่าน API โดยระบุสาเหตุ (Reject/Return) */
    const handleConfirmReject = async () => {
        try {
            const comment = rejectResult.trim()
                ? `${rejectReason} - ${rejectResult}`
                : rejectReason;
            await api.rejectJob(selectedJobId, user?.id || 1, comment);
            setShowRejectModal(false);
            setRejectReason('incomplete');
            setRejectComment('');
            loadData();
        } catch (error) {
            alert('ไม่สามารถปฏิเสธงานได้: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* ============================================
          ส่วนหัวของหน้าจอ (Page Header) + Refresh Button
          ============================================ */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">คิวรออนุมัติ (Approvals Queue)</h1>
                    <p className="text-gray-500">รายการงาน DJ (Design Job) ที่รอให้คุณดำเนินการตรวจสอบ</p>
                </div>
                <Button
                    variant="secondary"
                    onClick={loadData}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </Button>
            </div>

            {/* ============================================
          แถบเลือกสถานะงาน (Status Tabs)
          ============================================ */}
            <div className="border-b border-gray-400">
                <nav className="-mb-px flex gap-6">
                    <TabButton
                        active={activeTab === 'waiting'}
                        onClick={() => setActiveTab('waiting')}
                        count={jobs.filter(j => j.status === 'pending_approval' || j.status?.startsWith('pending_level_')).length}
                        label="รออนุมัติงาน"
                        icon={<ClockIcon className="w-5 h-5" />}
                    />
                    <TabButton
                        active={activeTab === 'returned'}
                        onClick={() => setActiveTab('returned')}
                        count={jobs.filter(j => ['returned', 'rejected'].includes(j.status)).length}
                        label="ตีกลับ / ปฏิเสธ"
                        icon={<ArrowPathIcon className="w-5 h-5" />}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        label="ประวัติงาน"
                        icon={<InboxIcon className="w-5 h-5" />}
                    />
                </nav>
            </div>

            {/* ============================================
          สรุปสถิติเบื้องต้น (Summary Stats) - แสดงเสมอ
          ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    label="งานรออนุมัติ" 
                    value={jobs.filter(j => j.status === 'pending_approval' || j.status?.startsWith('pending_level_')).length} 
                    icon={<ClockIcon className="w-5 h-5 text-amber-600" />} 
                    color="amber" 
                />
                <StatCard 
                    label="งานเร่งด่วน (Urgent)" 
                    value={urgentCount} 
                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-600" />} 
                    color="red" 
                />
                <StatCard 
                    label="งานตีกลับ" 
                    value={jobs.filter(j => ['returned', 'rejected'].includes(j.status)).length} 
                    icon={<ArrowPathIcon className="w-5 h-5 text-orange-600" />} 
                    color="orange" 
                />
            </div>

            {/* ============================================
          ตารางรายการงาน (Queue Table)
          ============================================ */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-400">
                            <tr>
                                <Th>ลำดับ</Th>
                                <Th>เลขที่</Th>
                                <Th>โครงการ / BUD</Th>
                                <Th>ประเภท</Th>
                                <Th>ผู้เปิดงาน</Th>
                                <Th>สถานะ</Th>
                                {activeTab === 'history' ? (
                                    <>
                                        <Th>วันที่ดำเนินการ</Th>
                                        <Th>ความคิดเห็น</Th>
                                    </>
                                ) : (
                                    <Th>วันที่สร้าง</Th>
                                )}
                                <Th className="text-center">การจัดการ</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-400">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-gray-500">กำลังโหลดรายการงาน...</td>
                                </tr>
                            ) : paginatedJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-gray-500">
                                        ไม่พบรายการงานในหัวข้อนี้
                                    </td>
                                </tr>
                            ) : (
                                groupedJobs.map((job, index) => (
                                    <AccordionRow
                                        key={job.id}
                                        sequence={(currentPage - 1) * itemsPerPage + index + 1}
                                        pkId={job.id}
                                        id={job.djId || `DJ-${job.id}`}
                                        project={job.project}
                                        bud={job.bud}
                                        type={job.jobType}
                                        subject={job.subject}
                                        requester={job.requester}
                                        submitted={new Date(job.createdAt).toLocaleDateString('th-TH')}
                                        historyData={job.historyData}
                                        activeTab={activeTab}
                                        status={job.status}
                                        sla={
                                            job.status?.startsWith('pending_level_') 
                                                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                                    Level {job.status.split('_')[2]}
                                                  </span>
                                                : job.status === 'pending_approval'
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                                        Level 1
                                                      </span>
                                                    : <span className="text-gray-500">-</span>
                                        }
                                        priority={<Badge status={job.priority?.toLowerCase() || 'normal'} />}
                                        urgent={job.priority?.toLowerCase() === 'urgent'}
                                        onApprove={() => handleOpenApprove(job.id)}
                                        onReject={() => handleOpenReject(job.id)}
                                        showActions={activeTab === 'waiting' && job.status !== 'pending_dependency' && !job.predecessorId}
                                        predecessorDjId={job.predecessorDjId}
                                        predecessorSubject={job.predecessorSubject}
                                        predecessorStatus={job.predecessorStatus}
                                        children={job.children}
                                        isExpanded={expandedRows.has(job.id)}
                                        onToggleExpand={() => toggleRowExpansion(job.id)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!isLoading && filteredJobs.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                        <div className="text-sm text-gray-500">
                            แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredJobs.length)} จาก {filteredJobs.length} รายการ
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="text-sm px-3 py-1"
                            >
                                ก่อนหน้า
                            </Button>
                            <span className="flex items-center px-4 text-sm font-medium text-gray-700">
                                {currentPage} / {totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="text-sm px-3 py-1"
                            >
                                ถัดไป
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* ============================================
          Approve Modal - Popup ยืนยันการ Approve
          ============================================ */}
        {showApproveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                    <div className="p-6 border-b border-gray-400 flex justify-between items-center">
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

                    <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
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
       Reject Modal - หน้าต่างการแจ้งปฏิเสธงาน (Reject/Return)
       ============================================ */}
        {showRejectModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                    <div className="p-6 border-b border-gray-400 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">ปฏิเสธหรือตีกลับงาน (Reject / Return)</h3>
                        <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">อ้างอิง DJ-ID: <span className="font-medium text-gray-900">{selectedJobId}</span></p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการดำเนินการ (Action Type)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="rejectType" value="return" defaultChecked className="text-rose-600 focus:ring-rose-500" />
                                    <span className="text-sm text-gray-700">ตีกลับเพื่อแก้ไข (Return for Revision)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="rejectType" value="reject" className="text-rose-600 focus:ring-rose-500" />
                                    <span className="text-sm text-gray-700">ปฏิเสธงาน (Reject)</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">สาเหตุการปฏิเสธ <span className="text-red-500">*</span></label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">ความคิดเห็นเพิ่มเติม</label>
                            <textarea
                                rows="4"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                placeholder="ระบุรายละเอียดเพื่อให้ผู้เปิดงานแก้ไข..."
                                value={rejectResult}
                                onChange={(e) => setRejectComment(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowRejectModal(false)}>ยกเลิก</Button>
                        <Button variant="primary" onClick={handleConfirmReject}>ยืนยันการดำเนินการ</Button>
                    </div>
                </div>
            </div>
        )}

        </div>
    );
}

/**
 * TabButton Helper Component
 * @param {object} props
 * @param {boolean} props.active - สถานะการเลือกแท็บ
 * @param {Function} props.onClick - ฟังก์ชันจัดการเมื่อคลิก
 * @param {number} props.count - จำนวนรายการในแท็บนั้นๆ
 * @param {string} props.label - ชื่อแท็บ
 * @param {React.ReactNode} props.icon - ไอคอนประจำแท็บ
 */
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

/**
 * StatCard Helper Component
 * @param {object} props
 * @param {string} props.label - หัวข้อสถิติ
 * @param {string|number} props.value - ค่าสถิติ
 * @param {React.ReactNode} props.icon - ไอคอน
 * @param {string} props.color - ธีมสี (rose, red, green, yellow)
 */
function StatCard({ label, value, icon, color }) {
    const colors = {
        rose: "bg-rose-100",
        red: "bg-red-100",
        green: "bg-green-100",
        yellow: "bg-yellow-100"
    };
    return (
        <div className="bg-white rounded-lg border border-gray-400 p-4 flex items-center gap-3 shadow-sm">
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

/**
 * Th Helper Component (ตาราง Header Cell)
 * @param {object} props
 * @param {React.ReactNode} props.children - ข้อมูลใน Cell
 * @param {string} [props.className] - CSS Class เพิ่มเติม
 */
function Th({ children, className = "text-left" }) {
    return <th className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${className}`}>{children}</th>;
}

/**
 * AccordionRow Helper Component (แถวหลักที่สามารถกาง/ยุบได้)
 * @param {object} props
 * @param {string} props.id - เลขที่ DJ
 * @param {string} props.project - ชื่อโครงการ
 * @param {string} props.bud - หน่วยงานที่รับผิดชอบ
 * @param {string} props.type - ประเภทงานออกแบบ
 * @param {string} props.subject - หัวข้องาน
 * @param {string} props.requester - ชื่อผู้เปิดงาน
 * @param {string} props.submitted - วันที่สร้าง
 * @param {string} props.status - สถานะงาน
 * @param {React.ReactNode} props.sla - เลเวลการอนุมัติ
 * @param {boolean} props.urgent - สถานะงานเร่งด่วน
 * @param {object} props.historyData - ข้อมูลประวัติการดำเนินการ (เฉพาะแท็บประวัติ)
 * @param {string} props.activeTab - แท็บที่เลือกอยู่ปัจจุบัน
 * @param {Function} props.onApprove - จัดการการอนุมัติ
 * @param {Function} props.onReject - จัดการการปฏิเสธ
 * @param {boolean} [props.showActions=true] - แสดงปุ่มจัดการงานหรือไม่
 * @param {Array} props.children - งานต่อเนื่องที่จะแสดงเมื่อกาง
 * @param {boolean} props.isExpanded - สถานะการกาง/ยุบ
 * @param {Function} props.onToggleExpand - ฟังก์ชันสลับสถานะ
 */
function AccordionRow({ sequence, pkId, id, project, bud, type, subject, requester, submitted, status, sla, urgent, historyData, activeTab, onApprove, onReject, showActions = true, predecessorDjId, predecessorSubject, predecessorStatus, children = [], isExpanded, onToggleExpand }) {
    const hasChildren = children && children.length > 0;
    
    // Determine row background based on urgent status
    const bgClass = urgent ? 'bg-red-50/80 hover:bg-red-100/80' : 'hover:bg-gray-50';
    const borderClass = predecessorDjId ? 'border-l-4 border-amber-400' : '';

    return (
        <>
            {/* แถวหลัก */}
            <tr className={`${bgClass} ${borderClass}`}>
                <td className="px-4 py-4 text-center text-sm font-medium text-gray-500">
                    {sequence}
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        {hasChildren && (
                            <button
                                onClick={onToggleExpand}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title={isExpanded ? "ยุบ" : "กาง"}
                            >
                                {isExpanded ? (
                                    <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                                ) : (
                                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                )}
                            </button>
                        )}
                        <Link to={`/jobs/${pkId}`} className="text-rose-600 font-medium hover:underline">{id}</Link>
                        {urgent && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">ด่วน</span>}
                        {predecessorDjId && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700" title="มีงานต่อเนื่อง">📎</span>}
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{project}</div>
                    <div className="text-xs text-gray-500">{bud}</div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit mb-1">
                            {type}
                        </span>
                        <div className="text-sm text-gray-900 max-w-[200px] truncate" title={subject}>
                            {subject}
                        </div>
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">
                            {requester?.[0] || 'U'}
                        </div>
                        <span className="text-sm text-gray-900">{requester}</span>
                    </div>
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 items-start">
                        <Badge status={status} />
                        {sla && activeTab === 'waiting' && (
                            <div className="mt-1">
                                {sla}
                            </div>
                        )}
                    </div>
                </td>
                {activeTab === 'history' ? (
                    <>
                        <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                                {historyData?.actionDate ? new Date(historyData.actionDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {historyData?.action === 'approved' ? 'อนุมัติ' : historyData?.action === 'rejected' ? 'ปฏิเสธ' : historyData?.action === 'returned' ? 'ตีกลับ' : '-'}
                            </div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="text-sm text-gray-600 max-w-[150px] truncate" title={historyData?.comment || '-'}>
                                {historyData?.comment || '-'}
                            </div>
                        </td>
                    </>
                ) : (
                    <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{submitted}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <ClockIcon className="w-3 h-3" />
                            {urgent ? 'ด่วน' : 'ปกติ'}
                        </div>
                    </td>
                )}
                <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                        <Link to={`/jobs/${pkId}`} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="ดูรายละเอียด">
                            <EyeIcon className="w-4 h-4" />
                        </Link>
                        {showActions && (
                            <>
                                <button onClick={onApprove} className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg" title="อนุมัติ">
                                    <CheckIcon className="w-4 h-4" />
                                </button>
                                <button onClick={onReject} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="ตีกลับ / ปฏิเสธ">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
            
            {/* งานต่อเนื่องที่กางลงมา */}
            {isExpanded && hasChildren && children.map((childJob, index) => (
                <tr key={childJob.id} className="bg-gray-50/50 hover:bg-gray-100/50">
                    <td colSpan="7" className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-amber-600">↳</span>
                                <Link to={`/jobs/${childJob.id}`} className="font-medium text-amber-700 hover:underline">
                                    {childJob.djId || `DJ-${childJob.id}`}
                                </Link>
                                <span className="text-gray-600">— {childJob.subject}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                    (จะถูกอนุมัติ Level {childJob.status?.startsWith('pending_level_') ? childJob.status.split('_')[2] : '1'} อัตโนมัติตาม {id})
                                </span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <Link to={`/jobs/${childJob.id}`} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded" title="ดูรายละเอียด">
                                    <EyeIcon className="w-4 h-4" />
                                </Link>
                                <Badge status={childJob.status} />
                            </div>
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
}

// Additional helper for Badge since "urgent" "high" might not be in generic Badge map yet, 
// strictly generic Badge handles these? Let's assume generic Badge needs update or we standardise strings.
// For now I passed Badge component in props so it's fine.
