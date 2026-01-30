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
import { useAuthStore } from '@core/stores/authStore';
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
    ArrowPathIcon
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

    /** ข้อมูลผู้ใช้งานปัจจุบันจาก Central Store */
    const { user } = useAuthStore();

    // === สถานะข้อมูล (Data States) ===
    const [jobs, setJobs] = useState([]);      // รายการงานทั้งหมดที่โหลดมา
    const [isLoading, setIsLoading] = useState(false); // สถานะการโหลดข้อมูล

    // === การโหลดข้อมูล (Initial Load) ===
    useEffect(() => {
        loadData();
    }, [user]);

    /** ดึงข้อมูลงานจาก API และคัดกรองตามสิทธิ์ของผู้ใช้งาน (Authorization Filtering) */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await api.getJobs();
            // เรียงลำดับตามวันที่สร้างล่าสุดขึ้นก่อน (Newest first)
            let sorted = (Array.isArray(data) ? data : []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // === Scope-based Filtering (ใหม่) ===
            // ดึง scopes ของ user จาก database
            if (user?.id) {
                const scopes = await getUserScopes(user.id);
                const hasTenantScope = scopes.some(s => s.scope_level === 'Tenant');

                if (!hasTenantScope && scopes.length > 0) {
                    // ถ้ามี scope แต่ไม่ใช่ Tenant level ให้ filter ตาม project
                    const allowedProjectIds = await getAllowedProjectIds(user.id, user.tenant_id);
                    sorted = sorted.filter(job => allowedProjectIds.has(job.projectId || job.project_id));
                    console.log('📋 Filtered by scope:', sorted.length, 'jobs');
                }
            }

            // กฎการคัดกรองตามบทบาท (Filter Logic by Role) - เก็บไว้เป็น fallback
            const userRole = user?.roles?.[0];
            if (userRole === 'approver' || userRole === 'admin') {
                // ผู้อนุมัติและ Admin สามารถเห็นและจัดการงานทั้งหมดใน scope
                setJobs(sorted);
            } else if (userRole === 'requester') {
                // ผู้ขอใช้บริการ (Requester) เห็นเฉพาะงานที่ตนเองเป็นคนสร้างเท่านั้น
                const myJobs = sorted.filter(job => job.requesterId === user?.id);
                setJobs(myJobs);
            } else {
                // ผู้ปฏิบัติงาน (Assignee) เห็นงานที่ได้รับมอบหมายมาเท่านั้น
                const assignedJobs = sorted.filter(job => job.assigneeId === user?.id);
                setJobs(assignedJobs);
            }
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการโหลดรายการงาน:", error);
        } finally {
            setIsLoading(false);
        }
    };

    /** การคัดกรองข้อมูลตามแท็บสถานะ (Tab Filtering) */
    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'waiting') return job.status === 'pending_approval';
        if (activeTab === 'returned') return job.status === 'returned' || job.status === 'rejected';
        if (activeTab === 'history') return job.status === 'approved';
        return false;
    });

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
            const type = document.querySelector('input[name="rejectType"]:checked')?.value === 'reject' ? 'reject' : 'return';
            await api.rejectJob(selectedJobId, rejectReason, type, user?.id || 1);
            setShowRejectModal(false);
            loadData();
        } catch (error) {
            alert('ไม่สามารถปฏิเสธงานได้: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* ============================================
          ส่วนหัวของหน้าจอ (Page Header)
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">คิวรออนุมัติ (Approvals Queue)</h1>
                    <p className="text-gray-500">รายการงาน DJ (Design Job) ที่รอให้คุณดำเนินการตรวจสอบ</p>
                </div>
                {/* ข้อมูลโปรไฟล์ผู้อนุมัติ (Mockup Profile) */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                        <span className="text-rose-600 font-semibold">{user?.displayName?.[0] || 'A'}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">{user?.displayName || 'Approver Name'}</p>
                        <p className="text-xs text-gray-500">{user?.bud || 'สายงานการตลาด'}</p>
                    </div>
                </div>
            </div>

            {/* ============================================
          แถบเลือกสถานะงาน (Status Tabs)
          ============================================ */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    <TabButton
                        active={activeTab === 'waiting'}
                        onClick={() => setActiveTab('waiting')}
                        count={jobs.filter(j => j.status === 'pending_approval').length}
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
          สรุปสถิติเบื้องต้น (Summary Stats)
          ============================================ */}
            {activeTab === 'waiting' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="งานรออนุมัติ" value={filteredJobs.length} icon={<ClockIcon className="w-5 h-5 text-rose-600" />} color="rose" />
                    <StatCard label="งานเร่งด่วน (Urgent)" value={filteredJobs.filter(j => j.priority === 'Urgent').length} icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-600" />} color="red" />
                    <StatCard label="งานทั้งหมดในระบบ" value={jobs.length} icon={<CheckBadgeIcon className="w-5 h-5 text-green-600" />} color="green" />
                    <StatCard label="อัตราการทำงาน" value="98%" icon={<ArrowPathIcon className="w-5 h-5 text-yellow-600" />} color="yellow" />
                </div>
            )}

            {/* ============================================
          ตารางรายการงาน (Queue Table)
          ============================================ */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                                </th>
                                <Th>เลขที่ DJ</Th>
                                <Th>โครงการ / BUD</Th>
                                <Th>ประเภทงาน</Th>
                                <Th>หัวข้อ</Th>
                                <Th>ผู้เปิดงาน</Th>
                                <Th>วันที่ส่งมา</Th>
                                <Th>สถานะ SLA</Th>
                                <Th>ความสำคัญ</Th>
                                <Th className="text-center">การจัดการ</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-8 text-gray-500">กำลังโหลดรายการงาน...</td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-8 text-gray-500">
                                        ไม่พบรายการงานในหัวข้อนี้
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(job => (
                                    <QueueRow
                                        key={job.id}
                                        pkId={job.id}
                                        id={job.djId || `DJ-${job.id}`}
                                        project={job.project}
                                        bud={job.bud}
                                        type={job.jobType}
                                        subject={job.subject}
                                        requester={job.requesterName}
                                        submitted={new Date(job.createdAt).toLocaleDateString('th-TH')}
                                        sla={job.currentLevel ? `Level ${job.currentLevel}` : '-'}
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
           Reject Modal - หน้าต่างการแจ้งปฏิเสธงาน (Reject/Return)
           ============================================ */}
            {showRejectModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
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

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
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
 * QueueRow Helper Component (ตารางแถวข้อมูลงาน)
 * @param {object} props
 * @param {string} props.id - เลขที่ DJ
 * @param {string} props.project - ชื่อโครงการ
 * @param {string} props.bud - หน่วยงานที่รับผิดชอบ
 * @param {string} props.type - ประเภทงานออกแบบ
 * @param {string} props.subject - หัวข้องาน
 * @param {string} props.requester - ชื่อผู้เปิดงาน
 * @param {string} props.submitted - วันที่ส่งงาน
 * @param {string} props.sla - สถานะระดับการอนุมัติหรือ SLA
 * @param {React.ReactNode} props.priority - Badge แสดงความสำคัญ
 * @param {boolean} props.urgent - สถานะงานเร่งด่วนเพื่อไฮไลต์แถว
 * @param {Function} props.onApprove - จัดการการอนุมัติ
 * @param {Function} props.onReject - จัดการการปฏิเสธ
 * @param {boolean} [props.showActions=true] - แสดงปุ่มจัดการงานหรือไม่
 */
function QueueRow({ pkId, id, project, bud, type, subject, requester, submitted, sla, priority, urgent, onApprove, onReject, showActions = true }) {
    return (
        <tr className={`hover:bg-gray-50 ${urgent ? 'bg-red-50' : ''}`}>
            <td className="px-4 py-4">
                <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
            </td>
            <td className="px-4 py-4">
                <Link to={`/jobs/${pkId}`} className="text-rose-600 font-medium hover:underline">{id}</Link>
            </td>
            <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900">{project}</div>
                <div className="text-xs text-gray-500">{bud}</div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900">{type}</td>
            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={subject}>{subject}</td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">
                        {requester?.[0] || 'U'}
                    </div>
                    <span className="text-sm text-gray-900">{requester}</span>
                </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-500">{submitted}</td>
            <td className="px-4 py-4 text-sm font-medium text-gray-700">{sla}</td>
            <td className="px-4 py-4">{priority}</td>
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
    );
}

// Additional helper for Badge since "urgent" "high" might not be in generic Badge map yet, 
// strictly generic Badge handles these? Let's assume generic Badge needs update or we standardise strings.
// For now I passed Badge component in props so it's fine.
