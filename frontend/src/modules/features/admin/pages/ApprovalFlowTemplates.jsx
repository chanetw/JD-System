/**
 * @file ApprovalFlowTemplates.jsx
 * @description หน้าจอสำหรับจัดการ Approval Flow Templates (V2)
 * 
 * Features:
 * - CRUD Master Templates (สร้าง/แก้ไข/ลบ Template)
 * - กำหนด Flow แยกตาม Project + JobType
 * - ตั้งค่า Auto-Assign Type
 * - Skip Approval (total_levels = 0)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import httpClient from '@shared/services/httpClient';

import {
    PlusIcon, TrashIcon, PencilIcon, CheckCircleIcon,
    ExclamationCircleIcon, XMarkIcon, DocumentDuplicateIcon,
    ClipboardDocumentListIcon, CogIcon, UserGroupIcon
} from '@heroicons/react/24/outline';

// === Constants ===
const AUTO_ASSIGN_TYPES = [
    { value: 'manual', label: 'Manual (กำหนดเอง)' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'dept_manager', label: 'หัวหน้าแผนก' },
    { value: 'specific_user', label: 'เลือกคนเฉพาะ' }
];

const APPROVER_TYPES = [
    { value: 'dept_manager', label: 'หัวหน้าแผนก' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'specific_user', label: 'ระบุเอง' }
];

/**
 * ApprovalFlowTemplates Component
 * หน้าจัดการ Master Templates สำหรับ Approval Flow V2
 */
