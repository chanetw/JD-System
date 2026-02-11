/**
 * @file JobTypeItems.jsx
 * @description หน้าจอจัดการ "รายการชิ้นงานย่อย" (Sub-items) ภายใต้ประเภทงาน (Job Type)
 * 
 * วัตถุประสงค์หลัก:
 * - แสดงรายการชิ้นงานย่อยทั้งหมดในแต่ละประเภทงาน (เช่น FB Post, IG Story)
 * - เพิ่ม/ลบรายการชิ้นงานย่อยได้
 * - ระบุขนาดมาตรฐาน (Default Size) ของชิ้นงาน
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import { Card, CardHeader } from '@shared/components/Card';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import {
    PlusIcon, TrashIcon, XMarkIcon, DocumentDuplicateIcon, PencilIcon
} from '@heroicons/react/24/outline';

/**
 * JobTypeItems Component
 * คอมโพเน็นต์สำหรับจัดการรายการชิ้นงานย่อยในหน้า Admin
 */
export default function JobTypeItems() {
    // === สถานะข้อมูล ===
    /** รายการประเภทงานทั้งหมด สำหรับ Dropdown */
    const [jobTypes, setJobTypes] = useState([]);
    /** ประเภทงานที่เลือกอยู่ */
    const [selectedJobTypeId, setSelectedJobTypeId] = useState('');
    /** รายการชิ้นงานย่อยของ Job Type ที่เลือก */
    const [items, setItems] = useState([]);
    /** สถานะการโหลด */
    const [isLoading, setIsLoading] = useState(false);

    // === สถานะ Modal ===
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({ name: '', defaultSize: '' });

    /**
     * โหลดรายการประเภทงานทั้งหมด (ครั้งแรก)
     */
    useEffect(() => {
        const loadJobTypes = async () => {
            try {
                // Force refresh to avoid stale cache issues (Deleted items reappearing)
                console.warn('[JobTypeItems] Loading job types (Forced Refresh)...');
                const data = await api.getJobTypes(true);
                const filteredData = data.filter(t => t.name !== 'Project Group (Parent)');
                setJobTypes(filteredData);
                if (filteredData.length > 0) {
                    setSelectedJobTypeId(filteredData[0].id);
                }
            } catch (error) {
                console.error('โหลดประเภทงานไม่สำเร็จ:', error);
            }
        };
        loadJobTypes();
    }, []);

    /**
     * โหลดรายการชิ้นงานย่อย เมื่อเปลี่ยน Job Type
     */
    useEffect(() => {
        if (selectedJobTypeId) {
            loadItems();
        }
    }, [selectedJobTypeId]);

    /**
     * โหลดรายการชิ้นงานย่อยของ Job Type ที่เลือก
     */
    /**
     * โหลดรายการชิ้นงานย่อยของ Job Type ที่เลือก
     * Use pre-loaded items from master data (Optimization)
     */
    const loadItems = () => {
        if (!selectedJobTypeId) return;

        const selectedType = jobTypes.find(jt => String(jt.id) === String(selectedJobTypeId));
        if (selectedType && selectedType.items) {
            console.log(`[JobTypeItems] Loaded ${selectedType.items.length} items from cache`);
            setItems(selectedType.items);
        } else {
            setItems([]);
        }
    };

    /**
     * เปิด Modal สำหรับเพิ่มหรือแก้ไข
     * @param {('add'|'edit')} mode
     * @param {Object} item
     */
    const handleOpenModal = (mode, item = null) => {
        setModalMode(mode);
        if (mode === 'edit' && item) {
            setSelectedId(item.id);
            setFormData({ name: item.name, defaultSize: item.defaultSize || '' });
        } else {
            setSelectedId(null);
            setFormData({ name: '', defaultSize: '' });
        }
        setShowModal(true);
    };

    /**
     * บันทึกข้อมูล (เพิ่ม/แก้ไข)
     * With improved validation and error handling
     */
    const handleSave = async () => {
        // Validation
        if (!formData.name || !formData.name.trim()) {
            Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อชิ้นงาน', confirmButtonText: 'ตกลง' });
            return;
        }

        if (!selectedJobTypeId) {
            Swal.fire({ icon: 'warning', title: 'กรุณาเลือกประเภทงาน', confirmButtonText: 'ตกลง' });
            return;
        }

        const tempId = Date.now(); // Temporary ID for optimistic update
        const newItem = {
            id: selectedId || tempId, // Use existing ID for edit, temp for add
            jobTypeId: Number(selectedJobTypeId),
            name: formData.name.trim(),
            defaultSize: formData.defaultSize || '-',
            isRequired: false
        };

        // 1. Optimistic Update: Update UI Immediately
        const previousItems = [...items]; // Backup for rollback
        if (modalMode === 'add') {
            setItems(prev => [...prev, newItem]);
        } else {
            setItems(prev => prev.map(item => item.id === selectedId ? newItem : item));
        }

        // Close modal immediately
        setShowModal(false);
        setFormData({ name: '', defaultSize: '' });

        try {
            // 2. Call API in Background
            if (modalMode === 'add') {
                const createdItem = await api.createJobTypeItem({
                    jobTypeId: newItem.jobTypeId,
                    name: newItem.name,
                    defaultSize: newItem.defaultSize,
                    isRequired: newItem.isRequired
                });

                console.log('[JobTypeItems] Created item from API:', createdItem);

                // Replace temp ID with real ID
                setItems(prev => prev.map(item => item.id === tempId ? createdItem : item));

                Swal.fire({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', showConfirmButton: false, timer: 1500 });
            } else {
                await api.updateJobTypeItem(selectedId, {
                    name: newItem.name,
                    defaultSize: newItem.defaultSize,
                    isRequired: newItem.isRequired
                });
                Swal.fire({ icon: 'success', title: 'แก้ไขรายการสำเร็จ', showConfirmButton: false, timer: 1500 });
            }

            // Sync with global cache (Optional but good)
            // Note: We don't need full refresh here because we trust our local update mostly
            // But to be safe, we can sync quietly later or just leave it since we updated global cache?
            // Actually, we should update the global jobTypes state as well to persist the change if user switches tabs
            // But let's stick to the minimal optimistic flow first.

        } catch (error) {
            console.error('[JobTypeItems] Save error:', error);
            // 3. Rollback on Error
            setItems(previousItems);

            const errorMsg = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการบันทึก';
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: errorMsg,
                confirmButtonText: 'ตกลง'
            });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * ลบรายการชิ้นงานย่อย
     * @param {number} itemId - รหัสรายการที่ต้องการลบ
     */
    /**
     * ลบรายการชิ้นงานย่อย
     * @param {number} itemId - รหัสรายการที่ต้องการลบ
     */
    const handleDelete = async (itemId) => {
        console.log('[JobTypeItems] handleDelete called with:', itemId, typeof itemId);
        if (typeof itemId === 'object') {
            console.error('[JobTypeItems] Critical: Object passed as ID!', itemId);
            alert('Error: ID is an object');
            return;
        }

        // Use SweetAlert2 for comfirmation
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบรายการ',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        // 1. Optimistic Update: Update UI Immediately
        const previousItems = [...items]; // Backup for rollback
        setItems(prev => prev.filter(item => item.id !== itemId));

        try {
            // 2. Call API in Background
            await api.deleteJobTypeItem(itemId);

            // Show success alert
            Swal.fire({
                icon: 'success',
                title: 'ลบรายการสำเร็จ',
                showConfirmButton: false,
                timer: 1500
            });

            // No need to reload cache, we are confident!
            // But we can update global cache silently
            setJobTypes(prev => prev.map(jt =>
                String(jt.id) === String(selectedJobTypeId)
                    ? { ...jt, items: jt.items.filter(i => i.id !== itemId) }
                    : jt
            ));

        } catch (error) {
            console.error('[JobTypeItems] Delete error:', error);
            // 3. Rollback on Error
            setItems(previousItems);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message,
                confirmButtonText: 'ตกลง'
            });
        }
    };

    // หา Job Type ที่เลือกอยู่
    const selectedJobType = jobTypes.find(jt => String(jt.id) === String(selectedJobTypeId));

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">จัดการรายการชิ้นงานย่อย</h1>
                    <p className="text-gray-600 mt-1">เพิ่ม/ลบรายการชิ้นงานย่อย (Sub-items) สำหรับแต่ละประเภทงาน</p>
                </div>
            </div>

            {/* Job Type Selector */}
            <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <FormSelect
                            label="เลือกประเภทงาน (Job Type)"
                            value={selectedJobTypeId}
                            onChange={(e) => setSelectedJobTypeId(e.target.value)}
                        >
                            {jobTypes.map(jt => (
                                <option key={jt.id} value={jt.id}>{jt.name}</option>
                            ))}
                        </FormSelect>
                    </div>
                    <Button onClick={() => handleOpenModal('add')} className="flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        เพิ่มรายการย่อย
                    </Button>
                </div>
            </Card>

            {/* Items Table */}
            <Card>
                <CardHeader
                    title={`รายการชิ้นงานย่อยของ "${selectedJobType?.name || '...'}"`}
                >
                    <span className="text-sm text-gray-500">
                        พบ {items?.length || 0} รายการ
                    </span>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-400">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อชิ้นงาน (Item Name)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ขนาดมาตรฐาน (Size)</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-400">
                            {isLoading ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">ยังไม่มีรายการชิ้นงานย่อย</td></tr>
                            ) : items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                                <DocumentDuplicateIcon className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-gray-900">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.defaultSize || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal('edit', item)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Item Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-400 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">{modalMode === 'add' ? 'เพิ่มรายการชิ้นงานย่อย' : 'แก้ไขรายการชิ้นงานย่อย'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput
                                label="ชื่อชิ้นงาน"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น Facebook Post, Instagram Story"
                            />
                            <FormInput
                                label="ขนาดมาตรฐาน (Size)"
                                value={formData.defaultSize}
                                onChange={(e) => setFormData({ ...formData, defaultSize: e.target.value })}
                                placeholder="เช่น 1080x1080px, 1920x600px"
                            />
                        </div>
                        <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>ยกเลิก</Button>
                            <Button onClick={handleSave}>{modalMode === 'add' ? 'เพิ่มรายการ' : 'บันทึกแก้ไข'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
