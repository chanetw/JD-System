/**
 * @file AdminApprovalFlow.jsx
 * @description หน้าจัดการ Approval Flow (Admin: Approval Flow)
 * 
 * Business Rules:
 * 1. DJ ต้องผ่านการอนุมัติตามลำดับ (Level 1 → 2 → ...)
 * 2. หาก Approver ปฏิเสธ DJ จะส่งกลับ Requester
 * 3. Default Assignee กำหนดอัตโนมัติเมื่ออนุมัติครบ
 * 4. สามารถเปลี่ยน Assignee ได้หลัง Approved
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';

import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    UserGroupIcon,
    BriefcaseIcon,
    ArrowRightIcon,
    XMarkIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Color palette สำหรับ Project badges
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

// Approver Level colors
const LEVEL_COLORS = ['blue', 'purple', 'teal', 'pink', 'indigo'];

export default function AdminApprovalFlow() {
    // State: Data
    const [projects, setProjects] = useState([]);
    const [approvalFlows, setApprovalFlows] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // State: UI
    const [selectedProject, setSelectedProject] = useState(null);
    const [currentFlow, setCurrentFlow] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [flowFilter, setFlowFilter] = useState('all'); // 'all', 'hasFlow', 'noFlow'

    // State: Edit Form
    const [editLevels, setEditLevels] = useState([]);
    const [editAssignee, setEditAssignee] = useState(null);

    // State: Responsible Team (Users relevant to the selected project)
    const [allUsers, setAllUsers] = useState([]);
    const [responsibleTeam, setResponsibleTeam] = useState({
        requesters: [],
        approvers: [],
        assignees: []
    });

    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // ============================================
    // Load Data
    // ============================================
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [projectsData, flowsData, usersData] = await Promise.all([
                api.getProjects(),
                api.getApprovalFlows(),
                api.getUsers()
            ]);
            setProjects(projectsData);
            setApprovalFlows(flowsData);
            setAllUsers(usersData); // Keep all users for filtering

            // Filter users by role (initial legacy filter)
            setApprovers(usersData.filter(u => u.roles?.includes('approver') || u.roles?.includes('admin')));
            setAssignees(usersData.filter(u => u.roles?.includes('assignee')));

            // Set first project as default
            if (projectsData.length > 0) {
                setSelectedProject(projectsData[0]);
            }
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter Responsible Team when project changes
    useEffect(() => {
        if (selectedProject && allUsers.length > 0) {
            const projectId = selectedProject.id;
            // Note: Assuming project has budId/tenantId if needed for scope. 
            // For now matching scopeId directly with projectId or just allowedProjects

            const reqs = allUsers.filter(u =>
                u.roles?.includes('marketing') &&
                (u.allowedProjects?.includes(projectId) || (u.scopeLevel === 'Project' && u.scopeId === projectId))
            );

            // Approvers: Admin or Approver with Scope matching Project
            // Logic: ScopeLevel=Project && ScopeId=ProjectId OR ScopeLevel=BUD/Tenant (needs hierarchy check)
            // Simplified: Check if scopeId matches project (for Project level) or is Admin
            // For advanced hierarchy, we usually check: project.budId === user.scopeId (if user.scopeLevel === 'BUD')

            // Try to find BUD/Tenant from project structure if available
            // const projectBUD = selectedProject.budId; 

            const apps = allUsers.filter(u => {
                const isAdmin = u.roles?.includes('admin');
                const isApprover = u.roles?.includes('approver');
                if (!isApprover && !isAdmin) return false;
                if (isAdmin) return true; // Admin can approve anywhere

                // Approver Scope Check
                if (u.scopeLevel === 'Project') return u.scopeId === projectId;
                // For BUD/Tenant, we ideally need to check if project belongs to that BUD/Tenant
                // Since we don't have easy hierarchy map here without searching masters every time,
                // we'll optimistically include them if scope matches OR just include them if we can't verify
                // But specifically for exact Project match:
                // Let's assume simple matching for now or if user has NO specific project scope but is approver
                return true; // Show all approvers for now to avoid hiding valid superior approvers
            });

            // Assignees: Role assignee AND assignedProjects includes project
            const asgs = allUsers.filter(u =>
                u.roles?.includes('assignee') && u.assignedProjects?.includes(projectId)
            );

            setResponsibleTeam({
                requesters: reqs,
                approvers: apps, // Keeping broad for approvers as hierarchy check needs more data
                assignees: asgs
            });

            // Also update the dropdown options to list only valid approvers?
            // Actually users might want to pick Head of Department who has BUD scope.
            // If we filter too strictly without hierarchy data, we might block them.
            // So for Approvers, we keep 'approvers' state as is (all approvers), 
            // but maybe we can flag them or sort them.
            // However, the Requesters and Assignees are definitely project-specific.
        }
    }, [selectedProject, allUsers]);

    // When project changes, find its flow
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

    // ============================================
    // Actions
    // ============================================

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

            showToast('บันทึก Flow สำเร็จ!', 'success');
            setIsEditMode(false);
            loadData(); // Reload to get updated data
        } catch (error) {
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    };

    const handleAddLevel = () => {
        const newLevel = {
            level: editLevels.length + 1,
            userId: '',
            name: '',
            role: '',
            canSkip: false
        };
        setEditLevels([...editLevels, newLevel]);
    };

    const handleRemoveLevel = (index) => {
        const updated = editLevels.filter((_, i) => i !== index);
        // Re-number levels
        const renumbered = updated.map((l, i) => ({ ...l, level: i + 1 }));
        setEditLevels(renumbered);
    };

    const handleLevelChange = (index, userId) => {
        const user = approvers.find(u => u.id == userId);
        const updated = [...editLevels];
        // สร้างชื่อจากหลายรูปแบบที่อาจมี
        const userName = user
            ? [user.prefix, user.name || user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
            : '';
        updated[index] = {
            ...updated[index],
            userId: userId,
            name: userName,
            role: user?.roles?.join(', ') || ''
        };
        setEditLevels(updated);
    };

    const handleAssigneeChange = (userId) => {
        const user = assignees.find(u => u.id == userId);
        if (user) {
            // สร้างชื่อจากหลายรูปแบบที่อาจมี
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

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // ============================================
    // Filter
    // ============================================
    const filteredProjects = projects.filter(p => {
        // Text search
        const matchText = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchTerm.toLowerCase());

        // Flow status filter
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

            {/* Page Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Approval Flow Configuration</h1>
                    <p className="text-gray-500">ตั้งค่าผู้อนุมัติและลำดับการอนุมัติตามโครงการ</p>
                </div>
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
                        {/* Flow Status Filter - Pill Style */}
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFlowFilter('all')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'all'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                All ({projects.length})
                            </button>
                            <button
                                onClick={() => setFlowFilter('hasFlow')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'hasFlow'
                                        ? 'bg-white text-green-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Active ({projects.filter(p => approvalFlows.some(f => f.projectId === p.id)).length})
                            </button>
                            <button
                                onClick={() => setFlowFilter('noFlow')}
                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${flowFilter === 'noFlow'
                                        ? 'bg-white text-red-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Inactive ({projects.filter(p => !approvalFlows.some(f => f.projectId === p.id)).length})
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
                                        {/* Flow Status Badge */}
                                        {flow ? (
                                            <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-green-50 text-green-700">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-gray-100 text-gray-500">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <UserGroupIcon className="w-3.5 h-3.5" /> {approverCount} Approvers
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BriefcaseIcon className="w-3.5 h-3.5" /> {hasAssignee} Assignee
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
                                <p className="text-xs text-gray-500">Projects</p>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-100">
                                <p className="font-bold text-gray-900">{approvalFlows.filter(f => f.status === 'active').length}</p>
                                <p className="text-xs text-gray-500">Active Flows</p>
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
                                            {currentFlow?.status?.toUpperCase() || 'NO FLOW'}
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
                                            {isEditMode ? 'Cancel' : <><PencilIcon className="w-4 h-4" /> Edit Flow</>}
                                        </Button>
                                    </div>
                                </div>
                            </div>



                            {/* Flow Diagram */}
                            {!isEditMode && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                    <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                        Approval Flow Diagram
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
                                                    name={level.name || 'Unassigned'}
                                                    role={level.role || 'Approver'}
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
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 flex items-center justify-between">
                                        <h3 className="text-white font-bold flex items-center gap-2">
                                            <PencilIcon className="w-5 h-5" /> Config Approval Flow
                                        </h3>
                                        <button onClick={() => setIsEditMode(false)} className="text-white/80 hover:text-white transition-colors">
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6">
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

                                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow flex gap-4 items-end">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                                Approver Level {level.level}
                                                            </label>
                                                            <FormSelect
                                                                value={level.userId || ''}
                                                                onChange={(e) => handleLevelChange(index, e.target.value)}
                                                                className="border-0 bg-gray-50 focus:ring-2 focus:ring-indigo-100"
                                                            >
                                                                <option value="">-- ระบุผู้อนุมัติ (Select Approver) --</option>
                                                                {responsibleTeam.approvers.map(u => (
                                                                    <option key={u.id} value={u.id}>
                                                                        {u.prefix || ''} {u.name} {u.lastName || ''} ({u.roles.includes('admin') ? 'Admin' : 'Approver'})
                                                                    </option>
                                                                ))}
                                                            </FormSelect>
                                                        </div>
                                                        <Button variant="ghost" className="text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleRemoveLevel(index)}>
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
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
                                                    <BriefcaseIcon className="w-5 h-5" /> ผู้รับงานต่อ (Assignee)
                                                    <span className="text-xs font-normal text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Final Step</span>
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
                                                <span className="text-xs text-gray-400">Flow ที่แก้ไขจะมีผลกับงานใหม่เท่านั้น</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button variant="ghost" onClick={() => setIsEditMode(false)}>ยกเลิก (Cancel)</Button>
                                                <Button variant="primary" onClick={handleSaveFlow} className="bg-indigo-600 hover:bg-indigo-700 px-6 shadow-lg shadow-indigo-200">
                                                    <CheckCircleIcon className="w-4 h-4" /> บันทึก (Save Flow)
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            เลือกโครงการจากรายการด้านซ้าย
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// Visual Flow Components
// ============================================

function Node({ icon, label, color = "bg-gray-100 border-gray-300" }) {
    return (
        <div className="flex flex-col items-center gap-2 w-24">
            <div className={`w-14 h-14 ${color} rounded-full flex items-center justify-center border-2`}>
                {icon}
            </div>
            <span className="text-xs text-gray-500 font-medium text-center">{label}</span>
        </div>
    );
}

function ApproverNode({ step, name, role, color = 'blue' }) {
    const colorMap = {
        blue: { container: "bg-blue-50 border-blue-200 text-blue-900", icon: "bg-blue-100 text-blue-600" },
        purple: { container: "bg-purple-50 border-purple-200 text-purple-900", icon: "bg-purple-100 text-purple-600" },
        teal: { container: "bg-teal-50 border-teal-200 text-teal-900", icon: "bg-teal-100 text-teal-600" },
        pink: { container: "bg-pink-50 border-pink-200 text-pink-900", icon: "bg-pink-100 text-pink-600" },
        indigo: { container: "bg-indigo-50 border-indigo-200 text-indigo-900", icon: "bg-indigo-100 text-indigo-600" },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`flex flex-col items-center border-2 rounded-xl p-3 min-w-[140px] text-center transition-all ${c.container}`}>
            <div className={`w-8 h-8 ${c.icon} rounded-full flex items-center justify-center font-bold text-xs mb-2`}>
                {step}
            </div>
            <p className="text-xs font-bold truncate w-full">{name}</p>
            <p className="text-[10px] opacity-70 truncate w-full">{role}</p>
        </div>
    );
}

function AssigneeNode({ name, role }) {
    return (
        <div className="flex flex-col items-center border-2 border-orange-200 bg-orange-50 rounded-xl p-3 min-w-[140px] text-center transition-all">
            <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs mb-2">
                <BriefcaseIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-orange-900 truncate w-full">{name}</p>
            <p className="text-[10px] text-orange-700 opacity-70 truncate w-full">{role}</p>
        </div>
    );
}

function Arrow() {
    return <ArrowRightIcon className="w-5 h-5 text-gray-300 shrink-0" />;
}
