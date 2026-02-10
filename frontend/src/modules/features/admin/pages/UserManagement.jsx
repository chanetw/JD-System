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
import { adminService } from '@shared/services/modules/adminService';
import { useAuth } from '@core/stores/authStore';
import { generateTempPassword } from '@shared/utils/passwordGenerator';
import { ROLES, ROLE_LABELS, ROLE_V1_DISPLAY, ROLE_V2_BADGE_COLORS, hasRole } from '@shared/utils/permission.utils';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import RoleSelectionCheckbox from '@shared/components/RoleSelectionCheckbox';
import ScopeConfigPanel from '@shared/components/ScopeConfigPanel';
import {
    CheckIcon, XMarkIcon,
    UserIcon, EnvelopeIcon, BuildingOfficeIcon,
    ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

// ROLE_OPTIONS และ SCOPE_LEVELS ย้ายไปใช้จาก permission.utils.js แล้ว
// ดู: ROLES, ROLE_LABELS, SCOPE_LEVELS จาก '@shared/utils/permission.utils'

export default function UserManagementNew() {
    const { user } = useAuth(); // ดึง current user จาก Auth Store
    const [activeTab, setActiveTab] = useState('active');
    const [isLoading, setIsLoading] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper: Check if current user is admin
    const isAdmin = user?.role === 'Admin' || user?.roles?.includes('Admin');

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
    const [editScopeData, setEditScopeData] = useState({
        scopeLevel: 'Project',
        scopeId: '',
        scopeName: '',
        allowedProjects: [],
        assignedProjects: []
    });
    // New: Department Manager State
    const [managedDeptId, setManagedDeptId] = useState('');
    const [userCurrentManagedDeptId, setUserCurrentManagedDeptId] = useState(null);

    // Multi-Role: Role configs with scopes
    const [approvalRoleConfigs, setApprovalRoleConfigs] = useState({});
    const [approvalSelectedRoles, setApprovalSelectedRoles] = useState([]);
    const [editRoleConfigs, setEditRoleConfigs] = useState({});
    const [editSelectedRoles, setEditSelectedRoles] = useState([]);
    const [availableScopes, setAvailableScopes] = useState({
        projects: [],
        buds: [],
        tenants: []
    });
    const [scopesLoading, setScopesLoading] = useState(false);

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

    // Pagination State
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    const [filterDepartment, setFilterDepartment] = useState('');
    const [showAllDepts, setShowAllDepts] = useState(false); // Department Manager Filter Toggle

    useEffect(() => {
        if (activeTab === 'registrations') {
            loadRegistrations();
            loadMasterData();
        } else if (activeTab === 'active') {
            loadUsers();
            loadMasterData(); // Need departments for edit
        }
    }, [activeTab]);

    const loadUsers = async (page = 1) => {
        try {
            setIsLoading(true);
            console.log('[UserManagement] calling apiDatabase.getUsers', apiDatabase.getUsers);
            // Pass page and limit (default 20)
            const result = await apiDatabase.getUsers(page, pagination.limit);
            console.log('[UserManagement] getUsers result:', result);

            setUsers(result?.data || []);
            setPagination({
                page: result?.pagination?.page || page,
                limit: result?.pagination?.limit || 20,
                total: result?.pagination?.total || 0,
                totalPages: result?.pagination?.totalPages || 1,
                hasNext: result?.pagination?.hasNext || false,
                hasPrev: result?.pagination?.hasPrev || false
            });
        } catch (error) {
            console.error('Error loading users:', error);
            showAlert('error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMasterData = async () => {
        try {
            console.log('[UserManagement] Loading master data...');

            // ✓ Use Backend REST API instead of direct Supabase queries (RLS blocked)
            const [tenants, buds, projects, departments] = await Promise.all([
                adminService.getTenants(),
                adminService.getBUDs(),
                adminService.getProjects(),
                adminService.getDepartments()
            ]);

            console.log('[UserManagement] Master data loaded:', {
                tenants: tenants?.length || 0,
                buds: buds?.length || 0,
                projects: projects?.length || 0,
                departments: departments?.length || 0
            });
            console.log('[UserManagement] Departments detail:', departments);

            setMasterData({
                tenants: tenants || [],
                buds: buds || [],
                projects: projects || [],
                departments: departments || []
            });

            console.log('[UserManagement] Master data set successfully');

            // Also load available scopes for multi-role
            loadAvailableScopes();
        } catch (error) {
            console.error('[UserManagement] Error loading master data:', error);
            console.error('[UserManagement] Error details:', error.message, error.stack);
        }
    };

    // Load available scopes for Multi-Role UI
    const loadAvailableScopes = async () => {
        try {
            setScopesLoading(true);
            const scopes = await adminService.getAvailableScopes(user?.tenant_id || 1);
            setAvailableScopes(scopes);
        } catch (error) {
            console.error('Error loading available scopes:', error);
            // Fallback to masterData
            setAvailableScopes({
                projects: masterData.projects.map(p => ({ id: p.id, name: p.name, code: p.code, budId: p.bud_id })),
                buds: masterData.buds.map(b => ({ id: b.id, name: b.name, code: b.code }))
            });
        } finally {
            setScopesLoading(false);
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
        // Reset Multi-Role configs
        setApprovalRoleConfigs({});
        setApprovalSelectedRoles([]);
    };

    // ✨ Handle Edit User - open modal with user data
    const handleEditUser = async (userToEdit) => {
        try {
            // Reset scope data with defaults
            const initialScopeData = {
                scopeLevel: 'Project',
                scopeId: '',
                scopeName: '',
                allowedProjects: [],
                assignedProjects: []
            };

            // Load user with roles using new Multi-Role API
            let userWithRoles = null;
            try {
                userWithRoles = await adminService.getUserWithRoles(userToEdit.id, userToEdit.tenantId || 1);
                console.log('📋 Loaded user with roles:', userWithRoles);
            } catch (apiError) {
                console.warn("Could not load user roles from new API:", apiError.message);
            }

            // Build roleConfigs from loaded roles
            const loadedRoleConfigs = {};
            const loadedRoleNames = [];

            console.log('🔍 [DEBUG] Checking roles:', {
                rolesRaw: userWithRoles?.roles,
                isArray: Array.isArray(userWithRoles?.roles),
                length: userWithRoles?.roles?.length
            });

            if (userWithRoles?.roles && userWithRoles.roles.length > 0) {
                userWithRoles.roles.forEach(role => {
                    loadedRoleNames.push(role.name);
                    loadedRoleConfigs[role.name] = {
                        level: role.scopes?.[0]?.level || 'project',
                        scopes: role.scopes || []
                    };
                });
                console.log('✅ Loaded roles:', loadedRoleNames);
                console.log('✅ Loaded configs:', loadedRoleConfigs);
            } else {
                // Fallback: use legacy role
                if (userToEdit.role) {
                    // Fix: Map 'marketing' to 'Requester' dynamically
                    const roleName = userToEdit.role === 'marketing' ? 'Requester' : userToEdit.role;
                    loadedRoleNames.push(roleName);
                    console.log(`⚠️ Using legacy role: ${userToEdit.role} -> mapped to ${roleName}`);
                }
            }

            // Try to fetch existing scopes (legacy support)
            try {
                const scopes = await apiDatabase.getUserScopes(userToEdit.id);
                if (scopes && scopes.length > 0) {
                    scopes.forEach(s => {
                        if (s.role_type === 'approver_scope') {
                            initialScopeData.scopeLevel = s.scope_level;
                            initialScopeData.scopeId = s.scope_id;
                            initialScopeData.scopeName = s.scope_name;
                        } else if (s.role_type === 'requester_allowed') {
                            initialScopeData.allowedProjects.push(s.scope_id);
                        } else if (s.role_type === 'assignee_assigned') {
                            initialScopeData.assignedProjects.push(s.scope_id);
                        }
                    });
                }
            } catch (scopeError) {
                console.warn("Could not load user scopes:", scopeError.message);
            }

            // New: Fetch Managed Department (Single)
            let currentManagedDeptId = '';
            try {
                const managedDepts = await adminService.getDepartmentsByManager(userToEdit.id);
                // เพราะเราเปลี่ยนเป็น Single Select ตาม Requirement
                if (managedDepts && managedDepts.length > 0) {
                    currentManagedDeptId = managedDepts[0].id;
                }
            } catch (deptError) {
                console.warn("Could not load managed departments:", deptError.message);
            }

            // Set states
            setManagedDeptId(currentManagedDeptId); // Sets the form value
            setUserCurrentManagedDeptId(currentManagedDeptId); // Remembers original value for change detection
            // Set states
            setEditScopeData(initialScopeData);
            setEditRoleConfigs(loadedRoleConfigs);
            setEditSelectedRoles(loadedRoleNames);
            setEditModal({
                show: true,
                user: {
                    ...userToEdit,
                    // Fix: Merge fresh data from API if available
                    firstName: userWithRoles?.firstName || userToEdit.firstName,
                    lastName: userWithRoles?.lastName || userToEdit.lastName,
                    title: userWithRoles?.title || userToEdit.title,
                    phone: userWithRoles?.phone || userToEdit.phone,
                    departmentId: userWithRoles?.departmentId || userToEdit.departmentId || userToEdit.department?.id || '',
                    role: userToEdit.role || loadedRoleNames[0] || 'Requester'
                }
            });
            console.log('🏢 Department loaded:', userWithRoles?.departmentId, 'from userToEdit:', userToEdit.departmentId);

            console.log('🎯 Edit modal opened with roles:', loadedRoleNames);
        } catch (error) {
            console.error("Error opening edit modal:", error);
            showAlert('error', 'ไม่สามารถเปิดหน้าแก้ไขได้');
        }
    };

    // ✨ Save User Changes (uses editModal.user data + Multi-Role)
    const handleSaveUserChanges = async () => {
        if (!editModal.user) return;

        const selectedRoles = editSelectedRoles;
        if (!selectedRoles || selectedRoles.length === 0) {
            showAlert('error', 'กรุณาเลือกบทบาทอย่างน้อย 1 ตัว');
            return;
        }

        // Validate scopes for each non-admin role
        const rolesNeedingScope = selectedRoles.filter(r => r !== 'Admin');
        for (const roleName of rolesNeedingScope) {
            const roleConfig = editRoleConfigs[roleName];
            if (!roleConfig || !roleConfig.scopes || roleConfig.scopes.length === 0) {
                showAlert('error', `กรุณากำหนดขอบเขตสำหรับบทบาท ${ROLE_LABELS[roleName] || roleName}`);
                return;
            }
        }

        // --- NEW: Deparment Manager Confirmation Logic ---
        const targetDeptId = managedDeptId ? parseInt(managedDeptId) : null;
        const currentDeptId = userCurrentManagedDeptId ? parseInt(userCurrentManagedDeptId) : null;
        const warnings = [];

        // Case 1: User จะถูกย้ายออกจากแผนกเดิม (User is currently manager of A, but removing or changing to B)
        if (currentDeptId && currentDeptId !== targetDeptId) {
            const currentDeptName = masterData.departments.find(d => d.id === currentDeptId)?.name || 'Unknown';
            // ถ้า targetDeptId เป็น null แปลว่า "ปลดออก" // ถ้าเปลี่ยนเป็น ID อื่น แปลว่า "ย้ายแผนก"
            const action = targetDeptId ? 'จะถูกย้ายออกจาก' : 'จะถูกปลดออกจาก';
            warnings.push(`👤 User นี้เป็น Manager ของแผนก "<b>${currentDeptName}</b>" อยู่ ${action}แผนกเดิม`);
        }

        // Case 2: แผนกเป้าหมายมี Manager คนอื่นอยู่แล้ว (Target dept already has a DIFFERENT manager)
        if (targetDeptId) {
            const targetDept = masterData.departments.find(d => d.id === targetDeptId);
            if (targetDept?.managerId && targetDept.managerId !== editModal.user.id) {
                // หาชื่อ Manager เดิมจาก users list หรือจาก dept.manager (ขึ้นอยู่กับ frontend data structure)
                // เนื่องจาก masterData.departments อาจไม่มี obj manager เราอาจต้องดูจาก field text ถ้ามี หรือหาจาก users
                const oldManagerName = targetDept.manager?.displayName || targetDept.manager?.first_name || 'Manager เดิม';
                warnings.push(`⚠️ แผนก "<b>${targetDept.name}</b>" มี Manager อยู่แล้ว (<b>${oldManagerName}</b>) จะถูกแทนที่`);
            }
        }

        // Show Confirmation if warnings exist
        if (warnings.length > 0) {
            // ต้อง Import Swal หรือใช้ confirm browser แบบง่าย ถ้าไม่มี Swal
            // ในที่นี้สมมติว่าใช้ confirm แบบง่ายไปก่อน หรือถ้ามี component AlertModal
            // แต่เนื่องจาก User Request เจาะจง "Popup แจ้งเตือน" เราใช้ window.confirm แบบสวยๆ หรือ Alert ดีกว่า
            // เพื่อความชัวร์และเร็ว ขอใช้ React State Alert ที่มี หรือ window.confirm + formatting
            // แต่เดี๋ยวก่อน... เรามี Swal ไหม? ในไฟล์ไม่มี import Swal
            // งั้นใช้ window.confirm แบบบ้านๆ ไปก่อน หรือสร้าง Modal ซ้อน?
            // "Notification Popup" user might mean SweetAlert.
            // Let's check imports. No Swal imported.
            // I will use standard window.confirm but format text for readability (plaintext)

            const confirmMessage = warnings.map(w => w.replace(/<b>|<\/b>/g, '')).join('\n\n') + '\n\nยืนยันที่จะบันทึกหรือไม่?';
            if (!window.confirm(confirmMessage)) {
                return;
            }
        }
        // --------------------------------------------------

        try {
            setIsSubmitting(true);

            const currentUserId = user.id;
            const tenantId = editModal.user.tenantId || editModal.user.tenant_id || 1;

            console.log('📝 Saving user:', {
                userId: editModal.user.id,
                title: editModal.user.title,
                phone: editModal.user.phone,
                departmentId: editModal.user.departmentId,
                selectedRoles,
                tenantId
            });

            // 1. Update users table basic info via Backend API (RLS-safe)
            console.log('[UserManagement] Saving user via Backend API:', editModal.user.id);

            try {
                await adminService.updateUser(editModal.user.id, {
                    firstName: editModal.user.firstName,
                    lastName: editModal.user.lastName,
                    title: editModal.user.title,
                    phone: editModal.user.phone,
                    departmentId: editModal.user.departmentId,
                    email: editModal.user.email,
                    isActive: editModal.user.isActive
                });
                console.log('✅ Updated users table via Backend API');
            } catch (updateError) {
                console.error('❌ Could not update users table:', updateError);
                throw updateError;
            }

            // 2. Build roles array for saveUserRoles
            const rolesForSave = selectedRoles.map(roleName => {
                const roleConfig = editRoleConfigs[roleName] || { level: 'project', scopes: [] };
                return {
                    name: roleName,
                    level: roleConfig.level || 'project', // ✅ ส่ง level ให้ด้วย
                    isActive: true,
                    scopes: roleConfig.scopes || []
                };
            });

            // 3. Save roles using new Multi-Role API
            await adminService.saveUserRoles(
                editModal.user.id,
                rolesForSave,
                currentUserId,
                tenantId
            );

            // 4. Update Department Manager (NEW)
            // เช็คว่ามีการเปลี่ยนแปลงค่าหรือไม่ (เพื่อลด call ไม่จำเป็น)
            if (managedDeptId !== userCurrentManagedDeptId) {
                await adminService.updateDepartmentManagers(
                    editModal.user.id,
                    managedDeptId ? [managedDeptId] : []
                );
                console.log('✅ Updated Department Manager');
            }

            console.log('✅ Saved user roles successfully');
            showAlert('success', 'บันทึกข้อมูลสำเร็จ');
            setEditModal({ show: false, user: null });
            setEditRoleConfigs({});
            setEditSelectedRoles([]);
            loadUsers();
            loadMasterData(); // Reload master data to reflect manager changes in list
        } catch (error) {
            console.error('❌ Error saving user:', error);
            showAlert('error', `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmApprove = async () => {
        // ตรวจสอบว่าเลือกบทบาทแล้วหรือยัง
        if (!approvalData.roles || approvalData.roles.length === 0) {
            showAlert('error', 'กรุณาเลือกบทบาทอย่างน้อย 1 ตัว');
            return;
        }

        // Validate scopes for each non-admin role
        const rolesNeedingScope = approvalData.roles.filter(r => r !== 'Admin');
        for (const roleName of rolesNeedingScope) {
            const roleConfig = approvalRoleConfigs[roleName];
            if (!roleConfig || !roleConfig.scopes || roleConfig.scopes.length === 0) {
                showAlert('error', `กรุณากำหนดขอบเขตสำหรับบทบาท ${ROLE_LABELS[roleName] || roleName}`);
                return;
            }
        }

        try {
            setIsSubmitting(true);

            // Validate current user
            if (!user) {
                showAlert('error', 'กรุณาเข้าสู่ระบบก่อนทำการอนุมัติ');
                return;
            }

            // Generate temporary password
            const tempPassword = generateTempPassword();

            // Build roles array for backend
            const rolesForApprove = approvalData.roles.map(roleName => {
                const roleConfig = approvalRoleConfigs[roleName] || { level: 'project', scopes: [] };
                return {
                    name: roleName,
                    level: roleConfig.level || 'project',
                    scopes: roleConfig.scopes || []
                };
            });

            console.log('[UserManagement] Approving registration via backend:', {
                registrationId: approveModal.registrationId,
                roles: rolesForApprove,
                email: approveModal.registrationData.email
            });

            // Use Backend API to approve registration
            const approveResponse = await adminService.approveRegistration(
                approveModal.registrationId,
                rolesForApprove,
                tempPassword
            );

            if (!approveResponse.success) {
                throw new Error(approveResponse.message || 'ไม่สามารถอนุมัติได้');
            }

            // Send approval email
            try {
                await apiDatabase.sendApprovalEmail(
                    approveModal.registrationData.email,
                    approveModal.registrationData.firstName
                );
            } catch (emailErr) {
                console.warn('Could not send approval email:', emailErr);
            }

            showAlert('success', 'อนุมัติและสร้างผู้ใช้สำเร็จ ☑️');
            setApproveModal({ show: false, registrationId: null, registrationData: null });
            setApprovalData({
                roles: [],
                scopeLevel: 'Project',
                scopeId: '',
                scopeName: '',
                allowedProjects: [],
                assignedProjects: []
            });
            setApprovalRoleConfigs({});
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

            // Validate current user
            if (!user) {
                showAlert('error', 'กรุณาเข้าสู่ระบบก่อนทำการปฏิเสธ');
                return;
            }

            const currentUserId = user.id;
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

    // Filter Users
    const filteredUsers = users.filter(u => {
        // 1. Department Filter
        if (filterDepartment && u.department?.id?.toString() !== filterDepartment) return false;

        // 2. Search Filter (Name, Email)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            const matchName = (u.name || '').toLowerCase().includes(lowerTerm);
            const matchDisplay = (u.displayName || '').toLowerCase().includes(lowerTerm);
            const matchEmail = (u.email || '').toLowerCase().includes(lowerTerm);
            if (!matchName && !matchDisplay && !matchEmail) return false;
        }

        // 3. Role Filter
        if (filterRole) {
            // Check primary role or roles array
            const userRoles = u.roles || (u.role ? [u.role] : []);
            if (!userRoles.includes(filterRole)) return false;
        }

        // 4. Status Filter
        if (filterStatus !== 'all') {
            const wantActive = filterStatus === 'active';
            if (u.isActive !== wantActive) return false;
        }

        return true;
    });


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
                        👥 Active Users ({filteredUsers.length})
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

            {/* Filters */}
            {activeTab === 'active' && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา (ชื่อ/อีเมล)</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="focus:ring-rose-500 focus:border-rose-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    placeholder="พิมพ์ชื่อ หรืออีเมล..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Department Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">แผนก (Department)</label>
                            <select
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm p-2 border"
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                            >
                                <option value="">ทั้งหมด</option>
                                {masterData.departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท (Role)</label>
                            <select
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm p-2 border"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">ทุกบทบาท</option>
                                <option value="Admin">{ROLE_V1_DISPLAY.Admin || 'System Admin'}</option>
                                <option value="Requester">{ROLE_V1_DISPLAY.Requester || 'Requester'}</option>
                                <option value="Approver">{ROLE_V1_DISPLAY.Approver || 'Approver'}</option>
                                <option value="Assignee">{ROLE_V1_DISPLAY.Assignee || 'Assignee'}</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ (Status)</label>
                            <select
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm p-2 border"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="active">ใช้งานอยู่ (Active)</option>
                                <option value="inactive">ปิดใช้งาน (Inactive)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

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
                            <LoadingSpinner size="md" color="rose" className="mb-3" label="" />
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">พนักงาน</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">แผนก / ฝ่าย</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">ขอบเขตความรับผิดชอบ (Scope)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาทระบบ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => {
                                        const isManager = user.managedDepartments && user.managedDepartments.length > 0;
                                        return (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                                {user.name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                                {user.displayName || user.name}
                                                                {isManager && (
                                                                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                                                        Manager
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                <EnvelopeIcon className="w-3 h-3" /> {user.email}
                                                            </div>
                                                            {user.phone && (
                                                                <div className="text-xs text-gray-400">📱 {user.phone}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Department + BU Column (Separated) */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-medium">{user.department?.bud?.name || '-'}</div>
                                                    <div className="text-sm text-gray-500">{user.department?.name || '-'}</div>
                                                </td>

                                                {/* Assigned Scopes Column */}
                                                <td className="px-6 py-4 relative group">
                                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                                        {/* Company Scope */}
                                                        {user.assignedScopes?.tenants?.map(t => (
                                                            <span key={`tenant-${t.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                                🏢 {t.name}
                                                            </span>
                                                        ))}

                                                        {/* BU Scope */}
                                                        {user.assignedScopes?.buds?.map(b => (
                                                            <span key={`bud-${b.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                                💼 {b.name}
                                                            </span>
                                                        ))}

                                                        {/* Project Scope */}
                                                        {user.assignedProjects && user.assignedProjects.length > 0 ? (
                                                            <>
                                                                {user.assignedProjects.slice(0, 5).map((p, idx) => (
                                                                    <span key={`proj-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                        🏗️ {p.name}
                                                                    </span>
                                                                ))}
                                                                {user.assignedProjects.length > 5 && (
                                                                    <div className="relative inline-block">
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 border border-gray-200">
                                                                            +{user.assignedProjects.length - 5}
                                                                        </span>
                                                                        {/* Tooltip/Popup on Hover */}
                                                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-50 hidden group-hover:block">
                                                                            <div className="text-xs text-gray-500 font-semibold mb-2 border-b pb-1">โครงการทั้งหมด:</div>
                                                                            <ul className="text-xs text-gray-700 space-y-1 max-h-48 overflow-y-auto">
                                                                                {user.assignedProjects.map(p => (
                                                                                    <li key={p.id} className="flex items-start gap-1">
                                                                                        <span className="mt-0.5">•</span>
                                                                                        <span>{p.name}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : null}

                                                        {/* Fallback if no scope assigned */}
                                                        {(!user.assignedScopes?.tenants?.length &&
                                                            !user.assignedScopes?.buds?.length &&
                                                            !user.assignedProjects?.length) && (
                                                                <span className="text-xs text-gray-400">-</span>
                                                            )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_V2_BADGE_COLORS[user.roleName] || 'bg-gray-100 text-gray-800'}`}>
                                                        {ROLE_V1_DISPLAY[user.roleName] || user.roleName || 'N/A'}
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {users.length > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => loadUsers(pagination.page - 1)}
                                    disabled={!pagination.hasPrev}
                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => loadUsers(pagination.page + 1)}
                                    disabled={!pagination.hasNext}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => loadUsers(pagination.page - 1)}
                                            disabled={!pagination.hasPrev}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                                        </button>

                                        {/* Page Numbers */}
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            // Simple logic to show window of pages around current page
                                            // For now just show 1..5 or adjust based on page
                                            let pageNum = pagination.page - 2 + i;
                                            if (pagination.page < 3) pageNum = i + 1;
                                            if (pageNum > pagination.totalPages) return null;
                                            if (pageNum < 1) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => loadUsers(pageNum)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.page === pageNum
                                                        ? 'bg-rose-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600'
                                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => loadUsers(pagination.page + 1)}
                                            disabled={!pagination.hasNext}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <LoadingSpinner size="md" color="rose" className="mb-3" label="" />
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
            )
            }

            {/* Edit User Modal */}
            {
                editModal.show && editModal.user && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
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
                                {/* Editable Info (Admin Only) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ชื่อจริง {isAdmin ? <span className="text-xs text-rose-500">(Admin แก้ได้)</span> : <span className="text-xs text-gray-400">(อ่านเท่านั้น)</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={editModal.user.firstName || ''}
                                            onChange={(e) => isAdmin && setEditModal(prev => ({ ...prev, user: { ...prev.user, firstName: e.target.value } }))}
                                            disabled={!isAdmin}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-300 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            นามสกุล
                                        </label>
                                        <input
                                            type="text"
                                            value={editModal.user.lastName || ''}
                                            onChange={(e) => isAdmin && setEditModal(prev => ({ ...prev, user: { ...prev.user, lastName: e.target.value } }))}
                                            disabled={!isAdmin}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-300 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            อีเมล {isAdmin ? <span className="text-xs text-rose-500">(Admin แก้ได้)</span> : <span className="text-xs text-gray-400">(อ่านเท่านั้น)</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={editModal.user.email || ''}
                                            onChange={(e) => isAdmin && setEditModal(prev => ({ ...prev, user: { ...prev.user, email: e.target.value } }))}
                                            disabled={!isAdmin}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-300 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        />
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

                                {/* Role Selection - Multi-Role Component */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-3">
                                        บทบาทในระบบ <span className="text-red-500">*</span>
                                    </label>
                                    <RoleSelectionCheckbox
                                        selectedRoles={editSelectedRoles}
                                        onChange={(roles) => {
                                            console.log('🔄 Roles changed to:', roles);
                                            setEditSelectedRoles(roles);
                                        }}
                                        showDescriptions={true}
                                    />
                                </div>

                                {/* Scope Configuration - Multi-Role Component */}
                                {editSelectedRoles.length > 0 && (
                                    <ScopeConfigPanel
                                        selectedRoles={editSelectedRoles}
                                        roleConfigs={editRoleConfigs}
                                        onConfigChange={(configs) => {
                                            console.log('🔄 Configs changed to:', configs);
                                            setEditRoleConfigs(configs);
                                        }}
                                        availableScopes={availableScopes}
                                        loading={scopesLoading}
                                    />
                                )}

                                {/* Department Manager Assignment (New) */
                                    (() => {
                                        // Filter Logic: Show only departments in same BUD
                                        const selectedUserDeptId = editModal.user.departmentId;
                                        const selectedDeptObj = masterData.departments.find(d => d.id == selectedUserDeptId);
                                        const currentBudId = selectedDeptObj?.bud_id;

                                        // If dept selected AND NOT showAll, filter by BUD. Otherwise show all.
                                        const managerOptions = (currentBudId && !showAllDepts)
                                            ? masterData.departments.filter(d => d.bud_id === currentBudId)
                                            : masterData.departments;

                                        return (
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-bold text-gray-900">
                                                        ผู้จัดการแผนก (Department Manager)
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={showAllDepts}
                                                            onChange={(e) => setShowAllDepts(e.target.checked)}
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-xs text-gray-500">แสดงข้ามสายงาน</span>
                                                    </label>
                                                </div>

                                                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        กำหนดให้ User นี้เป็นผู้จัดการแผนก
                                                        {currentBudId && !showAllDepts && <span className="text-rose-600 font-medium"> (เฉพาะฝ่าย {selectedDeptObj?.name})</span>}
                                                        {(!currentBudId || showAllDepts) && " (ทุกแผนก)"}
                                                    </p>
                                                    <select
                                                        value={managedDeptId || ''}
                                                        onChange={(e) => setManagedDeptId(e.target.value ? parseInt(e.target.value) : '')}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                    >
                                                        <option value="">-- ไม่ได้เป็นผู้จัดการ --</option>
                                                        {managerOptions.map(dept => (
                                                            <option key={dept.id} value={dept.id}>
                                                                {dept.name}
                                                                {/* Show warning if dept already has a DIFFERENT manager */}
                                                                {dept.manager && dept.manager.id !== editModal.user.id
                                                                    ? ` (⚠️ ปัจจุบัน: ${dept.manager.displayName || dept.manager.first_name})`
                                                                    : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex items-start gap-2 mt-2">
                                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                            ⚠️ การเปลี่ยนผู้จัดการจะทับคนเดิมทันที และบันทึก Log การเปลี่ยนแปลง
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}


                                <div className="flex items-center gap-3 p-3 mt-4 border border-gray-200 rounded-lg bg-gray-50">
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
                                <Button onClick={handleSaveUserChanges} disabled={isSubmitting}>
                                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reassign Modal */}
            {
                approveModal.show && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
                                {/* Role Selection - Multi-Role Component */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-3">
                                        เลือกบทบาท <span className="text-red-500">*</span>
                                    </label>
                                    <RoleSelectionCheckbox
                                        selectedRoles={approvalData.roles}
                                        onChange={(roles) => setApprovalData(prev => ({ ...prev, roles }))}
                                        showDescriptions={true}
                                    />
                                </div>

                                {/* Scope Configuration - Multi-Role Component */}
                                {approvalData.roles.length > 0 && (
                                    <ScopeConfigPanel
                                        selectedRoles={approvalData.roles}
                                        roleConfigs={approvalRoleConfigs}
                                        onConfigChange={setApprovalRoleConfigs}
                                        availableScopes={availableScopes}
                                        loading={scopesLoading}
                                    />
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
                )
            }

            {/* Reject Modal */}
            {
                rejectModal.show && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
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
                )
            }
        </div >
    );
}
