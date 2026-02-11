/**
 * @file AdminApprovalFlow.jsx
 * @description หน้าจอสำหรับจัดการขั้นตอนการอนุมัติ (Approval Flow) ในแต่ละโครงการ
 * 
 * กฎทางธุรกิจ (Business Rules):
 * 1. ใบขอเปิดเพลง (DJ) ต้องผ่านการอนุมัติตามลำดับขั้นตอนที่กำหนด (Level 1 → 2 → ...)
 * 2. หากผู้อนุมัติ (Approver) ปฏิเสธ (Reject) ใบงานจะถูกส่งกลับไปยังผู้สร้าง (Requester)
 * 3. ผู้รับผิดชอบงาน (Default Assignee) จะถูกกำหนดให้อัตโนมัติเมื่อผ่านการอนุมัติครบทุกขั้นตอน
 * 4. สามารถเปลี่ยนผู้รับผิดชอบงาน (Assignee) ได้ภายหลังหลังจากได้รับการอนุมัติแล้ว (Approved)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import { adminService } from '@shared/services/modules/adminService';
import { Card, CardHeader } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import { canApproveInProject, canBeAssignedInBud, hasRole, isAdmin as checkIsAdmin } from '@shared/utils/permission.utils';

import { PlusIcon, TrashIcon, UserGroupIcon, UserIcon, ArrowLongRightIcon, ArrowRightIcon, BriefcaseIcon, CheckCircleIcon, ExclamationCircleIcon, MagnifyingGlassIcon, PencilIcon, XMarkIcon, ExclamationTriangleIcon, BoltIcon, ForwardIcon } from '@heroicons/react/24/outline';
import AssignmentMatrix from './AssignmentMatrix'; // Import Matrix Component

/**
 * จานสีสำหรับใช้แสดงสัญลักษณ์โครงการ (Project Badges)
 * @type {string[]}
 */
const PROJECT_COLORS = [
    "from-rose-500 to-pink-600",
    "from-blue-500 to-indigo-600",
    "from-green-500 to-emerald-600",
    "from-purple-500 to-violet-600",
    "from-orange-500 to-amber-600",
    "from-cyan-500 to-teal-600",
    "from-red-500 to-rose-600",
    "from-slate-500 to-gray-600",
];

/**
 * สีประจำลำดับการอนุมัติ (Approver Level Colors)
 * @type {string[]}
 */
const LEVEL_COLORS = ['blue', 'purple', 'teal', 'pink', 'indigo'];

/**
 * AdminApprovalFlow Component
 * หน้าจัดการกำหนดขั้นตอนการทำงาน (Workflow) และสิทธิ์การทำงานร่วมกันในโครงการ
 */
