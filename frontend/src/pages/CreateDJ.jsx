/**
 * @file CreateDJ.jsx
 * @description หน้าจอสำหรับสร้างงานออกแบบใหม่ (Create Design Job)
 * 
 * วัตถุประสงค์หลัก:
 * - ให้ผู้ขอเพลง (Requester) หรือฝ่ายการตลาด ระบุรายละเอียดงานที่ต้องการ (Brief)
 * - ตรวจสอบกฎธุรกิจ (Business Rules) เช่น เวลาการส่งงาน, วันหยุด, และโควต้าต่อโครงการ
 * - คำนวณวันกำหนดส่งงาน (Due Date) ตาม SLA ของประเภทงานและข้ามวันหยุดราชการ
 * - บันทึกข้อมูลงานพร้อมรูปภาพ/ไฟล์แนบ และดึงลำดับการอนุมัติ (Approval Flow) ตามโครงการที่เลือก
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { createJob, getMasterData, getHolidays, getApprovalFlowByProject, getJobs, getJobTypeItems } from '@/services/mockApi';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import { FormInput, FormSelect, FormTextarea } from '@/components/common/FormInput';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { calculateDueDate, formatDateToThai } from '@/utils/slaCalculator';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

/**
 * CreateDJ Component
 * หน้าจอสร้างรายการงาน DJ พร้อมตรรกะการตรวจสอบเงื่อนไขทางธุรกิจ
 */