export default function ApprovalFlowTemplates() {
    // === Data States ===
    const [templates, setTemplates] = useState([]);
    const [projects, setProjects] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // === UI States ===
    const [activeTab, setActiveTab] = useState('templates'); // templates | assignments
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // === Form States ===
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        totalLevels: 1,
        autoAssignType: 'manual',
        autoAssignUserId: null,
        steps: []
    });

    // === Assignment Form States ===
    const [assignmentForm, setAssignmentForm] = useState({
        projectId: '',
        jobTypeId: '',
        templateId: ''
    });

    /**
     * โหลดข้อมูลทั้งหมด
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [templatesRes, projectsRes, jobTypesRes, usersRes] = await Promise.all([
                httpClient.get('/api/approval-flow-templates'),
                httpClient.get('/api/projects'),
                httpClient.get('/api/job-types'),
                httpClient.get('/api/users')
            ]);

            setTemplates(templatesRes.data?.data || templatesRes.data || []);
            setProjects(projectsRes.data?.data || projectsRes.data || []);
            setJobTypes(jobTypesRes.data?.data || jobTypesRes.data || []);
            setUsers(usersRes.data?.data || usersRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    /**
     * แสดง Toast
     */
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    /**
     * สร้าง Template ใหม่
     */
    const handleCreateTemplate = async () => {
        try {
            // สร้าง Steps อัตโนมัติตาม totalLevels
            const steps = [];
            for (let i = 1; i <= formData.totalLevels; i++) {
                steps.push({
                    level: i,
                    name: `ขั้นตอนที่ ${i}`,
                    approverType: 'dept_manager',
                    requiredApprovals: 1
                });
            }

            await httpClient.post('/api/approval-flow-templates', {
                ...formData,
                steps
            });

            showToast('สร้าง Template สำเร็จ!');
            setShowCreateModal(false);
            resetForm();
            loadData();
        } catch (error) {
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    };

    /**
     * อัปเดต Template
     */
    const handleUpdateTemplate = async () => {
        if (!selectedTemplate) return;

        try {
            await httpClient.put(`/api/approval-flow-templates/${selectedTemplate.id}`, formData);
            showToast('อัปเดต Template สำเร็จ!');
            setIsEditing(false);
            loadData();
        } catch (error) {
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    };

    /**
     * ลบ Template
     */
    const handleDeleteTemplate = async (id) => {
        if (!confirm('ยืนยันลบ Template นี้?')) return;

        try {
            await httpClient.delete(`/api/approval-flow-templates/${id}`);
            showToast('ลบ Template สำเร็จ!');
            setSelectedTemplate(null);
            loadData();
        } catch (error) {
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    };

    /**
     * สร้าง Assignment (ผูก Project+JobType กับ Template)
     */
    const handleCreateAssignment = async () => {
        if (!assignmentForm.projectId || !assignmentForm.templateId) {
            showToast('กรุณาเลือก Project และ Template', 'error');
            return;
        }

        try {
            await httpClient.post('/api/approval-flow-templates/assignments', {
                projectId: parseInt(assignmentForm.projectId),
                jobTypeId: assignmentForm.jobTypeId ? parseInt(assignmentForm.jobTypeId) : null,
                templateId: parseInt(assignmentForm.templateId)
            });

            showToast('ผูก Flow กับ Project สำเร็จ!');
            setAssignmentForm({ projectId: '', jobTypeId: '', templateId: '' });
            loadData();
        } catch (error) {
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    };

    /**
     * Reset Form
     */
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            totalLevels: 1,
            autoAssignType: 'manual',
            autoAssignUserId: null,
            steps: []
        });
    };

    /**
     * เลือก Template
     */
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            totalLevels: template.totalLevels,
            autoAssignType: template.autoAssignType || 'manual',
            autoAssignUserId: template.autoAssignUserId,
            steps: template.steps || []
        });
    };

    // === Render ===
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mr-3"></div>
                กำลังโหลด...
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <ExclamationCircleIcon className="w-5 h-5 text-red-500" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="w-7 h-7 text-rose-600" />
                    Approval Flow Templates (V2)
                </h1>
                <p className="text-gray-500">จัดการ Master Templates สำหรับการอนุมัติ - สร้างครั้งเดียว ใช้ได้หลายโครงการ</p>
            </div>

            {/* Tabs */}
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <DocumentDuplicateIcon className="w-4 h-4 inline mr-2" />
                    Master Templates
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'assignments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <CogIcon className="w-4 h-4 inline mr-2" />
                    Project Assignments
                </button>
            </div>

            {/* Tab: Templates */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-12 gap-6">
                    {/* Template List */}
                    <div className="col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-900">รายการ Templates</h2>
                            <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                                <PlusIcon className="w-4 h-4 mr-1" />
                                สร้างใหม่
                            </Button>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                            {templates.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <DocumentDuplicateIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p>ยังไม่มี Template</p>
                                </div>
                            ) : (
                                templates.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleSelectTemplate(template)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedTemplate?.id === template.id ? 'bg-rose-50 border-l-4 border-rose-500' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                                                <p className="text-xs text-gray-500">{template.description || '-'}</p>
                                            </div>
                                            <Badge variant={template.totalLevels === 0 ? 'warning' : 'primary'}>
                                                {template.totalLevels === 0 ? 'Skip' : `${template.totalLevels} Levels`}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex gap-2 text-xs text-gray-400">
                                            <span>Auto: {AUTO_ASSIGN_TYPES.find(t => t.value === template.autoAssignType)?.label || 'Manual'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Template Detail */}
                    <div className="col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        {selectedTemplate ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                                        <p className="text-gray-500">{selectedTemplate.description || 'ไม่มีคำอธิบาย'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => setIsEditing(!isEditing)}>
                                            <PencilIcon className="w-4 h-4 mr-1" />
                                            {isEditing ? 'ยกเลิก' : 'แก้ไข'}
                                        </Button>
                                        <Button variant="danger" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <FormInput
                                            label="ชื่อ Template"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                        <FormInput
                                            label="คำอธิบาย"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput
                                                label="จำนวนขั้นตอน (0 = Skip Approval)"
                                                type="number"
                                                min="0"
                                                value={formData.totalLevels}
                                                onChange={(e) => setFormData({ ...formData, totalLevels: parseInt(e.target.value) || 0 })}
                                            />
                                            <FormSelect
                                                label="Auto-Assign Type"
                                                value={formData.autoAssignType}
                                                onChange={(e) => setFormData({ ...formData, autoAssignType: e.target.value })}
                                            >
                                                {AUTO_ASSIGN_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </FormSelect>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button variant="primary" onClick={handleUpdateTemplate}>
                                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                                บันทึก
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="text-xs text-gray-500 mb-1">จำนวนขั้นตอน</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {selectedTemplate.totalLevels === 0 ? 'Skip Approval' : `${selectedTemplate.totalLevels} ขั้นตอน`}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="text-xs text-gray-500 mb-1">Auto-Assign</div>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {AUTO_ASSIGN_TYPES.find(t => t.value === selectedTemplate.autoAssignType)?.label}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Steps */}
                                        {selectedTemplate.steps?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <UserGroupIcon className="w-5 h-5" />
                                                    ขั้นตอนการอนุมัติ
                                                </h4>
                                                <div className="space-y-2">
                                                    {selectedTemplate.steps.map((step, idx) => (
                                                        <div key={step.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                                                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                                {step.level}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900">{step.name || `Level ${step.level}`}</div>
                                                                <div className="text-xs text-gray-500">
                                                                    {APPROVER_TYPES.find(t => t.value === step.approverType)?.label}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <div className="text-center">
                                    <ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-4" />
                                    <p>เลือก Template จากรายการด้านซ้าย</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Assignments */}
            {activeTab === 'assignments' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">กำหนด Flow ให้ Project</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        เลือก Project และ Template ที่ต้องการใช้ หากไม่เลือก JobType จะใช้เป็น Default สำหรับทุกประเภทงาน
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <FormSelect
                            label="Project"
                            value={assignmentForm.projectId}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, projectId: e.target.value })}
                        >
                            <option value="">-- เลือก Project --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </FormSelect>

                        <FormSelect
                            label="JobType (ไม่บังคับ)"
                            value={assignmentForm.jobTypeId}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, jobTypeId: e.target.value })}
                        >
                            <option value="">-- ใช้ทุกประเภทงาน (Default) --</option>
                            {jobTypes.map(jt => (
                                <option key={jt.id} value={jt.id}>{jt.name}</option>
                            ))}
                        </FormSelect>

                        <FormSelect
                            label="Template"
                            value={assignmentForm.templateId}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, templateId: e.target.value })}
                        >
                            <option value="">-- เลือก Template --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.totalLevels === 0 ? 'Skip' : `${t.totalLevels} Levels`})</option>
                            ))}
                        </FormSelect>
                    </div>

                    <Button variant="primary" onClick={handleCreateAssignment}>
                        <PlusIcon className="w-4 h-4 mr-1" />
                        สร้าง Assignment
                    </Button>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">สร้าง Template ใหม่</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <FormInput
                                label="ชื่อ Template"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น Standard 2-Level Approval"
                            />
                            <FormInput
                                label="คำอธิบาย"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="อธิบายการใช้งาน Template นี้"
                            />
                            <FormInput
                                label="จำนวนขั้นตอนการอนุมัติ"
                                type="number"
                                min="0"
                                value={formData.totalLevels}
                                onChange={(e) => setFormData({ ...formData, totalLevels: parseInt(e.target.value) || 0 })}
                                helperText="ใส่ 0 เพื่อ Skip Approval (ส่งงานตรงไป Assignee)"
                            />
                            <FormSelect
                                label="Auto-Assign Type"
                                value={formData.autoAssignType}
                                onChange={(e) => setFormData({ ...formData, autoAssignType: e.target.value })}
                            >
                                {AUTO_ASSIGN_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </FormSelect>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>ยกเลิก</Button>
                            <Button variant="primary" onClick={handleCreateTemplate}>
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                สร้าง Template
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