export default function AdminApprovalFlow() {
    // === สถานะข้อมูล (States: Data) ===
    /** รายการโครงการทั้งหมด */
    const [projects, setProjects] = useState([]);
    /** รายการขั้นตอนการอนุมัติทั้งหมดของทุกโครงการ (สำหรับนับจำนวนและกรอง) */
    const [allApprovalFlows, setAllApprovalFlows] = useState([]);
    /** รายการขั้นตอนการอนุมัติของโครงการที่เลือก */
    const [currentProjectFlows, setCurrentProjectFlows] = useState([]);
    /** รายการผู้อนุมัติ (อ้างตามบทบาท) */
    const [approvers, setApprovers] = useState([]);
    /** รายการผู้รับงาน (อ้างตามบทบาท) */
    const [assignees, setAssignees] = useState([]);
    /** สถานะการโหลดข้อมูล */
    const [isLoading, setIsLoading] = useState(true);

    // === สถานะส่วนประสานงาน (States: UI) ===
    /** โครงการที่กำลังถูกเลือกในปัจจุบัน */
    const [selectedProject, setSelectedProject] = useState(null);
    /** ขั้นตอนการอนุมัติของโครงการที่เลือก */
    const [currentFlow, setCurrentFlow] = useState(null);
    /** อยู่ในโหมดแก้ไขหรือไม่ */
    const [isEditMode, setIsEditMode] = useState(false);
    /** คำค้นหาโครงการ */
    const [searchTerm, setSearchTerm] = useState('');
    /** ตัวกรองสถานะ Flow: 'all' (ทั้งหมด), 'hasFlow' (ระบุแล้ว), 'noFlow' (ยังไม่ระบุ) */
    const [flowFilter, setFlowFilter] = useState('all');

    // === สถานะแท็บ (UI State) ===
    const [activeTab, setActiveTab] = useState('flow'); // 'flow' | 'matrix'

    // === สถานะฟอร์มแก้ไข (States: Edit Form) ===
    /** รายการลำดับการอนุมัติที่กำลังแก้ไข */
    const [editLevels, setEditLevels] = useState([]);
    /** เปิดใช้งาน Team Lead Approval หรือไม่ */
    const [includeTeamLead, setIncludeTeamLead] = useState(false);
    /** ID ของ Team Lead ที่เลือก */
    const [teamLeadId, setTeamLeadId] = useState(null);

    // === V1 Extended: Job Type + Skip Approval States ===
    /** รายการ Job Types */
    const [jobTypes, setJobTypes] = useState([]);
    /** Job Type ที่เลือก (null = Default Flow สำหรับทุก Job Type) */
    const [selectedJobType, setSelectedJobType] = useState(null);
    /** ข้ามการอนุมัติหรือไม่ */
    const [skipApproval, setSkipApproval] = useState(false);
    /** ประเภทการมอบหมายอัตโนมัติ: manual, dept_manager, team_lead, specific_user */
    const [autoAssignType, setAutoAssignType] = useState('manual');
    /** ID ของผู้รับมอบหมายเฉพาะ */
    const [autoAssignUserId, setAutoAssignUserId] = useState(null);

    // === V1 Extended: Skip Approval Multi-Select States ===
    /** ข้อมูล Job Assignments ของโปรเจกต์ (jobType → assignee) */
    const [projectJobAssignments, setProjectJobAssignments] = useState([]);
    /** Job Type IDs ที่เลือกให้ข้ามการอนุมัติ */
    const [selectedJobTypesForSkip, setSelectedJobTypesForSkip] = useState([]);
    /** สถานะกำลังสร้าง Skip Flows */
    const [isCreatingSkipFlows, setIsCreatingSkipFlows] = useState(false);

    // === ทีมงานที่เกี่ยวข้องกับโครงการ (States: Responsible Team) ===
    /** รวมรายการผู้ใช้งานทุกคน (เพื่อการกรองตามขอบเขต) */
    const [allUsers, setAllUsers] = useState([]);
    /** รายชื่อทีมงานที่รับผิดชอบโครงการที่เลือก (แบ่งตามหน้าที่) */
    const [responsibleTeam, setResponsibleTeam] = useState({
        requesters: [], // ผู้เปิดงาน
        approvers: [],  // ผู้อนุมัติ
        assignees: []   // ผู้รับงาน
    });

    /** สถานะการแสดงข้อความแจ้งเตือน (Toast) */
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    /**
     * ดึงข้อมูลตั้งต้นจาก API
     * โหลดข้อมูลโครงการ, รายการขั้นตอนการอนุมัติ และผู้ใช้งานทั้งหมด
     * 
     * @async
     * @function loadData
     * @returns {Promise<void>}
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            // โหลดข้อมูลแบบ parallel แต่มี fallback ป้องกัน error
            let projectsData = [];
            let allFlowsData = []; // ✅ เพิ่ม: เก็บ Flows ทั้งหมด
            let usersData = [];
            let jobTypesData = [];

            try {
                projectsData = await api.getProjects() || [];
            } catch (e) {
                console.warn('Error loading projects:', e.message);
            }

            // ✅ โหลด Flows ทั้งหมดสำหรับการนับและกรอง
            try {
                allFlowsData = await adminService.getAllApprovalFlows() || [];
                console.log(`[ApprovalFlow] Loaded ${allFlowsData.length} flows total`);
            } catch (e) {
                console.warn('Error loading all approval flows:', e.message);
            }

            try {
                const usersResponse = await api.getUsers() || {};
                usersData = usersResponse.data || [];
            } catch (e) {
                console.warn('Error loading users:', e.message);
            }

            try {
                jobTypesData = await api.getJobTypes() || [];
            } catch (e) {
                console.warn('Error loading job types:', e.message);
            }

            setProjects(projectsData);
            setAllApprovalFlows(allFlowsData); // ✅ เก็บ Flows ทั้งหมด
            setAllUsers(usersData);
            setJobTypes((jobTypesData || []).filter(t => t.name !== 'Project Group (Parent)'));

            // คัดกรองผู้ใช้งานตามบทบาทพื้นฐาน เพื่อความสะดวกรวดเร็ว
            setApprovers(usersData.filter(u => hasRole(u, 'Approver') || hasRole(u, 'Admin')));
            setAssignees(usersData.filter(u => hasRole(u, 'Assignee')));

            // กำหนดโครงการแรกเป็นรายการที่ถูกเลือกโดยตั้งต้น
            if (projectsData.length > 0) {
                setSelectedProject(projectsData[0]);
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * useEffect Hook
     * โหลดข้อมูลทั้งหมดเมื่อเริ่มเปิดใช้คอมโพเน็นต์
     */
    useEffect(() => {
        loadData();
    }, []);

    /**
     * useEffect Hook สำหรับคัดกรองทีมงานที่รับผิดชอบตามโครงการที่เลือก
     * เมื่อโครงการเปลี่ยนไป จะทำการคัดกรอง Requesters, Approvers และ Assignees ที่มีสิทธิ์เฉพาะโครงการนั้น
     */
    useEffect(() => {
        if (selectedProject && allUsers.length > 0) {
            const projectId = selectedProject.id;
            const budId = selectedProject.budId;



            // คัดกรองผู้เปิดงาน (Requesters) ที่มีสิทธิ์ในโครงการนี้
            // ใช้ Multi-Role: ตรวจสอบ scopes ใน user.roles
            const reqs = allUsers.filter(u => {
                if (!hasRole(u, 'Requester')) return false;
                // Admin สามารถเปิดงานได้ทุกโครงการ
                if (checkIsAdmin(u)) return true;
                // Legacy support: allowedProjects, scopeLevel, scopeId
                if (u.allowedProjects?.includes(projectId)) return true;
                if (u.scopeLevel === 'Project' && u.scopeId === projectId) return true;
                // Multi-Role: ตรวจสอบ scopes array
                const requesterRole = u.roles?.find?.(r => r.name === 'Requester');
                if (requesterRole?.scopes) {
                    return requesterRole.scopes.some(s =>
                        s.level === 'tenant' ||
                        (s.level === 'bud' && s.scopeId === budId) ||
                        (s.level === 'project' && s.scopeId === projectId)
                    );
                }
                return true; // Fallback: ถ้าไม่มี scopes = tenant level
            });

            // คัดกรองผู้อนุมัติ (Approvers)
            // ใช้ Multi-Role: canApproveInProject helper
            const apps = allUsers.filter(u => {
                if (!hasRole(u, 'Approver') && !checkIsAdmin(u)) return false;
                if (checkIsAdmin(u)) return true; // Admin มีสิทธิ์ทุกโครงการ
                // ใช้ canApproveInProject จาก permission.utils
                return canApproveInProject(u, projectId, budId);
            });

            // คัดกรองผู้รับงาน (Assignees)
            // ใช้ Multi-Role: canBeAssignedInBud helper
            const asgs = allUsers.filter(u => {
                if (!hasRole(u, 'Assignee')) return false;
                // ใช้ canBeAssignedInBud จาก permission.utils
                return canBeAssignedInBud(u, budId, projectId);
            });

            setResponsibleTeam({
                requesters: reqs,
                approvers: apps,
                assignees: asgs
            });

            console.log('[ApprovalFlow] Loaded Users:', allUsers.length);
            if (allUsers.length > 0) {
                console.log('[ApprovalFlow] User Sample:', JSON.stringify(allUsers[0], null, 2));
            }
            console.log('[ApprovalFlow] Filtered Requesters:', reqs.length);
            console.log('[ApprovalFlow] Filtered Approvers:', apps.length);
            console.log('[ApprovalFlow] Filtered Assignees:', asgs.length);
        }
    }, [selectedProject, allUsers]);

    /**
     * useEffect Hook: Load flow data when selected project changes
     */
    useEffect(() => {
        if (selectedProject?.id && allApprovalFlows.length >= 0) {
            // ✅ กรอง Flows จาก allApprovalFlows ที่โหลดไว้แล้ว
            const projectFlows = allApprovalFlows.filter(f => f.projectId === selectedProject.id);
            setCurrentProjectFlows(projectFlows);

            // Find default flow
            const defaultFlow = projectFlows.find(f => f.jobTypeId === null);

            if (defaultFlow) {
                setEditLevels(defaultFlow.levels || []);
                setIncludeTeamLead(defaultFlow.includeTeamLead || false);
                setTeamLeadId(defaultFlow.teamLeadId || null);
                setSkipApproval(defaultFlow.skipApproval || false);
                setCurrentFlow(defaultFlow);
            } else {
                // Reset if no default flow
                setEditLevels([]);
                setIncludeTeamLead(false);
                setTeamLeadId(null);
                setSkipApproval(false);
                setCurrentFlow(null);
            }

            // RESTORE SKIP FLOWS SELECTION
            const skipFlows = projectFlows.filter(f => f.skipApproval === true && f.jobTypeId !== null);
            const skippedJobTypeIds = skipFlows.map(f => f.jobTypeId);
            setSelectedJobTypesForSkip(skippedJobTypeIds);
        }
    }, [selectedProject, allApprovalFlows]); // ✅ Depend on allApprovalFlows

    /**
     * โหลด Job Assignments ของโปรเจกต์ปัจจุบัน
     * ใช้เมื่อเปลี่ยน project หรือเมื่อ Assignment Matrix มีการอัพเดท
     *
     * @async
     * @function fetchJobAssignments
     */
    const fetchJobAssignments = async () => {
        if (selectedProject?.id) {
            try {
                const assignments = await adminService.getProjectJobAssignments(selectedProject.id);
                setProjectJobAssignments(assignments || []);
                console.log('[ApprovalFlow] ✅ Refreshed job assignments:', assignments?.length || 0);
            } catch (error) {
                console.error('[ApprovalFlow] Error fetching job assignments:', error);
                setProjectJobAssignments([]);
            }
        }
    };

    /**
     * useEffect Hook สำหรับดึงข้อมูล Job Assignments เมื่อเปลี่ยนโปรเจกต์
     */
    useEffect(() => {
        fetchJobAssignments();
    }, [selectedProject]);

    // === ส่วนงานประมวลผล (Actions) ===

    /**
     * บันทึกข้อมูลลำดับการอนุมัติ (Approval Flow)
     * บันทึกทั้งข้อมูลโครงการ, ลำดับผู้ตรวจสอบ และการตั้งค่า Team Lead
     * 
     * @async
     * @function handleSaveFlow
     * @returns {Promise<void>}
     */
    const handleSaveFlow = async () => {
        try {
            // Default Flow: always skipApproval = false, jobTypeId = null (apply to all)
            const flowData = {
                projectId: selectedProject.id,
                projectName: selectedProject.name,
                // Default flow applies to ALL job types (except those with specific skip flows)
                jobTypeId: null,
                skipApproval: skipApproval, // Use state value
                autoAssignType: null,
                autoAssignUserId: null,
                // Approval flow settings
                levels: editLevels,
                includeTeamLead: includeTeamLead,
                teamLeadId: includeTeamLead ? teamLeadId : null
            };

            if (currentFlow) {
                await api.updateApprovalFlow(currentFlow.id, flowData);
            } else {
                await api.createApprovalFlow(flowData);
            }

            showToast('บันทึกขั้นตอนการอนุมัติสำเร็จ!', 'success');
            setIsEditMode(false);
            loadData(); // โหลดข้อมูลใหม่เพื่อแสดงผลล่าสุด
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
        }
    };

    /**
     * สร้าง Skip Approval Flows สำหรับ Job Types ที่เลือก (Bulk Creation)
     * ดึง assignee จาก project_job_assignments โดยอัตโนมัติ
     *
     * @async
     * @function handleCreateSkipFlows
     * @returns {Promise<void>}
     */
    const handleCreateSkipFlows = async () => {
        if (selectedJobTypesForSkip.length === 0) {
            showToast('กรุณาเลือกอย่างน้อย 1 ประเภทงาน', 'error');
            return;
        }

        // ตรวจสอบว่า Job Types ที่เลือกมี assignee ครบหรือไม่
        const missingAssignees = selectedJobTypesForSkip.filter(jtId => {
            const assignment = projectJobAssignments.find(a => a.jobTypeId === jtId);
            return !assignment?.assigneeId;
        });

        if (missingAssignees.length > 0) {
            const missingNames = missingAssignees.map(jtId => {
                const jt = jobTypes.find(j => j.id === jtId);
                return jt?.name || `ID: ${jtId}`;
            }).join(', ');
            showToast(`ไม่สามารถสร้าง Skip Flow ได้: ${missingNames} ยังไม่ได้กำหนดผู้รับงาน`, 'error');
            return;
        }

        setIsCreatingSkipFlows(true);
        try {
            const result = await adminService.createBulkFlowsFromAssignments({
                projectId: selectedProject.id,
                jobTypeIds: selectedJobTypesForSkip,
                skipApproval: true,
                name: `Skip Approval Flow - ${selectedProject.name}`
            });

            showToast(`สร้าง Skip Approval สำเร็จ ${result.created || selectedJobTypesForSkip.length} รายการ`, 'success');
            setSelectedJobTypesForSkip([]);
            loadData(); // โหลดข้อมูลใหม่
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการสร้าง Skip Flows: ' + error.message, 'error');
        } finally {
            setIsCreatingSkipFlows(false);
        }
    };

    /**
     * Toggle การเลือก Job Type สำหรับ Skip Approval
     *
     * @function toggleJobTypeForSkip
     * @param {number} jobTypeId - ID ของ Job Type
     * @returns {void}
     */
    const toggleJobTypeForSkip = (jobTypeId) => {
        setSelectedJobTypesForSkip(prev =>
            prev.includes(jobTypeId)
                ? prev.filter(id => id !== jobTypeId)
                : [...prev, jobTypeId]
        );
    };

    /**
     * เพิ่มขั้นตอนการอนุมัติใหม่ (Add Level)
     *
     * @function handleAddLevel
     * @returns {void}
     */
    const handleAddLevel = () => {
        const newLevel = {
            level: editLevels.length + 1,
            approvers: [], // รายการผู้มีสิทธิ์อนุมัติในระดับนี้ (Pool)
            logic: 'any', // ตรรกะการอนุมัติ: 'any' (คนเดียวพ้น) หรือ 'all' (ทุกคนต้องอนุมัติ)
            canSkip: false
        };
        setEditLevels([...editLevels, newLevel]);
    };

    /**
     * ลบขั้นตอนการอนุมัติ (Remove Level)
     * ระบบจะทำการจัดลำดับเลข Level ใหม่โดยอัตโนมัติ
     * 
     * @function handleRemoveLevel
     * @param {number} index - ลำดับของ Level ที่ต้องการลบ (0-indexed)
     * @returns {void}
     */
    const handleRemoveLevel = (index) => {
        const updated = editLevels.filter((_, i) => i !== index);
        // จัดลำดับเลข Level ใหม่ (Re-number levels)
        const renumbered = updated.map((l, i) => ({ ...l, level: i + 1 }));
        setEditLevels(renumbered);
    };

    /**
     * เพิ่มผู้อนุมัติรายบุคคลเข้าในกลุ่ม (Pool) ของขั้นตอนที่กำหนด
     * 
     * @function handleAddApproverToLevel
     * @param {number} levelIndex - ลำดับขั้นตอน (0-indexed)
     * @param {string|number} userId - ID ของผู้ใช้งานที่ต้องการเพิ่มเป็นผู้อนุมัติ
     * @returns {void}
     */
    const handleAddApproverToLevel = (levelIndex, userId) => {
        if (!userId) return;
        const user = allUsers.find(u => u.id == userId);
        if (!user) return;

        const updated = [...editLevels];
        const level = updated[levelIndex];

        // ป้องกันการเลือกซ้ำในระดับเดียวกัน (Prevent duplicate add)
        if (level.approvers.some(a => a.userId == userId)) return;

        // ประกอบชื่อเต็มสำหรับการแสดงผล
        const userName = [user.prefix, user.firstName || user.name, user.lastName].filter(Boolean).join(' ').trim() || user.email;

        level.approvers.push({
            userId: userId,
            name: userName,
            role: user.roles?.join(', ') || 'Approver'
        });

        setEditLevels(updated);
    };

    /**
     * นำผู้อนุมัติออกจากกลุ่ม (Pool) ของขั้นตอนที่กำหนด
     * 
     * @function handleRemoveApproverFromLevel
     * @param {number} levelIndex - ลำดับขั้นตอน (0-indexed)
     * @param {string|number} approverUserId - ID ของผู้ใช้งานที่ต้องการเอาออก
     * @returns {void}
     */
    const handleRemoveApproverFromLevel = (levelIndex, approverUserId) => {
        const updated = [...editLevels];
        updated[levelIndex].approvers = updated[levelIndex].approvers.filter(a => a.userId !== approverUserId);
        setEditLevels(updated);
    };

    /**
     * แสดงข้อความแจ้งเตือน (Toast Notification)
     * 
     * @function showToast
     * @param {string} message - ข้อความที่ต้องการแสดง
     * @param {string} type - ประเภท ('success' หรือ 'error')
     * @returns {void}
     */
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // === ส่วนการกรองข้อมูล (Filter Logic) ===
    /**
     * คัดกรองรายการโครงการตามคำค้นหาและสถานะการตั้งค่า Flow
     */
    const filteredProjects = projects.filter(p => {
        // ค้นหาจากชื่อหรือรหัส (Text search)
        const matchText = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchTerm.toLowerCase());

        // กรองตามสถานะการตั้งค่า Flow (Flow status filter)
        // ✅ ใช้ allApprovalFlows แทน approvalFlows
        const hasFlow = allApprovalFlows.some(f => f.projectId === p.id);
        const matchFlow = flowFilter === 'all' ? true :
            flowFilter === 'hasFlow' ? hasFlow :
                flowFilter === 'noFlow' ? !hasFlow : true;

        return matchText && matchFlow;
    });

    // ============================================
    // Render
    // ============================================
    if (isLoading) {
        return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        : <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                    }
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* ส่วนหัวของหน้า (Page Header) */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">กำหนดลำดับการอนุมัติ (Approval Flow Configuration)</h1>
                    <p className="text-gray-500">ตั้งค่าผู้อนุมัติและลำดับการตรวจสอบงานรายโครงการ</p>
                </div>
                {/* ปุ่มโหลดข้อมูลใหม่ (สำหรับ Debug เมื่อข้อมูลหาย) */}
                {projects.length === 0 && !isLoading && (
                    <Button
                        variant="secondary"
                        onClick={() => {
                            localStorage.removeItem('dj_system_projects');
                            localStorage.removeItem('dj_system_approvalFlows');
                            window.location.reload();
                        }}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        โหลดข้อมูลใหม่
                    </Button>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="w-96 border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 space-y-3">
                        {/* Search Input */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="ค้นหาโครงการ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
                            />
                        </div>
                        {/* ตัวกรองสถานะ Flow - รูปแบบ Pill (Flow Status Filter) */}
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFlowFilter('all')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                ทั้งหมด ({projects.length})
                            </button>
                            <button
                                onClick={() => setFlowFilter('hasFlow')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'hasFlow'
                                    ? 'bg-white text-green-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                ตั้งค่าแล้ว ({projects.filter(p => allApprovalFlows.some(f => f.projectId === p.id)).length})
                            </button>
                            <button
                                onClick={() => setFlowFilter('noFlow')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'noFlow'
                                    ? 'bg-white text-red-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                ยังไม่ตั้งค่า ({projects.filter(p => !allApprovalFlows.some(f => f.projectId === p.id)).length})
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredProjects.map((project, index) => {
                            // ✅ ใช้ allApprovalFlows แทน approvalFlows
                            const flow = allApprovalFlows.find(f => f.projectId === project.id && f.jobTypeId === null);
                            const color = PROJECT_COLORS[index % PROJECT_COLORS.length];
                            const approverCount = flow?.levels?.length || 0;
                            const hasAssignee = flow?.defaultAssignee ? 1 : 0;

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProject(project)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer border-l-4 transition-colors ${selectedProject?.id === project.id
                                        ? 'bg-rose-50 border-l-rose-500'
                                        : 'hover:bg-gray-50 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                                                {project.code?.substring(0, 3) || '?'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 text-sm">{project.name}</h4>
                                                <p className="text-xs text-gray-500">ID: {project.id}</p>
                                            </div>
                                        </div>
                                        {/* ป้ายแสดงสถานะ Flow (Flow Status Badge) */}
                                        {flow ? (
                                            <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-green-50 text-green-700">
                                                ตั้งค่าแล้ว
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-gray-100 text-gray-500">
                                                ยังไม่ตั้งค่า
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <UserGroupIcon className="w-3.5 h-3.5" /> {approverCount} ผู้อนุมัติ
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BriefcaseIcon className="w-3.5 h-3.5" /> {hasAssignee} ผู้รับงาน
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded p-2 border border-gray-100">
                                <p className="font-bold text-gray-900">{projects.length}</p>
                                <p className="text-xs text-gray-500">โครงการทั้งหมด</p>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-100">
                                <p className="font-bold text-gray-900">{new Set(allApprovalFlows.map(f => f.projectId)).size}</p>
                                <p className="text-xs text-gray-500">ที่มีการตั้งค่าแล้ว</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Detail & Flow */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {selectedProject ? (
                        <>
                            {/* Project Header */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                                <div className={`p-6 bg-gradient-to-r ${PROJECT_COLORS[projects.indexOf(selectedProject) % PROJECT_COLORS.length]}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">
                                                {selectedProject.code?.substring(0, 3) || '?'}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
                                                <p className="text-white/80">Project ID: {selectedProject.id}</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full backdrop-blur-sm">
                                            {currentFlow ? 'ใช้งาน (Active)' : 'ยังไม่มีข้อมูล (No Flow)'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                                    <div className="text-sm text-gray-500">
                                        {currentFlow
                                            ? `อัปเดตล่าสุด: ${new Date(currentFlow.updatedAt).toLocaleDateString('th-TH')}`
                                            : 'ยังไม่มี Flow สำหรับโครงการนี้'
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant={isEditMode ? "secondary" : "primary"} onClick={() => setIsEditMode(!isEditMode)}>
                                            {isEditMode ? 'ยกเลิก (Cancel)' : <><PencilIcon className="w-4 h-4" /> แก้ไขลำดับการอนุมัติ (Edit Flow)</>}
                                        </Button>
                                    </div>
                                </div>
                            </div>



                            {/* Flow Diagram */}
                            {!isEditMode && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                    <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                        แผนผังลำดับการอนุมัติ (Approval Flow Diagram)
                                    </h4>

                                    <div className="flex items-center justify-center gap-2 overflow-x-auto py-8">
                                        {/* Start */}
                                        <Node icon={<PlusIcon className="w-6 h-6 text-gray-500" />} label="สร้าง DJ" />
                                        <Arrow />

                                        {/* Dynamic Approvers */}
                                        {currentFlow?.levels?.map((level, idx) => (
                                            <React.Fragment key={level.level}>
                                                <ApproverNode
                                                    step={level.level}
                                                    approvers={level.approvers || []}
                                                    logic={level.logic || 'any'}
                                                    color={LEVEL_COLORS[idx % LEVEL_COLORS.length]}
                                                />
                                                <Arrow />
                                            </React.Fragment>
                                        ))}

                                        {/* Assignee */}
                                        {currentFlow?.defaultAssignee ? (
                                            <>
                                                <AssigneeNode
                                                    name={currentFlow.defaultAssignee.name}
                                                    role={currentFlow.defaultAssignee.role}
                                                />
                                                <Arrow />
                                            </>
                                        ) : null}

                                        {/* End */}
                                        <Node icon={<CheckCircleIcon className="w-6 h-6 text-green-600" />} label="เสร็จสิ้น" color="bg-green-100 border-green-300" />
                                    </div>

                                    {!currentFlow && (
                                        <div className="text-center py-8 text-gray-500">
                                            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                            <p>ยังไม่มี Approval Flow สำหรับโครงการนี้</p>
                                            <p className="text-sm">กด "Edit Flow" เพื่อสร้างใหม่</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Flow Summary - Job Type Breakdown */}
                            {!isEditMode && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <BriefcaseIcon className="w-5 h-5 text-gray-500" />
                                        สรุปการตั้งค่า Flow ตามประเภทงาน
                                    </h4>

                                    {(() => {
                                        // Calculate job type breakdown
                                        const skipFlowJobTypes = allApprovalFlows
                                            .filter(f => f.projectId === selectedProject?.id && f.skipApproval === true && f.jobTypeId)
                                            .map(f => {
                                                const jt = jobTypes.find(j => j.id === f.jobTypeId);
                                                const assignment = projectJobAssignments.find(a => a.jobTypeId === f.jobTypeId);
                                                return {
                                                    id: f.jobTypeId,
                                                    name: jt?.name || `Job Type #${f.jobTypeId}`,
                                                    assigneeName: assignment?.assigneeName || 'ไม่ระบุ'
                                                };
                                            });

                                        const skipJobTypeIds = new Set(skipFlowJobTypes.map(j => j.id));
                                        const defaultFlowJobTypes = jobTypes.filter(jt => !skipJobTypeIds.has(jt.id));

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Skip Approval Job Types */}
                                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <ForwardIcon className="w-4 h-4 text-emerald-600" />
                                                            <span className="text-sm font-bold text-emerald-800">ข้ามการอนุมัติ</span>
                                                        </div>
                                                        <span className="bg-emerald-200 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                                            {skipFlowJobTypes.length} งาน
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                                        {skipFlowJobTypes.length > 0 ? skipFlowJobTypes.map(jt => (
                                                            <div key={jt.id} className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                                                                <span className="text-sm text-gray-800">{jt.name}</span>
                                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                                                    → {jt.assigneeName}
                                                                </span>
                                                            </div>
                                                        )) : (
                                                            <p className="text-xs text-gray-400 text-center py-3">ยังไม่มีงานที่ข้ามการอนุมัติ</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Default Flow Job Types */}
                                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                                                            <span className="text-sm font-bold text-indigo-800">ผ่านการอนุมัติ</span>
                                                        </div>
                                                        <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                                            {defaultFlowJobTypes.length} งาน
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                                        {defaultFlowJobTypes.length > 0 ? defaultFlowJobTypes.map(jt => (
                                                            <div key={jt.id} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100">
                                                                <span className="text-sm text-gray-800">{jt.name}</span>
                                                                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {currentFlow?.levels?.length || 0} ขั้นตอน
                                                                </span>
                                                            </div>
                                                        )) : (
                                                            <p className="text-xs text-gray-400 text-center py-3">ทุกงานถูกตั้งค่าข้ามการอนุมัติ</p>
                                                        )}
                                                    </div>
                                                    {!currentFlow && defaultFlowJobTypes.length > 0 && (
                                                        <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                                            <ExclamationCircleIcon className="w-4 h-4" />
                                                            ยังไม่ได้ตั้งค่า Default Flow
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Responsible Team Summary */}
                            <div className="bg-white border border-gray-200 rounded-xl mb-6 p-5">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <UserGroupIcon className="w-4 h-4 text-gray-500" /> ทีมงานที่รับผิดชอบโครงการ (Responsible Team)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Requesters */}
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                        <div className="text-xs font-bold text-green-800 mb-2 flex justify-between items-center">
                                            <span>Requester (ผู้เปิดงาน)</span>
                                            <span className="bg-green-200/50 px-2 py-0.5 rounded text-[10px]">{responsibleTeam.requesters.length}</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                            {responsibleTeam.requesters.length > 0 ? responsibleTeam.requesters.map(u => (
                                                <div key={u.id} className="text-xs text-gray-700 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                                    {[u.prefix, u.name, u.lastName].filter(Boolean).join(' ')}
                                                </div>
                                            )) : <p className="text-xs text-gray-400 text-center py-2">- ไม่มีผู้รับผิดชอบ -</p>}
                                        </div>
                                    </div>

                                    {/* Approvers */}
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="text-xs font-bold text-purple-800 mb-2 flex justify-between items-center">
                                            <span>Approver (ผู้อนุมัติ)</span>
                                            <span className="bg-purple-200/50 px-2 py-0.5 rounded text-[10px]">{responsibleTeam.approvers.length}</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                            {responsibleTeam.approvers.length > 0 ? responsibleTeam.approvers.map(u => (
                                                <div key={u.id} className="text-xs text-gray-700 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                                    {[u.prefix, u.name, u.lastName].filter(Boolean).join(' ')}
                                                    {hasRole(u, 'Admin') && <span className="text-[10px] text-gray-400">(Admin)</span>}
                                                </div>
                                            )) : <p className="text-xs text-gray-400 text-center py-2">- ไม่มีผู้รับผิดชอบ -</p>}
                                        </div>
                                    </div>

                                    {/* Assignees */}
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                        <div className="text-xs font-bold text-orange-800 mb-2 flex justify-between items-center">
                                            <span>Assignee (ผู้รับงาน)</span>
                                            <span className="bg-orange-200/50 px-2 py-0.5 rounded text-[10px]">{responsibleTeam.assignees.length}</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                            {responsibleTeam.assignees.length > 0 ? responsibleTeam.assignees.map(u => (
                                                <div key={u.id} className="text-xs text-gray-700 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                                    {[u.prefix, u.name, u.lastName].filter(Boolean).join(' ')}
                                                </div>
                                            )) : <p className="text-xs text-gray-400 text-center py-2">- ไม่มีผู้รับผิดชอบ -</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Edit Form */}
                            {isEditMode && (
                                <div className="mb-6 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden animate-fadeIn">
                                    {/* ส่วนหัวของฟอร์ม (Header) */}
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-30 backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                                                <PencilIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">แก้ไขการตั้งค่าโครงการ (Project Settings)</h3>
                                                <p className="text-xs text-gray-500">Project ID: {selectedProject.id}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsEditMode(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Tabs Selector */}
                                    <div className="flex border-b border-gray-200 bg-white sticky top-[73px] z-20">
                                        <button
                                            onClick={() => setActiveTab('flow')}
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'flow'
                                                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/30'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                <UserGroupIcon className="w-4 h-4" /> ลำดับการอนุมัติ (Approval Flow)
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('matrix')}
                                            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'matrix'
                                                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/30'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                <BriefcaseIcon className="w-4 h-4" /> กำหนดผู้รับงานอัตโนมัติ (Auto-Assign)
                                            </span>
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        {activeTab === 'flow' ? (
                                            <>
                                                {/* ============================================ */}
                                                {/* SECTION 1: ตั้งค่าขั้นตอนการอนุมัติ */}
                                                {/* ============================================ */}
                                                <div className="mb-8">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">ตั้งค่าขั้นตอนการอนุมัติ (Approval Flow)</h4>
                                                            <p className="text-xs text-gray-500">กำหนดลำดับขั้นตอนการอนุมัติสำหรับโครงการนี้</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200">

                                                        {/* Timeline Container - Approval Steps */}
                                                        <div className="relative pl-8 border-l-2 border-indigo-100 space-y-8 mb-8 ml-2">

                                                            {/* Empty State */}
                                                            {editLevels.length === 0 && (
                                                                <div className="relative">
                                                                    <div className="absolute -left-[2.45rem] top-0 w-4 h-4 rounded-full border-2 border-gray-300 bg-white"></div>
                                                                    <p className="text-gray-400 text-sm italic">ยังไม่มีขั้นตอนการอนุมัติ</p>
                                                                </div>
                                                            )}

                                                            {/* Approver Levels */}
                                                            {editLevels.map((level, index) => (
                                                                <div key={index} className="relative group">
                                                                    {/* Timeline Dot */}
                                                                    <div className={`absolute -left-[2.55rem] top-3 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center
                                                        ${index === 0 ? 'border-blue-500 text-blue-500' :
                                                                            index === 1 ? 'border-purple-500 text-purple-500' :
                                                                                'border-teal-500 text-teal-500'}`}>
                                                                        <span className="text-[10px] font-bold">{level.level}</span>
                                                                    </div>

                                                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
                                                                        <div className="flex items-center justify-between mb-4">
                                                                            <div>
                                                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                                                                                    ลำดับการอนุมัติที่ {level.level} (Approver Step)
                                                                                </label>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                                                        มีสิทธิ์อนุมัติทั้งหมด {level.approvers.length} คน
                                                                                    </span>
                                                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                                        <CheckCircleIcon className="w-3 h-3" />
                                                                                        {level.logic === 'any' ? 'ใครคนหนึ่งพ้น' : 'ต้องอนุมัติทุกคน'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-red-500" onClick={() => handleRemoveLevel(index)}>
                                                                                <TrashIcon className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>

                                                                        {/* รายการผู้อนุมัติ (Approvers List - Chips) */}
                                                                        <div className="flex flex-wrap gap-2 mb-4 bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-200">
                                                                            {level.approvers.length === 0 ? (
                                                                                <p className="text-xs text-gray-400 italic">ยังไม่ได้เพิ่มผู้อนุมัติ กรุณาเลือกจากรายการด้านล่าง</p>
                                                                            ) : (
                                                                                level.approvers.map(app => (
                                                                                    <div key={app.userId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm animate-fadeIn">
                                                                                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                                                            {app.name.substring(0, 1)}
                                                                                        </div>
                                                                                        <span className="text-xs font-semibold text-gray-700">{app.name}</span>
                                                                                        <button onClick={() => handleRemoveApproverFromLevel(index, app.userId)} className="text-gray-400 hover:text-red-500">
                                                                                            <XMarkIcon className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>

                                                                        {/* User Selector Dropdown */}
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-1">
                                                                                <FormSelect
                                                                                    className="text-sm bg-white"
                                                                                    onChange={(e) => handleAddApproverToLevel(index, e.target.value)}
                                                                                    value=""
                                                                                >
                                                                                    <option value="">+ เพิ่มผู้อนุมัติในกลุ่มนี้ (Add Approver to Pool)...</option>
                                                                                    {responsibleTeam.approvers.map(u => (
                                                                                        <option key={u.id} value={u.id}>
                                                                                            {[u.prefix, u.firstName || u.name, u.lastName].filter(Boolean).join(' ')}
                                                                                        </option>
                                                                                    ))}
                                                                                </FormSelect>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Add Button */}
                                                            <div className="relative pt-2">
                                                                <div className="absolute -left-[2.45rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-200 bg-indigo-50"></div>
                                                                <Button variant="outline" size="sm" onClick={handleAddLevel} className="border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 w-full justify-center py-3">
                                                                    <PlusIcon className="w-4 h-4" /> เพิ่มระดับอนุมัติ (Add Level)
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Team Lead Auto-Assign Option */}
                                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                                <UserGroupIcon className="w-24 h-24 text-blue-500" />
                                                            </div>

                                                            <div className="relative z-10">
                                                                <h5 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                                                                    <UserGroupIcon className="w-5 h-5" /> การมอบหมายงานอัตโนมัติ (Auto-Assignment)
                                                                    <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">หลังการอนุมัติ</span>
                                                                </h5>

                                                                <div className="bg-white p-4 rounded-lg border border-blue-200/50 shadow-sm">
                                                                    <label className="flex items-start gap-3 cursor-pointer group">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={includeTeamLead}
                                                                            onChange={(e) => setIncludeTeamLead(e.target.checked)}
                                                                            className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <span className="font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
                                                                                ✅ อนุญาตให้ Team Lead รับงานอัตโนมัติ
                                                                            </span>
                                                                            <p className="text-xs text-blue-600 mt-2 leading-relaxed">
                                                                                เมื่อเปิดใช้: งานที่ผ่านการอนุมัติครบแล้วจะถูกมอบหมายให้ Team Lead ของโครงการโดยอัตโนมัติ
                                                                            </p>
                                                                            <p className="text-xs text-blue-500 mt-1">
                                                                                หาก Team Lead ไม่มีหรือไม่ได้กำหนด ระบบจะมอบหมายให้ Department Manager แทน
                                                                            </p>
                                                                        </div>
                                                                    </label>

                                                                    {/* Team Lead Selector - แสดงเมื่อติ๊ก checkbox */}
                                                                    {includeTeamLead && (
                                                                        <div className="mt-4 pt-4 border-t border-blue-100">
                                                                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                                                                เลือก Team Lead สำหรับโครงการนี้
                                                                            </label>
                                                                            <select
                                                                                value={teamLeadId || ''}
                                                                                onChange={(e) => setTeamLeadId(e.target.value ? parseInt(e.target.value) : null)}
                                                                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                                                            >
                                                                                <option value="">-- กรุณาเลือก Team Lead --</option>
                                                                                {responsibleTeam.assignees.map(user => (
                                                                                    <option key={user.id} value={user.id}>
                                                                                        {user.displayName || user.display_name} ({user.email})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            {!teamLeadId && (
                                                                                <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                                                                    <ExclamationCircleIcon className="w-4 h-4" />
                                                                                    หากไม่เลือก Team Lead ระบบจะใช้ Department Manager แทน
                                                                                </p>
                                                                            )}
                                                                            {teamLeadId && (
                                                                                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                                    งานที่ผ่านการอนุมัติจะถูกมอบหมายให้ Team Lead ที่เลือกโดยอัตโนมัติ
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="mt-3 p-3 bg-blue-100/50 rounded-lg">
                                                                    <p className="text-xs text-blue-700 flex items-center gap-2">
                                                                        <ExclamationCircleIcon className="w-4 h-4" />
                                                                        <span>หากไม่มีทั้ง Team Lead และ Department Manager ระบบจะให้ Admin หรือ Department Manager เลือกผู้รับงานด้วยตนเอง</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ============================================ */}
                                                {/* SECTION 2: เลือกงานที่ต้องการข้ามการอนุมัติ */}
                                                {/* ============================================ */}
                                                <div className="mb-8">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">เลือกงานที่ต้องการข้ามการอนุมัติ (Skip Approval)</h4>
                                                            <p className="text-xs text-gray-500">งานที่เลือกจะส่งตรงไปยังผู้รับงานโดยไม่ต้องรอการอนุมัติ</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                                                        {/* Job Types Grid with Assignees */}
                                                        <div className="bg-white rounded-lg border border-emerald-200/50 p-4 mb-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {jobTypes.map(jt => {
                                                                    const assignment = projectJobAssignments.find(a => a.jobTypeId === jt.id);
                                                                    const hasAssignee = !!assignment?.assigneeId;
                                                                    const isSelected = selectedJobTypesForSkip.some(id => parseInt(id) === parseInt(jt.id));

                                                                    return (
                                                                        <div
                                                                            key={jt.id}
                                                                            onClick={() => hasAssignee && toggleJobTypeForSkip(jt.id)}
                                                                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                                                                ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                                                                                : hasAssignee
                                                                                    ? 'bg-white border-gray-200 hover:border-emerald-300'
                                                                                    : 'bg-orange-50 border-orange-200 cursor-not-allowed'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    disabled={!hasAssignee}
                                                                                    onChange={() => { hasAssignee && toggleJobTypeForSkip(jt.id); }}
                                                                                    className="w-4 h-4 text-emerald-600 disabled:opacity-50"
                                                                                />
                                                                                <span className="font-medium text-gray-800">{jt.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                {hasAssignee ? (
                                                                                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                                                        <UserIcon className="w-3 h-3" />
                                                                                        {assignment.assigneeName || 'มีผู้รับงาน'}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                                                        <ExclamationTriangleIcon className="w-3 h-3" />
                                                                                        ยังไม่กำหนดผู้รับงาน
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {jobTypes.length === 0 && (
                                                                <p className="text-center text-gray-400 py-4">ไม่พบประเภทงานในระบบ</p>
                                                            )}
                                                        </div>

                                                        <div className="text-xs text-emerald-600">
                                                            เลือกข้ามการอนุมัติ {selectedJobTypesForSkip.length} รายการ
                                                        </div>

                                                        {/* Warning Note */}
                                                        {projectJobAssignments.filter(a => !a.assigneeId).length > 0 && (
                                                            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                                <p className="text-xs text-amber-700 flex items-start gap-2">
                                                                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    <span>
                                                                        <strong>หมายเหตุ:</strong> งานที่ยังไม่มีผู้รับผิดชอบในตาราง Assignment Matrix
                                                                        จะไม่สามารถเลือกข้ามการอนุมัติได้ กรุณาตั้งค่าผู้รับงานก่อนในแท็บ "กำหนดผู้รับงานอัตโนมัติ"
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ============================================ */}
                                                {/* SECTION 3: สรุปก่อนบันทึก */}
                                                {/* ============================================ */}
                                                <div className="mb-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">สรุปก่อนบันทึก (Summary)</h4>
                                                            <p className="text-xs text-gray-500">ตรวจสอบการตั้งค่าก่อนบันทึก</p>
                                                        </div>
                                                    </div>

                                                    {(() => {
                                                        // Calculate summary
                                                        const skipJobTypes = jobTypes.filter(jt => selectedJobTypesForSkip.includes(jt.id));
                                                        const approvalJobTypes = jobTypes.filter(jt => !selectedJobTypesForSkip.includes(jt.id));

                                                        // Validation errors
                                                        const errors = [];
                                                        const warnings = [];

                                                        // Check: At least 1 approval level if there are jobs needing approval
                                                        if (approvalJobTypes.length > 0 && editLevels.length === 0) {
                                                            errors.push('กรุณาเพิ่มอย่างน้อย 1 ขั้นตอนการอนุมัติ สำหรับงานที่ต้องผ่านการอนุมัติ');
                                                        }

                                                        // Check: Each approval level has at least 1 approver
                                                        editLevels.forEach((level, idx) => {
                                                            if (level.approvers.length === 0) {
                                                                errors.push(`ระดับการอนุมัติที่ ${idx + 1} ยังไม่มีผู้อนุมัติ`);
                                                            }
                                                        });

                                                        // Check: Skip approval jobs have assignees
                                                        skipJobTypes.forEach(jt => {
                                                            const assignment = projectJobAssignments.find(a => a.jobTypeId === jt.id);
                                                            if (!assignment?.assigneeId) {
                                                                errors.push(`งาน "${jt.name}" ยังไม่มีผู้รับงาน (ไม่สามารถข้ามการอนุมัติได้)`);
                                                            }
                                                        });

                                                        // Warning: No team lead selected
                                                        if (includeTeamLead && !teamLeadId) {
                                                            warnings.push('ยังไม่ได้เลือก Team Lead ระบบจะใช้ Department Manager แทน');
                                                        }

                                                        const hasErrors = errors.length > 0;

                                                        return (
                                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                                                                {/* Summary Grid */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                                    {/* Approval Flow Jobs */}
                                                                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                                                                                <span className="text-sm font-bold text-indigo-800">ผ่านการอนุมัติ</span>
                                                                            </div>
                                                                            <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                                                                {approvalJobTypes.length} งาน
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                            {approvalJobTypes.length > 0 ? approvalJobTypes.map(jt => (
                                                                                <div key={jt.id} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100">
                                                                                    <span className="text-sm text-gray-800">{jt.name}</span>
                                                                                    <span className="text-xs text-indigo-600">
                                                                                        {editLevels.length} ขั้นตอน
                                                                                    </span>
                                                                                </div>
                                                                            )) : (
                                                                                <p className="text-xs text-gray-400 text-center py-2">ทุกงานข้ามการอนุมัติ</p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Skip Approval Jobs */}
                                                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <ForwardIcon className="w-4 h-4 text-emerald-600" />
                                                                                <span className="text-sm font-bold text-emerald-800">ข้ามการอนุมัติ</span>
                                                                            </div>
                                                                            <span className="bg-emerald-200 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                                                                {skipJobTypes.length} งาน
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                            {skipJobTypes.length > 0 ? skipJobTypes.map(jt => {
                                                                                const assignment = projectJobAssignments.find(a => a.jobTypeId === jt.id);
                                                                                return (
                                                                                    <div key={jt.id} className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                                                                                        <span className="text-sm text-gray-800">{jt.name}</span>
                                                                                        <span className="text-xs text-emerald-600">
                                                                                            → {assignment?.assigneeName || 'ยังไม่ระบุ'}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            }) : (
                                                                                <p className="text-xs text-gray-400 text-center py-2">ไม่มีงานที่ข้ามการอนุมัติ</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Flow Diagram Preview */}
                                                                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                                                                    <p className="text-xs font-bold text-gray-600 mb-3">ขั้นตอนการทำงาน:</p>
                                                                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 whitespace-nowrap">
                                                                            สร้างงาน
                                                                        </span>
                                                                        <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                        {editLevels.length > 0 ? editLevels.map((level, idx) => (
                                                                            <React.Fragment key={idx}>
                                                                                <span className="px-3 py-1 bg-indigo-100 rounded-full text-xs font-medium text-indigo-700 whitespace-nowrap">
                                                                                    อนุมัติ #{level.level} ({level.approvers.length} คน)
                                                                                </span>
                                                                                <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                            </React.Fragment>
                                                                        )) : (
                                                                            <>
                                                                                <span className="px-3 py-1 bg-red-100 rounded-full text-xs font-medium text-red-700 whitespace-nowrap">
                                                                                    ยังไม่มีขั้นตอน
                                                                                </span>
                                                                                <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                            </>
                                                                        )}
                                                                        <span className="px-3 py-1 bg-orange-100 rounded-full text-xs font-medium text-orange-700 whitespace-nowrap">
                                                                            มอบหมายงาน
                                                                        </span>
                                                                        <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                        <span className="px-3 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700 whitespace-nowrap">
                                                                            เสร็จสิ้น
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Errors */}
                                                                {errors.length > 0 && (
                                                                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                                                        <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                                                                            <ExclamationCircleIcon className="w-4 h-4" />
                                                                            ไม่สามารถบันทึกได้ กรุณาแก้ไข:
                                                                        </p>
                                                                        <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                                                            {errors.map((err, idx) => (
                                                                                <li key={idx}>{err}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {/* Warnings */}
                                                                {warnings.length > 0 && (
                                                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                                        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                                                            <ExclamationTriangleIcon className="w-4 h-4" />
                                                                            คำเตือน:
                                                                        </p>
                                                                        <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                                                                            {warnings.map((warn, idx) => (
                                                                                <li key={idx}>{warn}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {/* Actions */}
                                                                <div className="flex items-center justify-between pt-4 border-t border-amber-200">
                                                                    <div className="text-xs text-gray-500">
                                                                        การเปลี่ยนแปลงจะมีผลกับงานที่สร้างใหม่เท่านั้น
                                                                    </div>
                                                                    <div className="flex gap-3">
                                                                        <Button variant="ghost" onClick={() => setIsEditMode(false)}>
                                                                            ยกเลิก
                                                                        </Button>
                                                                        <Button
                                                                            variant="primary"
                                                                            onClick={async () => {
                                                                                if (hasErrors) {
                                                                                    showToast('กรุณาแก้ไขข้อผิดพลาดก่อนบันทึก', 'error');
                                                                                    return;
                                                                                }

                                                                                // Save default flow first
                                                                                await handleSaveFlow();

                                                                                // Then create skip flows if any selected
                                                                                if (selectedJobTypesForSkip.length > 0) {
                                                                                    await handleCreateSkipFlows();
                                                                                }
                                                                            }}
                                                                            disabled={hasErrors}
                                                                            className={hasErrors
                                                                                ? 'bg-gray-400 cursor-not-allowed'
                                                                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                                                            }
                                                                        >
                                                                            <CheckCircleIcon className="w-4 h-4" />
                                                                            บันทึกทั้งหมด
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </>
                                        ) : (
                                            <AssignmentMatrix
                                                projectId={selectedProject.id}
                                                assignees={responsibleTeam.assignees}
                                                onSaveSuccess={fetchJobAssignments}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="text-center">
                                <BriefcaseIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>กรุณาเลือกโครงการจากรายการด้านซ้าย เพื่อจัดการขั้นตอนการอนุมัติ</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// === ส่วนประกอบแสดงผล Workflow (Visual Flow Components) ===

/**
 * โหนดแสดงสถานะเบื้องต้น (Start/End Node)
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.icon - ไอคอนประจำโหนด
 * @param {string} props.label - ข้อความกำกับ
 * @param {string} props.color - สไตล์สีของวงกลม
 */
function Node({ icon, label, color = "bg-gray-100 border-gray-300" }) {
    return (
        <div className="flex flex-col items-center gap-2 w-24">
            <div className={`w-14 h-14 ${color} rounded-full flex items-center justify-center border-2 shadow-sm`}>
                {icon}
            </div>
            <span className="text-xs text-gray-500 font-bold text-center">{label}</span>
        </div>
    );
}

/**
 * โหนดแสดงขั้นตอนการอนุมัติ (Approver Step Node)
 *
 * @component
 * @param {Object} props
 * @param {number} props.step - ลำดับขั้นตอน
 * @param {Array} props.approvers - รายชื่อผู้อนุมัติในกลุ่มนี้
 * @param {string} props.logic - ตรรกะการอนุมัติ ('any' หรือ 'all')
 * @param {string} props.color - โทนสีของโหนด
 */
function ApproverNode({ step, approvers = [], logic = 'any', color = 'blue' }) {
    const colorMap = {
        blue: { container: "bg-blue-50 border-blue-200 text-blue-900 border-l-4 border-l-blue-500", icon: "bg-blue-100 text-blue-600" },
        purple: { container: "bg-purple-50 border-purple-200 text-purple-900 border-l-4 border-l-purple-500", icon: "bg-purple-100 text-purple-600" },
        teal: { container: "bg-teal-50 border-teal-200 text-teal-900 border-l-4 border-l-teal-500", icon: "bg-teal-100 text-teal-600" },
        pink: { container: "bg-pink-50 border-pink-200 text-pink-900 border-l-4 border-l-pink-500", icon: "bg-pink-100 text-pink-600" },
        indigo: { container: "bg-indigo-50 border-indigo-200 text-indigo-900 border-l-4 border-l-indigo-500", icon: "bg-indigo-100 text-indigo-600" },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`flex flex-col items-center border shadow-sm rounded-xl p-3 min-w-[160px] transition-all ${c.container}`}>
            <div className="flex items-center justify-between w-full mb-3">
                <div className={`w-8 h-8 ${c.icon} rounded-full flex items-center justify-center font-black text-xs`}>
                    {step}
                </div>
                <div className="text-[9px] font-black text-white bg-gray-800/80 px-2 py-0.5 rounded uppercase tracking-tighter">
                    {logic === 'any' ? 'ONE-OF-MANY' : 'EVERYONE'}
                </div>
            </div>

            <div className="space-y-1 w-full flex flex-col items-center">
                {approvers.length > 0 ? approvers.map((app, i) => (
                    <div key={app.userId ? `${app.userId}-${i}` : i} className="w-full text-center">
                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{app.name}</p>
                        <p className="text-[9px] text-gray-500 leading-none">{app.role}</p>
                        {i < approvers.length - 1 && <div className="h-px w-1/3 bg-gray-200 mx-auto my-1.5 opacity-50"></div>}
                    </div>
                )) : (
                    <p className="text-xs italic text-gray-400">ยังไม่ระบุผู้อนุมัติ</p>
                )}
            </div>
        </div>
    );
}

/**
 * โหนดแสดงผู้รับงาน (Assignee Node)
 *
 * @component
 * @param {Object} props
 * @param {string} props.name - ชื่อผู้รับงาน
 * @param {string} props.role - บทบาท/ตำแหน่ง
 */
function AssigneeNode({ name, role }) {
    return (
        <div className="flex flex-col items-center border border-orange-200 bg-orange-50 shadow-sm rounded-xl p-3 min-w-[160px] border-l-4 border-l-orange-500">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full mb-3">
                <BriefcaseIcon className="w-4 h-4" />
            </div>
            <div className="text-center w-full">
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">ผู้รับงาน (Assignee)</p>
                <p className="text-xs font-bold text-gray-800 line-clamp-1">{name}</p>
                <p className="text-[9px] text-gray-500">{role}</p>
            </div>
        </div>
    );
}

/**
 * ลูกศรเชื่อมต่อระหว่างโหนด (Arrow Connector)
 */
function Arrow() {
    return <ArrowRightIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />;
}
