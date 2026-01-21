/**
 * @file OrganizationManagement.jsx
 * @description หน้าจอสำหรับจัดการข้อมูลมาสเตอร์ (Master Data) ของโครงสร้างองค์กร 
 * ประกอบด้วยข้อมูล บริษัท (Tenants), สายงาน (BUDs), และ โครงการ (Projects)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiService';
import { Card, CardHeader } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';
import {
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
    BuildingOfficeIcon, FolderIcon, BuildingLibraryIcon, UserGroupIcon
} from '@heroicons/react/24/outline';

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

    /**
     * ดึงข้อมูล Master Data จาก API
     * โหลดข้อมูลบริษัท สายงาน และโครงการ เพื่อนำมาแสดงในตาราง
     * 
     * @async
     * @function fetchData
     * @returns {Promise<void>}
     */
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const masterData = await api.getMasterData();
            setTenants(masterData.tenants || []);
            setBuds(masterData.buds || []);
            setProjects(masterData.projects || []);
            // โหลดข้อมูลแผนกแยกต่างหาก
            const deptData = await api.getDepartments();
            setDepartments(deptData || []);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * useEffect Hook
     * โหลดข้อมูลเมื่อคอมโพเน็นต์ถูกสร้างขึ้น (Mount)
     */
    useEffect(() => {
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
        try {
            if (activeTab === 'projects') {
                if (modalMode === 'add') await api.createProject(formData);
                else await api.updateProject(selectedItem.id, formData);
            } else if (activeTab === 'buds') {
                if (modalMode === 'add') await api.createBud(formData);
                else await api.updateBud(selectedItem.id, formData);
            } else if (activeTab === 'departments') {
                if (modalMode === 'add') await api.createDepartment(formData);
                else await api.updateDepartment(selectedItem.id, formData);
            } else if (activeTab === 'tenants') {
                if (modalMode === 'add') await api.createTenant(formData);
                else await api.updateTenant(selectedItem.id, formData);
            }
            setShowModal(false);
            fetchData(); // โหลดข้อมูลใหม่หลังจากบันทึกสำเร็จ
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
        }
    };

    /**
     * ลบข้อมูล (Delete)
     * แสดงหน้าต่างยืนยันก่อนลบ และเรียกใช้ API ลบตามประเภทข้อมูล
     * 
     * @async
     * @function handleDelete
     * @param {string|number} id - ID ของไอเทมที่ต้องการลบ
     * @returns {Promise<void>}
     */
    const handleDelete = async (id) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
        try {
            if (activeTab === 'projects') await api.deleteProject(id);
            else if (activeTab === 'buds') await api.deleteBud(id);
            else if (activeTab === 'departments') await api.deleteDepartment(id);
            else if (activeTab === 'tenants') await api.deleteTenant(id);
            fetchData(); // โหลดข้อมูลใหม่หลังจากลบสำเร็จ
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
        }
    };

    // --- ฟังก์ชันช่วยเหลือสำหรับการแสดงผล (RENDER HELPERS) ---

    /**
     * แสดงตารางรายการโครงการ (Projects Table)
     * @returns {JSX.Element} ตารางโครงการ
     */
    const renderProjectsTable = () => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อโครงการ (Project Name)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">บริษัท (Tenant)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">สายงาน (BUD)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {projects.map((item) => {
                    // ค้นหาข้อมูลสายงาน (BUD) ที่เกี่ยวข้อง
                    const bud = buds.find(b => b.id === (typeof item.bud === 'object' ? item.bud.id : item.budId)) || {};
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
                            <td className="px-6 py-4 text-sm text-gray-600">{item.tenantName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{bud.name || item.bud?.name || '-'}</td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.status === 'Active'}
                                    onClick={() => handleToggleStatus(item.id, item)}
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
    const renderBudsTable = () => (
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
                {buds.map((item) => {
                    // ค้นหาชื่อบริษัทที่สายงานสังกัดอยู่
                    const tenant = tenants.find(t => t.id === item.tenantId) || {};
                    return (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tenant.name || '-'}</td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.isActive}
                                    onClick={() => handleToggleStatus(item.id, item)}
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
    const renderDepartmentsTable = () => (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ชื่อแผนก (Dept Name)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">รหัส (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">สังกัดสายงาน (BUD)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">สถานะ (Status)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">จัดการ (Actions)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {departments.map((item) => {
                    const bud = buds.find(b => b.id === item.budId) || {};
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
                            <td className="px-6 py-4 text-center">
                                <StatusBadge
                                    isActive={item.isActive}
                                    onClick={() => handleToggleStatus(item.id, item)}
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
    const renderTenantsTable = () => (
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
                {tenants.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.code}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.subdomain}</td>
                        <td className="px-6 py-4 text-center">
                            <StatusBadge
                                isActive={item.isActive}
                                onClick={() => handleToggleStatus(item.id, item)}
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
        try {
            if (activeTab === 'projects') {
                const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
                await api.updateProject(id, { ...item, status: newStatus });
            } else if (activeTab === 'buds') {
                await api.updateBud(id, { ...item, isActive: !item.isActive });
            } else if (activeTab === 'departments') {
                await api.updateDepartment(id, { ...item, isActive: !item.isActive });
            } else if (activeTab === 'tenants') {
                await api.updateTenant(id, { ...item, isActive: !item.isActive });
            }
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + error.message);
        }
    };

    /**
     * คอมโพเน็นต์แสดงสถานะ (Status Badge)
     * @param {Object} props
     * @param {boolean} props.isActive - สถานะใช้งานอยู่หรือไม่
     * @param {Function} props.onClick - ฟังก์ชันจัดการเมื่อคลิก
     */
    const StatusBadge = ({ isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ข้อมูลโครงสร้างองค์กร (Organization Data)</h1>
                    <p className="text-gray-500">จัดการข้อมูลบริษัท, สายงาน (BUD), และโครงการต่างๆ ในระบบ</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* ปุ่มโหลดข้อมูลใหม่ (สำหรับ Debug เมื่อข้อมูลหาย) */}
                    {tenants.length === 0 && buds.length === 0 && projects.length === 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                localStorage.removeItem('dj_system_tenants');
                                localStorage.removeItem('dj_system_buds');
                                localStorage.removeItem('dj_system_projects');
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
                <div className="overflow-x-auto">
                    {/* แสดงตารางตามแท็บที่เลือกอยู่ (Render table based on active tab) */}
                    {activeTab === 'projects' && renderProjectsTable()}
                    {activeTab === 'buds' && renderBudsTable()}
                    {activeTab === 'departments' && renderDepartmentsTable()}
                    {activeTab === 'tenants' && renderTenantsTable()}
                </div>
            </Card>

            {/* หน้าต่างแก้ไขข้อมูล (Modal) */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                                        {buds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </FormSelect>
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
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </FormSelect>

                                    <FormSelect label="สังกัดสายงาน (BUD)" value={formData.budId || ''} onChange={(e) => setFormData({ ...formData, budId: parseInt(e.target.value) })}>
                                        <option value="">-- เลือกสายงาน --</option>
                                        {buds.
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
                            <Button variant="secondary" onClick={() => setShowModal(false)}>ยกเลิก (Cancel)</Button>
                            <Button onClick={handleSave}>บันทึกข้อมูล (Save)</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
