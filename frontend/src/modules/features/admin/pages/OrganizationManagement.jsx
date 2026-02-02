/**
 * @file OrganizationManagement.jsx
 * @description หน้าจอสำหรับจัดการข้อมูลมาสเตอร์ (Master Data) ของโครงสร้างองค์กร 
 * ประกอบด้วยข้อมูล บริษัท (Tenants), สายงาน (BUDs), และ โครงการ (Projects)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@shared/services/apiService';
import { Card, CardHeader } from '@shared/components/Card';
import Badge from '@shared/components/Badge';
import Button from '@shared/components/Button';
import { FormInput, FormSelect } from '@shared/components/FormInput';
import {
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
    BuildingOfficeIcon, FolderIcon, BuildingLibraryIcon, UserGroupIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

/**
 * แถบเมนูสำหรับเลือกจัดการข้อมูลแต่ละประเภท (Tabs Configuration)
 * @type {Array<{id: string, label: string, icon: React.ComponentType}>}
 */
const TABS = [
    { id: 'projects', label: 'โครงการ (Projects)', icon: FolderIcon },
    { id: 'departments', label: 'แผนก (Departments)', icon: UserGroupIcon },
    { id: 'buds', label: 'ฝ่าย (Business Unit)', icon: BuildingOfficeIcon },
    { id: 'tenants', label: 'บริษัท (Tenants)', icon: BuildingLibraryIcon },
];

/**
 * OrganizationManagement Component
 * คอมโพเน็นต์หลักสำหรับการจัดการข้อมูลโครงสร้างองค์กร
 * 
 * @returns {JSX.Element} หน้าจอจัดการข้อมูลองค์กร
 */
