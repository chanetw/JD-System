/**
 * @file CreateJobPage.jsx
 * @description หน้าจอสำหรับสร้างงานออกแบบใหม่ (Create Design Job)
 * 
 * วัตถุประสงค์หลัก:
 * - ให้ผู้ขอเพลง (Requester) หรือฝ่ายการตลาด ระบุรายละเอียดงานที่ต้องการ (Brief)
 * - ตรวจสอบกฎธุรกิจ (Business Rules) เช่น เวลาการส่งงาน, วันหยุด, และโควต้าต่อโครงการ
 * - คำนวณวันกำหนดส่งงาน (Due Date) ตาม SLA ของประเภทงานและข้ามวันหยุดราชการ
 * - บันทึกข้อมูลงานพร้อมลิงก์ Brief และดึงลำดับการอนุมัติ (Approval Flow) ตามโครงการที่เลือก
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import api from '@shared/services/apiService'; // ใช้ apiService ที่เป็น Centralized API (Support Real DB)
import { Card, CardHeader, CardBody } from '@shared/components/Card';
import { FormInput, FormSelect, FormTextarea } from '@shared/components/FormInput';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Modal from '@shared/components/Modal';
import { calculateDueDate, formatDateToThai, addWorkDays } from '@shared/utils/slaCalculator';
import { getAccessibleProjects, hasRole, isAdmin } from '@shared/utils/permission.utils';
import { XMarkIcon, ClockIcon, LinkIcon, TrashIcon } from '@heroicons/react/24/outline';
import AcceptanceDatePicker from '../components/AcceptanceDatePicker'; // New Component

/**
 * CreateDJ Component
 * หน้าจอสร้างรายการงาน DJ พร้อมตรรกะการตรวจสอบเงื่อนไขทางธุรกิจ
 */
