import React, { useState, useEffect } from 'react';
import api from '@shared/services/apiDatabase';
import { FormSelect } from '@shared/components/FormInput';
import Button from '@shared/components/Button';
import Modal from '@shared/components/Modal';

/**
 * AssignmentMatrix Component
 * จัดการตารางกำหนดผู้รับงานอัตโนมัติตามประเภทงาน (Project + JobType -> Assignee)
 */
export default function AssignmentMatrix({ projectId, assignees }) {
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

    // โหลดข้อมูลเมื่อ projectId เปลี่ยน
    useEffect(() => {
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // โหลด JobTypes ก่อน (ถ้า API พร้อม)
            let types = [];
            try {
                types = await api.getJobTypes({ is_active: true });
            } catch (e) {
                console.warn('ไม่สามารถโหลด JobTypes:', e.message);
            }
            setJobTypes(types || []);

            // โหลด Matrix (ถ้า table มีอยู่)
            let currentMatrix = [];
            try {
                if (api.getAssignmentMatrix) {
                    currentMatrix = await api.getAssignmentMatrix(projectId);
                }
            } catch (e) {
                // Table อาจยังไม่ถูกสร้าง - ไม่ต้อง throw error
                console.warn('ไม่สามารถโหลด Assignment Matrix:', e.message);
            }
            setMatrix(currentMatrix || []);
        } catch (error) {
            console.error('Error loading matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    // อัปเดต Matrix ใน state เมื่อมีการเลือก Assignee
    const handleAssigneeChange = (jobTypeId, assigneeId) => {
        setMatrix(prev => {
            const existing = prev.find(m => m.jobTypeId === jobTypeId);
            if (existing) {
                // Update
                return prev.map(m => m.jobTypeId === jobTypeId ? { ...m, assigneeId } : m);
            } else {
                // Add new
                return [...prev, { jobTypeId, assigneeId }];
            }
        });
    };

    // บันทึกข้อมูลลง Database
    const handleSave = async () => {
        try {
            setLoading(true);

            // เตรียมข้อมูลสำหรับบันทึก (กรองเฉพาะที่มี assigneeId)
            const payload = matrix
                .filter(m => m.assigneeId && m.assigneeId !== "")
                .map(m => ({
                    jobTypeId: m.jobTypeId,
                    assigneeId: parseInt(m.assigneeId)
                }));

            await api.saveAssignmentMatrix(projectId, payload);

            // Show Success Modal
            setModalConfig({
                type: 'success',
                title: 'บันทึกสำเร็จ',
                message: 'บันทึกการตั้งค่าผู้รับงานอัตโนมัติเรียบร้อยแล้ว'
            });
            setShowModal(true);

            loadData(); // Reload เพื่อ update ID
        } catch (error) {
            // Show Error Modal
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

    if (!projectId) return <div className="p-4 text-center text-gray-400">กรุณาเลือกโครงการก่อน</div>;

    return (
        <div className="bg-white rounded-lg border border-gray-200 mt-4 p-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                กำหนดผู้รับงานอัตโนมัติ (Auto-Assignment Rules)
            </h3>

            <p className="text-sm text-gray-500 mb-4">
                ตั้งค่าผู้รับงานเริ่มต้นสำหรับแต่ละประเภทงาน เมื่อ User เลือกโครงการและประเภทงานนี้ ระบบจะเลือกผู้รับงานให้อัตโนมัติ
            </p>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">ประเภทงาน (Job Type)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้รับงานเริ่มต้น (Default Assignee)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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
                                            {assignees.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {[u.prefix, u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ')}
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

            {/* Modal Popup */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
            />
        </div >
    );
}
