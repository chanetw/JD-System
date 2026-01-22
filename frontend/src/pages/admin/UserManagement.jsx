/**
 * UserManagement Component
 * คอมโพเน็นต์สำหรับจัดการข้อมูลผู้ใช้งานในระบบ (User Management)
 * 
 * ฟีเจอร์หลัก:
 * - แสดงรายการผู้ใช้ทั้งหมดในระบบ
 * - เพิ่ม/แก้ไข/ลบข้อมูลผู้ใช้
 * - กำหนดบทบาท (Roles) และขอบเขตการเข้าถึง (Scope) ของผู้ใช้
 * - รองรับการเลือกหลายโครงการสำหรับบทบาท Marketing และ Assignee
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';
import {
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
    UserIcon, BuildingOfficeIcon, BriefcaseIcon
} from '@heroicons/react/24/outline';

/**
 * ตัวเลือกคำนำหน้าชื่อ (Name Prefix Options)
 * รองรับทั้งภาษาไทยและภาษาอังกฤษ
 */
const PREFIX_OPTIONS = [
    { value: 'นาย', label: 'นาย' },
    { value: 'นาง', label: 'นาง' },
    { value: 'นางสาว', label: 'นางสาว' },
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Ms.', label: 'Ms.' }
];

/**
 * ตัวเลือกบทบาทผู้ใช้ (User Role Options)
 * - admin: ผู้ดูแลระบบ มีสิทธิ์เต็ม
 * - marketing: ผู้สั่งงาน (Requester) สามารถสร้าง DJ ได้
 * - approver: ผู้อนุมัติ (Head/Manager) อนุมัติคำขอสร้างงาน
 * - assignee: ผู้รับงาน (Creative/Workflow) รับมอบหมายงานและดำเนินการ
 */
const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
    { value: 'marketing', label: 'Requester (Marketing)' },
    { value: 'approver', label: 'Approver (Head/Manager)' },
    { value: 'assignee', label: 'Assignee (Creative/Workflow)' }
];

/**
 * ระดับขอบเขตการเข้าถึง (Scope Levels)
 * กำหนดว่าผู้ใช้มีสิทธิ์เข้าถึงข้อมูลในระดับใด
 * - Tenant: ระดับบริษัท (เห็นข้อมูลทั้งบริษัท)
 * - BUD: ระดับสายงาน/แผนก (เห็นเฉพาะสายงานของตน)
 * - Project: ระดับโครงการ (เห็นเฉพาะโครงการที่เกี่ยวข้อง)
 */
const SCOPE_LEVELS = [
    { value: 'Tenant', label: 'ระดับบริษัท (Tenant)' },
    { value: 'BUD', label: 'ระดับสายงาน (BUD)' },
    { value: 'Project', label: 'ระดับโครงการ (Project)' }
];

/**
 * UserManagement Component
 * คอมโพเน็นต์หลักสำหรับจัดการผู้ใช้งาน
 * 
 * @returns {JSX.Element} หน้าจัดการผู้ใช้งาน
 */