export default function CreateDJ() {
    const navigate = useNavigate();
    const { user } = useAuthStoreV2();

    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isNonWorkingDay = (date, holidayList = []) => {
        const current = new Date(date);
        current.setHours(0, 0, 0, 0);

        if (current.getDay() === 0 || current.getDay() === 6) {
            return true;
        }

        return holidayList.some((holiday) => {
            const value = typeof holiday === 'string' ? holiday : (holiday.date || holiday.Day);
            if (!value) return false;

            const holidayDate = new Date(value);
            holidayDate.setHours(0, 0, 0, 0);
            return holidayDate.getTime() === current.getTime();
        });
    };

    const getCriticalPathSla = (jobTypes = []) => {
        if (!jobTypes.length) return 0;

        const accumulatedSla = [];

        jobTypes.forEach((jobType, index) => {
            const ownSla = parseInt(jobType.sla, 10) || 7;
            const predecessorIndex = jobType.predecessorIndex;
            const predecessorSla = predecessorIndex !== null && predecessorIndex !== undefined && predecessorIndex < index
                ? (accumulatedSla[predecessorIndex] || 0)
                : 0;

            accumulatedSla[index] = ownSla + predecessorSla;
        });

        return Math.max(...accumulatedSla);
    };

    const getEffectiveSla = (jobTypes = selectedJobTypes, singleJobTypeId = formData.jobTypeId) => {
        if (jobTypes.length > 0) {
            return getCriticalPathSla(jobTypes);
        }

        const singleJobType = masterData.jobTypes.find((jobType) => jobType.id === parseInt(singleJobTypeId, 10));
        return parseInt(singleJobType?.sla, 10) || 0;
    };

    const getRecommendedDueDate = ({
        jobTypes = selectedJobTypes,
        singleJobTypeId = formData.jobTypeId,
        priority = formData.priority,
        holidayList = holidays
    } = {}) => {
        const effectiveSla = getEffectiveSla(jobTypes, singleJobTypeId);
        if (!effectiveSla) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nextDate;

        if (priority === 'Urgent') {
            nextDate = new Date(today);
            nextDate.setDate(nextDate.getDate() + 1);
        } else {
            nextDate = addWorkDays(today, effectiveSla, holidayList);
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + 1);

            while (isNonWorkingDay(nextDate, holidayList)) {
                nextDate.setDate(nextDate.getDate() + 1);
            }
        }

        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    };

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
    /** ข้อมูลลำดับการอนุมัติที่ผูกกับโครงการที่เลือก */
    const [approvalFlow, setApprovalFlow] = useState(null);

    // === สถานะชิ้นงานย่อย (States: Sub-items) ===
    /** รายการชิ้นงานย่อยของประเภทงานที่เลือก */
    const [jobTypeItems, setJobTypeItems] = useState([]);
    /** ชิ้นงานย่อยที่เลือก พร้อมจำนวน { [itemId]: quantity } เช่น { 1: 3, 5: 2 } */
    const [selectedSubItems, setSelectedSubItems] = useState({});

    // === สถานะ Multi Job Type (Parent-Child) ===
    /** รายการประเภทงานที่เลือก (สำหรับ Parent-Child Jobs) */
    const [selectedJobTypes, setSelectedJobTypes] = useState([]);

    // === สถานะปฏิทิน SLA Preview ===
    /** เดือนและปีที่แสดงในปฏิทิน (สำหรับเลื่อนดูเดือนอื่น) */
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

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
        briefLink: '',       // ลิงค์ Brief (เช่น Google Drive link)
        sellingPoints: [],   // จุดเด่นที่ต้องการเน้น (Tags)
        price: '',           // ราคา/โปรโมชั่น
        subItems: [],        // ชิ้นงานย่อยที่เลือก (เช่น FB, IG)
        dueDate: ''          // วันส่งงาน (Due Date) - New Field
    });

    /** ข้อความสำหรับเพิ่ม Selling Point ใหม่ลงใน Tags */
    const [newTag, setNewTag] = useState('');

    /** สถานะแสดง/ซ่อน Brief Link Input (สำหรับ Add Link button) */
    const [showBriefLinkInput, setShowBriefLinkInput] = useState(false);
    /** เก็บลิงค์ชั่วคราวก่อนกดปุ่ม แนบลิงค์ */
    const [tempBriefLink, setTempBriefLink] = useState('');

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
        // ⚠️ FIX: Only load data when user is available
        if (!user) return;

        /** ดึงข้อมูลโครงการ, ประเภทงาน และวันหยุดจาก API */
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Use Combined API for performance & scope data
                const data = await api.getMasterDataCombined();

                // Business Rule: User ทั่วไปควรเห็นเฉพาะข้อมูลที่ Active เท่านั้น (กรอง Inactive ออก)
                data.projects = data.projects?.filter(p => p.isActive) || [];
                data.jobTypes = data.jobTypes?.filter(jt => jt.isActive) || [];
                data.buds = data.buds?.filter(b => b.isActive) || [];

                // 🔍 DEBUG: Log full user object structure
                console.log('🔍 [CreateJobPage] User Object:', {
                    fullUser: user,
                    hasRoles: !!user?.roles,
                    hasRoleName: !!user?.roleName,
                    hasRole: !!user?.role,
                    rolesValue: user?.roles,
                    roleNameValue: user?.roleName,
                    roleValue: user?.role
                });

                // Multi-Role: กรองโครงการตาม scope ที่ user มีสิทธิ์
                const isAdminUser = isAdmin(user);

                if (user && !isAdminUser) {
                    // Use availableScopes from backend (Optimized)
                    const scopedProjects = data.availableScopes?.projects || [];

                    if (scopedProjects.length > 0) {
                        data.projects = scopedProjects;
                    } else {
                        // Fallback: Use permission.utils.js to filter by user scopes
                        // Handles Tenant/BUD/Project level scope assignments
                        let accessibleProjects = getAccessibleProjects(user, data.projects);
                        
                        // NEW: Fallback for users with NO scopes but with department/BUD (backward compatibility)
                        if (accessibleProjects.length === 0 && user.department?.bud_id) {
                            console.log(`[CreateJob] User has no explicit scopes, falling back to department BUD: ${user.department.bud_id}`);
                            accessibleProjects = data.projects.filter(p => p.budId === user.department.bud_id);
                        }

                        data.projects = accessibleProjects;

                        if (accessibleProjects.length === 0) {
                            console.warn('[CreateJob] User has no assigned project scopes and no department BUD');
                        }
                    }
                }

                // 🔍 DEBUG: Detailed logging of jobTypes structure to verify SLA field
                const firstJobType = data.jobTypes?.[0];
                console.log('🔍 [CreateJob] Master Data Loaded:', {
                    projects: data.projects?.length,
                    jobTypes: data.jobTypes?.length,
                    isAdmin: isAdminUser,
                    userRoles: user?.roles,
                    // Detailed inspection of first job type
                    firstJobType: firstJobType ? {
                        id: firstJobType.id,
                        name: firstJobType.name,
                        sla: firstJobType.sla,
                        slaWorkingDays: firstJobType.slaWorkingDays,
                        allKeys: Object.keys(firstJobType)
                    } : 'No jobTypes',
                    sampleJobTypes: data.jobTypes?.slice(0, 3).map(jt => ({
                        name: jt.name,
                        sla: jt.sla,
                        slaWorkingDays: jt.slaWorkingDays
                    }))
                });

                setMasterData(data);

                // ข้อมูลวันหยุดเพื่อใช้คำนวณเป้าหมายเวลาทำงาน (SLA Calculation)
                // Note: getMasterDataCombined already returns holidays in some versions, 
                // but if not, we keep this call or use data.holidays if available
                const holidaysData = data.holidays || await api.getHolidays();
                setHolidays(holidaysData);
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งต้น:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user]); // ✅ FIX: Added user dependency

    const jobTypeSelectionSignature = selectedJobTypes
        .map((jobType) => `${jobType.jobTypeId}:${jobType.sla || 7}:${jobType.predecessorIndex ?? 'null'}`)
        .join('|');

    // === Auto reset Due Date เมื่อ Job Type / Chain เปลี่ยน ===
    useEffect(() => {
        if (!holidays.length) return; // รอจนกว่า holidays โหลดเสร็จ

        const recommendedDueDate = getRecommendedDueDate();

        if (!recommendedDueDate) {
            setFormData((prev) => (prev.dueDate ? { ...prev, dueDate: '' } : prev));
            return;
        }

        const nextDueDate = formatDateForInput(recommendedDueDate);
        setFormData((prev) => (prev.dueDate === nextDueDate ? prev : { ...prev, dueDate: nextDueDate }));
        setCalendarMonth(recommendedDueDate.getMonth());
        setCalendarYear(recommendedDueDate.getFullYear());
    }, [formData.jobTypeId, formData.priority, holidays, masterData.jobTypes, jobTypeSelectionSignature]);

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
            const selectedProject = masterData.projects.find(p => p.id === parseInt(value));
            if (selectedProject) {
                const budValue = selectedProject.bud;
                const budName = typeof budValue === 'object' ? budValue.name : budValue;
                // Update projectId valid
                setFormData(prev => ({
                    ...prev,
                    projectId: selectedProject.id, // Store projectId!
                    bud: budName || 'BUD 1'
                }));

                // ดึงข้อมูลลำดับการอนุมัติ (Approval Flow) ประจำโครงการ
                // Pass Project ID if possible, or value (name) if API handles it. My API handles ID or Name.
                // But safer to pass ID if I have it.
                api.getApprovalFlowByProject(selectedProject.id).then(response => {
                    // Backend might return an array of flows (Default + Skip logic)
                    // We need the Default Flow for the general preview
                    const flow = Array.isArray(response)
                        ? response.find(f => !f.jobTypeId) || response[0]
                        : response;
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
                // โหลดรายการชิ้นงานย่อยของประเภทงานที่เลือก
                setFormData(prev => ({ ...prev, jobTypeId: selectedJobType.id, dueDate: '', subItems: [] }));
                setSelectedSubItems([]);
                api.getJobTypeItems(selectedJobType.id).then(items => {
                    setJobTypeItems(items || []);
                }).catch(() => setJobTypeItems([]));
            }
        }

        // === Auto-fill Assignee ตาม Project + Job Type ===
        // เมื่อเลือก Project หรือ Job Type เสร็จ ให้ตรวจสอบว่าทั้งคู่ถูกเลือกแล้วหรือยัง
        // ถ้าครบ ให้เรียก API ดึง Assignee ที่ตั้งค่าไว้มา Auto-fill
        if (name === 'project' || name === 'jobType') {
            setTimeout(async () => {
                const currentProject = name === 'project'
                    ? masterData.projects.find(p => p.id === parseInt(value))
                    : masterData.projects.find(p => p.id === parseInt(formData.project));
                const currentJobType = name === 'jobType'
                    ? masterData.jobTypes.find(t => t.name === value)
                    : masterData.jobTypes.find(t => t.name === formData.jobType);

                if (currentProject?.id && currentJobType?.id) {
                    try {
                        const assignee = await api.getAssigneeByProjectAndJobType(
                            currentProject.id,
                            currentJobType.id
                        );
                        if (assignee?.id) {
                            // พบ Assignee ที่ตั้งค่าไว้ -> Auto-fill
                            setFormData(prev => ({
                                ...prev,
                                assigneeId: assignee.id,
                                assigneeName: assignee.name
                            }));
                            console.log('Auto-assigned:', assignee.name);
                        }
                    } catch (err) {
                        // ไม่พบ Assignee ที่ตั้งค่าไว้ -> ปล่อยให้ User เลือกเอง
                        console.log('No pre-configured assignee for this project+jobType');
                    }
                }
            }, 100);
        }
    };

    /**
     * เลือก/ยกเลิกเลือกชิ้นงานย่อย พร้อมจัดการจำนวน
     * @param {number} itemId - รหัสชิ้นงานย่อย
     * @param {number|null} quantity - จำนวนที่ต้องการ (null = ยกเลิกเลือก)
     * 
     * ข้อมูลที่เก็บ:
     * - selectedSubItems: Object { [itemId]: quantity } เช่น { 1: 3, 5: 2 }
     * - formData.subItems: Array [{ id, quantity }] เช่น [{ id: 1, quantity: 3 }]
     */
    const toggleSubItem = (itemId, quantity = null) => {
        setSelectedSubItems(prev => {
            const updated = { ...prev };

            if (quantity === null || quantity <= 0) {
                // ยกเลิกการเลือก
                delete updated[itemId];
            } else {
                // เพิ่ม/แก้ไขจำนวน
                updated[itemId] = quantity;
            }

            // อัปเดต formData.subItems พร้อมกัน
            const newSubItems = Object.entries(updated)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => ({ id: parseInt(id), quantity: qty }));

            setFormData(prevForm => ({ ...prevForm, subItems: newSubItems }));

            return updated;
        });
    };

    /**
     * อัปเดตจำนวนชิ้นงานย่อย
     * @param {number} itemId - รหัสชิ้นงานย่อย
     * @param {string|number} value - จำนวนใหม่ (รับเป็น string จาก input)
     */
    const updateSubItemQuantity = (itemId, value) => {
        const qty = parseInt(value) || 0;
        toggleSubItem(itemId, qty > 0 ? qty : null);
    };

    // === Multi Job Type Functions (Parent-Child) ===

    /**
     * เพิ่มประเภทงานใหม่ลงใน selectedJobTypes
     * รองรับ Accordion: เก็บ subItems และ isExpanded ด้วย
     * 
     * @param {number} jobTypeId - ID ของประเภทงานที่ต้องการเพิ่ม
     */
    const addJobType = async (jobTypeId) => {
        if (!jobTypeId) return;

        // ตรวจสอบว่ามี JobType นี้อยู่แล้วหรือไม่ (Main Job)
        const exists = selectedJobTypes.some(jt => jt.jobTypeId === parseInt(jobTypeId));
        if (exists) {
            alert('ประเภทงานนี้ถูกเพิ่มไปแล้ว');
            return;
        }

        // หาข้อมูล JobType จาก masterData
        const jobTypeInfo = masterData.jobTypes.find(t => t.id === parseInt(jobTypeId));

        // เตรียมรายการงานที่จะเพิ่ม (Start with Main Job)
        const newJobs = [];
        const startIndex = selectedJobTypes.length;

        const mainJob = {
            jobTypeId: parseInt(jobTypeId),
            name: jobTypeInfo?.name || 'Unknown',
            sla: jobTypeInfo?.sla || 7,
            assigneeId: null,
            isExpanded: true,       // ✅ Default: Expanded
            subItems: {},           // ชิ้นงานย่อยที่เลือก { itemId: qty }
            availableSubItems: [],  // จะโหลดข้อมูลใส่ตรงนี้
            predecessorIndex: null  // 🔥 Dependency: Index of the job to wait for
        };
        newJobs.push(mainJob);

        // 🔥 Auto-Chain Logic: Check for Next Job
        console.log(`[Auto-Chain] Checking chain for ${jobTypeInfo?.name}: nextJobTypeId=${jobTypeInfo?.nextJobTypeId}`);
        if (jobTypeInfo?.nextJobTypeId) {
            const nextTypeInfo = masterData.jobTypes.find(t => t.id === jobTypeInfo.nextJobTypeId);
            console.log(`[Auto-Chain] Next type lookup (id=${jobTypeInfo.nextJobTypeId}):`, nextTypeInfo ? nextTypeInfo.name : 'NOT FOUND');
            if (nextTypeInfo) {
                // Check redundancy for the chained job
                const nextExists = selectedJobTypes.some(jt => jt.jobTypeId === nextTypeInfo.id);
                if (!nextExists) {
                    console.log(`[Auto-Chain] ✅ Adding ${nextTypeInfo.name} after ${jobTypeInfo.name}`);
                    const chainedJob = {
                        jobTypeId: nextTypeInfo.id,
                        name: nextTypeInfo.name,
                        sla: nextTypeInfo.sla || 7,
                        assigneeId: null,
                        isExpanded: true,
                        subItems: {},
                        availableSubItems: [],
                        predecessorIndex: startIndex // ✅ Wait for Main Job (at startIndex)
                    };
                    newJobs.push(chainedJob);
                } else {
                    console.log(`[Auto-Chain] ⚠️ ${nextTypeInfo.name} already exists, skipping`);
                }
            }
        }

        // เพิ่มเข้า State ทีเดียว (Optimistic UI)
        setSelectedJobTypes(prev => [...prev, ...newJobs]);

        // โหลดข้อมูล Sub-items สำหรับทุก Job ที่เพิ่มเข้ามา
        for (const job of newJobs) {
            try {
                const items = await api.getJobTypeItems(job.jobTypeId);
                setSelectedJobTypes(prev => prev.map(jt =>
                    jt.jobTypeId === job.jobTypeId
                        ? { ...jt, availableSubItems: items || [] }
                        : jt
                ));
            } catch (error) {
                console.error(`Error loading sub-items for job ${job.jobTypeId}:`, error);
            }
        }
    };

    /**
     * Toggle Accordion เปิด/ปิดของ Job Type Card
     * และโหลด Sub-items ถ้ายังไม่ได้โหลด
     * 
     * @param {number} index - ตำแหน่งใน Array
     */
    const toggleJobTypeExpand = async (index) => {
        const jobType = selectedJobTypes[index];
        const newIsExpanded = !jobType.isExpanded;

        // ถ้ากำลังจะเปิด และยังไม่มี availableSubItems -> โหลดจาก API
        if (newIsExpanded && jobType.availableSubItems.length === 0) {
            try {
                const items = await api.getJobTypeItems(jobType.jobTypeId);
                setSelectedJobTypes(prev => prev.map((jt, i) =>
                    i === index ? { ...jt, isExpanded: true, availableSubItems: items || [] } : jt
                ));
            } catch (error) {
                console.error('Error loading sub-items:', error);
                // ยังคง toggle แม้โหลดไม่ได้
                setSelectedJobTypes(prev => prev.map((jt, i) =>
                    i === index ? { ...jt, isExpanded: true } : jt
                ));
            }
        } else {
            // แค่ toggle
            setSelectedJobTypes(prev => prev.map((jt, i) =>
                i === index ? { ...jt, isExpanded: newIsExpanded } : jt
            ));
        }
    };

    /**
     * อัปเดต Sub-item ของ Job Type ที่ระบุ
     * 
     * @param {number} jobTypeIndex - ตำแหน่งของ Job Type ใน Array
     * @param {number} itemId - ID ของ Sub-item
     * @param {number|null} quantity - จำนวน (null = ลบออก)
     */
    const updateJobTypeSubItem = (jobTypeIndex, itemId, quantity) => {
        setSelectedJobTypes(prev => prev.map((jt, i) => {
            if (i !== jobTypeIndex) return jt;

            const newSubItems = { ...jt.subItems };
            if (quantity === null || quantity <= 0) {
                delete newSubItems[itemId];
            } else {
                newSubItems[itemId] = quantity;
            }
            return { ...jt, subItems: newSubItems };
        }));
    };

    /**
     * ลบประเภทงานออกจาก selectedJobTypes
     * 
     * @param {number} index - ตำแหน่งใน Array ที่ต้องการลบ
     */
    const removeJobType = (index) => {
        setSelectedJobTypes((prev) => prev
            .filter((_, currentIndex) => currentIndex !== index)
            .map((jobType) => {
                const predecessorIndex = jobType.predecessorIndex;

                if (predecessorIndex === null || predecessorIndex === undefined) {
                    return jobType;
                }

                if (predecessorIndex === index) {
                    return { ...jobType, predecessorIndex: null };
                }

                if (predecessorIndex > index) {
                    return { ...jobType, predecessorIndex: predecessorIndex - 1 };
                }

                return jobType;
            }));
    };

    /**
     * อัปเดต Assignee ของ Job Type ที่เลือก
     * 
     * @param {number} index - ตำแหน่งใน Array
     * @param {number} assigneeId - ID ของ Assignee ใหม่
     */
    const updateJobTypeAssignee = (index, assigneeId) => {
        setSelectedJobTypes(prev => prev.map((jt, i) =>
            i === index ? { ...jt, assigneeId: parseInt(assigneeId) || null } : jt
        ));
    };

    /**
     * อัปเดตเงื่อนไขการเริ่มงาน (Dependency)
     * @param {number} currentIndex - Index ของงานที่กำลังแก้ไข
     * @param {number|null} predecessorIndex - Index ของงานที่ต้องรอ (null = ทำพร้อมกัน)
     */
    const updateJobDependency = (currentIndex, predecessorIndex) => {
        setSelectedJobTypes(prev => prev.map((jt, i) => {
            if (i !== currentIndex) return jt;

            // Validate: ห้ามเลือกตัวเอง และห้ามเลือกงานที่อยู่ทีหลัง (เพื่อป้องกัน Circular)
            // UI ควรกรองให้แล้ว แต่กันเหนียว
            if (predecessorIndex !== null && predecessorIndex >= currentIndex) {
                return jt;
            }

            return { ...jt, predecessorIndex: predecessorIndex };
        }));
    };

    /**
     * คำนวณ Timeline ของงานทั้งหมดตาม Dependency
     * เพื่อหา Due Date จริงของแต่ละงาน
     */
    const calculateTimeline = () => {
        const timeline = [];

        selectedJobTypes.forEach((jt, index) => {
            let startDate = new Date(); // Default: Start Today
            const sla = jt.sla || 7;

            // Check dependency
            if (jt.predecessorIndex !== null && jt.predecessorIndex !== undefined) {
                // ต้องรอ Job ก่อนหน้า
                // อิงจาก index ใน timeline verification
                // เนื่องจาก timeline push ตาม sequence 0..index, ดังนั้น predecessor (ซึ่ง index < current) จะถูกคำนวณแล้ว
                const predecessor = timeline[jt.predecessorIndex];
                if (predecessor) {
                    startDate = new Date(predecessor.calculatedDueDate);
                }
            }

            const calculatedDueDate = calculateDueDate(startDate, sla, holidays);

            timeline.push({
                ...jt,
                originalIndex: index,
                calculatedStartDate: startDate,
                calculatedDueDate: calculatedDueDate
            });
        });

        return timeline;
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
            const selectedProject = masterData.projects.find(p => p.id === parseInt(formData.project));
            const projectId = parseInt(formData.project);
            const jobs = await api.getJobs();
            const todayJobs = jobs.filter(j => {
                const jobDate = new Date(j.createdAt).toISOString().split('T')[0];
                // Compare by projectId (handle both j.projectId and j.project)
                const jobProjectId = j.projectId || j.project_id;
                return jobProjectId === projectId && jobDate === todayStr;
            });

            if (todayJobs.length >= 10) {
                const projectName = selectedProject?.name || formData.project;
                return {
                    allowed: false,
                    reason: `โครงการ "${projectName}" ได้ส่งงานครบโควต้าประจำวันแล้ว (สูงสุด 10 งาน/วัน)`,
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
        if (!formData.jobType && selectedJobTypes.length === 0) newErrors.push("กรุณาเลือกประเภทงาน (Job Type)");
        if (!formData.subject) newErrors.push("กรุณาระบุหัวข้องาน (Subject)");
        // Objective ไม่บังคับแล้ว (ลบ validation 20 ตัวอักษร)
        // ต้องมี briefLink ถึงจะส่งงานได้
        if (!formData.briefLink) {
            newErrors.push("กรุณาใส่ลิงค์รายละเอียด (Brief Link) เพื่อส่งงาน");
        }

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
     * บันทึกร่างงาน (Save Draft)
     * ไม่ต้องผ่านการตรวจสอบเงื่อนไขทางธุรกิจ แค่ต้องมี Project และ Subject
     */
    const handleSaveDraft = async () => {
        // Minimal validation for draft
        const draftErrors = [];
        if (!formData.project) draftErrors.push('กรุณาเลือกโครงการ');
        if (!formData.subject?.trim()) draftErrors.push('กรุณาระบุหัวข้องาน');

        if (draftErrors.length > 0) {
            setErrors(draftErrors);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Clear errors and save
        setErrors([]);
        await submitJob('draft');
    };

    /**
     * บันทึกข้อมูลงานลงในระบบ
     * - ถ้า selectedJobTypes มีมากกว่า 1 รายการ -> สร้างแบบ Parent-Child
     * - ถ้า selectedJobTypes มี 1 รายการ หรือใช้ formData.jobTypeId -> สร้างแบบ Single Job
     * 
     * @async
     * @param {string} status - สถานะของการสร้างงาน ('submitted' หรือ 'scheduled')
     */
    const submitJob = async (status = 'submitted') => {
        setIsSubmitting(true);
        try {
            // เตรียม Payload
            const jobPayload = {
                projectId: parseInt(formData.project),
                subject: formData.subject,
                priority: formData.priority,
                deadline: formData.deadline,
                brief: {
                    objective: formData.objective || '',
                    headline: formData.headline || '',
                    subHeadline: formData.subHeadline || '',
                    description: formData.description || formData.objective || '',
                    briefLink: formData.briefLink || null
                },
                requesterId: user?.id,
                tenantId: user?.tenant_id || 1,
                requesterName: user?.firstName || user?.display_name || 'Unknown User',
                flowSnapshot: approvalFlow,
                dueDate: formData.dueDate || null, // วันส่งงาน (Due Date)
                status: status
            };

            // เตรียม items data จาก selectedJobTypes (พร้อม jobTypeId)
            if (selectedJobTypes.length > 0) {
                const items = selectedJobTypes.flatMap(jt =>
                    Object.entries(jt.subItems || {})
                        .filter(([_, quantity]) => quantity > 0)
                        .map(([itemId, quantity]) => {
                            const item = jt.availableSubItems?.find(i => i.id === parseInt(itemId));
                            return {
                                name: item?.name || `Item ${itemId}`,
                                quantity: quantity,
                                jobTypeId: jt.jobTypeId // เพิ่ม jobTypeId เพื่อให้ backend filter ได้
                            };
                        })
                );
                if (items.length > 0) {
                    jobPayload.items = items;
                }
            }

            // ถ้าเลือกหลาย Job Type -> ใช้ Parent-Child Mode
            if (selectedJobTypes.length > 0) {
                // Map predecessorIndex to payload ensure it's integer or null
                jobPayload.jobTypes = selectedJobTypes.map((jt, idx) => ({
                    ...jt,
                    order: idx + 1, // 1-based order for reference if needed
                    predecessorIndex: jt.predecessorIndex // Send index to backend
                }));
            } else {
                jobPayload.jobTypeId = parseInt(formData.jobTypeId);
            }

            await api.createJob(jobPayload);

            // Message based on status
            let message = 'สร้างรายการงาน DJ สำเร็จ!';
            let redirectMessage = 'กำลังนำคุณไปที่หน้ารายการงาน...';
            let redirectPath = '/jobs';

            if (status === 'draft') {
                message = 'บันทึกร่างเรียบร้อยแล้ว!';
                redirectMessage = 'กำลังนำคุณไปที่หน้ารายการงาน...';
                redirectPath = '/jobs?status=draft';
            } else if (status === 'scheduled') {
                message = 'บันทึกงานและตั้งเวลาส่งอัตโนมัติสำเร็จ!';
            }

            setResultModalConfig({
                type: 'success',
                title: message,
                message: redirectMessage
            });
            setShowResultModal(true);

            setTimeout(() => {
                navigate(redirectPath);
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
        const fields = ['project', 'jobType', 'subject'];
        const filled = fields.filter(f => formData[f]).length;
        const hasBriefLink = formData.briefLink ? 1 : 0;
        return Math.round(((filled + hasBriefLink) / (fields.length + 1)) * 100);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* === หัวข้อหน้า (Page Header) === */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สร้างรายการงาน (Create Design Job)</h1>
                    <p className="text-sm text-gray-500 sm:text-base">กรอกรายละเอียดเพื่อเปิดพรีวิวงบประมาณและงานออกแบบใหม่</p>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {/* === คอลัมน์ซ้าย: ฟอร์มกรอกข้อมูล (Form Sections) === */}
                <div className="space-y-4 md:col-span-2 md:space-y-6 lg:col-span-2">

                    {/* ส่วนที่ 1: ข้อมูลโครงการ (Job Info) */}
                    <Card>
                        <CardHeader title="ข้อมูลโครงการและประเภทงาน" badge="1" />
                        <CardBody className="!p-4 space-y-4 sm:!p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormSelect
                                    label="โครงการ (Project)"
                                    name="project"
                                    required
                                    value={formData.project}
                                    onChange={handleChange}
                                >
                                    <option value="">-- เลือกโครงการ --</option>
                                    {masterData.projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </FormSelect>
                                <div>
                                    <FormInput label="หน่วยงาน (BUD)" disabled value={formData.bud} className="bg-gray-50" />
                                    <p className="text-xs text-gray-400 mt-1">อ้างอิงตามโครงการที่เลือก</p>
                                </div>
                            </div>

                            <FormInput
                                label="หัวข้อ (Subject)"
                                name="subject"
                                required
                                placeholder="เช่น Banner Facebook แคมเปญ Q1"
                                value={formData.subject}
                                onChange={handleChange}
                            />

                            {/* Priority Selection - Button Group */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ความสำคัญ (Priority) <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: 'Normal' })}
                                        className={`
                                            min-h-[44px] rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 sm:text-base
                                            ${formData.priority === 'Normal'
                                                ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-300'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        งานปกติ (Normal)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: 'Urgent' })}
                                        className={`
                                            min-h-[44px] rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 sm:text-base
                                            ${formData.priority === 'Urgent'
                                                ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300 animate-pulse'
                                                : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700'
                                            }
                                        `}
                                    >
                                        งานด่วน (Urgent)
                                    </button>
                                </div>

                                {/* Warning Message for Urgent */}
                                {formData.priority === 'Urgent' && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 animate-fadeIn">
                                        <p className="font-semibold mb-2">
                                            งานด่วนต้องผ่านการอนุมัติเสมอ
                                        </p>
                                        <p className="text-xs text-red-700 leading-relaxed">
                                            เนื่องจากงานด่วนกระทบต่อ SLA ของงานอื่นๆ จึงต้องได้รับการอนุมัติก่อนเข้าสู่ระบบ
                                            (แม้ว่าประเภทงานจะตั้งค่าข้ามการอนุมัติไว้ก็ตาม)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ประเภทงาน (Job Types) <span className="text-red-500">*</span>
                                    {selectedJobTypes.length > 1 && (
                                        <span className="ml-2 text-xs text-rose-600 font-normal">
                                            (Parent-Child Mode: {selectedJobTypes.length} รายการ)
                                        </span>
                                    )}
                                </label>

                                {/* ส่วนเพิ่ม Job Type ใหม่ */}
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                                    <select
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        id="newJobTypeSelect"
                                        defaultValue=""
                                    >
                                        <option value="">-- เลือกประเภทงานที่ต้องการเพิ่ม --</option>
                                        {masterData.jobTypes
                                            .filter(t => t.name !== 'Project Group (Parent)') // ซ่อน Parent Group
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.sla || 7} วัน)</option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const select = document.getElementById('newJobTypeSelect');
                                            addJobType(select.value);
                                            select.value = '';
                                        }}
                                        className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-white transition-colors hover:bg-rose-700 sm:w-auto sm:px-4 sm:py-2 flex items-center justify-center gap-1"
                                    >
                                        <span>+</span> เพิ่ม
                                    </button>
                                </div>

                                {/* รายการ Job Types ที่เลือกไว้ (Accordion Style) */}
                                {selectedJobTypes.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedJobTypes.map((jt, index) => (
                                            <div
                                                key={index}
                                                className="border border-rose-200 rounded-lg overflow-hidden"
                                            >
                                                {/* Header (Always Visible) */}
                                                <div className="flex items-start gap-2 p-3 bg-rose-50 sm:items-center sm:gap-3">
                                                    {/* Toggle Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleJobTypeExpand(index)}
                                                        className="h-8 w-8 flex-shrink-0 flex items-center justify-center text-rose-600 hover:bg-rose-100 rounded transition-colors"
                                                        title={jt.isExpanded ? 'ปิด' : 'เปิดเลือกชิ้นงาน'}
                                                    >
                                                        {jt.isExpanded ? '▼' : '▶'}
                                                    </button>

                                                    {/* Job Type Info & Dependency */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-medium text-rose-800">
                                                                {index + 1}. {jt.name}
                                                            </span>
                                                            {/* Dependency Badge */}
                                                            {jt.predecessorIndex !== null && jt.predecessorIndex !== undefined && (
                                                                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                                    🔗 รอ Job {jt.predecessorIndex + 1}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Sub-line info */}
                                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                                            <span className="text-xs text-rose-600">
                                                                SLA: {jt.sla || 7} วัน
                                                            </span>

                                                            {/* Dependency Selector (Show only for 2nd job onwards) */}
                                                            {index > 0 && (
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <label className="text-xs text-gray-500">เริ่มงาน:</label>
                                                                    <select
                                                                        className="min-h-[36px] text-xs border border-gray-300 rounded px-2 py-1 bg-gray-100 text-gray-500 cursor-not-allowed opacity-70"
                                                                        value={jt.predecessorIndex === null ? '' : jt.predecessorIndex}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            updateJobDependency(index, val === '' ? null : parseInt(val));
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                                                                        disabled
                                                                    >
                                                                        <option value="">🟢 พร้อมกัน (Parallel)</option>
                                                                        {selectedJobTypes.map((prevJt, prevIdx) => {
                                                                            if (prevIdx >= index) return null; // Show only previous jobs
                                                                            return (
                                                                                <option key={prevIdx} value={prevIdx}>
                                                                                    🔗 หลังจาก {prevIdx + 1}. {prevJt.name} เสร็จ
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {Object.keys(jt.subItems || {}).length > 0 && (
                                                            <span className="mt-1 inline-block px-2 py-0.5 bg-rose-200 text-rose-700 text-xs rounded-full">
                                                                {Object.values(jt.subItems).reduce((a, b) => a + b, 0)} ชิ้น
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Remove Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeJobType(index)}
                                                        className="h-8 w-8 flex-shrink-0 flex items-center justify-center text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="ลบรายการนี้"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* Accordion Content (Sub-items) */}
                                                {jt.isExpanded && (
                                                    <div className="p-3 bg-white border-t border-rose-100">
                                                        {jt.availableSubItems && jt.availableSubItems.length > 0 ? (
                                                            <div className="space-y-2">
                                                                <p className="text-xs text-gray-500 mb-2">
                                                                    เลือกชิ้นงานย่อยและระบุจำนวน:
                                                                </p>
                                                                {jt.availableSubItems.map(item => {
                                                                    const isSelected = (jt.subItems?.[item.id] || 0) > 0;
                                                                    const quantity = jt.subItems?.[item.id] || 0;

                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`flex flex-wrap items-start gap-2 p-2 rounded-lg border transition-all ${isSelected ? 'border-rose-400 bg-rose-50' : 'border-gray-400'}`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => updateJobTypeSubItem(index, item.id, e.target.checked ? 1 : null)}
                                                                                className="mt-1 h-4 w-4 text-rose-600 rounded border-gray-300"
                                                                            />
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="text-sm text-gray-700">{item.name}</span>
                                                                                <span className="text-xs text-gray-400 ml-1">({item.defaultSize || '-'})</span>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <div className="ml-auto flex items-center gap-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => updateJobTypeSubItem(index, item.id, quantity - 1)}
                                                                                        disabled={quantity <= 1}
                                                                                        className="h-8 w-8 flex items-center justify-center bg-rose-100 text-rose-700 rounded hover:bg-rose-200 disabled:opacity-50"
                                                                                    >−</button>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        value={quantity}
                                                                                        onChange={(e) => updateJobTypeSubItem(index, item.id, parseInt(e.target.value) || 1)}
                                                                                        className="h-8 w-14 text-center text-sm border border-rose-200 rounded"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => updateJobTypeSubItem(index, item.id, quantity + 1)}
                                                                                        className="h-8 w-8 flex items-center justify-center bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                                                                                    >+</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 text-center py-2">
                                                                ไม่มีชิ้นงานย่อยสำหรับประเภทงานนี้
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* 📊 Summary Panel - สรุปงานทั้งหมด */}
                                        <div className="mt-4 p-4 bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 rounded-lg">
                                            <h4 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                                                📊 สรุปงานทั้งหมด
                                            </h4>

                                            {/* ข้อมูล Timeline ที่คำนวณแล้ว */}
                                            <div className="space-y-2 mb-3">
                                                {calculateTimeline().map((jt, idx) => {
                                                    const totalItems = Object.values(jt.subItems || {}).reduce((a, b) => a + b, 0);

                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-rose-700">
                                                                    {idx + 1}. {jt.name}
                                                                </span>
                                                                {jt.predecessorIndex !== null && jt.predecessorIndex !== undefined && (
                                                                    <span className="text-[10px] text-amber-600">
                                                                        ↳ รอ Job {jt.predecessorIndex + 1}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className="text-xs text-rose-600 font-medium">
                                                                    ส่ง: {formatDateToThai(jt.calculatedDueDate)}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    (เริ่ม: {formatDateToThai(jt.calculatedStartDate)})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* สรุปรวม */}
                                            <div className="pt-3 border-t border-rose-200">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
                                                    <span className="font-bold text-rose-800">
                                                        📦 รวมทั้งสิ้น: {selectedJobTypes.reduce((sum, jt) =>
                                                            sum + Object.values(jt.subItems || {}).reduce((a, b) => a + b, 0), 0
                                                        )} ชิ้น
                                                    </span>
                                                    <span className="font-bold text-rose-700">
                                                        📅 กำหนดส่งงานสุดท้าย: {(() => {
                                                            const timeline = calculateTimeline();
                                                            if (timeline.length === 0) return '-';

                                                            // Find the latest due date among all jobs
                                                            // (Note: Usually it's the last one in chain, but if parallel, could be anyone)
                                                            const maxDate = new Date(Math.max(...timeline.map(t => new Date(t.calculatedDueDate))));
                                                            return formatDateToThai(maxDate);
                                                        })()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    * คำนวณจาก SLA ตามสายงานที่นานที่สุด ({getEffectiveSla()} วันทำการ)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* กรณียังไม่เลือก Job Type */
                                    <div className="p-4 bg-gray-50 border border-gray-400 rounded-lg text-center">
                                        <p className="text-sm text-gray-500">กรุณาเลือกประเภทงานจาก Dropdown ด้านบน</p>
                                        <p className="text-xs text-gray-400 mt-1">สามารถเลือกได้หลายประเภท (Parent-Child Mode)</p>
                                    </div>
                                )}
                            </div>

                            {/* Subject และ Priority ย้ายไปอยู่ก่อน Job Type แล้ว */}
                        </CardBody>
                    </Card >

                    {/* ✨ NEW SECTION: วันส่งงาน (Due Date Selection) */}
                    <Card className="shadow-md">
                        <CardHeader
                            title="วันส่งงาน (Due Date)"
                            className="text-rose-700"
                        />
                        <CardBody className="!p-4 space-y-4 sm:!p-6">
                            {!formData.jobTypeId && selectedJobTypes.length === 0 ? (
                                <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded border border-dashed text-center">
                                    กรุณาเลือกประเภทงานก่อน จึงจะสามารถเลือกวันส่งงานได้
                                </div>
                            ) : (
                                <>
                                    <AcceptanceDatePicker
                                        // ส่งข้อมูล Job Type พร้อม Total SLA สำหรับ Sequential Jobs
                                        jobType={(() => {
                                            if (selectedJobTypes.length > 0) {
                                                const totalSLA = getEffectiveSla();
                                                return {
                                                    ...selectedJobTypes[0],
                                                    sla: totalSLA,
                                                    name: `${selectedJobTypes.length} งานต่อเนื่อง (Critical Path SLA: ${totalSLA} วัน)`
                                                };
                                            } else {
                                                // Single job
                                                return masterData.jobTypes.find(t => t.id === parseInt(formData.jobTypeId));
                                            }
                                        })()}

                                        // ส่ง Priority สำหรับ validation
                                        priority={formData.priority}

                                        // รับค่า Due Date ที่เลือกกลับมา
                                        selectedDate={formData.dueDate}
                                        onChange={(date) => {
                                            setFormData(prev => ({ ...prev, dueDate: date }));
                                        }}

                                        // ข้อมูลวันหยุดและ SLA logic
                                        holidays={holidays}
                                        disabled={isSubmitting}
                                    />

                                    {/* หมายเหตุเพิ่มเติม */}
                                    <p className="text-xs text-gray-400 mt-2">
                                        * เลือกวันที่ต้องการให้ส่งงาน - ระบบจะคำนวณวันเริ่มงานโดยอัตโนมัติตาม SLA
                                    </p>
                                </>
                            )}
                        </CardBody>
                    </Card>

                    {/* ส่วนที่ 2: รายละเอียดงาน (Brief) */}
                    < Card >
                        <CardHeader title="รายละเอียดงาน (Brief)" badge="2" />
                        <CardBody className="!p-4 space-y-4 sm:!p-6">
                            <div>
                                <FormTextarea
                                    label="วัตถุประสงค์และรายละเอียด (Objective & Details)"
                                    name="objective"
                                    // optional
                                    rows="4"
                                    placeholder="อธิบายรายละเอียดงาน, วัตถุประสงค์, กลุ่มเป้าหมาย หรือสิ่งที่ต้องการให้บริษัทรับทราบ..."
                                    value={formData.objective}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* ส่วน Headline, Sub-headline, Selling Points, Price ถูกลบออกตาม implementation plan */}
                            {/* Brief Link แยกเป็น section เฉพาะด้านล่าง */}
                        </CardBody>
                    </Card >

                    {/* ส่วนที่ 3: ลิงค์รายละเอียด (Brief Link) - บังคับกรอก */}
                    < Card >
                        <CardHeader title="ลิงค์รายละเอียด (Brief Link)" badge="3" />
                        <CardBody className="space-y-4">
                            {formData.briefLink ? (
                                /* Brief Link - แสดงเป็น Card เมื่อมีลิงค์ */
                                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-green-800">✓ แนบลิงค์เรียบร้อยแล้ว</p>
                                            <a
                                                href={formData.briefLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-green-600 hover:underline truncate block"
                                            >
                                                {formData.briefLink}
                                            </a>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, briefLink: '' }));
                                            setTempBriefLink(formData.briefLink); // เอาลิงค์เดิมกลับมาแก้ได้ง่ายๆ
                                        }}
                                        className="text-gray-400 hover:text-red-500 ml-2"
                                        title="แก้ไขลิงค์"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                /* Brief Link Input - แสดงตอนยังไม่มีลิงค์ */
                                <div className="space-y-3">
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-800 font-medium mb-2">⚠️ จำเป็นต้องใส่ลิงค์เพื่อส่งงาน</p>
                                        <p className="text-xs text-amber-600">กรุณาใส่ลิงค์ Google Drive, Notion หรือเอกสารออนไลน์ที่มีรายละเอียดงาน</p>
                                    </div>

                                    <div className="flex flex-col gap-2 items-stretch sm:flex-row sm:items-start">
                                        <div className="flex-1">
                                            <FormInput
                                                label="ลิงค์รายละเอียด (Brief Link) *"
                                                name="tempBriefLink"
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                value={tempBriefLink}
                                                onChange={(e) => setTempBriefLink(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (tempBriefLink.trim()) {
                                                    setFormData(prev => ({ ...prev, briefLink: tempBriefLink.trim() }));
                                                }
                                            }}
                                            disabled={!tempBriefLink.trim()}
                                            className={`w-full sm:w-auto mt-0 sm:mt-6 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${tempBriefLink.trim()
                                                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            แนบลิงค์
                                        </button>
                                    </div>
                                </div>
                            )}

                        </CardBody>
                    </Card >
                </div >

                {/* === คอลัมน์ขวา: พรีวิวและดำเนินการ (Info Panels & Actions) === */}
                < div className="space-y-4 md:space-y-6" >

                    {/* พรีวิวลำดับการอนุมัติ (Approval Flow Preview) */}
                    < Card >
                        <CardHeader title="ลำดับการอนุมัติ" badge="4" />
                        <CardBody>
                            {approvalFlow ? (
                                <div className="relative">
                                    {/* เส้นเชื่อมต่อ (Vertical Line) */}
                                    <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-gray-200"></div>

                                    <div className="space-y-6">
                                        {/* รายการแต่ละลำดับ (Levels) */}
                                        {approvalFlow.levels?.map((level, idx) => (
                                            <div key={idx} className="relative pl-8">
                                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 z-10 bg-white ${idx === 0 ? 'border-blue-500' : 'border-purple-500'
                                                    }`}></div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ลำดับที่ {level.level}</p>
                                                        {level.approvers?.length > 1 && (
                                                            <span className={`text-[9px] px-1 rounded font-bold ${level.logic === 'all' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
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
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-400 border-dashed">
                                    <p className="text-sm text-gray-500">ยังไม่มีการกำหนดลำดับการอนุมัติ</p>
                                    <p className="text-xs text-green-600 mt-1 font-medium">✨ อนุมัติอัตโนมัติ (Auto Approve)</p>
                                </div>
                            )}
                        </CardBody>
                    </Card >



                    {/* SLA Preview (ส่วนที่ 5) */}
                    <Card>
                        <CardHeader title="SLA Preview" badge="5" />
                        <CardBody>
                            <div className="bg-rose-50 rounded-xl p-6 text-center border border-rose-100 mb-4">
                                <p className="text-gray-500 text-sm mb-1">Calculated Deadline</p>
                                <h2 className="text-3xl font-bold text-rose-600 mb-1">
                                    {(() => {
                                        if (formData.dueDate) {
                                            return formatDateToThai(new Date(formData.dueDate));
                                        }

                                        return '-';
                                    })()}
                                </h2>
                                <p className="text-gray-400 text-xs">
                                    {getEffectiveSla()} Working Days
                                </p>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Submit Date:</span>
                                    <span className="font-medium text-gray-900">
                                        {new Date().toLocaleDateString('th-TH', {
                                            day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">SLA Days:</span>
                                    <span className="font-medium text-gray-900">
                                        {getEffectiveSla()} Working Days
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Holidays Excluded:</span>
                                    <span className="font-bold text-orange-500">
                                        {(() => {
                                            // คำนวณ Due Date แบบ Real-time
                                            let calculatedDueDate = null;
                                            let sla = 7;

                                            if (selectedJobTypes.length > 0) {
                                                const timeline = calculateTimeline();
                                                if (timeline.length > 0) {
                                                    const maxDate = new Date(Math.max(...timeline.map(t => new Date(t.calculatedDueDate))));
                                                    calculatedDueDate = maxDate;
                                                    // For sequential, estimated SLA is vague. We use Max SLA of single job for calculation baseline?
                                                    // Or we just accept that (Diff - SLA) might be approximate.
                                                    // Improved: Use the SLA of the job that finishes last?
                                                    // Let's stick to Max SLA for now to avoid complexity in this ephemeral generic check.
                                                    sla = Math.max(...selectedJobTypes.map(jt => jt.sla || 7));
                                                }
                                            } else {
                                                const singleJobType = masterData.jobTypes.find(t => t.id === parseInt(formData.jobTypeId));
                                                if (singleJobType?.sla) {
                                                    sla = singleJobType.sla;
                                                    calculatedDueDate = calculateDueDate(new Date(), sla, holidays);
                                                }
                                            }

                                            if (!calculatedDueDate) return '-';

                                            const start = new Date();
                                            const end = new Date(calculatedDueDate);
                                            // Diff in days (Calendar Days)
                                            const diffTime = Math.abs(end - start);
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            // Excluded = Total Calendar Days - SLA Working Days
                                            return `${diffDays - sla} วัน (ส-อา)`;
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Calendar Visualization - Mini Calendar with Navigation */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                {(() => {
                                    const sla = getEffectiveSla();
                                    const calculatedDueDate = formData.dueDate ? new Date(formData.dueDate) : null;

                                    if (!calculatedDueDate) {
                                        return (
                                            <div className="text-center text-gray-400 text-sm py-4">
                                                กรุณาเลือกประเภทงานเพื่อดูปฏิทิน
                                            </div>
                                        );
                                    }

                                    const today = new Date();
                                    const dueDate = new Date(calculatedDueDate);

                                    // สร้าง Holiday Set สำหรับเช็ค
                                    const holidaySet = new Set(
                                        holidays.map(h => {
                                            const dateStr = typeof h === 'string' ? h : (h.date || h.Day);
                                            const d = new Date(dateStr);
                                            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                                        })
                                    );

                                    // ใช้ State สำหรับเดือนที่แสดง (รองรับการเลื่อนดูเดือนอื่น)
                                    const displayMonth = calendarMonth;
                                    const displayYear = calendarYear;
                                    const firstDayOfMonth = new Date(displayYear, displayMonth, 1);
                                    const lastDayOfMonth = new Date(displayYear, displayMonth + 1, 0);
                                    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

                                    // สร้าง Array วันในเดือน
                                    const daysInMonth = [];

                                    // เติมช่องว่างก่อนวันที่ 1
                                    for (let i = 0; i < startDayOfWeek; i++) {
                                        daysInMonth.push(null);
                                    }

                                    // เติมวันในเดือน
                                    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
                                        daysInMonth.push(day);
                                    }

                                    // ฟังก์ชันเช็ควันหยุดสุดสัปดาห์
                                    const isWeekend = (day) => {
                                        const date = new Date(displayYear, displayMonth, day);
                                        return date.getDay() === 0 || date.getDay() === 6;
                                    };

                                    // ฟังก์ชันเช็ควันหยุดนักขัตฤกษ์
                                    const isHolidayDay = (day) => {
                                        return holidaySet.has(`${displayYear}-${displayMonth}-${day}`);
                                    };

                                    // ฟังก์ชันเช็ควันนี้
                                    const isToday = (day) => {
                                        return day === today.getDate() &&
                                            displayMonth === today.getMonth() &&
                                            displayYear === today.getFullYear();
                                    };

                                    // ฟังก์ชันเช็คว่าเป็น Deadline หรือไม่
                                    const isDeadline = (day) => {
                                        return day === dueDate.getDate() &&
                                            displayMonth === dueDate.getMonth() &&
                                            displayYear === dueDate.getFullYear();
                                    };

                                    // ฟังก์ชันเช็คว่าเป็นวันทำการระหว่าง Today ถึง Deadline
                                    const isWorkingDay = (day) => {
                                        const date = new Date(displayYear, displayMonth, day);
                                        date.setHours(0, 0, 0, 0);
                                        const todayStart = new Date(today);
                                        todayStart.setHours(0, 0, 0, 0);
                                        const dueDateEnd = new Date(dueDate);
                                        dueDateEnd.setHours(23, 59, 59, 999);

                                        // ต้องอยู่ระหว่าง Today และ Deadline
                                        if (date < todayStart || date > dueDateEnd) return false;

                                        // ต้องไม่ใช่วันหยุดสุดสัปดาห์และวันหยุดนักขัตฤกษ์
                                        const dateKey = `${displayYear}-${displayMonth}-${day}`;
                                        if (isWeekend(day) || holidaySet.has(dateKey)) return false;

                                        return true;
                                    };

                                    // ฟังก์ชันเลื่อนเดือน
                                    const goToPrevMonth = () => {
                                        if (displayMonth === 0) {
                                            setCalendarMonth(11);
                                            setCalendarYear(displayYear - 1);
                                        } else {
                                            setCalendarMonth(displayMonth - 1);
                                        }
                                    };

                                    const goToNextMonth = () => {
                                        if (displayMonth === 11) {
                                            setCalendarMonth(0);
                                            setCalendarYear(displayYear + 1);
                                        } else {
                                            setCalendarMonth(displayMonth + 1);
                                        }
                                    };

                                    // ตรวจสอบว่า Deadline อยู่เดือนอื่นหรือไม่
                                    const deadlineInDifferentMonth = dueDate.getMonth() !== today.getMonth() ||
                                        dueDate.getFullYear() !== today.getFullYear();

                                    // ชื่อเดือนภาษาไทย (แบบย่อ)
                                    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                                        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

                                    return (
                                        <div className="border border-gray-400 rounded-lg p-2.5 sm:p-3">
                                            {/* Header พร้อมปุ่มเลื่อนเดือน */}
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    type="button"
                                                    onClick={goToPrevMonth}
                                                    className="h-8 w-8 sm:h-6 sm:w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="เดือนก่อนหน้า"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <p className="text-xs text-gray-600 font-medium">
                                                    {thaiMonthsShort[displayMonth]} {displayYear + 543}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={goToNextMonth}
                                                    className="h-8 w-8 sm:h-6 sm:w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="เดือนถัดไป"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Header วันในสัปดาห์ */}
                                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs mb-1">
                                                <span className="text-gray-400">อา</span>
                                                <span className="text-gray-400">จ</span>
                                                <span className="text-gray-400">อ</span>
                                                <span className="text-gray-400">พ</span>
                                                <span className="text-gray-400">พฤ</span>
                                                <span className="text-gray-400">ศ</span>
                                                <span className="text-gray-400">ส</span>
                                            </div>

                                            {/* วันในเดือน */}
                                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs">
                                                {daysInMonth.map((day, index) => {
                                                    if (day === null) {
                                                        return <span key={index} className="min-h-[1.9rem] p-1 text-gray-300 sm:min-h-[1.5rem]">-</span>;
                                                    }

                                                    // กำหนด Style ตามประเภทวัน
                                                    let className = "min-h-[1.9rem] p-1 rounded sm:min-h-[1.5rem] ";

                                                    if (isDeadline(day)) {
                                                        // วัน Deadline - สีแดง
                                                        className += "bg-rose-500 text-white font-bold";
                                                    } else if (isToday(day)) {
                                                        // วันนี้ - สีเขียวเข้ม
                                                        className += "bg-green-500 text-white font-medium";
                                                    } else if (isWorkingDay(day)) {
                                                        // วันทำการ - สีเขียวอ่อน
                                                        className += "bg-green-100 text-green-700";
                                                    } else if (isWeekend(day) || isHolidayDay(day)) {
                                                        // วันหยุด - สีเทา
                                                        className += "text-gray-300";
                                                    } else {
                                                        className += "text-gray-600";
                                                    }

                                                    return (
                                                        <span key={index} className={className}>
                                                            {day}
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            {/* Legend */}
                                            <div className="flex gap-3 mt-3 text-xs justify-center flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 bg-green-500 rounded"></span> วันนี้
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 bg-green-100 border border-green-200 rounded"></span> ทำการ
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Deadline
                                                </span>
                                            </div>

                                            {/* แจ้งเตือนถ้า Deadline อยู่เดือนอื่น */}
                                            {deadlineInDifferentMonth && (
                                                <p className="text-xs text-center text-amber-600 mt-2 bg-amber-50 rounded py-1">
                                                    Deadline อยู่ {thaiMonthsShort[dueDate.getMonth()]} {dueDate.getFullYear() + 543}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardBody>
                    </Card>
                    < Card >
                        <CardHeader title="ความสมบูรณ์ของข้อมูล" />
                        <CardBody>
                            <div className="space-y-3">
                                <CheckItem label="ข้อมูลโครงการ" checked={!!formData.project} />
                                <CheckItem label="ประเภทงาน" checked={!!formData.jobType} />
                                <CheckItem label="หัวข้อรายการ" checked={!!formData.subject} />

                                <CheckItem label="ลิงค์รายละเอียด" checked={!!formData.briefLink} />
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-400">
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
                    </Card >

                    {/* ปุ่มดำเนินการ (Actions Panel) */}
                    < div className="space-y-3 pb-2 md:pb-0 lg:sticky lg:top-20" >
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
                        {/* Feature Pending: Save Draft
                        <Button type="button" variant="secondary" className="w-full" disabled={isSubmitting} onClick={handleSaveDraft}>
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกร่าง (Save Draft)'}
                        </Button>
                        */}
                    </div >

                </div >
            </div >

            {/* ============================================
          Block Modal - แสดงเมื่อไม่สามารถส่งงานได้
          ============================================ */}
            {
                showBlockModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                            <div className="p-6 border-b border-gray-400 flex justify-between items-center">
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
                            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
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
                )
            }

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
        </form >
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


/** @component ไอคอนเครื่องหมายถูก (Check Circle Icon) */
function CheckCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}

/** @component ไอคอนเครื่องหมายกากบาท (X Circle Icon) */
function XCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