export default function CreateDJ() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // === สถานะการทำงาน (States: Status) ===
    /** สถานะกำลังโหลดข้อมูลตั้งต้น */
    const [isLoading, setIsLoading] = useState(false);
    /** สถานะกำลังส่งข้อมูลงาน */
    const [isSubmitting, setIsSubmitting] = useState(false);

    // === สถานะข้อมูลอ้างอิง (States: Master Data) ===
    /** ข้อมูลพื้นฐานจากระบบประกอบด้วย Projects, Job Types, และ BUDs */
    const [masterData, setMasterData] = useState({
        projects: [],
        jobTypes: [],
        buds: []
    });

    // === สถานะวันหยุดและ SLA (States: SLA) ===
    /** รายการวันหยุดสำหรับคำนวณวันส่งงาน */
    const [holidays, setHolidays] = useState([]);
    /** วันที่กำหนดส่งงานจริง (คำนวณจาก SLA) */
    const [dueDate, setDueDate] = useState(null);
    /** ข้อมูลลำดับการอนุมัติที่ผูกกับโครงการที่เลือก */
    const [approvalFlow, setApprovalFlow] = useState(null);

    // === สถานะชิ้นงานย่อย (States: Sub-items) ===
    /** รายการชิ้นงานย่อยของประเภทงานที่เลือก */
    const [jobTypeItems, setJobTypeItems] = useState([]);
    /** ชิ้นงานย่อยที่เลือก (IDs) */
    const [selectedSubItems, setSelectedSubItems] = useState([]);

    // === สถานะข้อมูลฟอร์ม (States: Form) ===
    /** ข้อมูลงานที่ผู้ใช้ระบุ */
    const [formData, setFormData] = useState({
        project: '',         // โครงการที่เลือก
        bud: '',             // หน่วยงาน (Auto-fill จาก Project)
        jobType: 'Online Artwork', // ประเภทงาน
        jobTypeId: '',       // ID ของประเภทงาน (สำหรับดึง sub-items)
        subject: '',         // หัวข้องาน
        priority: 'Normal',  // ความสำคัญ (Low, Normal, Urgent)
        objective: '',       // วัตถุประสงค์และรายละเอียด (Brief)
        headline: '',        // พาดหัวหลัก
        subHeadline: '',     // พาดหัวรอง
        sellingPoints: [],   // จุดเด่นที่ต้องการเน้น (Tags)
        price: '',           // ราคา/โปรโมชั่น
        attachments: [],     // รายการไฟล์แนบ
        subItems: []         // ชิ้นงานย่อยที่เลือก (เช่น FB, IG)
    });

    /** ข้อความสำหรับเพิ่ม Selling Point ใหม่ลงใน Tags */
    const [newTag, setNewTag] = useState('');

    // === สถานะการตรวจสอบและแจ้งเตือน (States: Validation & Feedback) ===
    /** รายการข้อผิดพลาดที่พบจากฟอร์ม */
    const [errors, setErrors] = useState([]);

    /** ควบคุมการเปิด Modal แจ้งการถูกระงับการส่งงานตามกฎธุรกิจ */
    const [showBlockModal, setShowBlockModal] = useState(false);
    /** เหตุผลที่ถูกระงับ */
    const [blockReason, setBlockReason] = useState('');
    /** ตรวจสอบว่าสามารถตั้งเวลาส่งงานภายหลัง (Schedule) ได้หรือไม่ */
    const [canSchedule, setCanSchedule] = useState(false);

    /** ควบคุมการเปิด Modal แจ้งผลลัพธ์ (Success/Error) */
    const [showResultModal, setShowResultModal] = useState(false);
    /** การตั้งค่าข้อความและรูปแบบใน Result Modal */
    const [resultModalConfig, setResultModalConfig] = useState({
        type: 'success',
        title: '',
        message: ''
    });

    // === การโหลดข้อมูลตั้งต้น (Loading Master Data) ===
    useEffect(() => {
        /** ดึงข้อมูลโครงการ, ประเภทงาน และวันหยุดจาก API */
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await getMasterData();

                // Business Rule: User ทั่วไปควรเห็นเฉพาะข้อมูลที่ Active เท่านั้น (กรอง Inactive ออก)
                data.projects = data.projects?.filter(p => p.isActive) || [];
                data.jobTypes = data.jobTypes?.filter(jt => jt.isActive) || [];
                data.buds = data.buds?.filter(b => b.isActive) || [];

                // Logic: ถ้าเป็นผู้อนุมัติระดับสายงาน (BUD) ให้คัดกรองเฉพาะโครงการภายใต้ BUD ตนเองเท่านั้น
                if (user?.roles?.includes('approver') && user?.level === 'BUD' && user?.budId) {
                    data.projects = data.projects.filter(p => p.budId === user.budId);
                }

                setMasterData(data);
                // ข้อมูลวันหยุดเพื่อใช้คำนวณเป้าหมายเวลาทำงาน (SLA Calculation)
                const holidaysData = await getHolidays();
                setHolidays(holidaysData);
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งต้น:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // === ส่วนจัดการเหตุการณ์ (Event Handlers) ===

    /**
     * จัดการการเปลี่ยนแปลงค่าในฟอร์ม
     * @param {React.ChangeEvent} e - เหตุการณ์การเปลี่ยนแปลงช่องกรอกข้อมูล
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // เติมข้อมูล BUD อัตโนมัติเมื่อมีการเปลี่ยนโครงการ
        if (name === 'project') {
            const selectedProject = masterData.projects.find(p => p.name === value);
            if (selectedProject) {
                const budValue = selectedProject.bud;
                const budName = typeof budValue === 'object' ? budValue.name : budValue;
                setFormData(prev => ({ ...prev, bud: budName || 'BUD 1' }));

                // ดึงข้อมูลลำดับการอนุมัติ (Approval Flow) ประจำโครงการ
                getApprovalFlowByProject(value).then(flow => {
                    setApprovalFlow(flow);
                });
            } else {
                setApprovalFlow(null);
            }
        }

        // คำนวณวันส่งงาน (Due Date) อัตโนมัติเมื่อประเภทงานเปลี่ยนไป
        if (name === 'jobType') {
            const selectedJobType = masterData.jobTypes.find(t => t.name === value);
            if (selectedJobType && selectedJobType.sla) {
                const slaDays = parseInt(selectedJobType.sla) || 7;
                const calculatedDate = calculateDueDate(new Date(), slaDays, holidays);
                setDueDate(calculatedDate);

                // โหลดรายการชิ้นงานย่อยของประเภทงานที่เลือก
                setFormData(prev => ({ ...prev, jobTypeId: selectedJobType.id, subItems: [] }));
                setSelectedSubItems([]);
                getJobTypeItems(selectedJobType.id).then(items => {
                    setJobTypeItems(items || []);
                }).catch(() => setJobTypeItems([]));
            }
        }
    };

    /**
     * เลือก/ยกเลิกเลือกชิ้นงานย่อย
     * @param {number} itemId - รหัสชิ้นงานย่อย
     */
    const toggleSubItem = (itemId) => {
        setSelectedSubItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
        // อัปเดต formData.subItems ด้วย
        setFormData(prev => {
            const newSubItems = prev.subItems?.includes(itemId)
                ? prev.subItems.filter(id => id !== itemId)
                : [...(prev.subItems || []), itemId];
            return { ...prev, subItems: newSubItems };
        });
    };

    /**
     * เพิ่มจุดเด่น (Selling Point) ลงในรายการหลัก
     * @param {React.KeyboardEvent} e - เหตุการณ์การกดปุ่มบนคีย์บอร์ด
     */
    const addTag = (e) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            setFormData(prev => ({
                ...prev,
                sellingPoints: [...prev.sellingPoints, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    /**
     * ลบจุดเด่นออกจากรายการ
     * @param {number} tagIdx - ลำดับของรายการที่ต้องการลบ
     */
    const removeTag = (tagIdx) => {
        setFormData(prev => ({
            ...prev,
            sellingPoints: prev.sellingPoints.filter((_, i) => i !== tagIdx)
        }));
    };

    /**
     * จำลองการอัปโหลดไฟล์ (Mock Upload)
     */
    const handleFileUpload = () => {
        const mockFile = {
            name: `ไฟล์แนบ_${Date.now()}.zip`,
            size: '5.2 MB',
            type: 'zip'
        };
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, mockFile]
        }));
    };

    /**
     * ลบไฟล์แนบออกจากรายการ
     * @param {number} idx - ลำดับของไฟล์ที่ต้องการลบ
     */
    const removeFile = (idx) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== idx)
        }));
    };

    // === การตรวจสอบกฎธุรกิจและฟอร์ม (Business Rules & Validation) ===

    /**
     * ตรวจสอบว่าสามารถส่งงานได้หรือไม่ ตามกฎธุรกิจ (Business Rules)
     * กฎ: ห้ามส่งช่วง 22:00-05:00, ห้ามส่งวันหยุด/เสาร์-อาทิตย์, และโควต้า 10 งาน/วัน/โครงการ
     * @async
     * @returns {Promise<object>} ผลการตรวจสอบ { allowed: boolean, reason: string, canSchedule: boolean }
     */
    const checkSubmissionAllowed = async () => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = อาทิตย์, 6 = เสาร์

        // กฎข้อที่ 1: การจำกัดเวลาการส่ง (22:00 - 05:00 น. ระงับการส่งงานใหม่)
        if (hour >= 22 || hour < 5) {
            return {
                allowed: false,
                reason: 'ระบบระงับการรับงานใหม่ในช่วงเวลา 22:00 - 05:00 น.',
                canSchedule: true
            };
        }

        // กฎข้อที่ 2: วันหยุดสุดสัปดาห์
        if (day === 0 || day === 6) {
            return {
                allowed: false,
                reason: 'ไม่สามารถส่งงานได้ในวันเสาร์และวันอาทิตย์ (นอกเวลาทำการ)',
                canSchedule: true
            };
        }

        // กฎข้อที่ 3: วันหยุดนักขัตฤกษ์
        const todayStr = now.toISOString().split('T')[0];
        const isHoliday = holidays.some(h => h.date === todayStr);
        if (isHoliday) {
            return {
                allowed: false,
                reason: 'วันนี้เป็นวันหยุดนักขัตฤกษ์ ระบบจึงไม่สามารถรับงานได้ในขณะนี้',
                canSchedule: true
            };
        }

        // กฎข้อที่ 4: โควต้างานต่อวัน (จำกัดที่ 10 งานต่อหนึ่งโครงการต่อวัน)
        if (formData.project) {
            const jobs = await getJobs();
            const todayJobs = jobs.filter(j => {
                const jobDate = new Date(j.createdAt).toISOString().split('T')[0];
                return j.project === formData.project && jobDate === todayStr;
            });

            if (todayJobs.length >= 10) {
                return {
                    allowed: false,
                    reason: `โครงการ "${formData.project}" ได้ส่งงานครบโควต้าประจำวันแล้ว (สูงสุด 10 งาน/วัน)`,
                    canSchedule: false
                };
            }
        }

        return { allowed: true, reason: '', canSchedule: false };
    };

    /**
     * ตรวจสอบความถูกต้องของข้อมูลในฟอร์มเบื้องต้น
     * @returns {boolean} true หากข้อมูลครบถ้วน
     */
    const validateForm = () => {
        const newErrors = [];
        if (!formData.project) newErrors.push("กรุณาเลือกโครงการ (Project)");
        if (!formData.jobType) newErrors.push("กรุณาเลือกประเภทงาน (Job Type)");
        if (!formData.subject) newErrors.push("กรุณาระบุหัวข้องาน (Subject)");
        if (!formData.objective || formData.objective.length < 20) newErrors.push("วัตถุประสงค์ (Objective) ต้องมีความยาวอย่างน้อย 20 ตัวอักษร");
        if (!formData.headline) newErrors.push("กรุณาระบุพาดหัวหลัก (Headline)");
        if (formData.attachments.length === 0) newErrors.push("กรุณาแนบไฟล์รายละเอียดงานอย่างน้อย 1 ไฟล์");

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    /**
     * ดำเนินการส่งฟอร์มเพื่อสร้างงาน
     * @param {React.FormEvent} e - เหตุการณ์การส่งฟอร์ม
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. ตรวจสอบข้อมูลในฟอร์ม
        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // 2. ตรวจสอบเงื่อนไขทางธุรกิจ
        const validation = await checkSubmissionAllowed();
        if (!validation.allowed) {
            setBlockReason(validation.reason);
            setCanSchedule(validation.canSchedule);
            setShowBlockModal(true);
            return;
        }

        // 3. เริ่มกระบวนการส่งงาน
        await submitJob('submitted');
    };

    /**
     * บันทึกข้อมูลงานลงในระบบ
     * @async
     * @param {string} status - สถานะของการสร้างงาน ('submitted' หรือ 'scheduled')
     */
    const submitJob = async (status = 'submitted') => {
        setIsSubmitting(true);
        try {
            await createJob({
                ...formData,
                requesterName: user?.displayName || 'Unknown User',
                flowSnapshot: approvalFlow,
                status: status
            });

            const message = status === 'scheduled'
                ? 'บันทึกงานและตั้งเวลาส่งอัตโนมัติสำเร็จ!'
                : 'สร้างรายการงาน DJ สำเร็จ!';

            setResultModalConfig({
                type: 'success',
                title: message,
                message: 'กำลังนำคุณไปที่หน้ารายการงาน...'
            });
            setShowResultModal(true);

            setTimeout(() => {
                navigate('/jobs');
            }, 1500);

        } catch (error) {
            setResultModalConfig({
                type: 'error',
                title: 'เกิดข้อผิดพลาดในการสร้างงาน',
                message: error.message || 'ไม่สามารถสร้างงานได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
            });
            setShowResultModal(true);
        } finally {
            setIsSubmitting(false);
            setShowBlockModal(false);
        }
    };

    // Calculate Completion %
    const calculateCompletion = () => {
        const fields = ['project', 'jobType', 'subject', 'objective', 'headline'];
        const filled = fields.filter(f => formData[f]).length;
        const hasFiles = formData.attachments.length > 0 ? 1 : 0;
        return Math.round(((filled + hasFiles) / (fields.length + 1)) * 100);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* === หัวข้อหน้า (Page Header) === */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สร้างรายการงาน (Create Design Job)</h1>
                    <p className="text-gray-500">กรอกรายละเอียดเพื่อเปิดพรีวิวงบประมาณและงานออกแบบใหม่</p>
                </div>
            </div>

            {/* ============================================
          Validation Alert
          ============================================ */}
            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                    <div className="text-red-600 mt-0.5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-red-800">กรุณาแก้ไขข้อผิดพลาดดังนี้</h3>
                        <ul className="text-sm text-red-700 mt-1 space-y-1 list-disc pl-4">
                            {errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* === คอลัมน์ซ้าย: ฟอร์มกรอกข้อมูล (Form Sections) === */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ส่วนที่ 1: ข้อมูลโครงการ (Job Info) */}
                    <Card>
                        <CardHeader title="ข้อมูลโครงการและประเภทงาน" badge="ก" />
                        <CardBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    label="โครงการ (Project)"
                                    name="project"
                                    required
                                    value={formData.project}
                                    onChange={handleChange}
                                >
                                    <option value="">-- เลือกโครงการ --</option>
                                    {masterData.projects.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </FormSelect>
                                <div>
                                    <FormInput label="หน่วยงาน (BUD)" disabled value={formData.bud} className="bg-gray-50" />
                                    <p className="text-xs text-gray-400 mt-1">อ้างอิงตามโครงการที่เลือก</p>
                                </div>
                            </div>

                            <div>
                                <FormSelect
                                    label="ประเภทงาน (Job Type)"
                                    name="jobType"
                                    required
                                    value={formData.jobType}
                                    onChange={handleChange}
                                >
                                    {masterData.jobTypes.map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                </FormSelect>
                                <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                    {dueDate ? (
                                        <>
                                            <p className="text-sm text-rose-700">
                                                <strong>วันกำหนดส่ง (โดยประมาณ):</strong> {formatDateToThai(dueDate)}
                                            </p>
                                            <p className="text-xs text-rose-600 mt-1">
                                                * คำนวณจากวันทำการ (ข้ามวันหยุดราชการ)
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-rose-700"><strong>SLA:</strong> กรุณาเลือกประเภทงานเพื่อดูวันกำหนดส่ง</p>
                                            <p className="text-xs text-rose-600 mt-1">ระบบจะคำนวณวันส่งงานโดยนับเฉพาะวันทำงาน</p>
                                        </>
                                    )}
                                </div>

                                {/* ส่วนเลือกชิ้นงานย่อย (Sub-items) */}
                                {jobTypeItems.length > 0 && (
                                    <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                                        <p className="text-sm font-medium text-purple-800 mb-2">
                                            เลือกชิ้นงานที่ต้องการ (Sub-items):
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {jobTypeItems.map(item => (
                                                <label key={item.id} className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:border-purple-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSubItems.includes(item.id)}
                                                        onChange={() => toggleSubItem(item.id)}
                                                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{item.name}</span>
                                                    <span className="text-xs text-gray-400">({item.defaultSize})</span>
                                                </label>
                                            ))}
                                        </div>
                                        {selectedSubItems.length > 0 && (
                                            <p className="text-xs text-purple-600 mt-2">
                                                เลือกแล้ว {selectedSubItems.length} ชิ้นงาน
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <FormInput
                                label="หัวข้อ (Subject)"
                                name="subject"
                                required
                                placeholder="เช่น Banner Facebook แคมเปญ Q1"
                                value={formData.subject}
                                onChange={handleChange}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    label="ความสำคัญ (Priority)"
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <option value="Low">ต่ำ (Low)</option>
                                    <option value="Normal">ปกติ (Normal)</option>
                                    <option value="Urgent">ด่วน (Urgent)</option>
                                </FormSelect>
                                <div>
                                    <FormInput label="เวลาส่งงาน" disabled value="ปัจจุบัน (อัตโนมัติ)" className="bg-gray-50" />
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ส่วนที่ 2: รายละเอียดงาน (Brief) */}
                    <Card>
                        <CardHeader title="รายละเอียดงาน (Brief)" badge="ข" />
                        <CardBody className="space-y-4">
                            <div>
                                <FormTextarea
                                    label="วัตถุประสงค์และรายละเอียด (Objective & Details)"
                                    name="objective"
                                    required
                                    rows="4"
                                    placeholder="อธิบายรายละเอียดงาน, วัตถุประสงค์, กลุ่มเป้าหมาย หรือสิ่งที่ต้องการให้บริษัทรับทราบ..."
                                    value={formData.objective}
                                    onChange={handleChange}
                                />
                                <div className={`flex justify-end items-center mt-1 text-xs ${formData.objective.length < 20 ? 'text-red-500' : 'text-green-500'}`}>
                                    ขั้นต่ำ 20 ตัวอักษร (ปัจจุบัน: {formData.objective.length})
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="พาดหัวหลัก (Headline)"
                                    name="headline"
                                    required
                                    placeholder="ข้อความหลักที่ต้องการสื่อสาร"
                                    value={formData.headline}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="พาดหัวรอง (Sub-headline)"
                                    name="subHeadline"
                                    placeholder="ข้อความเสริม (ถ้ามี)"
                                    value={formData.subHeadline}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">จุดเด่นที่ต้องการเน้น (Selling Points)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.sellingPoints.map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm flex items-center gap-1">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(idx)}
                                                className="hover:text-rose-900 font-bold"
                                            >&times;</button>
                                        </span>
                                    ))}
                                </div>
                                <FormInput
                                    placeholder="เพิ่มจุดเด่นแล้วกด Enter..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={addTag}
                                />
                            </div>

                            <FormInput
                                label="ราคา / โปรโมชั่น (Price / Promotion)"
                                name="price"
                                placeholder="ระบุราคาหรือโปรโมชั่นที่ต้องการให้ปรากฏในงาน"
                                value={formData.price}
                                onChange={handleChange}
                            />
                        </CardBody>
                    </Card>

                    {/* ส่วนที่ 3: ไฟล์แนบ (Attachments) */}
                    <Card>
                        <CardHeader title="ไฟล์แนบประกอบงาน (Attachments)" badge="ค" />
                        <CardBody className="space-y-4">
                            {/* พื้นที่อัปโหลดไฟล์ */}
                            <div
                                onClick={handleFileUpload}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-rose-400 transition-colors cursor-pointer bg-gray-50 hover:bg-white"
                            >
                                <div className="text-gray-400 mx-auto mb-4">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <p className="text-gray-600 mb-1">คลิกที่นี่เพื่อเลือกอัปโหลดไฟล์รายละเอียด หรือรูปภาพตัวอย่าง</p>
                                <p className="text-xs text-gray-400">(ระบบจำลองการอัปโหลดไฟล์)</p>
                            </div>

                            {/* รายการไฟล์ที่อัปโหลดแล้ว */}
                            {formData.attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                                            DOC
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-gray-400">{file.size}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="text-gray-400 hover:text-red-500"
                                        title="ลบไฟล์"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                </div>

                {/* === คอลัมน์ขวา: พรีวิวและดำเนินการ (Info Panels & Actions) === */}
                <div className="space-y-6">

                    {/* พรีวิวลำดับการอนุมัติ (Approval Flow Preview) */}
                    <Card>
                        <CardHeader title="ลำดับการอนุมัติ" badge="ง" />
                        <CardBody>
                            {approvalFlow ? (
                                <div className="relative">
                                    {/* เส้นเชื่อมต่อ (Vertical Line) */}
                                    <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-gray-200"></div>

                                    <div className="space-y-6">
                                        {/* รายการแต่ละลำดับ (Levels) */}
                                        {approvalFlow.levels.map((level, idx) => (
                                            <div key={idx} className="relative pl-8">
                                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 z-10 bg-white ${idx === 0 ? 'border-blue-500' : 'border-purple-500'
                                                    }`}></div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ลำดับที่ {level.level}</p>
                                                        {level.approvers?.length > 1 && (
                                                            <span className={`text-[9px] px-1 rounded font-bold ${level.logic === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {level.logic === 'all' ? 'ครบทุกคน (ALL)' : 'ใครก็ได้ (ANY)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">{level.role}</p>
                                                    <div className="mt-1 space-y-0.5">
                                                        {level.approvers && level.approvers.length > 0 ? (
                                                            level.approvers.map((app, appIdx) => (
                                                                <p key={appIdx} className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                    {app.name}
                                                                </p>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-gray-500">{level.name || 'ผู้อนุมัติทั่วไป'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* ผู้รับงาน (Default Assignee) */}
                                        <div className="relative pl-8">
                                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-green-500 bg-white z-10"></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">ปลายทาง</p>
                                                <p className="text-sm font-medium text-gray-900">ผู้รับผิดชอบงาน</p>
                                                <p className="text-xs text-gray-500">
                                                    {approvalFlow.defaultAssignee?.name || 'มอบหมายอัตโนมัติ'}
                                                    {approvalFlow.defaultAssignee?.role && ` (${approvalFlow.defaultAssignee.role})`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                    <p className="text-sm text-gray-500">ยังไม่มีการกำหนดลำดับการอนุมัติ</p>
                                    <p className="text-xs text-green-600 mt-1 font-medium">✨ อนุมัติอัตโนมัติ (Auto Approve)</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* ความคืบหน้าการกรอกข้อมูล (Checklist Panel) */}
                    <Card>
                        <CardHeader title="ความสมบูรณ์ของข้อมูล" />
                        <CardBody>
                            <div className="space-y-3">
                                <CheckItem label="ข้อมูลโครงการ" checked={!!formData.project} />
                                <CheckItem label="ประเภทงาน" checked={!!formData.jobType} />
                                <CheckItem label="หัวข้อรายการ" checked={!!formData.subject} />
                                <CheckItem label="วัตถุประสงค์ (ขั้นต่ำ 20 ตัวอักษร)" checked={formData.objective.length >= 20} />
                                <CheckItem label="ไฟล์แนบ" checked={formData.attachments.length > 0} />
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-rose-500 rounded-full h-2 transition-all duration-500"
                                            style={{ width: `${calculateCompletion()}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{calculateCompletion()}%</span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ปุ่มดำเนินการ (Actions Panel) */}
                    <div className="sticky top-20 space-y-3">
                        <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    กำลังสร้างรายการ...
                                </span>
                            ) : (
                                "ส่งงานตอนนี้ (Send Now)"
                            )}
                        </Button>
                        <Button type="button" variant="secondary" className="w-full" disabled={isSubmitting}>
                            บันทึกร่าง (Save Draft)
                        </Button>
                    </div>

                </div>
            </div>

            {/* ============================================
          Block Modal - แสดงเมื่อไม่สามารถส่งงานได้
          ============================================ */}
            {showBlockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">ไม่สามารถส่งงานได้</h3>
                            <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <ClockIcon className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{blockReason}</p>
                                </div>
                            </div>

                            {canSchedule && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700">
                                        <strong>💡 ทางเลือก:</strong> คุณสามารถบันทึกงานและตั้งเวลาส่งอัตโนมัติ ในเวลา <strong>08:00 น. ของวันทำการถัดไป</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowBlockModal(false)}>ยกเลิก</Button>
                            {canSchedule && (
                                <Button onClick={() => submitJob('scheduled')} className="bg-blue-500 hover:bg-blue-600">
                                    <ClockIcon className="w-4 h-4 mr-2" />
                                    บันทึกและส่งอัตโนมัติ
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
          Success/Error Modal - แสดงผลลัพธ์การสร้างงาน
          ============================================ */}
            <Modal
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
                type={resultModalConfig.type}
                title={resultModalConfig.title}
                message={resultModalConfig.message}
                confirmText="ตกลง"
            />
        </form>
    );
}

/**
 * CheckItem Helper Component
 * แสดงรายการตรวจสอบความสมบูรณ์ของข้อมูลพร้อมไอคอนสถานะ
 * @param {object} props
 * @param {string} props.label - ข้อความประกอบ
 * @param {boolean} props.checked - สถานะการตรวจสอบสำเร็จหรือไม่
 */
function CheckItem({ label, checked }) {
    return (
        <div className="flex items-center gap-2">
            {checked ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
                <XCircleIcon className="w-5 h-5 text-gray-300" />
            )}
            <span className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
            </span>
        </div>
    );
}

// === ไอคอนพื้นฐาน (Base Icons) ===

/** @component ไอคอนถังขยะ (Trash Icon) */
function TrashIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}

/** @component ไอคอนเครื่องหมายถูก (Check Circle Icon) */
function CheckCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}

/** @component ไอคอนเครื่องหมายกากบาท (X Circle Icon) */
function XCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
