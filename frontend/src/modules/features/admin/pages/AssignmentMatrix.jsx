import React, { useState, useEffect } from 'react';
import api from '@shared/services/apiDatabase';
import { FormSelect } from '@shared/components/FormInput';
import Button from '@shared/components/Button';
import Modal from '@shared/components/Modal';

/**
 * AssignmentMatrix Component
 * จัดการตารางกำหนดผู้รับงานอัตโนมัติตามประเภทงาน (Project + JobType -> Assignee)
 *
 * Capability:
 * - Standalone Mode: มี Dropdown ให้เลือก Project และโหลด Assignees เอง
 * - Embedded Mode: รับ projectId และ assignees ผ่าน props
 *
 * @param {Function} onSaveSuccess - Callback ที่ถูกเรียกเมื่อบันทึกสำเร็จ
 */
export default function AssignmentMatrix({ projectId: propProjectId, assignees: propAssignees, onSaveSuccess }) {
    // === State ===
    const [projects, setProjects] = useState([]);
    const [localAssignees, setLocalAssignees] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(propProjectId || '');

    const [matrix, setMatrix] = useState([]); // [{ jobTypeId, assigneeId }]
    const [jobTypes, setJobTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        type: 'success',
        title: '',
        message: ''
    });

    // === Effects ===

    // 1. Initial Load (Projects & Assignees)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // ถ้าไม่มี propAssignees ให้โหลด Users ทั้งหมด (หรือกรองตาม Role)
                if (!propAssignees) {
                    const usersResponse = await api.getUsers(); // หรือ api.getUsers({ role: 'assignee' }) ถ้ามี
                    setLocalAssignees(usersResponse?.data || []);
                }

                // ถ้าไม่มี propProjectId ให้โหลด Projects มาให้เลือก
                if (!propProjectId) {
                    const projectList = await api.getProjects();
                    // Filter Active Projects
                    setProjects(projectList?.filter(p => p.is_active) || []);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
            }
        };
        loadInitialData();
    }, [propProjectId, propAssignees]);

    // 2. Sync Prop Updates
    useEffect(() => {
        if (propProjectId) setSelectedProjectId(propProjectId);
        if (propAssignees) setLocalAssignees(propAssignees);
    }, [propProjectId, propAssignees]);

    // 3. Load Matrix Data when Project Changes
    useEffect(() => {
        if (selectedProjectId) {
            loadMatrixData();
        } else {
            setMatrix([]); // Clear matrix if no project selected
        }
    }, [selectedProjectId]);

    const loadMatrixData = async () => {
        setLoading(true);
        try {
            // โหลด JobTypes
            let types = [];
            try {
                types = await api.getJobTypes({ is_active: true });
            } catch (e) {
                console.warn('ไม่สามารถโหลด JobTypes:', e.message);
            }
            setJobTypes((types || []).filter(t => t.name !== 'Project Group (Parent)'));

            // โหลด Matrix
            let currentMatrix = [];
            try {
                if (api.getAssignmentMatrix) {
                    currentMatrix = await api.getAssignmentMatrix(selectedProjectId);
                }
            } catch (e) {
                console.warn('ไม่สามารถโหลด Assignment Matrix:', e.message);
            }
            setMatrix(currentMatrix || []);
        } catch (error) {
            console.error('Error loading matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    // === Handlers ===

    const handleAssigneeChange = (jobTypeId, assigneeId) => {
        setMatrix(prev => {
            const existing = prev.find(m => m.jobTypeId === jobTypeId);
            if (existing) {
                return prev.map(m => m.jobTypeId === jobTypeId ? { ...m, assigneeId } : m);
            } else {
                return [...prev, { jobTypeId, assigneeId }];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedProjectId) return;

        try {
            setLoading(true);
            const payload = matrix
                .filter(m => m.assigneeId && m.assigneeId !== "")
                .map(m => ({
                    jobTypeId: m.jobTypeId,
                    assigneeId: parseInt(m.assigneeId)
                }));

            await api.saveAssignmentMatrix(selectedProjectId, payload);

            setModalConfig({
                type: 'success',
                title: 'บันทึกสำเร็จ',
                message: 'บันทึกการตั้งค่าผู้รับงานอัตโนมัติเรียบร้อยแล้ว'
            });
            setShowModal(true);
            loadMatrixData();

            // แจ้ง parent component ว่าบันทึกสำเร็จแล้ว
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            setModalConfig({
                type: 'error',
                title: 'เกิดข้อผิดพลาด',
                message: 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Determine values to use
    const activeAssignees = propAssignees || localAssignees;

    return (
        <div className="bg-white rounded-lg border border-gray-400 mt-4 p-4 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                กำหนดผู้รับงานอัตโนมัติ (Auto-Assignment Rules)
            </h3>

            {/* Project Select (Standalone Mode) */}
            {!propProjectId && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-400">
                    <label className="block text-sm font-medium text-gray-700 mb-2">เลือกโครงการ (Select Project)</label>
                    <select
                        className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                        <option value="">-- กรุณาเลือกโครงการ --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                        ))}
                    </select>
                </div>
            )}

            {!selectedProjectId ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-400 rounded-lg">
                    <p>กรุณาเลือกโครงการเพื่อเริ่มตั้งค่า</p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-gray-500 mb-4">
                        ตั้งค่าผู้รับงานเริ่มต้นสำหรับแต่ละประเภทงาน เมื่อ User เลือกโครงการและประเภทงานนี้ ระบบจะเลือกผู้รับงานให้อัตโนมัติ
                    </p>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-400">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">ประเภทงาน (Job Type)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้รับงานเริ่มต้น (Default Assignee)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-400">
                                {jobTypes.map(type => {
                                    const current = matrix.find(m => m.jobTypeId === type.id);
                                    return (
                                        <tr key={type.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                                {type.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <select
                                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                    value={current?.assigneeId || ''}
                                                    onChange={(e) => handleAssigneeChange(type.id, e.target.value)}
                                                >
                                                    <option value="">-- ไม่ระบุ (ปล่อยว่าง) --</option>
                                                    {activeAssignees.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.firstName ||
                                                                u.name ||
                                                                [u.prefix, u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ') ||
                                                                u.email ||
                                                                `User #${u.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {jobTypes.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-10 text-center text-gray-400">
                                            ยังไม่มีประเภทงานในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                        </Button>
                    </div>
                </>
            )}

            {/* Modal Popup */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
            />
        </div>
    );
}