export default function OrganizationManagement() {
    /** แท็บที่กำลังใช้งานอยู่ (Active Tab) */
    const [activeTab, setActiveTab] = useState('projects');

    // === สถานะข้อมูล (Data States) ===
    /** รายการบริษัททั้งหมด (Tenants) */
    const [tenants, setTenants] = useState([]);
    /** รายการสายงานทั้งหมด (BUDs) */
    const [buds, setBuds] = useState([]);
    /** รายการโครงการทั้งหมด (Projects) */
    const [projects, setProjects] = useState([]);
    /** รายการแผนกทั้งหมด (Departments) */
    const [departments, setDepartments] = useState([]);
    /** รายการผู้ใช้ทั้งหมด (Users) สำหรับเลือก Manager */
    const [users, setUsers] = useState([]);
    /** สถานะการโหลดข้อมูล (Loading State) */
    const [isLoading, setIsLoading] = useState(false);

    // === สถานะ Modal (Modal State) ===
    /** แสดง/ซ่อน Modal */
    const [showModal, setShowModal] = useState(false);
    /** โหมดของ Modal: 'add' (เพิ่มใหม่) หรือ 'edit' (แก้ไข) */
    const [modalMode, setModalMode] = useState('add');
    /** ข้อมูลไอเทมที่ถูกเลือกเพื่อแก้ไข */
    const [selectedItem, setSelectedItem] = useState(null);
    /** ข้อมูลในฟอร์ม (Form Data) */
    const [formData, setFormData] = useState({});
    /** สถานะกำลังบันทึกข้อมูล (Saving State) */
    const [isSaving, setIsSaving] = useState(false);
    /** รายการที่กำลังเปลี่ยนสถานะ (Toggling Items) - ป้องกันการรัวปุ่ม */
    const [togglingItems, setTogglingItems] = useState(new Set());

    /**
     * ดึงข้อมูล Master Data จาก API
     * โหลดข้อมูลบริษัท สายงาน และโครงการ เพื่อนำมาแสดงในตาราง
     * 
     * @async
     * @function fetchData
     * @returns {Promise<void>}
     */
    const fetchData = async (shouldRefresh = false, isBackground = false) => {
        console.log('[OrgManagement] Fetching data...', { shouldRefresh, isBackground });
        if (!isBackground) setIsLoading(true);
        try {
            const masterData = await api.getMasterData(shouldRefresh);
            console.log('[OrgManagement] MasterData loaded:', masterData);
            setTenants(masterData.tenants || []);

            // 1. Tenants: Show All, Sort Active First
            try {
                const allTenants = await api.getTenants();
                if (allTenants && allTenants.length > 0) {
                    setTenants(allTenants.sort((a, b) => Number(b.isActive) - Number(a.isActive)));
                }
            } catch (err) {
                console.warn('[OrgManagement] Failed to fetch all tenants');
            }

            // 2. Sort other lists (Active First)
            const sortActiveFirst = (list) => [...list].sort((a, b) => Number(b.isActive) - Number(a.isActive));

            setBuds(sortActiveFirst(masterData.buds || []));
            setProjects(sortActiveFirst(masterData.projects || []));
            setDepartments(sortActiveFirst(masterData.departments || []));

            // Backend API master-data might not include users to reduce payload size
            // Fetch users separately or if masterData has it
            const usersData = await api.getUsers();
            setUsers(usersData || []);

            console.log('[OrgManagement] All data loaded successfully');
        } catch (error) {
            console.error('[OrgManagement] Error loading data:', error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    /**
     * useEffect Hook
     * โหลดข้อมูลเมื่อคอมโพเน็นต์ถูกสร้างขึ้น (Mount)
     */
    useEffect(() => {
        console.log('[OrgManagement] Component Mounted');
        fetchData();
    }, []);

    /**
     * จัดการการเปิด Modal สำหรับเพิ่มหรือแก้ไขข้อมูล
     * จะทำการรีเซ็ตค่าในฟอร์ม (Form Data) ตามประเภทของแท็บที่เลือกอยู่
     * 
     * @function handleOpenModal
     * @param {string} mode - โหมดของ Modal ('add' หรือ 'edit')
     * @param {Object|null} item - ข้อมูลไอเทมที่ต้องการแก้ไข (ถ้าเป็นโหมด edit)
     * @returns {void}
     */
    const handleOpenModal = (mode, item = null) => {
        setModalMode(mode);
        setSelectedItem(item);

        // รีเซ็ตฟอร์มตามประเภทของแท็บที่เลือก (Reset Form based on Tab)
        if (mode === 'add') {
            if (activeTab === 'projects') {
                setFormData({ name: '', code: '', tenantId: '', budId: '', status: 'Active' });
            } else if (activeTab === 'buds') {
                setFormData({ name: '', code: '', tenantId: '', isActive: true });
            } else if (activeTab === 'departments') {
                setFormData({ name: '', code: '', budId: '', managerId: '', isActive: true });
            } else if (activeTab === 'tenants') {
                setFormData({ name: '', code: '', subdomain: '', isActive: true });
            }
        } else {
            // โหมดแก้ไข: ใส่ข้อมูลเดิมลงในฟอร์ม (Edit Mode - Pre-fill)
            setFormData({ ...item });
        }
        setShowModal(true);
    };

    /**
     * บันทึกข้อมูล (เพิ่มใหม่ หรือ อัปเดต)
     * เรียกใช้ API ตามประเภทข้อมูลในแท็บที่เลือกอยู่
     *
     * @async
     * @function handleSave
     * @returns {Promise<void>}
     */
    const handleSave = async () => {
        // Prevent double submission
        if (isSaving) return;

        // Optimistic Data Snapshots (for Revert)
        const originalProjects = [...projects];
        const originalBuds = [...buds];
        const originalDepts = [...departments];
        const originalTenants = [...tenants];

        try {
            console.log('[handleSave] Saving data:', { mode: modalMode, tab: activeTab, data: formData });

            // ✅ Client-side validation for tenants
            if (activeTab === 'tenants') {
                if (!formData.name || !formData.name.trim()) {
                    alert('กรุณากรอก "ชื่อบริษัท"');
                    return;
                }
                if (!formData.code || !formData.code.trim()) {
                    alert('กรุณากรอก "รหัสบริษัท"');
                    return;
                }
            }

            // ✅ Client-side validation for buds
            if (activeTab === 'buds') {
                if (!formData.name || !formData.name.trim()) {
                    alert('กรุณากรอก "ชื่อสายงาน"');
                    return;
                }
                if (!formData.tenantId) {
                    alert('กรุณาเลือก "บริษัท"');
                    return;
                }
            }

            // ✅ Client-side validation for departments
            if (activeTab === 'departments') {
                if (!formData.name || !formData.name.trim()) {
                    alert('กรุณากรอก "ชื่อแผนก"');
                    return;
                }
                if (!formData.budId) {
                    alert('กรุณาเลือก "สายงาน"');
                    return;
                }
            }

            // ✅ Client-side validation for projects
            if (activeTab === 'projects') {
                if (!formData.name || !formData.name.trim()) {
                    alert('กรุณากรอก "ชื่อโครงการ"');
                    return;
                }
                if (!formData.tenantId) {
                    alert('กรุณาเลือก "บริษัท"');
                    return;
                }
                if (!formData.budId) {
                    alert('กรุณาเลือก "สายงาน"');
                    return;
                }
            }

            setIsSaving(true); // START SAVING

            // ⚡ Optimistic UI: For Edit Mode, Update Local State Immediately
            if (modalMode === 'edit') {
                const id = selectedItem.id;
                // Helper to merge form data into list items
                const updateList = (list) => list.map(item => item.id === id ? { ...item, ...formData } : item);

                if (activeTab === 'projects') setProjects(updateList(projects));
                else if (activeTab === 'buds') setBuds(updateList(buds));
                else if (activeTab === 'departments') setDepartments(updateList(departments));
                else if (activeTab === 'tenants') setTenants(updateList(tenants));

                setShowModal(false); // Close immediately for perceived speed
            }

            let result;
            if (activeTab === 'projects') {
                if (modalMode === 'add') result = await api.createProject(formData);
                else result = await api.updateProject(selectedItem.id, formData);
            } else if (activeTab === 'buds') {
                if (modalMode === 'add') result = await api.createBud(formData);
                else result = await api.updateBud(selectedItem.id, formData);
            } else if (activeTab === 'departments') {
                if (modalMode === 'add') result = await api.createDepartment(formData);
                else result = await api.updateDepartment(selectedItem.id, formData);
            } else if (activeTab === 'tenants') {
                if (modalMode === 'add') result = await api.createTenant(formData);
                else result = await api.updateTenant(selectedItem.id, formData);
            }

            console.log('[handleSave] Save result:', result);

            // For Add Mode: Close after success (since we didn't optimistic update)
            if (modalMode === 'add') {
                setShowModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกข้อมูลเรียบร้อย',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'แก้ไขข้อมูลเรียบร้อย',
                    showConfirmButton: false,
                    timer: 1500
                });
            }

            // Final Sync
            fetchData(true, true);

        } catch (error) {
            // Revert Optimistic UI if Edit Failed
            if (modalMode === 'edit') {
                console.error('Save failed, reverting UI:', error);
                if (activeTab === 'projects') setProjects(originalProjects);
                else if (activeTab === 'buds') setBuds(originalBuds);
                else if (activeTab === 'departments') setDepartments(originalDepts);
                else if (activeTab === 'tenants') setTenants(originalTenants);
                // Re-open modal to allow user to correct and retry
                setShowModal(true);
            }

            // Display detailed error message
            const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการบันทึก';
            Swal.fire({
                icon: 'error',
                title: 'บันทึกไม่สำเร็จ',
                text: errorMessage,
                confirmButtonText: 'ตกลง'
            });
        } finally {
            setIsSaving(false); // STOP SAVING
        }
    };

    /**
     * ลบข้อมูล (Delete)
     * แสดงหน้าต่างยืนยันก่อนลบ และเรียกใช้ API ลบตามประเภทข้อมูล
     */
    const handleDelete = async (id) => {
        // Use SweetAlert2 for confirmation
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ข้อมูลจะถูกลบและไม่สามารถกู้คืนได้ (Soft Delete)",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        try {
            // Call API
            let response;
            if (activeTab === 'projects') response = await api.deleteProject(id);
            else if (activeTab === 'buds') response = await api.deleteBud(id);
            else if (activeTab === 'departments') response = await api.deleteDepartment(id);
            else if (activeTab === 'tenants') response = await api.deleteTenant(id);

            const isSoftDelete = response?.type === 'soft_delete' ||
                (response?.message && /deleted \(soft\)/i.test(response.message)) ||
                (response?.message && /soft delete/i.test(response.message));

            const message = response?.message || 'ลบข้อมูลสำเร็จ';

            // --- DEBUG LOGS (Requested by User) ---
            console.group('🛑 Delete Operation Debug');
            console.log('Target ID:', id);
            console.log('Target Type:', activeTab);
            console.log('API Response:', response);
            console.log('Is Soft Delete?', isSoftDelete);
            console.log('Action Taken:', isSoftDelete ? 'Update to Inactive' : 'Remove from List');
            console.groupEnd();
            // --------------------------------------

            if (isSoftDelete) {
                // Soft Delete: Mark as inactive instead of removing
                const updateList = (list) => list.map(item => item.id === id ? { ...item, isActive: false, status: 'Inactive' } : item)
                    .sort((a, b) => Number(b.isActive) - Number(a.isActive)); // Re-sort Active first

                if (activeTab === 'projects') setProjects(prev => updateList(prev));
                else if (activeTab === 'buds') setBuds(prev => updateList(prev));
                else if (activeTab === 'departments') setDepartments(prev => updateList(prev));
                else if (activeTab === 'tenants') setTenants(prev => updateList(prev));

                Swal.fire({
                    icon: 'info',
                    title: 'ปิดการใช้งาน (Soft Delete)',
                    text: `ข้อมูลมีการใช้งานอยู่ จึงเปลี่ยนสถานะเป็น Inactive แทนการลบถาวร\n(API Message: ${message})`,
                    confirmButtonText: 'ตกลง'
                });
            } else {
                // Hard Delete: Remove from UI
                if (activeTab === 'projects') setProjects(prev => prev.filter(item => item.id !== id));
                else if (activeTab === 'buds') setBuds(prev => prev.filter(item => item.id !== id));
                else if (activeTab === 'departments') setDepartments(prev => prev.filter(item => item.id !== id));
                else if (activeTab === 'tenants') setTenants(prev => prev.filter(item => item.id !== id));

                Swal.fire({
                    icon: 'success',
                    title: 'ลบข้อมูลถาวรสำเร็จ',
                    showConfirmButton: false,
                    timer: 1500
                });
            }

            // Sync silently
            fetchData(true, true);

        } catch (error) {
            console.error('Delete failed:', error);
            // Revert State (Simplest way is to fetch freshly)
            fetchData(true, true);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถลบข้อมูลได้',
                confirmButtonText: 'ตกลง'
            });
        }
    };

    // --- ฟังก์ชันช่วยเหลือสำหรับการแสดงผล (RENDER HELPERS) ---

    /**
     * แสดงตารางรายการโครงการ (Projects Table)
     * @returns {JSX.Element} ตารางโครงการ
     */
    const renderProjectsTable = (data) => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">โครงการ (Project)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">บริษัท (Tenant)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ฝ่าย (Business Unit)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {data.map((item) => {
                    // ค้นหาข้อมูลสายงาน (BUD) ที่เกี่ยวข้อง
                    const bud = buds.find(b => b.id === (item.bud?.id || item.budId)) || {};
                    const tenant = tenants.find(t => t.id === item.tenantId) || {};
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                        <FolderIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tenant.name || (item.tenantId ? `(ID: ${item.tenantId})` : '-')}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{bud.name || item.bud?.name || '-'}</td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.status === 'Active'}
                                    onClick={() => handleToggleStatus(item.id, item)}
                                    disabled={togglingItems.has(item.id)}
                                />
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Actions id={item.id} item={item} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    /**
     * แสดงตารางรายการสายงาน (BUDs Table)
     * @returns {JSX.Element} ตารางสายงาน
     */
    const renderBudsTable = (data) => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อสายงาน (BUD Name)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">บริษัท (Tenant)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {data.map((item) => {
                    // ค้นหาชื่อบริษัทที่สายงานสังกัดอยู่
                    const tenant = tenants.find(t => t.id === item.tenantId) || {};
                    // Debug Log for Tenant Display
                    if (!tenant.name) {
                        console.warn('[renderBudsTable] Tenant lookup failed for BUD:', item.name, {
                            budTenantId: item.tenantId,
                            tenantsAvailable: tenants.map(t => ({ id: t.id, name: t.name }))
                        });
                    }
                    const tenantName = tenant.name || (item.tenantId ? `(ID: ${item.tenantId})` : '-');
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tenantName}</td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.isActive}
                                    onClick={() => handleToggleStatus(item.id, item)}
                                    disabled={togglingItems.has(item.id)}
                                />
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Actions id={item.id} item={item} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    /**
     * แสดงตารางรายการแผนก (Departments Table)
     * @returns {JSX.Element} ตารางแผนก
     */
    const renderDepartmentsTable = (data) => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อแผนก (Dept Name)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ฝ่าย (Business Unit)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ผู้จัดการ (Manager)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {data.map((item) => {
                    const bud = buds.find(b => b.id === item.budId) || {};
                    const manager = users.find(u => u.id === item.managerId) || {};
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                                        <UserGroupIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{bud.name || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                                {manager.name ? (
                                    <div className="flex items-center gap-2">
                                        {manager.avatar && <img src={manager.avatar} alt="" className="w-6 h-6 rounded-full" />}
                                        <span>{manager.name}</span>
                                    </div>
                                ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.isActive}
                                    onClick={() => handleToggleStatus(item.id, item)}
                                    disabled={togglingItems.has(item.id)}
                                />
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Actions id={item.id} item={item} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    /**
     * แสดงตารางรายการบริษัท (Tenants Table)
     * @returns {JSX.Element} ตารางบริษัท
     */
    const renderTenantsTable = (data) => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อบริษัท (Tenant Name)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ซับโดเมน (Subdomain)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.subdomain}</td>
                        <td className="px-6 py-4 text-center">
                            <StatusBadge
                                isActive={item.isActive}
                                onClick={() => handleToggleStatus(item.id, item)}
                                disabled={togglingItems.has(item.id)}
                            />
                        </td>
                        <td className="px-6 py-4 text-center">
                            <Actions id={item.id} item={item} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    /**
     * คอมโพเน็นต์ส่วนปุ่มจัดการ (Actions) ในตาราง
     * @param {Object} props
     * @param {string|number} props.id - ID ของรายการ
     * @param {Object} props.item - ข้อมูลรายการทั้งหมด
     */
    const Actions = ({ id, item }) => (
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => handleOpenModal('edit', item)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="แก้ไข">
                <PencilIcon className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="ลบ">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );

    /**
     * เปลี่ยนสถานะใช้งาน (Toggle Status)
     * @param {string|number} id - ID ของไอเทม
     * @param {Object} item - ข้อมูลไอเทมปัจจุบัน
     */
    const handleToggleStatus = async (id, item) => {
        // 🔒 Prevent Double Click / Debounce
        if (togglingItems.has(id)) return;

        // Add to locking set
        setTogglingItems(prev => new Set(prev).add(id));

        // ⚡ Optimistic Update: เปลี่ยนสถานะทันทีไม่ต้องรอเซิร์ฟเวอร์
        const toggleValue = (current) => !current;
        const toggleStatusStr = (current) => current === 'Active' ? 'Inactive' : 'Active';

        // เก็บค่าเดิมไว้สำหรับ Revert กรณี Error
        const originalProjects = [...projects];
        const originalBuds = [...buds];
        const originalDepts = [...departments];
        const originalTenants = [...tenants];

        try {
            if (activeTab === 'projects') {
                // Update Local UI
                setProjects(prev => prev.map(p => p.id === id ? { ...p, status: toggleStatusStr(p.status), isActive: !p.isActive } : p));
                const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
                await api.updateProject(id, { ...item, status: newStatus });
            } else if (activeTab === 'buds') {
                setBuds(prev => prev.map(b => b.id === id ? { ...b, isActive: toggleValue(b.isActive) } : b));
                await api.updateBud(id, { ...item, isActive: !item.isActive });
            } else if (activeTab === 'departments') {
                setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: toggleValue(d.isActive) } : d));
                await api.updateDepartment(id, { ...item, isActive: !item.isActive });
            } else if (activeTab === 'tenants') {
                setTenants(prev => prev.map(t => t.id === id ? { ...t, isActive: toggleValue(t.isActive) } : t));
                await api.updateTenant(id, { ...item, isActive: !item.isActive });
            }

            // Sync with Server silently to ensure correctness
            fetchData(true, true);

            // ✅ Success Alert (ตามที่ขอ: แจ้งเมื่อสำเร็จ)
            await Swal.fire({
                icon: 'success',
                title: 'เปลี่ยนสถานะเรียบร้อย',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });

        } catch (error) {
            // Revert on Failure
            console.error('Toggle failed, reverting UI:', error);
            if (activeTab === 'projects') setProjects(originalProjects);
            else if (activeTab === 'buds') setBuds(originalBuds);
            else if (activeTab === 'departments') setDepartments(originalDepts);
            else if (activeTab === 'tenants') setTenants(originalTenants);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเปลี่ยนสถานะได้: ' + error.message,
                confirmButtonText: 'ตกลง'
            });
        } finally {
            // 🔓 Unlock button
            setTogglingItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    /**
     * คอมโพเน็นต์แสดงสถานะ (Status Badge)
     * @param {Object} props
     * @param {boolean} props.isActive - สถานะใช้งานอยู่หรือไม่
     * @param {Function} props.onClick - ฟังก์ชันจัดการเมื่อคลิก
     */
    const StatusBadge = ({ isActive, onClick, disabled }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                ${disabled ? 'cursor-wait opacity-50' : 'cursor-pointer'}
                ${isActive
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }
            `}
            title="คลิกเพื่อเปลี่ยนสถานะ"
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {isActive ? 'Active' : 'Inactive'}
        </button>
    );

    // Filter Active Data for Select Options
    const activeTenants = tenants.filter(t => t.isActive);
    const activeBuds = buds.filter(b => b.isActive);
    const activeDepts = departments.filter(d => d.isActive);

    // === Pagination Logic ===
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset pagination when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Helper to get current data list
    const getCurrentList = () => {
        if (activeTab === 'projects') return projects;
        if (activeTab === 'buds') return buds;
        if (activeTab === 'departments') return departments;
        if (activeTab === 'tenants') return tenants;
        return [];
    };

    const currentList = getCurrentList();
    const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
    const paginatedList = currentList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const Pagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                    <Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, currentList.length)}</span> of <span className="font-medium">{currentList.length}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page ? 'bg-rose-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ข้อมูลโครงสร้างองค์กร (Organization Data)</h1>
                    <p className="text-gray-500">จัดการข้อมูลบริษัท, สายงาน (BUD), และโครงการต่างๆ ในระบบ</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => handleOpenModal('add')}>
                        <PlusIcon className="w-5 h-5" /> เพิ่ม {TABS.find(t => t.id === activeTab)?.label.split(' ')[0]}
                    </Button>
                </div>
            </div>

            {/* แถบเมนู (Tabs) สำหรับเลือกประเภทข้อมูล */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${isActive
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    {/* แสดงตารางตามแท็บที่เลือกอยู่ (Render table based on active tab) */}
                    {activeTab === 'projects' && renderProjectsTable(paginatedList)}
                    {activeTab === 'buds' && renderBudsTable(paginatedList)}
                    {activeTab === 'departments' && renderDepartmentsTable(paginatedList)}
                    {activeTab === 'tenants' && renderTenantsTable(paginatedList)}
                </div>
                {/* Pagination Controls */}
                <Pagination />
            </Card>

            {/* หน้าต่างแก้ไขข้อมูล (Modal) */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {modalMode === 'add' ? 'เพิ่ม' : 'แก้ไข'} {TABS.find(t => t.id === activeTab)?.label.split(' ')[0]}
                            </h3>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">

                            {/* --- ฟอร์มสำหรับจัดการบริษัท (TENANT FORM) --- */}
                            {activeTab === 'tenants' && (
                                <>
                                    <FormInput label="ชื่อบริษัท" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น บริษัท เสนาดีเวลลอปเม้นท์ จำกัด (มหาชน)" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput label="รหัสบริษัท" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น SENA" />
                                        <div className="space-y-1">
                                            <FormInput label="ซับโดเมน (Subdomain)" value={formData.subdomain || ''} onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })} placeholder="เช่น sena" />
                                            <p className="text-xs text-gray-500">ใช้สำหรับแยก URL เข้าใช้งานของแต่ละบริษัท (เช่น sena.djsystem.com)</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* --- ฟอร์มสำหรับจัดการสายงาน (BUD FORM) --- */}
                            {activeTab === 'buds' && (
                                <>
                                    <FormInput label="ชื่อสายงาน (BUD)" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น สายงานขาย 1" />
                                    <FormInput label="รหัสสายงาน" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น SALES-01" />
                                    <FormSelect label="สังกัดบริษัท (Tenant)" value={formData.tenantId || ''} onChange={(e) => setFormData({ ...formData, tenantId: parseInt(e.target.value) })}>
                                        <option value="">-- เลือกบริษัท --</option>
                                        {tenants.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </FormSelect>
                                </>
                            )}

                            {/* --- ฟอร์มสำหรับจัดการแผนก (DEPARTMENT FORM) --- */}
                            {activeTab === 'departments' && (
                                <>
                                    <FormInput label="ชื่อแผนก (Department)" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น แผนกการตลาด, แผนกกราฟฟิค" />
                                    <FormInput label="รหัสแผนก" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น MKT, GFX" />
                                    <FormSelect label="สังกัดสายงาน (BUD)" value={formData.budId || ''} onChange={(e) => setFormData({ ...formData, budId: parseInt(e.target.value) })}>
                                        <option value="">-- เลือกสายงาน (หรือเป็นแผนกกลาง) --</option>
                                        {activeBuds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </FormSelect>

                                    <FormSelect
                                        label="ผู้จัดการแผนก (Manager)"
                                        value={formData.managerId || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            managerId: e.target.value ? parseInt(e.target.value) : null
                                        })}
                                    >
                                        <option value="">-- ไม่มีผู้จัดการ --</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                                    </FormSelect>
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 ถ้าไม่มี Manager, Admin สามารถมอบหมายงานเองได้
                                    </p>
                                </>
                            )}

                            {/* --- ฟอร์มสำหรับจัดการโครงการ (PROJECT FORM) --- */}
                            {activeTab === 'projects' && (
                                <>
                                    <FormInput label="ชื่อโครงการ" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น เสนาคิทท์ รังสิต - ติวานนท์" />
                                    <FormInput label="รหัสโครงการ" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="เช่น SKR01" />

                                    {/* Dropdown ที่มีความเกี่ยวข้องกัน (Dependent Dropdowns) */}
                                    <FormSelect label="สังกัดบริษัท (Tenant)" value={formData.tenantId || ''} onChange={(e) => setFormData({ ...formData, tenantId: parseInt(e.target.value) })}>
                                        <option value="">-- เลือกบริษัท --</option>
                                        {tenants.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </FormSelect>

                                    <FormSelect label="สังกัดสายงาน (BUD)" value={formData.budId || ''} onChange={(e) => setFormData({ ...formData, budId: parseInt(e.target.value) })}>
                                        <option value="">-- เลือกสายงาน --</option>
                                        {activeBuds.
                                            filter(b => !formData.tenantId || b.tenantId === formData.tenantId)
                                            .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </FormSelect>

                                    <FormSelect label="สถานะโครงการ" value={formData.status || 'Active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Active">ใช้งาน (Active)</option>
                                        <option value="Inactive">ไม่ใช้งาน (Inactive)</option>
                                    </FormSelect>
                                </>
                            )}

                        </div>
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>ยกเลิก (Cancel)</Button>
                            <Button onClick={handleSave} disabled={isSaving} icon={isSaving ? undefined : null}>
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล (Save)'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
