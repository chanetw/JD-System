/**
 * @file JobTypeSLA.jsx
 * @description หน้าจอจัดการประเภทงาน (Job Types) และเป้าหมายระยะเวลาทำงาน (SLA)
 * 
 * วัตถุประสงค์หลัก:
 * - กำหนดประเภทงานต่างๆ ที่มีในระบบ (เช่น Social Media, Banner, Video)
 * - ตั้งค่าระยะเวลา SLA (จำนวนวันทำงาน) สำหรับงานแต่ละประเภท
 * - กำหนดรายการเอกสารแนบที่จำเป็นสำหรับงานแต่ละประเภท
 * - เลือกไอคอนและสีประจำประเภทงานเพื่อความสวยงามในระบบ
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import { Card, CardHeader } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import Swal from 'sweetalert2';
import { FormInput, FormSelect, FormTextarea } from '@shared/components/FormInput';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    BriefcaseIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

/**
 * การตั้งค่าสีและไอคอนสำหรับประเภทงานต่างๆ
 * ใช้สำหรับแสดงผลในตารางและส่วนสรุปสถิติ
 */
const JOB_ICONS = {
    social: {
        label: "Social Media",
        color: "blue",
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
    },
    banner: {
        label: "Banner Web",
        color: "purple",
        bg: "bg-purple-100",
        text: "text-purple-600",
        border: "border-purple-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    print: {
        label: "Print Ad",
        color: "orange",
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
    },
    edm: {
        label: "EDM",
        color: "teal",
        bg: "bg-teal-100",
        text: "text-teal-600",
        border: "border-teal-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    },
    video: {
        label: "Video Clip",
        color: "red",
        bg: "bg-red-100",
        text: "text-red-600",
        border: "border-red-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    },
    key_visual: {
        label: "Key Visual",
        color: "pink",
        bg: "bg-pink-100",
        text: "text-pink-600",
        border: "border-pink-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    },
    photography: {
        label: "Photography",
        color: "yellow",
        bg: "bg-yellow-100",
        text: "text-yellow-600",
        border: "border-yellow-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 15a3 3 0 106 0 3 3 0 00-6 0z"></path>
    },
    motion: {
        label: "Motion Graphics",
        color: "amber",
        bg: "bg-amber-100",
        text: "text-amber-600",
        border: "border-amber-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    },
    audio: {
        label: "Audio / Music",
        color: "green",
        bg: "bg-green-100",
        text: "text-green-600",
        border: "border-green-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path>
    },
    infographic: {
        label: "Infographic",
        color: "cyan",
        bg: "bg-cyan-100",
        text: "text-cyan-600",
        border: "border-cyan-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    },
    landing: {
        label: "Landing Page",
        color: "indigo",
        bg: "bg-indigo-100",
        text: "text-indigo-600",
        border: "border-indigo-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
    },
    social_reply: {
        label: "Social Comments",
        color: "lime",
        bg: "bg-lime-100",
        text: "text-lime-600",
        border: "border-lime-500",
        path: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
    }
};

/**
 * รายการเอกสารแนบที่ระบบรองรับให้เลือก (Standard Attachment Types)
 */
const AVAILABLE_ATTACHMENTS = ['Logo', 'Product Image', 'Size Spec', 'Print Spec', 'Script', 'Storyboard', 'Music Ref', 'Mood & Tone', 'Reference'];

/**
 * AdminJobTypeSLA Component
 * คอมโพเน็นต์สำหรับการจัดการประเภทงานและ SLA ในระบบหลังบ้าน
 */
export default function AdminJobTypeSLA() {
    // === สถานะของข้อมูล (States: Data) ===
    /** รายการประเภทงานทั้งหมด */
    const [jobTypes, setJobTypes] = useState([]);
    /** สถานะการกำลังโหลดข้อมูล */
    const [isLoading, setIsLoading] = useState(false);

    // === สถานะของหน้าต่างจัดการ (States: Modal) ===
    /** ควบคุมการเปิด/ปิด Modal */
    const [showModal, setShowModal] = useState(false);
    /** โหมดของ Modal: 'add' (เพิ่มใหม่) หรือ 'edit' (แก้ไข) */
    const [modalMode, setModalMode] = useState('add');
    /** ID ของรายการที่กำลังเลือกแก้ไข */
    const [selectedId, setSelectedId] = useState(null);
    /** ข้อมูลในฟอร์ม */
    const [formData, setFormData] = useState({
        name: '',           // ชื่อประเภทงาน
        description: '',    // รายละเอียด
        sla: 3,             // ระยะเวลา SLA (วัน)
        attachments: [],    // รายการเอกสารแนบที่ต้องใช้
        icon: 'social',     // ไอคอนที่เลือก
        status: 'active',   // สถานะ: active, inactive
        nextJobTypeId: ''   // Next Job (Auto-Chain)
    });

    // ============================================
    // Load Data
    // ============================================
    /**
     * ดึงข้อมูลประเภทงานทั้งหมดจาก API
     * @async
     */
    const fetchData = async () => {
        setIsLoading(true);
        try {
            console.log('[JobTypeSLA] Fetching data...');
            const data = await api.getJobTypes();
            console.log('[JobTypeSLA] Raw data received:', data);

            if (data && data.length > 0) {
                // Log the first item to check field mapping
                console.log('[JobTypeSLA] First item sample:', {
                    id: data[0].id,
                    name: data[0].name,
                    attachments: data[0].attachments, // Check this specifically
                    icon: data[0].icon
                });
            } else {
                console.warn('[JobTypeSLA] No data received or empty array');
            }

            setJobTypes((data || []).filter(t => t.name !== 'Project Group (Parent)'));
        } catch (error) {
            console.error("[JobTypeSLA] Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ============================================
    // Actions
    // ============================================
    /**
     * เปิด Modal สำหรับเพิ่มหรือแก้ไขข้อมูล
     * @param {('add'|'edit')} mode - โหมดการใช้งาน
     * @param {Object} [item] - ข้อมูลที่ต้องการแก้ไข (กรณี mode เป็น 'edit')
     */
    const handleOpenModal = (mode, item = null) => {
        setModalMode(mode);
        if (mode === 'edit' && item) {
            setSelectedId(item.id);
            setFormData({
                name: item.name,
                description: item.description || '',
                sla: item.sla,
                attachments: item.attachments || [],
                icon: item.icon || 'social',
                status: item.status || 'active',
                nextJobTypeId: item.nextJobTypeId || ''
            });
        } else {
            // ล้างข้อมูลฟอร์มสำหรับการเพิ่มใหม่ (Reset for Add)
            setSelectedId(null);
            setFormData({
                name: '',
                description: '',
                sla: 3,
                attachments: ['Logo', 'Product Image'],
                icon: 'social',
                status: 'active',
                nextJobTypeId: ''
            });
        }
        setShowModal(true);
    };

    /** บันทึกข้อมูลประเภทงานลงในฐานข้อมูล */
    /** บันทึกข้อมูลประเภทงานลงในฐานข้อมูล */
    const handleSave = async () => {
        // Validation
        if (!formData.name || !formData.name.trim()) {
            Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อประเภทงาน', confirmButtonText: 'ตกลง' });
            return;
        }

        const tempId = Date.now(); // Temporary ID for optimistic update
        const newItem = {
            id: selectedId || tempId,
            ...formData,
            status: formData.status || 'active'
        };

        // 1. Optimistic Update: Update UI Immediately
        const previousJobTypes = [...jobTypes]; // Backup for rollback
        console.log('[JobTypeSLA] Optimistic adding/updating item:', newItem);

        if (modalMode === 'add') {
            setJobTypes(prev => [...prev, newItem]);
            // Optimistic Success Feedback
            Swal.fire({ icon: 'success', title: 'เพิ่มประเภทงานสำเร็จ', showConfirmButton: false, timer: 1500 });
        } else {
            setJobTypes(prev => prev.map(jt => jt.id === selectedId ? newItem : jt));
            // Optimistic Success Feedback
            Swal.fire({ icon: 'success', title: 'แก้ไขข้อมูลสำเร็จ', showConfirmButton: false, timer: 1500 });
        }

        // Close modal immediately
        setShowModal(false);

        try {
            // 2. Call API in Background
            if (modalMode === 'add') {
                console.log('[JobTypeSLA] Calling API CreateJobType...');
                const createdItem = await api.createJobType(formData);
                console.log('[JobTypeSLA] API Create success:', createdItem);

                // Replace temp ID with real ID
                setJobTypes(prev => prev.map(jt => jt.id === tempId ? createdItem : jt));
            } else {
                console.log('[JobTypeSLA] Calling API UpdateJobType for ID:', selectedId);
                await api.updateJobType(selectedId, formData);
                console.log('[JobTypeSLA] API Update success');
            }

        } catch (error) {
            console.error('[JobTypeSLA] Save error:', error);
            // 3. Rollback on Error
            setJobTypes(previousJobTypes);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
                confirmButtonText: 'ตกลง'
            });
        }
    };

    /**
     * ลบประเภทงาน
     * @param {string|number} id - ID ของประเภทงานที่ต้องการลบ
     */
    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบประเภทงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        // 1. Optimistic Update: Update UI Immediately
        const previousJobTypes = [...jobTypes]; // Backup for rollback
        console.log('[JobTypeSLA] Optimistic deleting item ID:', id);
        setJobTypes(prev => prev.filter(item => item.id !== id));

        // Optimistic Success Feedback
        Swal.fire({ icon: 'success', title: 'ลบข้อมูลสำเร็จ', showConfirmButton: false, timer: 1500 });

        try {
            // 2. Call API in Background
            console.log('[JobTypeSLA] Calling API DeleteJobType for ID:', id);
            await api.deleteJobType(id);
            console.log('[JobTypeSLA] API Delete success');

        } catch (error) {
            console.error('[JobTypeSLA] Delete error:', error);
            // 3. Rollback on Error
            setJobTypes(previousJobTypes);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถลบข้อมูลได้',
                confirmButtonText: 'ตกลง'
            });
        }
    };

    /**
     * จัดการการเลือกเอกสารแนบที่จำเป็น (Toggle Selection)
     * @param {string} item - ชื่อประเภทเอกสารแนบ
     */
    const handleAttachmentChange = (item) => {
        setFormData(prev => {
            if (prev.attachments.includes(item)) {
                return { ...prev, attachments: prev.attachments.filter(a => a !== item) };
            } else {
                return { ...prev, attachments: [...prev.attachments, item] };
            }
        });
    };

    /**
     * เปลี่ยนสถานะใช้งาน (Toggle Status)
     * ✅ FIXED: Only send necessary fields to API (not entire item)
     * @param {string|number} id - ID ของรายการ
     * @param {Object} item - ข้อมูลรายการ
     */
    const handleToggleStatus = async (id, item) => {
        // 1. Optimistic Update: Update UI Immediately
        const previousJobTypes = [...jobTypes]; // Backup for rollback
        const newStatus = item.status === 'active' ? 'inactive' : 'active';

        console.log(`[JobTypeSLA] Toggling status for ID ${id} to ${newStatus}`);

        setJobTypes(prev => prev.map(jt =>
            jt.id === id ? { ...jt, status: newStatus } : jt
        ));

        // Optimistic Success Feedback (Toast)
        const statusText = newStatus === 'active' ? 'เปิดการใช้งาน' : 'ปิดการใช้งาน';
        Swal.fire({
            icon: 'success',
            title: `${statusText}เรียบร้อย`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
        });

        try {
            // 2. Call API in Background
            // ✅ FIXED: Only send necessary fields to prevent Prisma schema conflicts
            const payload = {
                isActive: newStatus === 'active'  // Convert status to isActive boolean
            };
            console.log('[JobTypeSLA] Sending payload:', payload);
            await api.updateJobType(id, payload);

        } catch (error) {
            console.error('[JobTypeSLA] Toggle status error:', error);
            // 3. Rollback on Error
            setJobTypes(previousJobTypes);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + error.message);
        }
    };

    /**
     * คอมโพเน็นต์แสดงสถานะ (Status Badge) แบบเดียวกับ Projects
     */
    const StatusBadge = ({ isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer
                ${isActive
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-600 border-gray-400 hover:bg-gray-100'
                }
            `}
            title="คลิกเพื่อเปลี่ยนสถานะ"
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {isActive ? 'Active' : 'Inactive'}
        </button>
    );

    // Stats Calculation
    const filteredJobTypes = jobTypes.filter(j => j.name !== 'Project Group (Parent)');
    const activeCount = filteredJobTypes.filter(j => j.status === 'active').length;
    const avgSLA = filteredJobTypes.length ? (filteredJobTypes.reduce((acc, curr) => acc + Number(curr.sla), 0) / filteredJobTypes.length).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Job Type & SLA Management</h1>
                    <p className="text-gray-500">จัดการประเภทงานและระยะเวลา SLA</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* ปุ่มโหลดข้อมูลใหม่ (สำหรับ Debug เมื่อข้อมูลหาย) */}
                    {jobTypes.length === 0 && !isLoading && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                localStorage.removeItem('dj_system_jobTypes');
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
                    <Button onClick={() => handleOpenModal('add')}>
                        <PlusIcon className="w-5 h-5" /> Add Job Type
                    </Button>
                </div>
            </div>

            {/* ส่วนสรุปสถิติ (Stats Overview) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminStatCard label="ประเภทงานทั้งหมด" value={jobTypes.length} icon={<BriefcaseIcon className="w-5 h-5 text-rose-600" />} color="rose" />
                <AdminStatCard label="เปิดการใช้งาน (Active)" value={activeCount} icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />} color="green" />
                <AdminStatCard label="SLA เฉลี่ย (วัน)" value={avgSLA} icon={<ClockIcon className="w-5 h-5 text-blue-600" />} color="blue" />
                <AdminStatCard label="DJ ที่เกิดขึ้นเดือนนี้" value="156" icon={<DocumentDuplicateIcon className="w-5 h-5 text-purple-600" />} color="purple" />
            </div>

            {/* ตารางแสดงข้อมูล (Job Types Table) */}
            <Card className="overflow-hidden shadow-sm border border-gray-100">
                <CardHeader title="กำหนดค่าประเภทงานและ SLA (Job Types Configuration)" />
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-400">
                            <tr>
                                <Th>ประเภทงาน (Job Type)</Th>
                                <Th>รายละเอียด (Description)</Th>
                                <Th className="text-center">SLA (วันทำงาน)</Th>
                                <Th>เอกสารแนบที่ต้องใช้ (Attachments)</Th>
                                <Th className="text-center">สถานะ</Th>
                                <Th className="text-center">จัดการ</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-400">
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : jobTypes.map((item) => {
                                const iconConfig = JOB_ICONS[item.icon] || JOB_ICONS.social;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${iconConfig.bg} rounded-lg flex items-center justify-center ${iconConfig.text}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        {iconConfig.path}
                                                    </svg>
                                                </div>
                                                <span className="font-medium text-gray-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-green-100 text-green-700 font-medium rounded-full text-sm">{item.sla} วัน</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {item.attachments?.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge
                                                isActive={item.status === 'active'}
                                                onClick={() => handleToggleStatus(item.id, item)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleOpenModal('edit', item)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* หน้าต่างเพิ่ม/แก้ไข (Add/Edit Modal) */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                        <div className="p-6 border-b border-gray-400 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">{modalMode === 'add' ? 'เพิ่มประเภทงานใหม่' : 'แก้ไขข้อมูลประเภทงาน'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm transition-transform hover:rotate-90">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="ชื่อประเภทงาน"
                                    required
                                    placeholder="เช่น Social Media Design"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <FormSelect
                                    label="สถานะการใช้งาน"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">เปิดใช้งาน (Active)</option>
                                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                                </FormSelect>
                            </div>

                            <FormTextarea
                                label="รายละเอียดประเภทงาน"
                                rows="2"
                                placeholder="ระบุขอบเขตของงานโดยสังเขป..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />

                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                <FormInput
                                    label="เป้าหมายระยะเวลาทำงาน (SLA) - จำนวนวันทำงาน"
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.sla}
                                    onChange={(e) => setFormData({ ...formData, sla: e.target.value })}
                                />
                                <p className="mt-2 text-xs text-rose-600 italic">* ระบบจะใช้ค่านี้ในการคำนวณวันครบกำหนดส่งงานโดยนับเฉพาะวันทำงาน</p>
                            </div>

                            {/* Auto-Chain Configuration */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <FormSelect
                                    label="งานถัดไป (Auto-Chain Next Job)"
                                    value={formData.nextJobTypeId}
                                    onChange={(e) => setFormData({ ...formData, nextJobTypeId: e.target.value })}
                                >
                                    <option value="">-- ไม่มีการผูกงาน (None) --</option>
                                    {jobTypes
                                        .filter(jt => jt.id !== selectedId) // Prevent self-loop
                                        .map(jt => (
                                            <option key={jt.id} value={jt.id}>
                                                {jt.name}
                                            </option>
                                        ))
                                    }
                                </FormSelect>
                                <p className="mt-2 text-xs text-blue-600 italic">
                                    * เมื่อ User เลือกงานนี้ ระบบจะเพิ่มงานที่กำหนดไว้ให้อัตโนมัติ พร้อมตั้งค่าให้รองานนี้เสร็จก่อน
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    เอกสารแนบที่จำเป็น (Required Attachments)
                                    <span className="text-[10px] font-normal bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 uppercase">Select Multiple</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {AVAILABLE_ATTACHMENTS.map(item => (
                                        <label key={item} className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all ${formData.attachments.includes(item) ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200' : 'bg-white border-gray-400 hover:border-gray-300'}`}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                                checked={formData.attachments.includes(item)}
                                                onChange={() => handleAttachmentChange(item)}
                                            />
                                            <span className={`text-sm ${formData.attachments.includes(item) ? 'text-rose-700 font-bold' : 'text-gray-600'}`}>{item}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">เลือกไอคอนแสดงผล (Display Icon)</label>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(JOB_ICONS).map(iconName => {
                                        const iconConfig = JOB_ICONS[iconName];
                                        const isSelected = formData.icon === iconName;
                                        return (
                                            <div
                                                key={iconName}
                                                onClick={() => setFormData({ ...formData, icon: iconName })}
                                                title={iconConfig.label}
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 cursor-pointer transition-all transform hover:scale-105 ${isSelected ? `${iconConfig.bg} ${iconConfig.border} ${iconConfig.text} shadow-md` : 'bg-gray-50 border-transparent hover:border-gray-300 text-gray-400'}`}
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {iconConfig.path}
                                                </svg>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก (Cancel)</Button>
                            <Button variant="primary" onClick={handleSave} className="bg-rose-600 hover:bg-rose-700 shadow-md transform active:scale-95 transition-all min-w-[140px]">
                                {modalMode === 'add' ? 'เพิ่มประเภทงาน' : 'บันทึกการแก้ไข'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * การ์ดแสดงผลสถิติในหน้า Admin
 * @component
 */
function AdminStatCard({ label, value, icon, color }) {
    const colors = {
        rose: "bg-rose-100",
        green: "bg-green-100",
        blue: "bg-blue-100",
        purple: "bg-purple-100"
    };
    return (
        <div className="bg-white rounded-xl border border-gray-400 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center shadow-inner`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
            </div>
        </div>
    );
}

/** ส่วนหัวตารางป้ายกำกับขนาดจิ๋ว */
function Th({ children, className = "text-left" }) {
    return <th className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${className}`}>{children}</th>;
}
