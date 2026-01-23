/**
 * @file UserManagementNew.jsx  
 * @description User Management + Registration Approval with Role Selection Modal
 * 
 * Features:
 * - Tab 1: Active Users (placeholder)
 * - Tab 2: Pending Registrations
 *   - Click [อนุมัติ] → Popup Modal to select Role + Scope
 *   - Create User → Move to Active Users
 *   - Click [ปฏิเสธ] → Modal for Reason + Auto-Email
 */

import React, { useState, useEffect } from 'react';
import apiDatabase from '@shared/services/apiDatabase';
import { supabase } from '@shared/services/supabaseClient';
import Button from '@shared/components/Button';
import {
    CheckIcon, XMarkIcon,
    UserIcon, EnvelopeIcon, BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
    { value: 'marketing', label: 'Marketing (ผู้สั่งงาน)' },
    { value: 'approver', label: 'Approver (ผู้อนุมัติ)' },
    { value: 'assignee', label: 'Assignee (ผู้รับงาน)' }
];

const SCOPE_LEVELS = [
    { value: 'Tenant', label: 'ระดับบริษัท' },
    { value: 'BUD', label: 'ระดับสายงาน' },
    { value: 'Project', label: 'ระดับโครงการ' }
];

export default function UserManagementNew() {
    const [activeTab, setActiveTab] = useState('active');
    const [isLoading, setIsLoading] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Approve Modal (Select Role & Scope)
    const [approveModal, setApproveModal] = useState({
        show: false,
        registrationId: null,
        registrationData: null
    });
    const [approvalData, setApprovalData] = useState({
        roles: [],
        scopeLevel: 'Project',
        scopeId: '',
        scopeName: '',
        allowedProjects: [],
        assignedProjects: []
    });
    const [editModal, setEditModal] = useState({
        show: false,
        user: null
    });
    const [masterData, setMasterData] = useState({
        tenants: [],
        buds: [],
        projects: [],
        departments: []
    });

    // Reject Modal
    const [rejectModal, setRejectModal] = useState({
        show: false,
        registrationId: null,
        registrationEmail: null
    });
    const [rejectReason, setRejectReason] = useState('');

    // Alert
    const [alertState, setAlertState] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (activeTab === 'registrations') {
            loadRegistrations();
            loadMasterData();
        } else if (activeTab === 'active') {
            loadUsers();
            loadMasterData(); // Need departments for edit
        }
    }, [activeTab]);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await apiDatabase.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
            showAlert('error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMasterData = async () => {
        try {
            const [tenantsRes, budsRes, projectsRes, departmentsRes] = await Promise.all([
                supabase.from('tenants').select('*').eq('is_active', true),
                supabase.from('buds').select('*').eq('is_active', true),
                supabase.from('projects').select('*').eq('is_active', true),
                supabase.from('departments').select('*').eq('is_active', true)
            ]);

            setMasterData({
                tenants: tenantsRes.data || [],
                buds: budsRes.data || [],
                projects: projectsRes.data || [],
                departments: departmentsRes.data || []
            });
        } catch (error) {
            console.error('Error loading master data:', error);
        }
    };

    const loadRegistrations = async () => {
        try {
            setIsLoading(true);
            const regsData = await apiDatabase.getPendingRegistrations('pending');
            setRegistrations(regsData);
        } catch (error) {
            console.error('Error loading registrations:', error);
            showAlert('error', 'ไม่สามารถโหลดคำขอสมัครได้');
        } finally {
            setIsLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlertState({ show: true, type, message });
        setTimeout(() => setAlertState({ show: false, type: '', message: '' }), 3000);
    };

    const handleApproveClick = (registrationId) => {
        const registration = registrations.find(r => r.id === registrationId);
        setApproveModal({
            show: true,
            registrationId,
            registrationData: registration
        });
        setApprovalData({
            roles: [],
            scopeLevel: 'Project',
            scopeId: '',
            scopeName: '',
            allowedProjects: [],
            assignedProjects: []
        });
    };

    const handleConfirmApprove = async () => {
        if (approvalData.roles.length === 0) {
            showAlert('error', 'กรุณาเลือกบทบาทอย่างน้อย 1 ตัว');
            return;
        }

        const needsScopeId = !approvalData.roles.includes('marketing') && !approvalData.roles.includes('assignee');
        if (needsScopeId && !approvalData.scopeId) {
            showAlert('error', 'กรุณาเลือกสังกัด/โครงการ');
            return;
        }

        if (approvalData.roles.includes('marketing') && approvalData.allowedProjects.length === 0) {
            showAlert('error', 'กรุณาเลือกโครงการที่สร้าง DJ ได้');
            return;
        }

        if (approvalData.roles.includes('assignee') && approvalData.assignedProjects.length === 0) {
            showAlert('error', 'กรุณาเลือกโครงการที่รับผิดชอบ');
            return;
        }

        try {
            setIsSubmitting(true);
            const currentUserId = 1; // TODO: ดึงจาก auth store
            const tenantId = 1; // Default tenant

            // 1. Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    tenant_id: tenantId,
                    email: approveModal.registrationData.email,
                    password_hash: 'temp_hash',
                    first_name: approveModal.registrationData.firstName,
                    last_name: approveModal.registrationData.lastName,
                    title: approveModal.registrationData.title,
                    phone: approveModal.registrationData.phone,
                    department: approveModal.registrationData.department,
                    is_active: true
                }])
                .select()
                .single();

            if (createError) throw createError;

            // 2. Assign roles to new user
            await apiDatabase.assignUserRoles(
                newUser.id,
                tenantId,
                approvalData.roles,
                currentUserId
            );

            // 3. Assign scopes to new user
            const scopeAssignments = [];

            // Add scope assignment based on scopeLevel
            if (approvalData.scopeLevel && approvalData.scopeId) {
                // Determine roleType based on selected roles
                if (approvalData.roles.includes('approver') || approvalData.roles.includes('admin')) {
                    scopeAssignments.push({
                        scopeLevel: approvalData.scopeLevel,
                        scopeId: approvalData.scopeId,
                        scopeName: approvalData.scopeName || '',
                        roleType: 'approver_scope'
                    });
                }
            }

            // Add marketing allowed projects
            if (approvalData.roles.includes('marketing') && approvalData.allowedProjects.length > 0) {
                approvalData.allowedProjects.forEach(projectId => {
                    scopeAssignments.push({
                        scopeLevel: 'Project',
                        scopeId: projectId,
                        scopeName: '',
                        roleType: 'marketing_allowed'
                    });
                });
            }

            // Add assignee assigned projects
            if (approvalData.roles.includes('assignee') && approvalData.assignedProjects.length > 0) {
                approvalData.assignedProjects.forEach(projectId => {
                    scopeAssignments.push({
                        scopeLevel: 'Project',
                        scopeId: projectId,
                        scopeName: '',
                        roleType: 'assignee_assigned'
                    });
                });
            }

            if (scopeAssignments.length > 0) {
                await apiDatabase.assignUserScopes(
                    newUser.id,
                    tenantId,
                    scopeAssignments,
                    currentUserId
                );
            }

            // 4. Update registration status
            const { error: updateError } = await supabase
                .from('user_registration_requests')
                .update({
                    status: 'approved',
                    approved_by: currentUserId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', approveModal.registrationId);

            if (updateError) throw updateError;

            // 5. Send approval email
            await apiDatabase.sendApprovalEmail(
                approveModal.registrationData.email,
                approveModal.registrationData.firstName
            );

            showAlert('success', 'อนุมัติและสร้างผู้ใช้สำเร็จ ☑️ ชื่อย้ายไปยัง Active Users');
            setApproveModal({ show: false, registrationId: null, registrationData: null });
            await loadRegistrations();
        } catch (error) {
            console.error('Error approving registration:', error);
            showAlert('error', 'อนุมัติไม่สำเร็จ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenRejectModal = (registrationId, email) => {
        setRejectModal({
            show: true,
            registrationId,
            registrationEmail: email
        });
        setRejectReason('');
    };

    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            showAlert('error', 'กรุณากรอกเหตุผลการปฏิเสธ');
            return;
        }

        try {
            setIsSubmitting(true);
            const currentUserId = 1; // TODO: ดึงจาก auth store
            await apiDatabase.rejectRegistration(rejectModal.registrationId, rejectReason, currentUserId);
            showAlert('success', 'ปฏิเสธคำขอสมัครและส่งอีเมลแล้ว');
            setRejectModal({ show: false, registrationId: null, registrationEmail: null });
            setRejectReason('');
            await loadRegistrations();
        } catch (error) {
            showAlert('error', 'ปฏิเสธไม่สำเร็จ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">จัดการผู้ใช้งาน และอนุมัติคำขอสมัครใหม่</p>
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
                <div className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 animate-slideIn ${alertState.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${alertState.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{alertState.message}</span>
                </div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'active' ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-rose-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังโหลดข้อมูลผู้ใช้...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-gray-300 mb-4">
                                <UserIcon className="w-16 h-16 mx-auto opacity-30" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600">ไม่พบผู้ใช้งาน</h3>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">พนักงาน</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง / สังกัด</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาทระบบ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <EnvelopeIcon className="w-3 h-3" /> {user.email}
                                                        </div>
                                                        {user.phone && (
                                                            <div className="text-xs text-gray-400">📱 {user.phone}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{user.title || '-'}</div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                                    <BuildingOfficeIcon className="w-3 h-3" /> {user.department || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                    ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                        user.role === 'marketing' ? 'bg-blue-100 text-blue-800' :
                                                            user.role === 'approver' ? 'bg-orange-100 text-orange-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    แก้ไข
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-rose-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            กำลังโหลด...
                        </div>
                    ) : registrations.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-gray-300 mb-4">
                                <CheckIcon className="w-16 h-16 mx-auto opacity-30" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600">ไม่มีคำขอสมัครที่รอการอนุมัติ</h3>
                            <p className="text-gray-500 text-sm mt-2">ทุกคำขอได้รับการจัดการแล้ว</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อมูลผู้สมัคร</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วยงาน/แผนก</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สมัคร</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {registrations.map((registration) => (
                                        <tr key={registration.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
                                                        {(registration.firstName || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {registration.title} {registration.firstName} {registration.lastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <EnvelopeIcon className="w-4 h-4" />
                                                            {registration.email}
                                                        </div>
                                                        {registration.phone && (
                                                            <div className="text-sm text-gray-500">
                                                                📱 {registration.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                                                    {registration.department}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {registration.position || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(registration.createdAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleApproveClick(registration.id)}
                                                        disabled={isSubmitting}
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                        อนุมัติ
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenRejectModal(registration.id, registration.email)}
                                                        disabled={isSubmitting}
                                                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                        ปฏิเสธ
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Edit User Modal */}
            {editModal.show && editModal.user && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserIcon className="w-6 h-6 text-indigo-600" />
                                แก้ไขข้อมูลผู้ใช้
                            </h3>
                            <button onClick={() => setEditModal({ show: false, user: null })} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {/* Read-only info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">ชื่อที่แสดง</label>
                                    <input type="text" value={editModal.user.name} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">อีเมล</label>
                                    <input type="text" value={editModal.user.email} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm" />
                                </div>
                            </div>

                            {/* Editable Fields */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">ตำแหน่ง (Job Title)</label>
                                <input
                                    type="text"
                                    value={editModal.user.title || ''}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, title: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">เบอร์โทรศัพท์</label>
                                <input
                                    type="text"
                                    value={editModal.user.phone || ''}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, phone: e.target.value } }))}
                                    placeholder="0xx-xxx-xxxx"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">แผนก / สังกัด</label>
                                <select
                                    value={editModal.user.departmentId || ''}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, departmentId: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">-- ระบุแผนก --</option>
                                    {masterData.departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-1">บทบาทในระบบ (System Role)</label>
                                <select
                                    value={editModal.user.role}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, role: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {ROLE_OPTIONS.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editModal.user.isActive}
                                        onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, isActive: e.target.checked } }))}
                                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-bold text-gray-900">สถานะเปิดใช้งาน (Active)</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                            <Button variant="secondary" onClick={() => setEditModal({ show: false, user: null })}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleSaveUser} disabled={isSubmitting}>
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reassign Modal */}
            {approveModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-6">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100 sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                    <CheckIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">อนุมัติคำขอสมัคร</h3>
                                    <p className="text-sm text-green-700">{approveModal.registrationData?.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-3">
                                    เลือกบทบาท <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {ROLE_OPTIONS.map(role => (
                                        <label
                                            key={role.value}
                                            className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${approvalData.roles.includes(role.value)
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={approvalData.roles.includes(role.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setApprovalData(prev => ({
                                                            ...prev,
                                                            roles: [...prev.roles, role.value]
                                                        }));
                                                    } else {
                                                        setApprovalData(prev => ({
                                                            ...prev,
                                                            roles: prev.roles.filter(r => r !== role.value)
                                                        }));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm font-medium text-gray-900">{role.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Selection */}
                            {!approvalData.roles.includes('marketing') && !approvalData.roles.includes('assignee') && approvalData.roles.length > 0 && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            เลือกสังกัด <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={approvalData.scopeLevel}
                                            onChange={(e) => setApprovalData(prev => ({
                                                ...prev,
                                                scopeLevel: e.target.value,
                                                scopeId: ''
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        >
                                            {SCOPE_LEVELS.map(level => (
                                                <option key={level.value} value={level.value}>{level.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">
                                            ระบุ {approvalData.scopeLevel} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={approvalData.scopeId}
                                            onChange={(e) => {
                                                let scopeName = '';
                                                if (approvalData.scopeLevel === 'Tenant') {
                                                    scopeName = masterData.tenants.find(t => t.id === parseInt(e.target.value))?.name || '';
                                                } else if (approvalData.scopeLevel === 'BUD') {
                                                    scopeName = masterData.buds.find(b => b.id === parseInt(e.target.value))?.name || '';
                                                } else if (approvalData.scopeLevel === 'Project') {
                                                    scopeName = masterData.projects.find(p => p.id === parseInt(e.target.value))?.name || '';
                                                }
                                                setApprovalData(prev => ({
                                                    ...prev,
                                                    scopeId: e.target.value,
                                                    scopeName: scopeName
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">-- เลือก --</option>
                                            {approvalData.scopeLevel === 'Tenant' && masterData.tenants.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                            {approvalData.scopeLevel === 'BUD' && masterData.buds.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                            {approvalData.scopeLevel === 'Project' && masterData.projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Marketing Projects */}
                            {approvalData.roles.includes('marketing') && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                                    <label className="block text-sm font-bold text-gray-900">
                                        เลือกโครงการ <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {masterData.projects.map(project => (
                                            <label key={project.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={approvalData.allowedProjects.includes(project.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setApprovalData(prev => ({
                                                                ...prev,
                                                                allowedProjects: [...prev.allowedProjects, project.id]
                                                            }));
                                                        } else {
                                                            setApprovalData(prev => ({
                                                                ...prev,
                                                                allowedProjects: prev.allowedProjects.filter(id => id !== project.id)
                                                            }));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600"
                                                />
                                                <span className="text-sm text-gray-900">{project.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Assignee Projects */}
                            {approvalData.roles.includes('assignee') && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                                    <label className="block text-sm font-bold text-gray-900">
                                        เลือกโครงการ <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {masterData.projects.map(project => (
                                            <label key={project.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={approvalData.assignedProjects.includes(project.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setApprovalData(prev => ({
                                                                ...prev,
                                                                assignedProjects: [...prev.assignedProjects, project.id]
                                                            }));
                                                        } else {
                                                            setApprovalData(prev => ({
                                                                ...prev,
                                                                assignedProjects: prev.assignedProjects.filter(id => id !== project.id)
                                                            }));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600"
                                                />
                                                <span className="text-sm text-gray-900">{project.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                            <button
                                onClick={() => setApproveModal({ show: false, registrationId: null, registrationData: null })}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 font-medium"
                            >
                                {isSubmitting ? 'กำลังประมวลผล...' : 'บันทึกและอนุมัติ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                    <XMarkIcon className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">ปฏิเสธคำขอสมัคร</h3>
                                    <p className="text-sm text-red-700">{rejectModal.registrationEmail}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="ระบุเหตุผลที่ชัดเจน..."
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            />
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setRejectModal({ show: false, registrationId: null, registrationEmail: null })}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={isSubmitting || !rejectReason.trim()}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                            >
                                {isSubmitting ? 'กำลังประมวลผล...' : 'ยืนยันการปฏิเสธ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
