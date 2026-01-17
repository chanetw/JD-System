import React, { useState, useEffect } from 'react';
import {
    getUsers, createUser, updateUser, deleteUser, getMasterData
} from '@/services/mockApi';
import Button from '@/components/common/Button';
import { FormInput, FormSelect } from '@/components/common/FormInput';
import {
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
    UserIcon, BuildingOfficeIcon, BriefcaseIcon
} from '@heroicons/react/24/outline';

const PREFIX_OPTIONS = [
    { value: 'นาย', label: 'นาย' },
    { value: 'นาง', label: 'นาง' },
    { value: 'นางสาว', label: 'นางสาว' },
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Ms.', label: 'Ms.' }
];

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
    { value: 'marketing', label: 'Requester (Marketing)' },
    { value: 'approver', label: 'Approver (Head/Manager)' },
    { value: 'assignee', label: 'Assignee (Creative/Workflow)' }
];

const SCOPE_LEVELS = [
    { value: 'Tenant', label: 'ระดับบริษัท (Tenant)' },
    { value: 'BUD', label: 'ระดับสายงาน (BUD)' },
    { value: 'Project', label: 'ระดับโครงการ (Project)' }
];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [masters, setMasters] = useState({ tenants: [], buds: [], projects: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        prefix: '',
        name: '',
        lastName: '',
        email: '',
        phone: '',
        roles: [],
        scopeLevel: 'Project', // Default to Project
        scopeId: '',
        assignedProjects: [], // โครงการที่รับผิดชอบ (สำหรับ Assignee)
        allowedProjects: [] // โครงการที่สร้าง DJ ได้ (สำหรับ Requester)
    });

    // Alert State
    const [alertState, setAlertState] = useState({ show: false, type: 'success', message: '' });

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState({ show: false, id: null });

    // Project Search (for Assignee projects multi-select)
    const [projectSearch, setProjectSearch] = useState('');

    // Requester Project Search
    const [requesterSearch, setRequesterSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [usersData, masterData] = await Promise.all([
                getUsers(),
                getMasterData()
            ]);
            setUsers(usersData);
            setMasters(masterData);
        } catch (error) {
            showAlert('error', 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlertState({ show: true, type, message });
        setTimeout(() => setAlertState({ show: false, type: '', message: '' }), 3000);
    };

    // --- Form Handlers ---
    const handleRoleChange = (roleValue) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            if (currentRoles.includes(roleValue)) {
                return { ...prev, roles: currentRoles.filter(r => r !== roleValue) };
            } else {
                return { ...prev, roles: [...currentRoles, roleValue] };
            }
        });
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || formData.roles.length === 0 || !formData.scopeId) {
            showAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, อีเมล, บทบาท, สังกัด)');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingUser) {
                await updateUser(editingUser.id, formData);
                showAlert('success', 'แก้ไขข้อมูลผู้ใช้สำเร็จ');
            } else {
                await createUser(formData);
                showAlert('success', 'เพิ่มผู้ใช้ใหม่สำเร็จ');
            }
            await loadData();
            setShowModal(false);
            resetForm();
        } catch (error) {
            showAlert('error', 'เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

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
        setEditingUser(null);
    };

    // --- Actions ---
    const handleEditClick = (user) => {
        setEditingUser(user);
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
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        setConfirmModal({ show: true, id });
    };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await deleteUser(confirmModal.id);
            await loadData();
            showAlert('success', 'ลบผู้ใช้สำเร็จ');
            setConfirmModal({ show: false, id: null });
        } catch (error) {
            showAlert('error', 'ลบไม่สำเร็จ: ' + error.message);
        }
    };

    // Helper to get Scope Name
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

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">จัดการผู้ใช้งาน กำหนดบทบาทและสิทธิ์การเข้าถึง</p>
                </div>
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <PlusIcon className="w-5 h-5" /> Add User
                </Button>
            </div>

            {/* Alert Toast */}
            {alertState.show && (
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 animate-slideIn ${alertState.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${alertState.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{alertState.message}</span>
                </div>
            )}

            {/* Table */}
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
                                    <div className="text-sm text-gray-900 font-medium">
                                        {user.scopeLevel === 'Tenant' && '🏢 '}
                                        {user.scopeLevel === 'BUD' && '📑 '}
                                        {user.scopeLevel === 'Project' && '🏗️ '}
                                        {getScopeName(user)}
                                    </div>
                                    <div className="text-xs text-gray-500">Level: {user.scopeLevel}</div>
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
