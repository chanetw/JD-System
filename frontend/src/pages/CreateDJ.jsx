/**
 * @file CreateDJ.jsx
 * @description หน้าสร้างงาน DJ ใหม่ (Create Design Job) - Logic Integrated
 * 
 * Senior Programmer Notes:
 * - เชื่อมต่อกับ mockApi.js เพื่อสร้างงานจริง
 * - มี Validation ตรวจสอบข้อมูลก่อนส่ง
 * - รองรับการ Upload File (Mock)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { createJob, getMasterData, getHolidays, getApprovalFlowByProject } from '@/services/mockApi';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import { FormInput, FormSelect, FormTextarea } from '@/components/common/FormInput';
import Button from '@/components/common/Button';
import { calculateDueDate, formatDateToThai } from '@/utils/slaCalculator';

export default function CreateDJ() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Status State
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Master Data State
    const [masterData, setMasterData] = useState({
        projects: [],
        jobTypes: [],
        buds: []
    });

    // Holidays & SLA State
    const [holidays, setHolidays] = useState([]);
    const [dueDate, setDueDate] = useState(null);
    const [approvalFlow, setApprovalFlow] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        project: '',
        bud: '', // Auto from Project
        jobType: 'Online Artwork',
        subject: '',
        priority: 'Normal',
        objective: '',
        headline: '',
        subHeadline: '',
        sellingPoints: [],
        price: '',
        attachments: []
    });

    // New Selling Point Input
    const [newTag, setNewTag] = useState('');

    // Validation State
    const [errors, setErrors] = useState([]);

    // ============================================
    // Load Master Data
    // ============================================
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await getMasterData();
                setMasterData(data);
                // โหลดวันหยุดสำหรับ SLA calculation
                const holidaysData = await getHolidays();
                setHolidays(holidaysData);
            } catch (error) {
                console.error("Failed to load master data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ============================================
    // Logic Handlers
    // ============================================

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-fill BUD when Project changes
        if (name === 'project') {
            // Mock logic: ในของจริงต้องดึงจาก relation
            const selectedProject = masterData.projects.find(p => p.name === value);
            if (selectedProject) {
                const budValue = selectedProject.bud;
                const budName = typeof budValue === 'object' ? budValue.name : budValue;
                setFormData(prev => ({ ...prev, bud: budName || 'BUD 1' }));

                // Fetch Approval Flow
                getApprovalFlowByProject(value).then(flow => {
                    setApprovalFlow(flow);
                });
            } else {
                setApprovalFlow(null);
            }
        }

        // Calculate Due Date when Job Type changes
        if (name === 'jobType') {
            const selectedJobType = masterData.jobTypes.find(t => t.name === value);
            if (selectedJobType && selectedJobType.sla) {
                const slaDays = parseInt(selectedJobType.sla) || 7;
                const calculatedDate = calculateDueDate(new Date(), slaDays, holidays);
                setDueDate(calculatedDate);
            }
        }
    };

    // Handle Selling Points (Tags)
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

    const removeTag = (tagIdx) => {
        setFormData(prev => ({
            ...prev,
            sellingPoints: prev.sellingPoints.filter((_, i) => i !== tagIdx)
        }));
    };

    // Handle File Upload (Mock)
    const handleFileUpload = () => {
        // Simulate file selection
        const mockFile = {
            name: `upload_${Date.now()}.zip`,
            size: '5.2 MB',
            type: 'zip'
        };
        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, mockFile]
        }));
    };

    const removeFile = (idx) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== idx)
        }));
    };

    // ============================================
    // Validation & Submit
    // ============================================

    const validateForm = () => {
        const newErrors = [];
        if (!formData.project) newErrors.push("กรุณาเลือก Project");
        if (!formData.subject) newErrors.push("กรุณาระบุ Subject");
        if (!formData.objective || formData.objective.length < 20) newErrors.push("Objective ต้องมีอย่างน้อย 20 ตัวอักษร");
        if (!formData.headline) newErrors.push("กรุณาระบุ Headline");
        if (formData.attachments.length === 0) newErrors.push("กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์");

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // กัน form submit ปกติ

        if (!validateForm()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        try {
            await createJob({
                ...formData,
                requesterName: user?.displayName || 'Unknown User',
                flowSnapshot: approvalFlow
            });

            // Success Notification (Mock with alert for now)
            alert('สร้างงาน DJ สำเร็จ! กำลังไปที่หน้ารายการงาน...');
            navigate('/jobs');

        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate Completion %
    const calculateCompletion = () => {
        const fields = ['project', 'jobType', 'subject', 'objective', 'headline', 'price'];
        const filled = fields.filter(f => formData[f]).length;
        const hasFiles = formData.attachments.length > 0 ? 1 : 0;
        return Math.round(((filled + hasFiles) / (fields.length + 1)) * 100);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ============================================
          Page Header
          ============================================ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Design Job</h1>
                    <p className="text-gray-500">เปิดงานออกแบบใหม่</p>
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
                {/* ============================================
            Left Column (Form Sections)
            ============================================ */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Section A: Job Info */}
                    <Card>
                        <CardHeader title="Job Info" badge="A" />
                        <CardBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    label="Project"
                                    name="project"
                                    required
                                    value={formData.project}
                                    onChange={handleChange}
                                >
                                    <option value="">-- เลือก Project --</option>
                                    {masterData.projects.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </FormSelect>
                                <div>
                                    <FormInput label="BUD" disabled value={formData.bud} className="bg-gray-50" />
                                    <p className="text-xs text-gray-400 mt-1">Auto จาก Project</p>
                                </div>
                            </div>

                            <div>
                                <FormSelect
                                    label="Job Type"
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
                                                คำนวณจากวันทำการ (ข้ามวันหยุดราชการ)
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-rose-700"><strong>SLA:</strong> เลือก Job Type เพื่อดูวันกำหนดส่ง</p>
                                            <p className="text-xs text-rose-600 mt-1">ระบบจะคำนวณโดยนับเฉพาะวันทำการ</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <FormInput
                                label="Subject"
                                name="subject"
                                required
                                placeholder="เช่น Banner Facebook Q1 Campaign"
                                value={formData.subject}
                                onChange={handleChange}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    label="Priority"
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <option>Low</option>
                                    <option>Normal</option>
                                    <option>Urgent</option>
                                </FormSelect>
                                <div>
                                    <FormInput label="Requested Start" disabled value="Now (Auto)" className="bg-gray-50" />
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Section B: Brief */}
                    <Card>
                        <CardHeader title="Brief (Mandatory)" badge="B" />
                        <CardBody className="space-y-4">
                            <div>
                                <FormTextarea
                                    label="Objective & Details"
                                    name="objective"
                                    required
                                    rows="4"
                                    placeholder="อธิบายรายละเอียดงาน, วัตถุประสงค์, กลุ่มเป้าหมาย..."
                                    value={formData.objective}
                                    onChange={handleChange}
                                />
                                <div className={`flex justify-end items-center mt-1 text-xs ${formData.objective.length < 20 ? 'text-red-500' : 'text-green-500'}`}>
                                    {formData.objective.length} / 20 characters min
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="Headline"
                                    name="headline"
                                    required
                                    placeholder="พาดหัวหลัก"
                                    value={formData.headline}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Sub-headline"
                                    name="subHeadline"
                                    placeholder="พาดหัวรอง (ถ้ามี)"
                                    value={formData.subHeadline}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Points</label>
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
                                    placeholder="พิมพ์แล้วกด Enter เพื่อเพิ่ม..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={addTag}
                                />
                            </div>

                            <FormInput
                                label="Price / Promotion"
                                name="price"
                                placeholder="ราคา หรือ โปรโมชั่นที่ต้องการเน้น"
                                value={formData.price}
                                onChange={handleChange}
                            />
                        </CardBody>
                    </Card>

                    {/* Section C: Attachments */}
                    <Card>
                        <CardHeader title="Attachments" badge="C" />
                        <CardBody className="space-y-4">
                            {/* Upload Area */}
                            <div
                                onClick={handleFileUpload}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-rose-400 transition-colors cursor-pointer bg-gray-50 hover:bg-white"
                            >
                                <div className="text-gray-400 mx-auto mb-4">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <p className="text-gray-600 mb-1">คลิกที่นี่เพื่อจำลองการอัปโหลดไฟล์ (Simulate Upload)</p>
                                <p className="text-xs text-gray-400">Mock File Upload</p>
                            </div>

                            {/* File List */}
                            {formData.attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                                            FILE
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
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                </div>

                {/* ============================================
            Right Column (Info Panels & Actions)
            ============================================ */}
                <div className="space-y-6">

                    {/* Approval Flow Preview */}
                    <Card>
                        <CardHeader title="Approval Flow" badge="D" />
                        <CardBody>
                            {approvalFlow ? (
                                <div className="relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-gray-200"></div>

                                    <div className="space-y-6">
                                        {/* Levels */}
                                        {approvalFlow.levels.map((level, idx) => (
                                            <div key={idx} className="relative pl-8">
                                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 z-10 bg-white ${idx === 0 ? 'border-blue-500' : 'border-purple-500'
                                                    }`}></div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Step {level.level}</p>
                                                    <p className="text-sm font-medium text-gray-900">{level.role}</p>
                                                    <p className="text-xs text-gray-500">{level.name || 'Any User'}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Default Assignee */}
                                        <div className="relative pl-8">
                                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-green-500 bg-white z-10"></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Final</p>
                                                <p className="text-sm font-medium text-gray-900">Assign To</p>
                                                <p className="text-xs text-gray-500">
                                                    {approvalFlow.defaultAssignee?.name || 'Auto Assign'}
                                                    {approvalFlow.defaultAssignee?.role && ` (${approvalFlow.defaultAssignee.role})`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                    <p className="text-sm text-gray-500">No Approval Flow</p>
                                    <p className="text-xs text-green-600 mt-1 font-medium">✨ Auto Approve</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Checklist Panel */}
                    <Card>
                        <CardHeader title="Completion Status" />
                        <CardBody>
                            <div className="space-y-3">
                                <CheckItem label="Project info" checked={!!formData.project} />
                                <CheckItem label="Job Type" checked={!!formData.jobType} />
                                <CheckItem label="Subject" checked={!!formData.subject} />
                                <CheckItem label="Objective" checked={formData.objective.length >= 20} />
                                <CheckItem label="Attachments" checked={formData.attachments.length > 0} />
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

                    {/* Actions Panel */}
                    <div className="sticky top-20 space-y-3">
                        <Button className="w-full h-12 text-lg shadow-lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Job...
                                </span>
                            ) : (
                                "Assign Job Now"
                            )}
                        </Button>
                        <Button type="button" variant="secondary" className="w-full" disabled={isSubmitting}>
                            Save as Draft
                        </Button>
                    </div>

                </div>
            </div>
        </form>
    );
}

// Helpers
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

// Minimal Trash Icon if not using Heroicons import
function TrashIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}

function CheckCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}

function XCircleIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
