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
import { api } from '@/services/apiService';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';

import { PlusIcon, TrashIcon, UserGroupIcon, UserIcon, ArrowLongRightIcon, ArrowRightIcon, BriefcaseIcon, CheckCircleIcon, ExclamationCircleIcon, MagnifyingGlassIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    /** รายการขั้นตอนการอนุมัติทั้งหมดที่มีในระบบ */
    const [approvalFlows, setApprovalFlows] = useState([]);
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
    /** ผู้รับงานเริ่มต้นที่กำลังแก้ไข */
    const [editAssignee, setEditAssignee] = useState(null);

    // === ทีมงานที่เกี่ยวข้องกับโครงการ (States: Responsible Team) ===
    /** รวมรายการผู้ใช้งานทุกคน (เพื่อการกรองตามขอบเขต) */
    const [allUsers, setAllUsers] = useState([]);
    /** รายชื่อทีมงานที่รับผิดชอบโครงการที่เลือก (แบ่งตามหน้าที่) */
    const [responsibleTeam, setResponsibleTeam] = useState({
        requesters: [], // ผู้สั่งงาน
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
            let flowsData = [];
            let usersData = [];

            try {
                projectsData = await api.getProjects() || [];
            } catch (e) {
                console.warn('Error loading projects:', e.message);
            }

            try {
                flowsData = await api.getApprovalFlows() || [];
            } catch (e) {
                console.warn('Error loading approval flows:', e.message);
            }

            try {
                usersData = await api.getUsers() || [];
            } catch (e) {
                console.warn('Error loading users:', e.message);
            }

            setProjects(projectsData);
            setApprovalFlows(flowsData);
            setAllUsers(usersData); // เก็บข้อมูลผู้ใช้ทั้งหมดไว้สำหรับคัดกรองตามโครงการ

            // คัดกรองผู้ใช้งานตามบทบาทพื้นฐาน เพื่อความสะดวกรวดเร็ว
            setApprovers(usersData.filter(u => u.roles?.includes('approver') || u.roles?.includes('admin')));
            setAssignees(usersData.filter(u => u.roles?.includes('assignee')));

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

            // คัดกรองผู้สั่งงาน (Requesters) ที่มีสิทธิ์ในโครงการนี้
            const reqs = allUsers.filter(u =>
                (u.roles?.includes('marketing') || u.roles?.includes('requester')) &&
                (u.allowedProjects?.includes(projectId) || (u.scopeLevel === 'Project' && u.scopeId === projectId))
            );

            // คัดกรองผู้อนุมัติ (Approvers)
            // นโยบาย: ผู้ดูแลระบบ (Admin) มีสิทธิ์ทุกโครงการ, ผู้อนุมัติทั่วไปตรวจสอบตามขอบเขต (Scope)
            const apps = allUsers.filter(u => {
                const isAdmin = u.roles?.includes('admin');
                const isApprover = u.roles?.includes('approver');
                if (!isApprover && !isAdmin) return false;
                if (isAdmin) return true; // แอดมินมีสิทธิ์ทุกโครงการ

                // ตรวจสอบความสอดคล้องของขอบเขตงาน (Scope Check)
                if (u.scopeLevel === 'Project') return u.scopeId === projectId;
                // สำหรับขอบเขตระดับสายงาน (BUD) หรือบริษัท (Tenant)
                // ปัจจุบันเปิดให้เห็นทุกคนเพื่อให้ผู้ใช้เลือกหัวหน้างานข้ามระดับได้สะดวก
                return true;
            });

            // คัดกรองผู้รับงาน (Assignees)
            // ปัจจุบัน: แสดงทุกคนที่มี Role 'assignee' เพราะ DB ไม่มี assignedProjects field
            // TODO: ในอนาคตอาจเพิ่ม assignedProjects ใน DB และ Filter ตาม Project
            const asgs = allUsers.filter(u =>
                u.roles?.includes('assignee')
            );

            setResponsibleTeam({
                requesters: reqs,
                approvers: apps,
                assignees: asgs
            });
        }
    }, [selectedProject, allUsers]);

    /**
     * useEffect Hook เมื่อโครงการที่เลือกเปลี่ยนไป
     * ค้นหาและตั้งค่า Approval Flow ที่ผูกกับโครงการนั้นๆ ลงในฟอร์มแก้ไข
     */
    useEffect(() => {
        if (selectedProject) {
            const flow = approvalFlows.find(f => f.projectId === selectedProject.id);
            setCurrentFlow(flow || null);
            if (flow) {
                setEditLevels(flow.levels || []);
                setEditAssignee(flow.defaultAssignee || null);
            } else {
                setEditLevels([]);
                setEditAssignee(null);
            }
        }
    }, [selectedProject, approvalFlows]);

    // === ส่วนงานประมวลผล (Actions) ===

    /**
     * บันทึกข้อมูลลำดับการอนุมัติ (Approval Flow)
     * บันทึกทั้งข้อมูลโครงการ, ลำดับผู้ตรวจสอบ และผู้รับงานเริ่มต้น
     * 
     * @async
     * @function handleSaveFlow
     * @returns {Promise<void>}
     */
    const handleSaveFlow = async () => {
        try {
            const flowData = {
                projectId: selectedProject.id,
                projectName: selectedProject.name,
                levels: editLevels,
                defaultAssignee: editAssignee
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
     * เปลี่ยนผู้รับงานเริ่มต้น (Default Assignee)
     * 
     * @function handleAssigneeChange
     * @param {string|number} userId - ID ของผู้รับงาน
     * @returns {void}
     */
    const handleAssigneeChange = (userId) => {
        const user = assignees.find(u => u.id == userId);
        if (user) {
            // ประกอบชื่อเต็มสำหรับการแสดงผล
            const userName = [user.prefix, user.name || user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
            setEditAssignee({
                userId: userId,
                name: userName,
                role: user.roles?.join(', ') || 'Assignee'
            });
        } else {
            setEditAssignee(null);
        }
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
        const hasFlow = approvalFlows.some(f => f.projectId === p.id);
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
                                ตั้งค่าแล้ว ({projects.filter(p => approvalFlows.some(f => f.projectId === p.id)).length})
                            </button>
                            <button
                                onClick={() => setFlowFilter('noFlow')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'noFlow'
                                    ? 'bg-white text-red-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                ยังไม่ตั้งค่า ({projects.filter(p => !approvalFlows.some(f => f.projectId === p.id)).length})
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredProjects.map((project, index) => {
                            const flow = approvalFlows.find(f => f.projectId === project.id);
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
                                <p className="font-bold text-gray-900">{approvalFlows.filter(f => !!f).length}</p>
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

                            {/* Responsible Team Summary */}
                            <div className="bg-white border border-gray-200 rounded-xl mb-6 p-5">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <UserGroupIcon className="w-4 h-4 text-gray-500" /> ทีมงานที่รับผิดชอบโครงการ (Responsible Team)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Requesters */}
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                        <div className="text-xs font-bold text-green-800 mb-2 flex justify-between items-center">
                                            <span>Requester (ผู้สั่งงาน)</span>
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
                                                    {u.roles.includes('admin') && <span className="text-[10px] text-gray-400">(Admin)</span>}
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
                                                {/* Timeline Container */}
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

                                                {/* Assignee Section */}
                                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                                        <BriefcaseIcon className="w-24 h-24 text-orange-500" />
                                                    </div>

                                                    <div className="relative z-10">
                                                        <h5 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                                                            <BriefcaseIcon className="w-5 h-5" /> ผู้รับงานดำเนินงานต่อ (Assignee)
                                                            <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">ขั้นตอนสุดท้าย (Final Step)</span>
                                                        </h5>

                                                        {/* Assignee Logic */}
                                                        {(() => {
                                                            return (
                                                                <>
                                                                    {responsibleTeam.assignees.length === 0 && (
                                                                        <div className="bg-white/80 backdrop-blur border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mb-4 flex items-center gap-2">
                                                                            <ExclamationCircleIcon className="w-5 h-5" />
                                                                            ยังไม่มี Assignee ในโครงการนี้
                                                                        </div>
                                                                    )}
                                                                    <div className="bg-white p-3 rounded-lg border border-orange-200/50 shadow-sm">
                                                                        <FormSelect
                                                                            label="เลือกผู้รับงาน Default"
                                                                            value={editAssignee?.userId || ''}
                                                                            onChange={(e) => handleAssigneeChange(e.target.value)}
                                                                        >
                                                                            <option value="">-- ไม่ระบุ (Unassigned) --</option>
                                                                            {responsibleTeam.assignees.map(u => (
                                                                                <option key={u.id} value={u.id}>
                                                                                    {[u.prefix, u.name, u.lastName].filter(Boolean).join(' ')}
                                                                                </option>
                                                                            ))}
                                                                        </FormSelect>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Actions Footer */}
                                                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-gray-500">หมายเหตุ:</span>
                                                        <span className="text-xs text-gray-400">ลำดับการอนุมัติที่แก้ไขจะมีผลเฉพาะกับใบงาน DJ ที่สร้างขึ้นใหม่เท่านั้น</span>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <Button variant="ghost" onClick={() => setIsEditMode(false)}>ยกเลิก (Cancel)</Button>
                                                        <Button variant="primary" onClick={handleSaveFlow} className="bg-indigo-600 hover:bg-indigo-700 px-6 shadow-lg shadow-indigo-200">
                                                            <CheckCircleIcon className="w-4 h-4" /> บันทึกขั้นตอน (Save Flow)
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <AssignmentMatrix
                                                projectId={selectedProject.id}
                                                assignees={responsibleTeam.assignees}
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
                    <div key={app.userId} className="w-full text-center">
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
