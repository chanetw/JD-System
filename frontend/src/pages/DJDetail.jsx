/**
 * @file DJDetail.jsx
 * @description หน้าจอแสดงรายละเอียดงาน DJ (DJ Job Detail)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายละเอียด Brief ของงาน, ไฟล์แนบ, และความคืบหน้า (Activity Timeline)
 * - คำนวณและแสดงผลสถานะ SLA และวันกำหนดส่งงาน (Deadline)
 * - มีระบบจัดการ Actions ตามบทบาทของผู้ใช้งาน (Role-based Actions) เช่น การอนุมัติ, การขอแก้ไข, หรือการส่งงาน
 * - รองรับระบบแชทและแจ้งเตือนภายในหน้างาน เพื่อการสื่อสารที่สะดวกรวดเร็ว
 * - จัดการเวอร์ชันของงานออกแบบ (Deliverables Versioning)
 */

/**
 * @module React
 * @description นำเข้าไลบรารี React สำหรับสร้างคอมโพเนนต์และจัดการสถานะ
 */
import React, { useState, useEffect } from 'react';
/**
 * @module ReactRouterDom
 * @description นำเข้า Hook จาก react-router-dom สำหรับการนำทางและเข้าถึงพารามิเตอร์ URL
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
/**
 * @module CommonComponents/Card
 * @description นำเข้าคอมโพเนนต์ Card, CardHeader, CardBody สำหรับการจัดโครงสร้าง UI
 */
import { Card, CardHeader, CardBody } from '@/components/common/Card';
/**
 * @module CommonComponents/Badge
 * @description นำเข้าคอมโพเนนต์ Badge สำหรับแสดงสถานะหรือข้อมูลขนาดเล็ก
 */
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getJobById, approveJob, rejectJob, getJobs } from '@/services/mockApi';
import { loadMockData, saveMockData } from '@/services/mockStorage';