export default function UserManagement() {
    // === State Management (การจัดการสถานะ) ===

    /** รายการผู้ใช้ทั้งหมด (User List) */
    const [users, setUsers] = useState([]);

    /** ข้อมูล Master Data ประกอบด้วย tenants, buds, projects */
    const [masters, setMasters] = useState({ tenants: [], buds: [], projects: [] });

    /** สถานะการโหลดข้อมูล (Loading State) */
    const [isLoading, setIsLoading] = useState(true);

    /** Tab ปัจจุบัน: 'active' หรือ 'registrations' */
    const [activeTab, setActiveTab] = useState('active');

    /** รายการคำขอสมัครที่รอการอนุมัติ */
    const [registrations, setRegistrations] = useState([]);

    /** สถานะการโหลดคำขอสมัคร */
    const [registrationsLoading, setRegistrationsLoading] = useState(false);

    /** Modal สำหรับ Reject Reason */
    const [rejectModal, setRejectModal] = useState({
        show: false,
        registrationId: null,
        registrationEmail: null
    });

    /** Reject Reason Text */
    const [rejectReason, setRejectReason] = useState('');

    /** สถานะการแสดง Modal สำหรับเพิ่ม/แก้ไขผู้ใช้ */
    const [showModal, setShowModal] = useState(false);

    /** สถานะการส่งข้อมูล (กำลังบันทึก) */
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** ข้อมูลผู้ใช้ที่กำลังแก้ไข (null = โหมดเพิ่มใหม่) */
    const [editingUser, setEditingUser] = useState(null);

    // === Form State (สถานะฟอร์ม) ===

    /** ข้อมูลในฟอร์มสำหรับเพิ่ม/แก้ไขผู้ใช้ */
    const [formData, setFormData] = useState({
        prefix: '',                  // คำนำหน้าชื่อ
        name: '',                    // ชื่อ
        lastName: '',                // นามสกุล
        email: '',                   // อีเมล
        phone: '',                   // เบอร์โทรศัพท์
        roles: [],                   // บทบาท (สามารถเลือกได้หลายบทบาท)
        scopeLevel: 'Project',       // ระดับขอบเขต (ค่าเริ่มต้น: Project)
        scopeId: '',                 // ID ของ Scope ที่เลือก
        assignedProjects: [],        // โครงการที่รับผิดชอบ (สำหรับ Assignee)
        allowedProjects: []          // โครงการที่สร้าง DJ ได้ (สำหรับ Requester/Marketing)
    });

    // === Alert State (สถานะการแจ้งเตือน) ===

    /** สถานะการแสดงข้อความแจ้งเตือน (Toast Alert) */
    const [alertState, setAlertState] = useState({
        show: false,      // แสดง/ซ่อน Alert
        type: 'success',  // ประเภท: 'success' หรือ 'error'
        message: ''       // ข้อความที่จะแสดง
    });

    // === Confirm Modal State (สถานะ Modal ยืนยันการลบ) ===

    /** สถานะ Modal ยืนยันการลบผู้ใช้ */
    const [confirmModal, setConfirmModal] = useState({
        show: false,  // แสดง/ซ่อน Modal
        id: null      // ID ของผู้ใช้ที่จะลบ
    });

    // === Search State (สถานะการค้นหา) ===

    /** คำค้นหาโครงการสำหรับ Assignee (ผู้รับงาน) */
    const [projectSearch, setProjectSearch] = useState('');

    /** คำค้นหาโครงการสำหรับ Requester/Marketing (ผู้สั่งงาน) */
    const [requesterSearch, setRequesterSearch] = useState('');

    useEffect(() => {
        loadData();
        if (activeTab === 'registrations') {
            loadRegistrations();
        }
    }, [activeTab]);

    /**
     * โหลดข้อมูลผู้ใช้และ Master Data จาก API
     * ฟังก์ชันนี้จะดึงข้อมูลผู้ใช้ทั้งหมดและข้อมูล Master (tenants, buds, projects) พร้อมกัน
     * 
     * @async
     * @function loadData
     * @returns {Promise<void>} ไม่มีค่าส่งกลับ แต่จะอัปเดต state users และ masters
     * @throws {Error} แสดง Alert ข้อผิดพลาดหากโหลดข้อมูลไม่สำเร็จ
     */
    const loadData = async () => {
        try {
            setIsLoading(true);
            // เรียก API 2 ตัวพร้อมกัน (Parallel) เพื่อประหยัดเวลา
            const [usersData, masterData] = await Promise.all([
                api.getUsers(),
                api.getMasterData()
            ]);
            setUsers(usersData);
            setMasters(masterData);
        } catch (error) {
            showAlert('error', 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * โหลดรายการคำขอสมัครที่รอการอนุมัติ
     * @async
     */
    const loadRegistrations = async () => {
        try {
            setRegistrationsLoading(true);
            const regsData = await api.getPendingRegistrations('pending');
            setRegistrations(regsData);
        } catch (error) {
            console.error('Error loading registrations:', error);
            showAlert('error', 'ไม่สามารถโหลดคำขอสมัครได้');
        } finally {
            setRegistrationsLoading(false);
        }
    };

    /**
     * แสดงข้อความแจ้งเตือนแบบ Toast
     * ข้อความจะแสดงเป็นเวลา 3 วินาทีแล้วหายไปอัตโนมัติ
     * 
     * @function showAlert
     * @param {string} type - ประเภทของ Alert ('success' หรือ 'error')
     * @param {string} message - ข้อความที่ต้องการแสดง
     * @returns {void}
     */
    const showAlert = (type, message) => {
        setAlertState({ show: true, type, message });
        // ซ่อน Alert อัตโนมัติหลังจาก 3 วินาที
        setTimeout(() => setAlertState({ show: false, type: '', message: '' }), 3000);
    };

    /**
     * จัดการการเปลี่ยนแปลงบทบาทของผู้ใช้
     * รองรับการเลือกหลายบทบาท (Multi-select) โดยการ Toggle เพิ่ม/ลบบทบาท
     * 
     * @function handleRoleChange
     * @param {string} roleValue - ค่าบทบาทที่ถูกคลิก (เช่น 'admin', 'marketing', 'approver', 'assignee')
     * @returns {void}
     */
    const handleRoleChange = (roleValue) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            // ถ้ามีบทบาทนี้อยู่แล้ว ให้ลบออก (Uncheck)
            if (currentRoles.includes(roleValue)) {
                return { ...prev, roles: currentRoles.filter(r => r !== roleValue) };
            } else {
                // ถ้ายังไม่มี ให้เพิ่มเข้าไป (Check)
                return { ...prev, roles: [...currentRoles, roleValue] };
            }
        });
    };

    /**
     * บันทึกข้อมูลผู้ใช้ (เพิ่มใหม่หรือแก้ไข)
     * ฟังก์ชันนี้จะตรวจสอบความถูกต้องของข้อมูล (Validation) ก่อนบันทึก
     * 
     * กฎการตรวจสอบ:
     * 1. ต้องกรอก ชื่อ, อีเมล และเลือกบทบาทอย่างน้อย 1 บทบาท
     * 2. บทบาทที่ไม่ใช่ Marketing/Assignee ต้องเลือก Scope (scopeId)
     * 3. บทบาท Marketing ต้องเลือกโครงการที่สร้าง DJ ได้อย่างน้อย 1 โครงการ
     * 4. บทบาท Assignee ต้องเลือกโครงการที่รับผิดชอบอย่างน้อย 1 โครงการ
     * 
     * @async
     * @function handleSave
     * @returns {Promise<void>} ไม่มีค่าส่งกลับ แต่จะอัปเดต state และปิด Modal เมื่อสำเร็จ
     */
    const handleSave = async () => {
        // === การตรวจสอบความถูกต้องพื้นฐาน (Basic Validation) ===
        if (!formData.name || !formData.email || formData.roles.length === 0) {
            showAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, บทบาท)');
            return;
        }

        // === ตรวจสอบ scopeId สำหรับบทบาทที่ไม่ใช่ Marketing และ Assignee ===
        const needsScopeId = !formData.roles.includes('marketing') && !formData.roles.includes('assignee');
        if (needsScopeId && !formData.scopeId) {
            showAlert('error', 'กรุณาเลือกสังกัด (Assigned To)');
            return;
        }

        // === ตรวจสอบการเลือกโครงการสำหรับบทบาท Marketing ===
        if (formData.roles.includes('marketing') && formData.allowedProjects.length === 0) {
            showAlert('error', 'กรุณาเลือกโครงการที่สร้าง DJ ได้อย่างน้อย 1 โครงการ');
            return;
        }

        // === ตรวจสอบการเลือกโครงการสำหรับบทบาท Assignee ===
        if (formData.roles.includes('assignee') && formData.assignedProjects.length === 0) {
            showAlert('error', 'กรุณาเลือกโครงการที่รับผิดชอบอย่างน้อย 1 โครงการ');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingUser) {
                // โหมดแก้ไข: อัปเดตข้อมูลผู้ใช้ที่มีอยู่
                await api.updateUser(editingUser.id, formData);
                showAlert('success', 'แก้ไขข้อมูลผู้ใช้สำเร็จ');
            } else {
                // โหมดเพิ่มใหม่: สร้างผู้ใช้ใหม่
                await api.createUser(formData);
                showAlert('success', 'เพิ่มผู้ใช้ใหม่สำเร็จ');
            }
            await loadData();  // โหลดข้อมูลใหม่เพื่ออัปเดตตาราง
            setShowModal(false);  // ปิด Modal
            resetForm();  // ล้างฟอร์ม
        } catch (error) {
            showAlert('error', 'เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * อนุมัติคำขอสมัครและสร้างผู้ใช้ใหม่
     */
    const handleApproveRegistration = async (registrationId) => {
        try {
            setIsSubmitting(true);
            // TODO: ดึง current user ID จาก auth store
            const currentUserId = 1; // Mock
            await api.approveRegistration(registrationId, currentUserId);
            showAlert('success', 'อนุมัติคำขอสมัครสำเร็จ');
            await loadRegistrations();
            await loadData(); // รีเฟรช user list
        } catch (error) {
            showAlert('error', 'อนุมัติไม่สำเร็จ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * เปิด Modal เพื่อยืนยันการปฏิเสธและระบุเหตุผล
     */
    const handleOpenRejectModal = (registrationId, email) => {
        setRejectModal({
            show: true,
            registrationId,
            registrationEmail: email
        });
        setRejectReason('');
    };

    /**
     * ปฏิเสธคำขอสมัครพร้อมเหตุผล
     */
    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            showAlert('error', 'กรุณากรอกเหตุผลการปฏิเสธ');
            return;
        }

        try {
            setIsSubmitting(true);
            // TODO: ดึง current user ID จาก auth store
            const currentUserId = 1; // Mock
            await api.rejectRegistration(rejectModal.registrationId, rejectReason, currentUserId);
            showAlert('success', 'ปฏิเสธคำขอสมัครสำเร็จ');
            setRejectModal({ show: false, registrationId: null, registrationEmail: null });
            setRejectReason('');
            await loadRegistrations();
        } catch (error) {
            showAlert('error', 'ปฏิเสธไม่สำเร็จ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * รีเซ็ตฟอร์มกลับไปเป็นค่าเริ่มต้น
     * ใช้เมื่อปิด Modal หรือหลังจากบันทึกข้อมูลสำเร็จ
     * 
     * @function resetForm
     * @returns {void}
     */
    const resetForm = () => {
        setFormData({
            prefix: '',
            name: '',
            lastName: '',
            email: '',
            phone: '',
            roles: [],
            scopeLevel: 'Project',
            scopeId: '',
            assignedProjects: [],
            allowedProjects: []
        });
        setEditingUser(null);  // ล้างข้อมูลผู้ใช้ที่กำลังแก้ไข
    };

    // === Action Handlers (ฟังก์ชันจัดการ Action) ===

    /**
     * จัดการเมื่อคลิกปุ่มแก้ไขผู้ใช้
     * โหลดข้อมูลผู้ใช้ที่เลือกเข้ามาใส่ในฟอร์มและเปิด Modal แก้ไข
     * 
     * @function handleEditClick
     * @param {Object} user - ข้อมูลผู้ใช้ที่ต้องการแก้ไข
     * @param {string} user.id - ID ของผู้ใช้
     * @param {string} user.prefix - คำนำหน้าชื่อ
     * @param {string} user.name - ชื่อผู้ใช้
     * @param {string} user.lastName - นามสกุล
     * @param {string} user.email - อีเมล
     * @param {string} user.phone - เบอร์โทรศัพท์
     * @param {Array<string>} user.roles - รายการบทบาท
     * @param {string} user.scopeLevel - ระดับขอบเขต
     * @param {string} user.scopeId - ID ของ Scope
     * @param {Array<string>} user.assignedProjects - รายการ ID โครงการที่รับผิดชอบ
     * @param {Array<string>} user.allowedProjects - รายการ ID โครงการที่สร้าง DJ ได้
     * @returns {void}
     */
    const handleEditClick = (user) => {
        setEditingUser(user);
        // โหลดข้อมูลผู้ใช้เข้ามาในฟอร์ม (รองรับกรณีชื่อ Field ที่อาจไม่มีใน Object)
        setFormData({
            prefix: user.prefix || '',
            name: user.name || user.displayName || user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            phone: user.phone || '',
            roles: user.roles || [],
            scopeLevel: user.scopeLevel || 'Project',
            scopeId: user.scopeId || '',
            assignedProjects: user.assignedProjects || [],
            allowedProjects: user.allowedProjects || []
        });
        setShowModal(true);  // เปิด Modal แก้ไข
    };

    /**
     * จัดการเมื่อคลิกปุ่มลบผู้ใช้
     * เปิด Modal ยืนยันการลบเพื่อให้ผู้ใช้ยืนยัน
     * 
     * @function handleDeleteClick
     * @param {string} id - ID ของผู้ใช้ที่ต้องการลบ
     * @returns {void}
     */
    const handleDeleteClick = (id) => {
        setConfirmModal({ show: true, id });
    };

    /**
     * ยืนยันและดำเนินการลบผู้ใช้
     * เรียก API ลบผู้ใช้และโหลดข้อมูลใหม่เพื่ออัปเดตตาราง
     * 
     * @async
     * @function confirmDelete
     * @returns {Promise<void>} ไม่มีค่าส่งกลับ แต่จะอัปเดตรายการผู้ใช้และปิด Modal
     */
    const confirmDelete = async () => {
        if (!confirmModal.id) return;  // ถ้าไม่มี ID ให้ยกเลิก
        try {
            await api.deleteUser(confirmModal.id);
            await loadData();  // โหลดข้อมูลใหม่เพื่ออัปเดตตาราง
            showAlert('success', 'ลบผู้ใช้สำเร็จ');
            setConfirmModal({ show: false, id: null });  // ปิด Modal
        } catch (error) {
            showAlert('error', 'ลบไม่สำเร็จ: ' + error.message);
        }
    };

    // === Helper Functions (ฟังก์ชันช่วยเหลือ) ===

    /**
     * ดึงชื่อของขอบเขต (Scope Name) จาก ID
     * ใช้สำหรับแสดงชื่อขอบเขตในตารางผู้ใช้
     * 
     * @function getScopeName
     * @param {Object} user - ข้อมูลผู้ใช้
     * @param {string} user.scopeLevel - ระดับขอบเขต ('Tenant', 'BUD', หรือ 'Project')
     * @param {string} user.scopeId - ID ของ Scope
     * @returns {string} ชื่อของขอบเขต หรือ '-' ถ้าไม่พบ
     */
    const getScopeName = (user) => {
        if (user.scopeLevel === 'Tenant') {
            return masters.tenants?.find(t => t.id == user.scopeId)?.name || 'Unknown Company';
        }
        if (user.scopeLevel === 'BUD') {
            return masters.buds?.find(b => b.id == user.scopeId)?.name || 'Unknown BUD';
        }
        if (user.scopeLevel === 'Project') {
            return masters.projects?.find(p => p.id == user.scopeId)?.name || 'Unknown Project';
        }
        return '-';
    };

    /**
     * ดึงรายการชื่อโครงการสำหรับผู้ใช้บทบาท Marketing และ Assignee
     * ฟังก์ชันนี้จะแปลง ID โครงการเป็นชื่อโครงการเพื่อแสดงผล
     * 
     * @function getProjectNames
     * @param {Object} user - ข้อมูลผู้ใช้
     * @param {Array<string>} user.roles - รายการบทบาทของผู้ใช้
     * @param {Array<string>} user.allowedProjects - รายการ ID โครงการที่สร้าง DJ ได้ (สำหรับ Marketing)
     * @param {Array<string>} user.assignedProjects - รายการ ID โครงการที่รับผิดชอบ (สำหรับ Assignee)
     * @returns {Array<string>} รายการชื่อโครงการ หรือ Array ว่างถ้าไม่มี
     */
    const getProjectNames = (user) => {
        // สำหรับบทบาท Marketing - แสดง allowedProjects
        if (user.roles?.includes('marketing') && user.allowedProjects?.length > 0) {
            const projectNames = user.allowedProjects
                .map(projectId => masters.projects?.find(p => p.id === projectId)?.name)
                .filter(Boolean);  // กรองเฉพาะค่าที่ไม่เป็น null/undefined
            return projectNames.length > 0 ? projectNames : ['ไม่มีโครงการ'];
        }

        // สำหรับบทบาท Assignee - แสดง assignedProjects
        if (user.roles?.includes('assignee') && user.assignedProjects?.length > 0) {
            const projectNames = user.assignedProjects
                .map(projectId => masters.projects?.find(p => p.id === projectId)?.name)
                .filter(Boolean);  // กรองเฉพาะค่าที่ไม่เป็น null/undefined
            return projectNames.length > 0 ? projectNames : ['ไม่มีโครงการ'];
        }

        return [];  // ถ้าไม่ใช่บทบาท Marketing หรือ Assignee คืน Array ว่าง
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">จัดการผู้ใช้งาน กำหนดบทบาทและสิทธิ์การเข้าถึง</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* ปุ่มโหลดข้อมูลใหม่ (สำหรับ Debug เมื่อข้อมูลหาย) */}
                    {users.length === 0 && !isLoading && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                localStorage.removeItem('dj_system_users');
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
                    {activeTab === 'active' && (
                        <Button onClick={() => { resetForm(); setShowModal(true); }}>
                            <PlusIcon className="w-5 h-5" /> Add User
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'active'
                            ? 'text-rose-600 border-rose-600'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                            }`}
                    >
                        👥 Active Users
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'registrations'
                            ? 'text-rose-600 border-rose-600'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                            }`}
                    >
                        📋 Pending Registrations
                        {registrations.length > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {registrations.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Alert Toast */}
            {alertState.show && (
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 animate-slideIn ${alertState.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${alertState.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{alertState.message}</span>
                </div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'active' ? (
                /* TAB 1: Active Users Table */
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Scope</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No users found.</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
                                                {(user.name || user.displayName || user.firstName || '?').charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name || user.displayName || '-'}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map(role => (
                                                <span key={role} className={`px-2 py-1 rounded-full text-xs font-medium border uppercase ${role === 'admin' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                                    role === 'approver' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                        role === 'marketing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            'bg-orange-50 text-orange-700 border-orange-100' // assignee
                                                    }`}>
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* แสดง Scope สำหรับ Admin/Approver */}
                                        {!user.roles?.includes('marketing') && !user.roles?.includes('assignee') ? (
                                            <>
                                                <div className="text-sm text-gray-900 font-medium">
                                                    {user.scopeLevel === 'Tenant' && '🏢 '}
                                                    {user.scopeLevel === 'BUD' && '📑 '}
                                                    {user.scopeLevel === 'Project' && '🏗️ '}
                                                    {getScopeName(user)}
                                                </div>
                                                <div className="text-xs text-gray-500">Level: {user.scopeLevel}</div>
                                            </>
                                        ) : (
                                            /* แสดงโครงการสำหรับ Marketing/Assignee */
                                            <>
                                                {getProjectNames(user).length > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap gap-1">
                                                            {getProjectNames(user).slice(0, 3).map((projectName, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.roles?.includes('marketing')
                                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                                                                        }`}
                                                                >
                                                                    🏗️ {projectName}
                                                                </span>
                                                            ))}
                                                            {getProjectNames(user).length > 3 && (
                                                                <div className="relative group inline-block">
                                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 cursor-help border border-gray-300 hover:bg-gray-200 transition-colors">
                                                                        +{getProjectNames(user).length - 3} อื่นๆ
                                                                    </span>
                                                                    {/* Tooltip */}
                                                                    <div className="absolute left-0 top-full mt-1 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                                                        <div className="font-semibold mb-2 text-gray-300">โครงการที่เหลือ ({getProjectNames(user).length - 3}):</div>
                                                                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                                            {getProjectNames(user).slice(3).map((projectName, idx) => (
                                                                                <div key={idx} className="flex items-center gap-2 py-1">
                                                                                    <span className="text-gray-400">{idx + 4}.</span>
                                                                                    <span className="text-white">{projectName}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {/* Arrow */}
                                                                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Level: Project ({getProjectNames(user).length} โครงการ)
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-400">-</div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEditClick(user)} className="text-gray-400 hover:text-rose-600 transition-colors">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(user.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn my-4 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Basic Info */}
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-1">
                                    <FormSelect
                                        label="คำนำหน้า"
                                        value={formData.prefix}
                                        onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
                                    >
                                        <option value="">--</option>
                                        {PREFIX_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </FormSelect>
                                </div>
                                <div className="col-span-2">
                                    <FormInput
                                        label="ชื่อ"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. สมชาย"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <FormInput
                                        label="นามสกุล"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="e.g. ใจดี"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="user@company.com"
                                />
                                <FormInput
                                    label="เบอร์โทรศัพท์"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="e.g. 081-234-5678"
                                />
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Roles (Select Multiple)</label>
                                <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar">
                                    {ROLE_OPTIONS.map(option => (
                                        <label key={option.value} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                                                checked={formData.roles.includes(option.value)}
                                                onChange={() => handleRoleChange(option.value)}
                                            />
                                            <span className="text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Selection - ซ่อนถ้ามี role marketing หรือ assignee (ใช้ Multi-project แทน) */}
                            {!formData.roles.includes('marketing') && !formData.roles.includes('assignee') && (
                                <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                                        <BuildingOfficeIcon className="w-4 h-4" /> Scope & Permission
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormSelect
                                            label="Scope Level"
                                            value={formData.scopeLevel}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                scopeLevel: e.target.value,
                                                scopeId: '' // Reset ID when level changes
                                            }))}
                                        >
                                            {SCOPE_LEVELS.map(level => (
                                                <option key={level.value} value={level.value}>{level.label}</option>
                                            ))}
                                        </FormSelect>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Assigned To <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
                                                value={formData.scopeId}
                                                onChange={(e) => setFormData(prev => ({ ...prev, scopeId: e.target.value }))}
                                            >
                                                <option value="">-- Select --</option>
                                                {formData.scopeLevel === 'Tenant' && masters.tenants.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                                {formData.scopeLevel === 'BUD' && masters.buds.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                                {formData.scopeLevel === 'Project' && masters.projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Allowed Projects - แสดงเมื่อมี role = marketing (requester) */}
                            {formData.roles.includes('marketing') && (
                                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                                            📝 โครงการที่สร้าง DJ ได้
                                            <span className="bg-green-200 text-green-700 px-2 py-0.5 rounded-full text-xs">
                                                {formData.allowedProjects.length} เลือกแล้ว
                                            </span>
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const filtered = masters.projects.filter(p =>
                                                        p.name?.toLowerCase().includes(requesterSearch.toLowerCase())
                                                    );
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        allowedProjects: [...new Set([...prev.allowedProjects, ...filtered.map(p => p.id)])]
                                                    }));
                                                }}
                                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                            >
                                                เลือกทั้งหมด
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, allowedProjects: [] }))}
                                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                            >
                                                ล้าง
                                            </button>
                                        </div>
                                    </div>

                                    {/* แสดงโครงการที่เลือกไว้เป็น Tags */}
                                    {formData.allowedProjects.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-green-200 max-h-20 overflow-y-auto">
                                            {formData.allowedProjects.map(projectId => {
                                                const project = masters.projects.find(p => p.id === projectId);
                                                return project ? (
                                                    <span
                                                        key={projectId}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                                                    >
                                                        {project.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                allowedProjects: prev.allowedProjects.filter(id => id !== projectId)
                                                            }))}
                                                            className="hover:text-green-900 font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {/* คำอธิบาย */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                                        <p className="font-semibold mb-1">📌 User นี้เป็น "ผู้สั่งงาน" → กรุณาเลือกโครงการที่สร้าง DJ ได้</p>
                                        <div className="space-y-0.5">
                                            <p>✅ โครงการที่เลือก = สามารถสร้าง DJ ในโครงการนี้ได้</p>
                                            <p>❌ โครงการที่ไม่เลือก = ไม่สามารถสร้าง DJ ได้</p>
                                        </div>
                                    </div>

                                    {/* Search Box */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="🔍 ค้นหาโครงการ..."
                                            value={requesterSearch}
                                            onChange={(e) => setRequesterSearch(e.target.value)}
                                            className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                        {requesterSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setRequesterSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Project List */}
                                    <div className="border border-green-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                                        {masters.projects
                                            .filter(p => p.name?.toLowerCase().includes(requesterSearch.toLowerCase()))
                                            .map(project => (
                                                <label
                                                    key={project.id}
                                                    className={`flex items-center gap-3 px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-green-100 last:border-b-0 ${formData.allowedProjects.includes(project.id) ? 'bg-green-50' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                        checked={formData.allowedProjects.includes(project.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    allowedProjects: [...prev.allowedProjects, project.id]
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    allowedProjects: prev.allowedProjects.filter(id => id !== project.id)
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-700 flex-1">{project.name}</span>
                                                    {formData.allowedProjects.includes(project.id) && (
                                                        <span className="text-green-500 text-xs">✓</span>
                                                    )}
                                                </label>
                                            ))
                                        }
                                        {masters.projects.filter(p => p.name?.toLowerCase().includes(requesterSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-gray-400 text-sm">ไม่พบโครงการที่ค้นหา</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Assigned Projects - แสดงเมื่อมี role = assignee */}
                            {formData.roles.includes('assignee') && (
                                <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                                            <BriefcaseIcon className="w-4 h-4" /> โครงการที่รับผิดชอบ
                                            <span className="bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                                                {formData.assignedProjects.length} เลือกแล้ว
                                            </span>
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const filtered = masters.projects.filter(p =>
                                                        p.name?.toLowerCase().includes(projectSearch.toLowerCase())
                                                    );
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        assignedProjects: [...new Set([...prev.assignedProjects, ...filtered.map(p => p.id)])]
                                                    }));
                                                }}
                                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                                            >
                                                เลือกทั้งหมด
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, assignedProjects: [] }))}
                                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                            >
                                                ล้าง
                                            </button>
                                        </div>
                                    </div>

                                    {/* แสดงโครงการที่เลือกไว้เป็น Tags */}
                                    {formData.assignedProjects.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-orange-200 max-h-20 overflow-y-auto">
                                            {formData.assignedProjects.map(projectId => {
                                                const project = masters.projects.find(p => p.id === projectId);
                                                return project ? (
                                                    <span
                                                        key={projectId}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                                                    >
                                                        {project.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                assignedProjects: prev.assignedProjects.filter(id => id !== projectId)
                                                            }))}
                                                            className="hover:text-orange-900 font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {/* คำอธิบาย */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                                        <p className="font-semibold mb-1">📌 User นี้เป็น "ผู้รับงาน" → กรุณาเลือกโครงการที่รับผิดชอบ</p>
                                        <div className="space-y-0.5">
                                            <p>✅ โครงการที่เลือก = สามารถมอบหมายงานให้ได้</p>
                                            <p>❌ โครงการที่ไม่เลือก = ไม่ปรากฏในรายชื่อผู้รับงาน</p>
                                        </div>
                                    </div>

                                    {/* Search Box */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="🔍 ค้นหาโครงการ..."
                                            value={projectSearch}
                                            onChange={(e) => setProjectSearch(e.target.value)}
                                            className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                        {projectSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setProjectSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Project List */}
                                    <div className="border border-orange-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                                        {masters.projects
                                            .filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase()))
                                            .map(project => (
                                                <label
                                                    key={project.id}
                                                    className={`flex items-center gap-3 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b border-orange-100 last:border-b-0 ${formData.assignedProjects.includes(project.id) ? 'bg-orange-50' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                                        checked={formData.assignedProjects.includes(project.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    assignedProjects: [...prev.assignedProjects, project.id]
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    assignedProjects: prev.assignedProjects.filter(id => id !== project.id)
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-700 flex-1">{project.name}</span>
                                                    {formData.assignedProjects.includes(project.id) && (
                                                        <span className="text-orange-500 text-xs">✓</span>
                                                    )}
                                                </label>
                                            ))
                                        }
                                        {masters.projects.filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-gray-400 text-sm">ไม่พบโครงการที่ค้นหา</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Add User')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 flex items-center justify-center z-[70]">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setConfirmModal({ show: false, id: null })}></div>
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-4 relative z-10 animate-scaleIn">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <TrashIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Delete User?</h3>
                            <p className="text-gray-500 text-sm">Are you sure you want to delete this user?<br />This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="secondary" onClick={() => setConfirmModal({ show: false, id: null })}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