// Heroicons
import {
    ArrowLeftIcon,
    ClockIcon,
    CheckIcon,
    XMarkIcon,
    ArrowPathIcon,
    PencilSquareIcon,
    ArrowUpTrayIcon,
    PaperAirplaneIcon,
    PlusIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    UserIcon,
    CheckBadgeIcon,
    DocumentIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';

/**
 * DJDetail Component
 * หน้าจอแสดงรายละเอียดงานและการจัดการสถานะงานแต่ละรายการ
 */
export default function DJDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // === สถานะข้อมูล (States: Data) ===
    /** ข้อมูลงานที่ดึงมาจาก API */
    const [job, setJob] = useState(null);
    /** สถานะกำลังโหลดข้อมูล */
    const [isLoading, setIsLoading] = useState(true);
    /** ข้อความแจ้งข้อผิดพลาด */
    const [error, setError] = useState(null);
    /** ข้อความในกล่องแชท */
    const [chatMessage, setChatMessage] = useState('');
    /** เวอร์ชันของงานที่เลือกแสดงผลพรีวิว */
    const [selectedVersion, setSelectedVersion] = useState(0);

    // === สถานะหน้าต่างแจ้งเตือน (States: Modals) ===
    /** แสดงหน้าต่างยืนยันการอนุมัติ */
    const [showApproveModal, setShowApproveModal] = useState(false);
    /** แสดงหน้าต่างระบุเหตุผลการปฏิเสธหรือตีกลับ */
    const [showRejectModal, setShowRejectModal] = useState(false);
    /** แสดงหน้าต่างระบุรายละเอียดการขอแก้ไขงาน (Revision) */
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    /** ประเภทหรือเหตุผลของการปฏิเสธ */
    const [rejectReason, setRejectReason] = useState('incomplete');
    /** ความคิดเห็นเพิ่มเติมเมื่อมีการปฏิเสธ */
    const [rejectComment, setRejectComment] = useState('');
    /** ความคิดเห็นหรือสิ่งที่ต้องการให้แก้ไข */
    const [revisionComment, setRevisionComment] = useState('');

    // === การโหลดข้อมูลงาน (Data Fetching) ===
    useEffect(() => {
        /** ดึงข้อมูลรายละเอียดงานตาม ID จาก API หรือฐานข้อมูลจำลอง */
        const loadJob = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const jobs = await getJobs();
                // ค้นหางานที่ตรงกับ ID (รองรับทั้งตัวเลขและรหัส DJ-ID)
                const foundJob = jobs.find(j =>
                    j.id === parseInt(id) ||
                    j.id === id ||
                    j.djId === id
                );

                if (foundJob) {
                    setJob(foundJob);
                } else {
                    setError('ไม่พบข้อมูลงานที่ระบุในระบบ');
                }
            } catch (err) {
                console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลงาน:', err);
                setError('เกิดข้อผิดพลาดทางเทคนิคในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
            } finally {
                setIsLoading(false);
            }
        };

        loadJob();
    }, [id]);

    // === ส่วนจัดการเหตุการณ์ (Event Handlers) ===

    /**
     * ดำเนินการอนุมัติงาน (Approve)
     * @async
     */
    const handleApprove = async () => {
        try {
            await approveJob(job.id, user?.displayName || 'User');
            setShowApproveModal(false);
            // โหลดข้อมูลงานใหม่เพื่ออัปเดตสถานะบนหน้าจอ
            const jobs = await getJobs();
            const updatedJob = jobs.find(j => j.id === job.id);
            if (updatedJob) setJob(updatedJob);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + err.message);
        }
    };

    /**
     * ดำเนินการปฏิเสธงานหรือตีกลับ (Reject / Return)
     * นำค่าจากฟอร์มใน Modal มาประมวลผล
     * @async
     */
    const handleReject = async () => {
        try {
            // ตรวจสอบประเภทการจัดการ: Reject (สั่งจบทันที) หรือ Return (ตีกลับไปแก้ไข)
            const type = document.querySelector('input[name="rejectType"]:checked')?.value === 'reject' ? 'reject' : 'return';
            await rejectJob(job.id, rejectReason, type, user?.displayName || 'User');
            setShowRejectModal(false);
            // โหลดข้อมูลใหม่เพื่อแสดงสถานะล่าสุด
            const jobs = await getJobs();
            const updatedJob = jobs.find(j => j.id === job.id);
            if (updatedJob) setJob(updatedJob);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message);
        }
    };

    /**
     * ส่งคำขอแก้ไขงาน (Request Revision) จากฝั่งคนสั่งงาน (Marketing)
     */
    const handleRequestRevision = () => {
        // ในระบบจริงจะมีการเรียก API เพื่อเปลี่ยนสถานะเป็น 'rework'
        setShowRevisionModal(false);
        alert('ส่งคำขอแก้ไขงานเรียบร้อยแล้ว');
    };

    /**
     * จัดการการเพิ่มข้อความแชทและอัปเดต Activity Timeline
     * รวมถึงการส่งการแจ้งเตือน (Notifications) ให้ผู้เกี่ยวข้อง
     * @async
     */
    const handleSendChat = async () => {
        if (!chatMessage.trim()) return;

        const newActivity = {
            type: 'chat',
            user: user?.displayName || 'Unknown',
            message: chatMessage,
            time: new Date().toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
            initial: user?.displayName?.[0] || 'U',
            color: currentRole === 'marketing' ? 'rose' : currentRole === 'assignee' ? 'purple' : 'blue',
            createdAt: new Date().toISOString()
        };

        // บันทึก Activity ใหม่ลงในระบบ Mock Storage
        const allJobs = loadMockData('jobs');
        const jobIndex = allJobs.findIndex(j => j.id === job.id);
        if (jobIndex !== -1) {
            if (!allJobs[jobIndex].activities) {
                allJobs[jobIndex].activities = [];
            }
            allJobs[jobIndex].activities.unshift(newActivity);
            saveMockData('jobs', allJobs);

            // อัปเดตสถานะในหน้าประกอบ
            setJob({ ...job, activities: allJobs[jobIndex].activities });
        }

        // --- ระบบการแจ้งเตือน (Notification Logic) ---
        const { addNotification } = useNotificationStore.getState();

        // แจ้งเตือนไปยังผู้ออกแบบ (Assignee) หากผู้พิมพ์ไม่ใช่ผู้ออกแบบ
        if (currentRole !== 'assignee' && job.assigneeId) {
            addNotification({
                id: Date.now(),
                recipientId: job.assigneeId,
                type: 'comment',
                title: 'มีความคิดเห็นใหม่ในงานของคุณ',
                message: `${user?.displayName}: "${chatMessage.substring(0, 50)}${chatMessage.length > 50 ? '...' : ''}"`,
                link: `/jobs/${job.id}`,
                isRead: false,
                createdAt: new Date().toISOString()
            });
        }

        // แจ้งเตือนไปยังผู้สั่งงาน (Requester) หากผู้พิมพ์ไม่ใช่ผู้สั่งงาน
        if (currentRole !== 'marketing' && job.requesterId) {
            addNotification({
                id: Date.now() + 1,
                recipientId: job.requesterId,
                type: 'comment',
                title: 'มีการตอบกลับในใบงานของคุณ',
                message: `${user?.displayName}: "${chatMessage.substring(0, 50)}${chatMessage.length > 50 ? '...' : ''}"`,
                link: `/jobs/${job.id}`,
                isRead: false,
                createdAt: new Date().toISOString()
            });
        }

        setChatMessage('');
    };

    // Loading State
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    // Error State
    if (error || !job) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <ExclamationTriangleIcon className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500">{error || 'ไม่พบงาน'}</p>
                <Button variant="secondary" onClick={() => navigate('/jobs')}>
                    กลับไปหน้ารายการ
                </Button>
            </div>
        );
    }

    /**
     * คำนวณการแสดงผลของ SLA และ Deadline
     * @returns {object} ข้อมูลสำหรับการแสดงผล Badge (ข้อความ, สี, คลาส CSS)
     */
    const getSlaDisplay = () => {
        // กรณีงานเกินกำหนด (Overdue)
        if (job.isOverdue) {
            return {
                text: `เกินกำหนด +${job.overdueDays || 1} วัน`,
                subText: `Deadline: ${new Date(job.deadline).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`,
                color: 'red',
                bgColor: 'bg-red-50 border-red-200',
                textColor: 'text-red-600'
            };
        }

        // กรณีมีวันกำหนดส่ง (Deadline) และยังไม่เกินกำหนด
        if (job.deadline) {
            const deadline = new Date(job.deadline);
            const today = new Date();
            // คำนวณจำนวนวันคงเหลือ
            const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                return {
                    text: 'ครบกำหนดวันนี้',
                    subText: `Deadline: ${deadline.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`,
                    color: 'amber',
                    bgColor: 'bg-amber-50 border-amber-200',
                    textColor: 'text-amber-600'
                };
            } else if (diffDays <= 2) {
                return {
                    text: `เหลือน้อยกว่า ${diffDays} วัน`,
                    subText: `Deadline: ${deadline.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`,
                    color: 'amber',
                    bgColor: 'bg-amber-50 border-amber-200',
                    textColor: 'text-amber-600'
                };
            } else {
                return {
                    text: `เหลืออีก ${diffDays} วัน`,
                    subText: `Deadline: ${deadline.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`,
                    color: 'green',
                    bgColor: 'bg-green-50 border-green-200',
                    textColor: 'text-green-600'
                };
            }
        }

        // กรณีพื้นฐาน (Default) แสดงจำนวนวัน SLA ของประเภทงาน
        return {
            text: `SLA: ${job.slaWorkingDays || 7} วันทำการ`,
            subText: '',
            color: 'gray',
            bgColor: 'bg-gray-50 border-gray-200',
            textColor: 'text-gray-600'
        };
    };

    const slaDisplay = getSlaDisplay();

    // Load activities from job data (or use defaults)
    const activities = job.activities || [
        { type: 'assign', user: job.assigneeName || 'Unassigned', action: 'ถูกมอบหมายงาน', time: new Date(job.createdAt).toLocaleDateString('th-TH'), color: 'cyan' },
        { type: 'create', user: job.requesterName || 'Unknown', action: 'สร้างงาน', time: new Date(job.createdAt).toLocaleDateString('th-TH'), color: 'gray' },
    ];

    // Mock Deliverables / Versions
    const versions = [
        { version: 2, name: 'FB_Banner_Q1_v2.png', size: '245 KB', dimensions: '1200 x 628 px', active: true },
        { version: 1, name: 'FB_Banner_Q1_v1.png', size: '230 KB', dimensions: '1200 x 628 px', active: false },
    ];

    return (
        <div className="space-y-6">
            {/* ============================================
          Page Header
          ============================================ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900">{job.djId || `DJ-${job.id}`}</h1>
                            <Badge status={job.status} />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {job.subject} • {job.project}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* SLA Badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 ${slaDisplay.bgColor} border rounded-xl`}>
                        <ClockIcon className={`w-5 h-5 ${slaDisplay.textColor}`} />
                        <div>
                            <p className={`text-sm font-bold ${slaDisplay.textColor}`}>{slaDisplay.text}</p>
                            {slaDisplay.subText && (
                                <p className={`text-xs ${slaDisplay.textColor} opacity-80`}>{slaDisplay.subText}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================
          Revision Alert (แสดงเมื่อมี revision request)
          ============================================ */}
            {job.status === 'rework' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-800">Revision Request จาก Requester</h3>
                        <p className="text-sm text-amber-700 mt-1">"ขอให้ปรับสีโทนให้สว่างขึ้น และเพิ่ม CTA button ด้วยครับ"</p>
                        <p className="text-xs text-amber-600 mt-2">5 ม.ค. 68 09:30 by สมหญิง</p>
                    </div>
                    <button className="text-amber-600 hover:text-amber-800 text-sm font-medium">ดู</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ============================================
            Left Column: Preview + Actions + Activity
            ============================================ */}
                <div className="lg:col-span-2 space-y-6">

                    {/* การแสดงตัวอย่างงาน (Deliverables) */}
                    <Card>
                        <CardHeader title="ตัวอย่างงาน / ไฟล์ที่ส่งมอบ (Deliverables)">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    เวอร์ชัน {versions[selectedVersion]?.version || 1}
                                </span>
                                <Button variant="link">ดาวน์โหลดทั้งหมด</Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {/* ส่วนแสดงตัวอย่างหลัก (Main Preview) */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl aspect-video flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                                <div className="text-center">
                                    <DocumentIcon className="w-20 h-20 text-gray-400 mx-auto mb-3" />
                                    <p className="font-medium text-gray-600">{versions[selectedVersion]?.name || 'ไม่พบไฟล์'}</p>
                                    <p className="text-sm text-gray-400">
                                        {versions[selectedVersion]?.dimensions} • {versions[selectedVersion]?.size}
                                    </p>
                                </div>
                            </div>

                            {/* Version Thumbnails */}
                            <div className="flex gap-3">
                                {versions.map((v, idx) => (
                                    <div
                                        key={v.version}
                                        onClick={() => setSelectedVersion(idx)}
                                        className={`w-24 aspect-video bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer relative transition-opacity
                                            ${selectedVersion === idx ? 'border-2 border-rose-500' : 'opacity-60 hover:opacity-100'}`}
                                    >
                                        <span className="text-xs text-gray-500">v{v.version}</span>
                                        {selectedVersion === idx && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full"></span>
                                        )}
                                    </div>
                                ))}

                                {/* Upload New (Assignee Only) */}
                                {currentRole === 'assignee' && (
                                    <div className="w-24 aspect-video bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-rose-400 transition-colors">
                                        <PlusIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ปุ่มดำเนินการ (Action Buttons) - คัดกรองตาม Role */}
                    <Card>
                        <CardBody>
                            <h2 className="font-semibold text-gray-900 mb-4">การดำเนินการ (Actions)</h2>
                            <div className="flex flex-wrap gap-3">

                                {/* สำหรับผู้สั่งงาน (Marketing) */}
                                {currentRole === 'marketing' && (
                                    <>
                                        <Button
                                            onClick={() => setShowApproveModal(true)}
                                            className="flex-1 bg-rose-500 hover:bg-rose-600 flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <CheckIcon className="w-5 h-5 mr-2" />
                                                Approve & Close Job
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">รับมอบงานและปิดงาน</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowRevisionModal(true)}
                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-none flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <ArrowPathIcon className="w-5 h-5 mr-2" />
                                                Request Revision
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">ขอให้แก้ไขงาน</span>
                                        </Button>
                                        <Button variant="secondary" className="flex-col py-3">
                                            <div className="flex items-center">
                                                <PencilSquareIcon className="w-5 h-5 mr-2" />
                                                Edit Brief
                                            </div>
                                            <span className="text-xs opacity-60 mt-1">แก้ไขรายละเอียดงาน</span>
                                        </Button>
                                    </>
                                )}

                                {/* สำหรับผู้อนุมัติ (Approver) */}
                                {currentRole === 'approver' && (
                                    <>
                                        <Button
                                            onClick={() => setShowApproveModal(true)}
                                            className="flex-1 bg-green-500 hover:bg-green-600 flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <CheckIcon className="w-5 h-5 mr-2" />
                                                Approve
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">อนุมัติคำขอสร้างงาน</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowRejectModal(true)}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <XMarkIcon className="w-5 h-5 mr-2" />
                                                Reject / Return
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">ปฏิเสธ / ตีกลับแก้ไข</span>
                                        </Button>
                                    </>
                                )}

                                {/* สำหรับผู้ออกแบบ (Assignee) */}
                                {currentRole === 'assignee' && (
                                    <>
                                        <Button className="flex-1 bg-blue-500 hover:bg-blue-600 flex-col py-3">
                                            <div className="flex items-center">
                                                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                                                Upload Draft
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">อัปโหลดตัวอย่างงาน</span>
                                        </Button>
                                        <Button className="flex-1 bg-green-500 hover:bg-green-600 flex-col py-3">
                                            <div className="flex items-center">
                                                <CheckBadgeIcon className="w-5 h-5 mr-2" />
                                                Submit for Review
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">ส่งงานให้ตรวจสอบ</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowRejectModal(true)}
                                            variant="secondary"
                                            className="flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <XMarkIcon className="w-5 h-5 mr-2" />
                                                Reject Job
                                            </div>
                                            <span className="text-xs opacity-60 mt-1">ปฏิเสธรับงาน</span>
                                        </Button>
                                    </>
                                )}

                                {/* Admin Actions */}
                                {currentRole === 'admin' && (
                                    <>
                                        <Button className="flex-1 bg-purple-500 hover:bg-purple-600 flex-col py-3">
                                            <div className="flex items-center">
                                                <UserIcon className="w-5 h-5 mr-2" />
                                                Assign / Reassign
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">มอบหมาย/เปลี่ยนผู้รับงาน</span>
                                        </Button>
                                        <Button variant="secondary" className="flex-col py-3">
                                            <div className="flex items-center">
                                                <PencilSquareIcon className="w-5 h-5 mr-2" />
                                                Edit SLA
                                            </div>
                                            <span className="text-xs opacity-60 mt-1">แก้ไข SLA</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowApproveModal(true)}
                                            className="bg-green-500 hover:bg-green-600 flex-col py-3"
                                        >
                                            <div className="flex items-center">
                                                <CheckIcon className="w-5 h-5 mr-2" />
                                                Approve
                                            </div>
                                            <span className="text-xs opacity-80 mt-1">อนุมัติงาน</span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ส่วนกิจกรรมและการสนทนา */}
                    <Card>
                        <CardHeader title="กิจกรรมย้อนหลังและแชท (Activity & Chat)">
                            <span className="text-xs text-gray-500">{activities.length} รายการ</span>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {activities.map((item, idx) => (
                                    item.type === 'chat' ? (
                                        <ChatMessage
                                            key={idx}
                                            user={item.user}
                                            message={item.message}
                                            time={item.time}
                                            initial={item.initial}
                                            color={item.color}
                                        />
                                    ) : (
                                        <TimelineItem
                                            key={idx}
                                            user={item.user}
                                            action={item.action}
                                            time={item.time}
                                            type={item.type}
                                            color={item.color}
                                        />
                                    )
                                ))}
                            </div>

                            {/* Chat Input */}
                            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                                <input
                                    type="text"
                                    placeholder="พิมพ์ข้อความ... (@mention)"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                />
                                <Button onClick={handleSendChat} className="rounded-xl px-3">
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* ============================================
               คอลัมน์ขวา: รายละเอียดข้อมูลงาน (Job Info)
               ============================================ */}
                <div className="space-y-6">
                    {/* ข้อมูลพื้นฐาน */}
                    <Card>
                        <CardHeader title="ข้อมูลงาน (Job Details)" />
                        <CardBody className="space-y-4">
                            <InfoRow label="โครงการ (Project)" value={job.project || '-'} />
                            <InfoRow label="หน่วยงาน (BUD)" value={job.bud || '-'} />
                            <InfoRow label="ประเภทงาน (Job Type)" value={job.jobType || '-'} sub={`SLA: ${job.slaWorkingDays || 7} วันทำการ`} />
                            <div>
                                <p className="text-xs text-gray-500 mb-1">ความสำคัญ (Priority)</p>
                                <Badge status={job.priority?.toLowerCase() || 'normal'} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">ผู้สั่งงาน (Requester)</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm">
                                        {job.requesterName?.[0] || 'U'}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{job.requesterName || '-'}</span>
                                </div>
                            </div>
                            {job.assigneeName && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">ผู้ออกแบบ (Assignee)</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                                            {job.assigneeName?.[0] || 'A'}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{job.assigneeName}</span>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* รายละเอียดเนื้อหางาน (Brief) */}
                    <Card>
                        <CardHeader title="รายละเอียดงาน (Brief)" />
                        <CardBody className="space-y-4">
                            <InfoRow label="วัตถุประสงค์ (Objective)" value={job.brief?.objective || 'ไม่ระบุ'} />
                            <InfoRow label="พาดหัวหลัก (Headline)" value={job.brief?.headline || '-'} />
                            <InfoRow label="พาดหัวรอง (Sub-headline)" value={job.brief?.subHeadline || '-'} />
                            {job.brief?.sellingPoints?.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">จุดเด่น/ข้อมูลประกอบ (Selling Points)</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {job.brief.sellingPoints.map((point, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                                                {point}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <InfoRow label="ราคา/โปรโมชั่น (Price)" value={job.brief?.price || '-'} />
                        </CardBody>
                    </Card>

                    {/* ไฟล์แนบอ้างอิง */}
                    <Card>
                        <CardHeader title="ไฟล์แนบ (Attachments)" />
                        <CardBody className="space-y-3">
                            <FileItem name="CI-guideline.pdf" size="2.1 MB" color="red" />
                            <FileItem name="logo-pack.zip" size="5.4 MB" color="yellow" />
                            <p className="text-xs text-gray-400 mt-2">
                                อัปเดตล่าสุดเมื่อ: {new Date(job.updatedAt || job.createdAt).toLocaleDateString('th-TH')}
                            </p>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* ============================================
          Approve Modal
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
                                    <p className="text-lg font-semibold text-gray-900">{job.djId || `Job #${job.id}`}</p>
                                </div>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-700">
                                    <strong>หมายเหตุ:</strong> เมื่ออนุมัติแล้ว งานจะถูกส่งไปยังขั้นตอนถัดไป
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>ยกเลิก</Button>
                            <Button onClick={handleApprove} className="bg-green-500 hover:bg-green-600">
                                <CheckIcon className="w-4 h-4 mr-2" />
                                อนุมัติ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
           Reject Modal - หน้าต่างระบุเหตุผลการปฏิเสธ
           ============================================ */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">ปฏิเสธหรือส่งคืนแก้ไข (Reject / Return)</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">อ้างอิง DJ-ID: <span className="font-medium text-gray-900">{job.djId}</span></p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทการดำเนินการ</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="rejectType" value="return" defaultChecked className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm text-gray-700">ส่งคืนให้แก้ไข (Return for Revision)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="rejectType" value="reject" className="text-rose-600 focus:ring-rose-500" />
                                        <span className="text-sm text-gray-700">ปฏิเสธงาน (Reject)</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">สาเหตุประกอบ <span className="text-red-500">*</span></label>
                                <select
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                >
                                    <option value="incomplete">Brief ไม่ครบถ้วน</option>
                                    <option value="unclear">ข้อมูลไม่ชัดเจน</option>
                                    <option value="quality">คุณภาพงานไม่ผ่าน</option>
                                    <option value="other">อื่นๆ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ความคิดเห็นเพิ่มเติม</label>
                                <textarea
                                    rows="3"
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>ยกเลิก</Button>
                            <Button onClick={handleReject} className="bg-red-500 hover:bg-red-600">ยืนยัน</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
           Revision Modal - หน้าต่างการขอแก้ไขงาน
           ============================================ */}
            {showRevisionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">ขอให้แก้ไขงาน (Request Revision)</h3>
                            <button onClick={() => setShowRevisionModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                    <ArrowPathIcon className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">ขอแก้ไขงาน</p>
                                    <p className="text-lg font-semibold text-gray-900">{job.djId}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียดที่ต้องการแก้ไข <span className="text-red-500">*</span></label>
                                <textarea
                                    rows="4"
                                    value={revisionComment}
                                    onChange={(e) => setRevisionComment(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                    placeholder="ระบุสิ่งที่ต้องการให้แก้ไข..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>ยกเลิก</Button>
                            <Button onClick={handleRequestRevision} className="bg-amber-500 hover:bg-amber-600">
                                <ArrowPathIcon className="w-4 h-4 mr-2" />
                                ส่งคำขอแก้ไข
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// คอมโพเนนต์ย่อย (Sub-components)
// ============================================

/**
 * InfoRow Component
 * แสดงข้อมูลแบบแถว มีหัวข้อและรายละเอียด
 * @param {object} props
 * @param {string} props.label - ชื่อหัวข้อ
 * @param {string} props.value - ค่าของข้อมูล
 * @param {string} [props.sub] - ข้อมูลเสริมขนาดเล็ก
 */
function InfoRow({ label, value, sub }) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

/**
 * FileItem Component
 * แสดงรายการไฟล์แนบพร้อมไอคอนตามประเภทและปุ่มดาวน์โหลด
 * @param {object} props
 * @param {string} props.name - ชื่อไฟล์
 * @param {string} props.size - ขนาดไฟล์
 * @param {string} props.color - ธีมสีของไอคอน (red, yellow, blue)
 */
function FileItem({ name, size, color }) {
    const colors = {
        red: "bg-red-100 text-red-500",
        yellow: "bg-yellow-100 text-yellow-600",
        blue: "bg-blue-100 text-blue-500"
    };
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${colors[color] || colors.blue} rounded-lg flex items-center justify-center`}>
                    <span className="text-xs font-bold uppercase">{name.split('.').pop()}</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700">{name}</p>
                    <p className="text-xs text-gray-400">{size}</p>
                </div>
            </div>
            <button title="ดาวน์โหลด" className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-white">
                <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

/**
 * TimelineItem Component
 * แสดงรายการความคืบหน้าใน Activity Timeline พร้อมไอคอน
 * @param {object} props
 * @param {string} props.user - ชื่อผู้ดำเนินการ
 * @param {string} props.action - การกระทำที่เกิดขึ้น
 * @param {string} props.time - เวลาที่เกิดรายการ
 * @param {string} props.type - ประเภทรายการเพื่อเลือกไอคอน (upload, revision, approve, assign, create)
 * @param {string} props.color - สีพื้นหลังไอคอน
 */
function TimelineItem({ user, action, time, type, color }) {
    const colorClasses = {
        blue: "bg-blue-100 text-blue-600",
        amber: "bg-amber-100 text-amber-600",
        green: "bg-green-100 text-green-600",
        cyan: "bg-cyan-100 text-cyan-600",
        gray: "bg-gray-100 text-gray-600",
    };

    const icons = {
        upload: <ArrowUpTrayIcon className="w-5 h-5" />,
        revision: <ArrowPathIcon className="w-5 h-5" />,
        approve: <CheckIcon className="w-5 h-5" />,
        assign: <UserIcon className="w-5 h-5" />,
        create: <PlusIcon className="w-5 h-5" />,
    };

    return (
        <div className="flex gap-3">
            <div className={`w-10 h-10 ${colorClasses[color] || colorClasses.gray} rounded-full flex items-center justify-center flex-shrink-0`}>
                {icons[type] || <DocumentIcon className="w-5 h-5" />}
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-700"><strong>{user}</strong> {action}</p>
                <p className="text-xs text-gray-400">{time}</p>
            </div>
        </div>
    );
}

/**
 * ChatMessage Component
 * แสดงกล่องข้อความแชทของผู้ใช้งาน
 * @param {object} props
 * @param {string} props.user - ชื่อผู้ส่ง
 * @param {string} props.message - ข้อความ
 * @param {string} props.time - เวลาที่ส่ง
 * @param {string} props.initial - ตัวอักษรย่อสำหรับ Avatar
 * @param {string} props.color - ธีมสีของกล่องข้อความ
 */
function ChatMessage({ user, message, time, initial, color }) {
    const bgColors = {
        purple: 'bg-purple-50',
        rose: 'bg-rose-50',
        blue: 'bg-blue-50',
    };
    const avatarColors = {
        purple: 'bg-purple-500',
        rose: 'bg-rose-500',
        blue: 'bg-blue-500',
    };

    return (
        <div className="flex gap-3">
            <div className={`w-10 h-10 ${avatarColors[color] || 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-sm flex-shrink-0`}>
                {initial}
            </div>
            <div className={`flex-1 ${bgColors[color] || 'bg-gray-50'} rounded-xl p-4`}>
                <p className="text-sm text-gray-700">{message}</p>
                <p className="text-xs text-gray-400 mt-2">{user} • {time}</p>
            </div>
        </div>
    );
}
