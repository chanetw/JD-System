/**
 * @file UserManagementNew.jsx  
 * @description User Management + Registration Approval with Role Selection Modal
 * 
 * Features:
 * - Tab 1: Active Users (จัดการผู้ใช้)
 * - Tab 2: Pending Registrations (อนุมัติ/ปฏิเสธ คำขอสมัคร)
 * - Tab 3: User Requests (คำขอจากผู้ใช้ — resolve/reject + notify user)
 *   - URL params: ?tab=requests&id={id} → เปิด tab + popup อัตโนมัติ
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiDatabase from '@shared/services/apiDatabase';
import { adminService } from '@shared/services/modules/adminService';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';
import { generateTempPassword } from '@shared/utils/passwordGenerator';
import { ROLES, ROLE_LABELS, ROLE_V1_DISPLAY, ROLE_V2_BADGE_COLORS, hasRole } from '@shared/utils/permission.utils';
import Button from '@shared/components/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import RoleSelectionCheckbox from '@shared/components/RoleSelectionCheckbox';
import ScopeConfigPanel from '@shared/components/ScopeConfigPanel';
import {
    CheckIcon, XMarkIcon,
    UserIcon, EnvelopeIcon, BuildingOfficeIcon,
    ChevronLeftIcon, ChevronRightIcon,
    KeyIcon,
    ExclamationTriangleIcon,
    MapIcon // For Responsibilities Icon
} from '@heroicons/react/24/outline';

// ROLE_OPTIONS และ SCOPE_LEVELS ย้ายไปใช้จาก permission.utils.js แล้ว
// ดู: ROLES, ROLE_LABELS, SCOPE_LEVELS จาก '@shared/utils/permission.utils'

// ⚡ Custom debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

export default function UserManagementNew() {
    const { user } = useAuthStoreV2(); // ดึง current user จาก Auth Store
    const [activeTab, setActiveTab] = useState('active');
    const [isLoading, setIsLoading] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- User Requests Tab ---
    /** รายการ User Requests (pending) */
    const [userRequests, setUserRequests] = useState([]);
    /** จำนวน pending requests สำหรับแสดงใน badge */
    const [pendingCount, setPendingCount] = useState(0);
    /** User Request ที่เลือกดูรายละเอียด (popup) */
    const [selectedRequest, setSelectedRequest] = useState(null);
    /** ควบคุมการแสดง request detail popup */
    const [requestDetailOpen, setRequestDetailOpen] = useState(false);
    /** กำลัง resolve/reject อยู่หรือไม่ (เพื่อ disable ปุ่ม) */
    const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
    /** admin note สำหรับ resolve */
    const [adminNote, setAdminNote] = useState('');
    /** URL search params (ใช้ deep link ?tab=requests&id={id}) */
    const [searchParams] = useSearchParams();

    // Helper: Check if current user is admin
    const isAdmin = hasRole(user, ROLES.ADMIN) || hasRole(user, 'SuperAdmin');

    // Approve Modal (Select Role & Scope)
    const [approveModal, setApproveModal] = useState({
        show: false,
        registrationId: null,
        registrationData: null,
        filteredScopes: null  // Store filtered scopes based on user's department
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
        user: null,
        filteredScopes: null  // Store filtered scopes based on user's department
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

    // --- NEW: Assignment State (BUD-level + Project-level) ---
    const [editAssignmentData, setEditAssignmentData] = useState({ jobTypeIds: [], budIds: [], projectIds: [] });
    const [initialAssignmentData, setInitialAssignmentData] = useState({ jobTypeIds: [], budIds: [], projectIds: [] }); // To detect changes
    const [budFilter, setBudFilter] = useState('all'); // Filter for projects section
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
        departments: [],
        jobTypes: [] // Add jobTypes to masterData
    });

    // Reject Modal
    const [rejectModal, setRejectModal] = useState({
        show: false,
        registrationId: null,
        registrationEmail: null
    });
    const [rejectReason, setRejectReason] = useState('');

    // Alert - Using SweetAlert2 now, removing local state
    // const [alertState, setAlertState] = useState({ ... });

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
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // ⚡ 300ms debounce
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    const [filterDepartment, setFilterDepartment] = useState('');
    const [showAllDepts, setShowAllDepts] = useState(false); // Department Manager Filter Toggle

    // ⚡ Memoize department lookups (O(1) instead of O(n) find operations)
    const departmentMap = useMemo(() => {
        const map = new Map();
        masterData.departments.forEach(dept => {
            map.set(dept.id, dept);
            map.set(dept.name, dept);
        });
        return map;
    }, [masterData.departments]);

    // ⚡ Performance: Load master data once on mount
    useEffect(() => {
        loadMasterData();
        // โหลด pending count ครั้งแรก (สำหรับ badge)
        loadPendingCount();
    }, []);

    // ✨ Deep Link Handler: อ่าน URL params ?tab=requests&id={id}
    // เมื่อ Admin คลิก notification → navigate มาพร้อม params → เปิด tab + popup อัตโนมัติ
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const idParam = searchParams.get('id');

        if (tabParam === 'requests') {
            setActiveTab('requests');
            // ถ้ามี id → โหลด requests แล้วเปิด popup
            if (idParam) {
                adminService.getUserRequests('pending').then(data => {
                    setUserRequests(data);
                    const found = data.find(r => String(r.id) === String(idParam));
                    if (found) {
                        setSelectedRequest(found);
                        setAdminNote('');
                        setRequestDetailOpen(true);
                    }
                }).catch(err => console.error('[UserManagement] Deep link load error:', err));
            }
        }
    }, [searchParams]);

    // Load tab-specific data when tab changes
    useEffect(() => {
        if (activeTab === 'registrations') {
            loadRegistrations();
        } else if (activeTab === 'active') {
            loadUsers();
        } else if (activeTab === 'requests') {
            loadUserRequests();
        }
    }, [activeTab]);

    const loadUsers = async (page = 1) => {
        try {
            setIsLoading(true);
            console.log('[UserManagement] calling apiDatabase.getUsers', apiDatabase.getUsers);
            
            // Build filter object
            const filters = {};
            if (filterDepartment) filters.departmentId = filterDepartment;
            if (filterRole) filters.role = filterRole;
            if (filterStatus !== 'all') filters.isActive = filterStatus === 'active';
            if (debouncedSearchTerm) filters.search = debouncedSearchTerm;
            
            console.log('[UserManagement] Filter State:', { filterDepartment, filterRole, filterStatus, debouncedSearchTerm });
            console.log('[UserManagement] Built filters:', filters);
            
            // Pass page, limit, and filters
            const result = await apiDatabase.getUsers(page, pagination.limit, filters);
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
            console.log('[UserManagement] Loading master data (combined endpoint)...');
            const startTime = performance.now();

            // ⚡ Performance: Use combined endpoint (1 API call instead of 5)
            // Already has caching (10 min TTL) from adminService
            const combinedData = await adminService.getMasterDataCombined();
            const { tenants, buds, projects, departments, jobTypes, availableScopes } = combinedData;

            const loadTime = performance.now() - startTime;
            console.log('[UserManagement] ✅ Master data loaded in', loadTime.toFixed(0), 'ms:', {
                tenants: tenants?.length || 0,
                buds: buds?.length || 0,
                projects: projects?.length || 0,
                departments: departments?.length || 0,
                jobTypes: jobTypes?.length || 0,
                scopes: availableScopes
            });

            setMasterData({
                tenants: tenants || [],
                buds: buds || [],
                projects: projects || [],
                departments: departments || [],
                jobTypes: jobTypes || []
            });

            // ⚡ Set availableScopes directly (already included in combined data)
            setAvailableScopes(availableScopes || {
                projects: projects || [],
                buds: buds || [],
                tenants: tenants || []
            });

            console.log('[UserManagement] Master data set successfully');
        } catch (error) {
            console.error('[UserManagement] Error loading master data:', error);
            console.error('[UserManagement] Error details:', error.message, error.stack);
        }
    };

    // Load available scopes for Multi-Role UI
    const loadAvailableScopes = async () => {
        try {
            // ⚡ Scopes already loaded from getMasterDataCombined()
            // This function is now a no-op, but kept for backward compatibility
            if (masterData.projects && masterData.projects.length > 0) {
                setAvailableScopes({
                    projects: masterData.projects || [],
                    buds: masterData.buds || [],
                    tenants: masterData.tenants || []
                });
            }
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

    /**
     * Filter projects by user's department and BUD
     * Shows only projects that belong to the same BUD as the user's department
     *
     * Data sources:
     * - User (Edit mode): has departmentId directly
     * - Registration (Approve mode): has departmentId and departmentName from backend
     *
     * @param {Object} userOrRegistration - User object or Registration object
     * @param {Object} allScopes - Original availableScopes with all projects
     * @returns {Object} - Filtered availableScopes with filtered projects
     */
    const getFilteredScopesForUser = (userOrRegistration, allScopes) => {
        // 🔓 TEMPORARY: Disable scope filtering - show all projects
        console.log('🔓 [TEMP] Scope filtering DISABLED - showing all projects');
        return {
            ...allScopes,
            _filterApplied: false,
            _filterDisabled: true
        };

        /* ORIGINAL FILTERING LOGIC - Commented out for now
        if (!userOrRegistration || !allScopes) return allScopes;

        // 1. Get user's department ID - Backend sends departmentId for both users and registrations
        let departmentId = null;
        let lookupMethod = 'none';

        // Priority 1: Use departmentId directly (both User and Registration have this from backend)
        if (userOrRegistration.departmentId) {
            departmentId = userOrRegistration.departmentId;
            lookupMethod = 'departmentId (direct)';
        }
        // Priority 2: Fallback - lookup by departmentName (for registrations that might have name only)
        else if (userOrRegistration.departmentName) {
            const dept = departmentMap.get(userOrRegistration.departmentName);
            departmentId = dept?.id;
            lookupMethod = 'departmentName (lookup)';
        }
        // Priority 3: Legacy fallback - lookup by department string (old format)
        else if (userOrRegistration.department && typeof userOrRegistration.department === 'string') {
            const dept = departmentMap.get(userOrRegistration.department);
            departmentId = dept?.id;
            lookupMethod = 'department (legacy lookup)';
        }
        // Priority 4: Nested department object
        else if (userOrRegistration.department?.id) {
            departmentId = userOrRegistration.department.id;
            lookupMethod = 'department.id (nested)';
        }

        // 2. Get department's BUD ID
        const department = departmentMap.get(departmentId);
        // Fix: backend might return budId (Prisma) or bud_id (Raw DB)
        const userBudId = department?.bud_id;

        console.log('🔍 Filtering projects for user:', {
            userId: userOrRegistration.id,
            departmentId,
            lookupMethod,
            departmentName: department?.name,
            budId: userBudId
        });

        // 3. If no department found (only warn if it was expected)
        if (!departmentId) {
            // If we have a user ID but no department, that's a data issue or admin user
            if (userOrRegistration.id && !userOrRegistration.departmentId) {
                // Might be valid for some users
                return { ...allScopes, _filterApplied: false };
            }

            console.warn('⚠️ No department found for user/registration:', {
                id: userOrRegistration.id,
                email: userOrRegistration.email
            });
            return {
                ...allScopes,
                _filterError: 'NO_DEPARTMENT',
                _filterMessage: 'ไม่พบข้อมูลแผนกของผู้ใช้'
            };
        }

        // 4. If no BUD found for department, show warning
        if (!userBudId) {
            console.error('❌ No BUD found for department:', {
                departmentId,
                departmentName: department?.name
            });
            return {
                ...allScopes,
                _filterError: 'NO_BUD',
                _filterMessage: `ไม่พบข้อมูลฝ่ายของแผนก "${department?.name || departmentId}"`
            };
        }

        // 5. Filter projects by BUD
        const filteredProjects = allScopes.projects?.filter(p => {
            const match = p.budId === userBudId;
            if (match) {
                console.log('✅ Project matched:', p.name, 'BUD:', p.budId);
            }
            return match;
        }) || [];

        console.log(`📊 Filtered ${filteredProjects.length}/${allScopes.projects?.length || 0} projects for BUD ${userBudId}`);

        // 6. Return filtered scopes with metadata
        return {
            ...allScopes,
            projects: filteredProjects,
            _budId: userBudId,
            _budName: masterData.buds?.find(b => b.id === userBudId)?.name || null,
            _filterApplied: true
        };
        */
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

    /**
     * โหลดรายการ User Requests (pending) จาก API
     * เรียกเมื่อ activeTab เปลี่ยนเป็น 'requests'
     */
    const loadUserRequests = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getUserRequests('pending');
            setUserRequests(data);
        } catch (error) {
            console.error('[UserManagement] loadUserRequests error:', error);
            showAlert('error', 'ไม่สามารถโหลดรายการ User Requests ได้');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * โหลดจำนวน pending User Requests สำหรับแสดง badge
     * เรียกตอน component mount (ครั้งเดียว)
     */
    const loadPendingCount = async () => {
        try {
            const data = await adminService.getUserRequestCount();
            setPendingCount(data?.pending || 0);
        } catch (error) {
            console.error('[UserManagement] loadPendingCount error:', error);
        }
    };

    /**
     * Resolve User Request: Admin ยืนยันว่าแก้ไขแล้ว + ส่ง notification กลับหา user
     * @param {Object} request - User Request object ที่ต้องการ resolve
     * @param {string} note - admin note (หมายเหตุการดำเนินการ)
     */
    const handleResolveRequest = async (request, note) => {
        if (!note?.trim()) {
            showAlert('warning', 'กรุณาระบุหมายเหตุการดำเนินการ');
            return;
        }
        try {
            setIsRequestSubmitting(true);
            await adminService.resolveUserRequest(request.id, note.trim());
            // ลบรายการออกจาก list (รายการที่ resolve แล้วไม่แสดงในหน้า pending)
            setUserRequests(prev => prev.filter(r => r.id !== request.id));
            setPendingCount(prev => Math.max(0, prev - 1));
            setRequestDetailOpen(false);
            setSelectedRequest(null);
            setAdminNote('');
            showAlert('success', 'ยืนยันการแก้ไขเรียบร้อยแล้ว ผู้ส่งได้รับการแจ้งเตือนแล้ว');
        } catch (error) {
            console.error('[UserManagement] handleResolveRequest error:', error);
            showAlert('error', 'เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถ resolve ได้'));
        } finally {
            setIsRequestSubmitting(false);
        }
    };

    /**
     * Reject User Request: Admin ปฏิเสธและระบุเหตุผล + ส่ง notification กลับหา user
     * @param {Object} request - User Request object ที่ต้องการ reject
     */
    const handleRejectRequest = async (request) => {
        // ใช้ SweetAlert2 เพื่อรับเหตุผลจาก Admin
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'ระบุเหตุผลที่ไม่สามารถดำเนินการได้',
            input: 'textarea',
            inputLabel: 'เหตุผล',
            inputPlaceholder: 'เช่น ไม่เป็นไปตามนโยบาย, อยู่นอกขอบเขตความรับผิดชอบ...',
            inputAttributes: { rows: 3 },
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ยืนยัน ปฏิเสธ',
            cancelButtonText: 'ยกเลิก',
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'กรุณาระบุเหตุผล';
            }
        });

        if (!isConfirmed || !reason?.trim()) return;

        try {
            setIsRequestSubmitting(true);
            await adminService.rejectUserRequest(request.id, reason.trim());
            // ลบรายการออกจาก list
            setUserRequests(prev => prev.filter(r => r.id !== request.id));
            setPendingCount(prev => Math.max(0, prev - 1));
            setRequestDetailOpen(false);
            setSelectedRequest(null);
            setAdminNote('');
            showAlert('success', 'ปฏิเสธคำขอเรียบร้อยแล้ว ผู้ส่งได้รับการแจ้งเตือนพร้อมเหตุผลแล้ว');
        } catch (error) {
            console.error('[UserManagement] handleRejectRequest error:', error);
            showAlert('error', 'เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถ reject ได้'));
        } finally {
            setIsRequestSubmitting(false);
        }
    };



    const showAlert = (type, message) => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: type,
            title: message
        });
    };

    const handleApproveClick = (registrationId) => {
        const registration = registrations.find(r => r.id === registrationId);

        // ✨ Get filtered scopes for this registration based on department/BUD
        const filteredScopes = getFilteredScopesForUser(registration, availableScopes);

        setApproveModal({
            show: true,
            registrationId,
            registrationData: registration,
            filteredScopes  // Store filtered scopes in state
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

    // ✨ Handle Toggle User Status (Active/Inactive)
    const handleToggleStatus = async (userToToggle) => {
        try {
            const newStatus = !userToToggle.isActive;

            // Optimistic Update: Update UI immediately
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.id === userToToggle.id ? { ...u, isActive: newStatus } : u
                )
            );

            // Call API
            await adminService.updateUser(userToToggle.id, {
                ...userToToggle,
                isActive: newStatus
            });

            showAlert('success', `เปลี่ยนสถานะเป็น ${newStatus ? 'Active' : 'Inactive'} เรียบร้อยแล้ว`);
            // No need to reload list: loadUsers(); 
        } catch (error) {
            console.error('Error toggling status:', error);

            // Revert on error
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.id === userToToggle.id ? { ...u, isActive: userToToggle.isActive } : u
                )
            );
            showAlert('error', 'ไม่สามารถเปลี่ยนสถานะได้');
        }
    };

    // ✨ Handle Reset Password
    const handleResetPassword = async (userToReset) => {
        const result = await Swal.fire({
            title: `รีเซ็ตรหัสผ่าน?`,
            text: `ต้องการรีเซ็ตรหัสผ่านของ ${userToReset.firstName} ใช่หรือไม่? ระบบจะสุ่มรหัสผ่านใหม่และส่งไปยังอีเมลของผู้ใช้ทันที`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, รีเซ็ตเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        try {
            setIsSubmitting(true);
            await adminService.resetPassword(userToReset.id);
            showAlert('success', `รีเซ็ตรหัสผ่านและส่งอีเมลเรียบร้อยแล้ว`);
        } catch (error) {
            console.error('Error resetting password:', error);
            showAlert('error', 'ไม่สามารถรีเซ็ตรหัสผ่านได้: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
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

            // ⚡ Performance: Load all edit details in ONE request
            let userWithRoles = null;
            let assignments = { budAssignments: [], projectAssignments: [] };
            let managedDepts = [];
            let currentManagedDeptId = '';

            try {
                console.log('⚡ Loading user edit details (combined endpoint)...');
                const startTime = performance.now();

                const editDetails = await adminService.getUserEditDetails(userToEdit.id);
                const loadTime = performance.now() - startTime;

                console.log(`✅ User edit details loaded in ${loadTime.toFixed(0)}ms:`, editDetails);

                // Extract data from combined response
                const { user: editUser, roles, assignments: userAssignments, managedDepartments } = editDetails;

                userWithRoles = {
                    ...editUser,
                    roles: roles
                };

                assignments = userAssignments;
                managedDepts = managedDepartments || [];

                if (managedDepts && managedDepts.length > 0) {
                    currentManagedDeptId = managedDepts[0].id;
                }
            } catch (apiError) {
                console.warn("Could not load user edit details from combined endpoint:", apiError.message);
                // Fallback to old method if combined endpoint fails (backward compatibility)
                try {
                    userWithRoles = await adminService.getUserWithRoles(userToEdit.id, userToEdit.tenantId || 1);
                } catch (e) {
                    console.warn("Fallback also failed:", e.message);
                }
            }

            // Build roleConfigs from loaded roles
            const loadedRoleConfigs = {};
            const loadedRoleNames = [];

            if (userWithRoles?.roles && userWithRoles.roles.length > 0) {
                userWithRoles.roles.forEach(role => {
                    loadedRoleNames.push(role.name);
                    loadedRoleConfigs[role.name] = {
                        level: role.scopes?.[0]?.level || 'project',
                        scopes: role.scopes || []
                    };
                });
                console.log('✅ Loaded roles:', loadedRoleNames);
            } else {
                // Fallback: use legacy role
                if (userToEdit.role) {
                    const roleName = userToEdit.role === 'marketing' ? 'Requester' : userToEdit.role;
                    loadedRoleNames.push(roleName);
                    console.log(`⚠️ Using legacy role: ${userToEdit.role} -> mapped to ${roleName}`);
                }
            }

            // Extract assignment data
            const { budAssignments = [], projectAssignments = [] } = assignments;

            // Extract unique job type IDs from both levels
            const jobTypeIds = [
                ...new Set([
                    ...budAssignments.map(a => a.jobTypeId),
                    ...projectAssignments.map(a => a.jobTypeId)
                ])
            ];

            // Extract BUD IDs
            const budIds = [...new Set(budAssignments.map(a => a.budId))];

            // Extract Project IDs
            const projectIds = [...new Set(projectAssignments.map(a => a.projectId))];

            const assignmentData = { jobTypeIds, budIds, projectIds };

            console.log('[UserManagement] Extracted assignments:', assignmentData);

            setEditAssignmentData(assignmentData);
            setInitialAssignmentData(assignmentData);

            // Set states
            // Set states
            setManagedDeptId(currentManagedDeptId); // Sets the form value
            setUserCurrentManagedDeptId(currentManagedDeptId); // Remembers original value for change detection
            // Set states
            setEditScopeData(initialScopeData);
            setEditRoleConfigs(loadedRoleConfigs);
            setEditSelectedRoles(loadedRoleNames);

            // ✨ Get filtered scopes for this user based on department/BUD
            // Use userWithRoles (fresh data) if available, otherwise fallback to userToEdit
            const userForFiltering = userWithRoles || userToEdit;
            const filteredScopes = getFilteredScopesForUser(userForFiltering, availableScopes);

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
                },
                filteredScopes  // Store filtered scopes in state
            });
            console.log('🏢 Department loaded:', userForFiltering.departmentId, 'from userToEdit:', userToEdit.departmentId);

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
        // Validate scopes for each non-admin role (Assignee uses Responsibilities, not Scope)
        const rolesNeedingScope = selectedRoles.filter(r => r !== 'Admin' && r !== 'Assignee');
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

        // Validate Assignee Assignments (Must select both Job Types and Projects)
        const isAssignee = selectedRoles.includes('Assignee');
        if (isAssignee) {
            if (editAssignmentData.projectIds.length > 0 && editAssignmentData.jobTypeIds.length === 0) {
                showAlert('error', 'กรุณาเลือกทักษะ (Job Types) อย่างน้อย 1 งาน');
                return;
            }
            if (editAssignmentData.jobTypeIds.length > 0 && editAssignmentData.projectIds.length === 0) {
                showAlert('error', 'กรุณาเลือกโครงการ (Projects) อย่างน้อย 1 โครงการ');
                return;
            }
            // Optional: If both are empty, that's fine (no assignment), unless strict requirement.
            // But usually Assignee should have assignment.
            if (editAssignmentData.projectIds.length === 0 && editAssignmentData.jobTypeIds.length === 0) {
                // Maybe warn? or let it pass (empty assignment)
            }
        }

        // Case 1: User จะถูกย้ายออกจากแผนกเดิม (User is currently manager of A, but removing or changing to B)
        if (currentDeptId && currentDeptId !== targetDeptId) {
            const currentDeptName = departmentMap.get(currentDeptId)?.name || 'Unknown';
            // ถ้า targetDeptId เป็น null แปลว่า "ปลดออก" // ถ้าเปลี่ยนเป็น ID อื่น แปลว่า "ย้ายแผนก"
            const action = targetDeptId ? 'จะถูกย้ายออกจาก' : 'จะถูกปลดออกจาก';
            warnings.push(`👤 User นี้เป็น Manager ของแผนก "<b>${currentDeptName}</b>" อยู่ ${action}แผนกเดิม`);
        }

        // Case 2: แผนกเป้าหมายมี Manager คนอื่นอยู่แล้ว (Target dept already has a DIFFERENT manager)
        if (targetDeptId) {
            const targetDept = departmentMap.get(targetDeptId);
            if (targetDept?.managerId && targetDept.managerId !== editModal.user.id) {
                const oldManagerName = targetDept.manager?.firstName || targetDept.manager?.first_name || 'Manager เดิม';
                warnings.push(`⚠️ แผนก "<b>${targetDept.name}</b>" มี Manager อยู่แล้ว (<b>${oldManagerName}</b>) จะถูกแทนที่`);
            }
        }

        // --- NEW: Assignment Conflict Check (Only if Assignment Role is selected AND changes made) ---
        // isAssignee already declared above
        let assignmentsChanged = false;

        if (isAssignee) {
            const jobTypesChanged = JSON.stringify(editAssignmentData.jobTypeIds.sort()) !== JSON.stringify(initialAssignmentData.jobTypeIds.sort());
            const budsChanged = JSON.stringify(editAssignmentData.budIds?.sort() || []) !== JSON.stringify(initialAssignmentData.budIds?.sort() || []);
            const projectsChanged = JSON.stringify(editAssignmentData.projectIds.sort()) !== JSON.stringify(initialAssignmentData.projectIds.sort());
            assignmentsChanged = jobTypesChanged || budsChanged || projectsChanged;

            if (assignmentsChanged && editAssignmentData.projectIds.length > 0 && editAssignmentData.jobTypeIds.length > 0) {
                try {
                    const conflicts = await adminService.checkAssignmentConflicts(
                        editModal.user.id,
                        editAssignmentData.jobTypeIds,
                        editAssignmentData.projectIds
                    );

                    if (conflicts && conflicts.length > 0) {
                        // Create readable conflict list
                        const conflictList = conflicts.map(c =>
                            `<li><b>${c.projectName}</b> - <b>${c.jobTypeName}</b> (ปัจจุบันรับผิดชอบโดย: ${c.currentAssigneeName})</li>`
                        ).join('');

                        warnings.push(
                            `<div class="text-left mt-2">
                                <strong class="text-amber-600 block mb-1">⚠️ พบความซ้ำซ้อนในความรับผิดชอบ (Assignments Conflict):</strong>
                                <ul class="list-disc pl-5 text-sm text-gray-700 max-h-32 overflow-y-auto">${conflictList}</ul>
                                <p class="text-xs text-gray-500 mt-1">* หากยืนยัน ระบบจะเปลี่ยนผู้รับผิดชอบเป็น User นี้แทนทันที</p>
                            </div>`
                        );
                    }
                } catch (err) {
                    console.error("Conflict check failed ignored:", err);
                }
            }
        }

        // Show Confirmation if warnings exist
        if (warnings.length > 0) {
            const confirmMessage = warnings.join('<br/><br/>');

            const result = await Swal.fire({
                title: 'ยืนยันการบันทึก?',
                html: `<div class="text-left text-sm">${confirmMessage}</div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยัน, บันทึกเลย',
                cancelButtonText: 'ยกเลิก'
            });

            if (!result.isConfirmed) {
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

            if (managedDeptId !== userCurrentManagedDeptId) {
                await adminService.updateDepartmentManagers(
                    editModal.user.id,
                    managedDeptId ? [managedDeptId] : []
                );
                console.log('✅ Updated Department Manager');
            }

            // 5. Save Assignments (Responsibilities)
            if (isAssignee && assignmentsChanged) {
                await adminService.saveUserAssignments(editModal.user.id, editAssignmentData);
                console.log('✅ Updated Assignments');
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
        // Validate scopes for each non-admin role (Assignee uses Responsibilities, not Scope)
        const rolesNeedingScope = approvalData.roles.filter(r => r !== 'Admin' && r !== 'Assignee');
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

    // ⚡ Reload users when filters change
    useEffect(() => {
        if (activeTab === 'active') {
            loadUsers(1); // Reset to page 1 when filters change
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDepartment, filterRole, filterStatus, debouncedSearchTerm, activeTab]);

    // ⚡ Use users directly (backend already filtered)
    const filteredUsers = users;


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
            <div className="border-b border-gray-400">
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
                    {/* Tab ที่ 3: User Requests — แสดง badge จำนวน pending */}
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'requests'
                            ? 'text-rose-600 border-rose-600'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                            }`}
                    >
                        📩 User Requests
                        {pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>


            {/* Filters */}
            {activeTab === 'active' && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-400 space-y-4">
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

            {/* Alert Toast - Removed (Using SweetAlert2) */}

            {/* Content based on active tab */}
            {activeTab === 'active' && (
                <div className="bg-white border border-gray-400 rounded-xl shadow-sm overflow-hidden">
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
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">พนักงาน</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">แผนก / ฝ่าย</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">ขอบเขต (Scope) & ความรับผิดชอบ</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาทระบบ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-300">
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
                                                                {user.name}
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
                                                            <span key={`tenant-${t.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                                                🏢 {t.name}
                                                            </span>
                                                        ))}

                                                        {/* BU Scope */}
                                                        {user.assignedScopes?.buds?.map(b => (
                                                            <span key={`bud-${b.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-300">
                                                                💼 {b.name}
                                                            </span>
                                                        ))}

                                                        {/* Project Scope */}
                                                        {user.assignedProjects && user.assignedProjects.length > 0 ? (
                                                            <>
                                                                {user.assignedProjects.slice(0, 5).map((p, idx) => (
                                                                    <span key={`proj-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300">
                                                                        🏗️ {p.name}
                                                                    </span>
                                                                ))}
                                                                {user.assignedProjects.length > 5 && (
                                                                    <div className="relative inline-block">
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 border border-gray-300">
                                                                            +{user.assignedProjects.length - 5}
                                                                        </span>
                                                                        {/* Tooltip/Popup on Hover */}
                                                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-300 z-50 hidden group-hover:block">
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

                                                        {/* Assignee Responsibilities (Unique Projects) */}
                                                        {user.jobAssignments && user.jobAssignments.length > 0 ? (() => {
                                                            // Deduplicate projects
                                                            const uniqueProjects = Array.from(new Set(user.jobAssignments.map(a => a.projectId)))
                                                                .map(id => {
                                                                    const assignment = user.jobAssignments.find(a => a.projectId === id);
                                                                    // Collect all job types for this project for tooltip
                                                                    const jobTypes = user.jobAssignments
                                                                        .filter(a => a.projectId === id)
                                                                        .map(a => a.jobTypeName)
                                                                        .join(', ');
                                                                    return {
                                                                        ...assignment,
                                                                        tooltip: `Job Types: ${jobTypes}`
                                                                    };
                                                                });

                                                            return (
                                                                <>
                                                                    {uniqueProjects.slice(0, 5).map((p, idx) => (
                                                                        <span key={`proj-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300" title={p.tooltip}>
                                                                            🏗️ {p.projectName}
                                                                        </span>
                                                                    ))}
                                                                    {uniqueProjects.length > 5 && (
                                                                        <div className="relative inline-block">
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 border border-gray-300">
                                                                                +{uniqueProjects.length - 5}
                                                                            </span>
                                                                            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-300 z-50 hidden group-hover:block">
                                                                                <div className="text-xs text-gray-500 font-semibold mb-2 border-b pb-1">โครงการทั้งหมด:</div>
                                                                                <ul className="text-xs text-gray-700 space-y-1 max-h-48 overflow-y-auto">
                                                                                    {uniqueProjects.map(p => (
                                                                                        <li key={p.id} className="flex items-start gap-1">
                                                                                            <span className="mt-0.5">•</span>
                                                                                            <span>{p.projectName}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })() : null}

                                                        {/* Fallback if no scope/responsibility assigned */}
                                                        {(!user.assignedScopes?.tenants?.length &&
                                                            !user.assignedScopes?.buds?.length &&
                                                            !user.assignedProjects?.length &&
                                                            !user.jobAssignments?.length) && (
                                                                <span className="text-xs text-gray-400">-</span>
                                                            )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles && user.roles.length > 0 ? (
                                                            user.roles.map((roleObj, idx) => {
                                                                const roleName = typeof roleObj === 'string' ? roleObj : roleObj?.name;
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_V2_BADGE_COLORS[roleName] || 'bg-gray-100 text-gray-800'}`}
                                                                    >
                                                                        {ROLE_V1_DISPLAY[roleName] || roleName}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                {ROLE_V1_DISPLAY[user.role] || user.role || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        disabled={isSubmitting}
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors
                                                        ${user.isActive
                                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                                        title="แตะเพื่อเปลี่ยนสถานะ"
                                                    >
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Reset Password */}
                                                        <button
                                                            onClick={() => handleResetPassword(user)}
                                                            className="text-amber-600 hover:text-amber-900 transition-colors p-1 rounded hover:bg-amber-50"
                                                            title="รีเซ็ตรหัสผ่าน"
                                                        >
                                                            <KeyIcon className="w-5 h-5" />
                                                        </button>

                                                        {/* Edit User */}
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded hover:bg-indigo-50"
                                                            title="แก้ไขข้อมูล"
                                                        >
                                                            <span className="hidden">Edit</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                            </svg>
                                                        </button>


                                                    </div>
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
                        <div className="flex items-center justify-between border-t border-gray-300 bg-white px-4 py-3 sm:px-6">
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
            )}

            {activeTab === 'registrations' && (
                <div className="bg-white border border-gray-400 rounded-xl shadow-sm overflow-hidden">
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
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อมูลผู้สมัคร</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วยงาน/แผนก</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สมัคร</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-300">
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

            {/* ==========================================
                Tab 3: User Requests Content Area
                แสดงตารางรายการ + popup รายละเอียดเมื่อกดแถว
               ========================================== */}
            {activeTab === 'requests' && (
                <div className="bg-white border border-gray-400 rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <LoadingSpinner size="md" color="rose" className="mb-3" label="" />
                            กำลังโหลดรายการ...
                        </div>
                    ) : userRequests.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-gray-300 mb-4">
                                <EnvelopeIcon className="w-16 h-16 mx-auto opacity-30" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-600">ไม่มีคำขอที่รอดำเนินการ</h3>
                            <p className="text-gray-500 text-sm mt-2">คำขอทั้งหมดได้รับการจัดการแล้ว ✅</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ส่ง</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หัวข้อ</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ส่ง</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {userRequests.map((req) => (
                                        <tr
                                            key={req.id}
                                            className="hover:bg-rose-50 cursor-pointer transition-colors"
                                            onClick={() => {
                                                setSelectedRequest(req);
                                                setAdminNote('');
                                                setRequestDetailOpen(true);
                                            }}
                                        >
                                            {/* ชื่อผู้ส่ง */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm flex-shrink-0">
                                                        {(req.senderName || req.senderEmail || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{req.senderName || '-'}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <EnvelopeIcon className="w-3 h-3" />
                                                            {req.senderEmail}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* ประเภท */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${req.category === 'bug' ? 'bg-red-100 text-red-700' :
                                                      req.category === 'access' ? 'bg-blue-100 text-blue-700' :
                                                      'bg-purple-100 text-purple-700'}`}>
                                                    {req.category === 'bug' ? '🐛 แจ้งบัก' :
                                                     req.category === 'access' ? '🔑 ขอสิทธิ์' :
                                                     '📝 คำขออื่น'}
                                                </span>
                                            </td>
                                            {/* หัวข้อ */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 max-w-xs truncate">{req.subject}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{req.message}</div>
                                            </td>
                                            {/* วันที่ */}
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {new Date(req.createdAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </td>
                                            {/* สถานะ */}
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                    ⏳ รอดำเนินการ
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ==========================================
                User Request Detail Popup (Modal)
                เปิดเมื่อ Admin กดแถว หรือคลิก notification
               ========================================== */}
            {requestDetailOpen && selectedRequest && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-rose-100 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                                        <EnvelopeIcon className="w-6 h-6 text-rose-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">รายละเอียดคำขอ</h3>
                                        <p className="text-sm text-rose-700">#{selectedRequest.id} — {
                                            selectedRequest.category === 'bug' ? '🐛 แจ้งบัก' :
                                            selectedRequest.category === 'access' ? '🔑 ขอสิทธิ์' :
                                            '📝 คำขออื่น'
                                        }</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setRequestDetailOpen(false); setSelectedRequest(null); setAdminNote(''); }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    disabled={isRequestSubmitting}
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* ข้อมูลผู้ส่ง */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700">ผู้ส่ง:</span>
                                    <span className="text-gray-900">{selectedRequest.senderName || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <EnvelopeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-700">อีเมล:</span>
                                    <span className="text-gray-900">{selectedRequest.senderEmail}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium text-gray-700 ml-6">วันที่ส่ง:</span>
                                    <span className="text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString('th-TH')}</span>
                                </div>
                            </div>

                            {/* หัวข้อ + ข้อความ */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">หัวข้อ</p>
                                <p className="text-sm font-medium text-gray-900">{selectedRequest.subject}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">รายละเอียด</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-40 overflow-y-auto">
                                    {selectedRequest.message}
                                </p>
                            </div>

                            {/* Admin Note Input สำหรับ Resolve */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                    หมายเหตุการดำเนินการ <span className="text-rose-500 normal-case">(จำเป็นเมื่อยืนยันแก้ไข)</span>
                                </label>
                                <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="ระบุสิ่งที่ดำเนินการแล้ว เช่น เพิ่มสิทธิ์ให้แล้ว, แก้ไข bug แล้ว..."
                                    rows={3}
                                    disabled={isRequestSubmitting}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
                            <button
                                onClick={() => { setRequestDetailOpen(false); setSelectedRequest(null); setAdminNote(''); }}
                                disabled={isRequestSubmitting}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-60"
                            >
                                ปิด
                            </button>
                            <button
                                onClick={() => handleRejectRequest(selectedRequest)}
                                disabled={isRequestSubmitting}
                                className="min-w-[120px] px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                {isRequestSubmitting ? 'กำลังดำเนินการ...' : 'ไม่แก้ไข'}
                            </button>
                            <button
                                onClick={() => handleResolveRequest(selectedRequest, adminNote)}
                                disabled={isRequestSubmitting || !adminNote.trim()}
                                className="min-w-[140px] px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-4 h-4" />
                                {isRequestSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันแก้ไข'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {

                editModal.show && editModal.user && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 p-6 max-w-4xl w-full">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
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
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-400 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`}
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
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-400 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`}
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
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${isAdmin ? 'bg-white border-gray-400 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'}`}
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
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={editModal.user.phone || ''}
                                        onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, phone: e.target.value } }))}
                                        placeholder="0xx-xxx-xxxx"
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">แผนก / สังกัด</label>
                                    <select
                                        value={editModal.user.departmentId || ''}
                                        onChange={(e) => setEditModal(prev => ({ ...prev, user: { ...prev.user, departmentId: e.target.value } }))}
                                        className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

                                {/* ✨ Show filtered scope indicator or error for any role */}
                                {editModal.filteredScopes && (
                                    <>
                                        {/* Error: No Department */}
                                        {editModal.filteredScopes._filterError === 'NO_DEPARTMENT' && (
                                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs text-red-700">
                                                    ⚠️ <strong>ไม่พบแผนก:</strong> {editModal.filteredScopes._filterMessage}
                                                    <br />
                                                    <span className="text-red-500">กำลังแสดงโครงการทั้งหมด</span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Error: No BUD */}
                                        {editModal.filteredScopes._filterError === 'NO_BUD' && (
                                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-xs text-yellow-700">
                                                    ⚠️ <strong>ไม่พบฝ่าย:</strong> {editModal.filteredScopes._filterMessage}
                                                    <br />
                                                    <span className="text-yellow-600">กำลังแสดงโครงการทั้งหมด</span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Success: Filter Applied */}
                                        {editModal.filteredScopes._filterApplied && (
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-xs text-blue-700">
                                                    💡 <strong>กรองโครงการแล้ว:</strong> แสดงเฉพาะโครงการในฝ่าย{' '}
                                                    <strong>{editModal.filteredScopes._budName || 'ไม่ระบุ'}</strong>
                                                    {' '}({editModal.filteredScopes.projects?.length || 0} โครงการ)
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Scope Configuration Panel (for roles OTHER than Assignee) */}
                                {editSelectedRoles.length > 0 && editSelectedRoles.filter(r => r !== 'Assignee').length > 0 && (
                                    <ScopeConfigPanel
                                        selectedRoles={editSelectedRoles.filter(r => r !== 'Assignee')}
                                        roleConfigs={editRoleConfigs}
                                        onConfigChange={(configs) => {
                                            console.log('🔄 Configs changed to:', configs);
                                            setEditRoleConfigs(configs);
                                        }}
                                        availableScopes={{
                                            projects: masterData.projects || [],
                                            buds: masterData.buds || [],
                                            tenants: masterData.tenants || []
                                        }}
                                        loading={scopesLoading}
                                    />
                                )}

                                {/* --- Responsibilities Section for Assignee --- */}
                                {editSelectedRoles.includes('Assignee') && (
                                    <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-5 py-4 border-b border-gray-300">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                                        <MapIcon className="h-5 w-5 text-slate-600" />
                                                        ความรับผิดชอบ
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        เลือกประเภทงานและโครงการที่รับผิดชอบ
                                                    </p>
                                                </div>
                                                <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-md border border-gray-400">
                                                    <span className="font-medium text-gray-900">
                                                        {editAssignmentData.jobTypeIds?.length || 0}
                                                    </span> ทักษะ, <span className="font-medium text-gray-900">
                                                        {editAssignmentData.projectIds?.length || 0}
                                                    </span> โครงการ
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2-Column Layout */}
                                        <div className="p-5">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* LEFT: Job Types */}
                                                <div className="flex flex-col">
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-sm font-semibold text-gray-900">ทักษะ (Job Types)</h5>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const allJobTypeIds = masterData.jobTypes
                                                                        ?.filter(jt => jt.name !== 'Project Group (Parent)') // Filter out Parent Job
                                                                        ?.map(jt => jt.id) || [];
                                                                    const allSelected = allJobTypeIds.length > 0 && allJobTypeIds.every(id => editAssignmentData.jobTypeIds.includes(id));
                                                                    setEditAssignmentData({
                                                                        ...editAssignmentData,
                                                                        jobTypeIds: allSelected ? [] : allJobTypeIds
                                                                    });
                                                                }}
                                                                className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            >
                                                                {(() => {
                                                                    const allJobTypeIds = masterData.jobTypes
                                                                        ?.filter(jt => jt.name !== 'Project Group (Parent)') // Filter out Parent Job
                                                                        ?.map(jt => jt.id) || [];
                                                                    const allSelected = allJobTypeIds.length > 0 && allJobTypeIds.every(id => editAssignmentData.jobTypeIds.includes(id));
                                                                    return allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
                                                                })()}
                                                            </button>
                                                        </div>
                                                        {/* Spacer to align with Right Column Filter */}
                                                        <div className="w-full text-sm border border-transparent px-3 py-2 invisible">
                                                            Placeholder
                                                        </div>
                                                    </div>
                                                    <div className="border border-gray-400 shadow-sm rounded-lg h-96 overflow-y-auto bg-white">
                                                        {masterData.jobTypes?.length > 0 ? masterData.jobTypes
                                                            .filter(jt => jt.name !== 'Project Group (Parent)') // Filter out Parent Job from List
                                                            .map(jt => {
                                                                const isSelected = editAssignmentData.jobTypeIds.includes(jt.id);
                                                                return (
                                                                    <label
                                                                        key={jt.id}
                                                                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-blue-50/50' : ''
                                                                            }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                const newIds = e.target.checked
                                                                                    ? [...editAssignmentData.jobTypeIds, jt.id]
                                                                                    : editAssignmentData.jobTypeIds.filter(x => x !== jt.id);
                                                                                setEditAssignmentData({ ...editAssignmentData, jobTypeIds: newIds });
                                                                            }}
                                                                        />
                                                                        <span className="text-sm font-medium text-gray-900 flex-1">{jt.name}</span>
                                                                    </label>
                                                                );
                                                            }) : (
                                                            <div className="text-sm text-gray-400 px-4 py-6 text-center">ไม่มีข้อมูล</div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 px-1 text-xs text-gray-600">
                                                        เลือกแล้ว: <span className="font-medium text-gray-900">{editAssignmentData.jobTypeIds?.length || 0}</span>
                                                    </div>
                                                </div>

                                                {/* RIGHT: Projects with BUD Filter */}
                                                <div className="flex flex-col">
                                                    {/* Header and Filter aligned like Job Types */}
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-sm font-semibold text-gray-900">โครงการ (Projects)</h5>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const filteredProjects = masterData.projects
                                                                        ?.filter(p => p.isActive !== false && p.isParent !== true && p.isParent !== 1)
                                                                        ?.filter(p => budFilter === 'all' || p.budId === budFilter || p.bud_id === budFilter) || [];
                                                                    const allIds = filteredProjects.map(p => p.id);
                                                                    const allSelected = allIds.length > 0 && allIds.every(id => editAssignmentData.projectIds.includes(id));

                                                                    setEditAssignmentData({
                                                                        ...editAssignmentData,
                                                                        projectIds: allSelected
                                                                            ? editAssignmentData.projectIds.filter(id => !allIds.includes(id))
                                                                            : [...new Set([...editAssignmentData.projectIds, ...allIds])]
                                                                    });
                                                                }}
                                                                className="text-xs px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            >
                                                                {(() => {
                                                                    const filteredProjects = masterData.projects
                                                                        ?.filter(p => p.isActive !== false && p.isParent !== true && p.isParent !== 1)
                                                                        ?.filter(p => budFilter === 'all' || p.budId === budFilter || p.bud_id === budFilter) || [];
                                                                    const allIds = filteredProjects.map(p => p.id);
                                                                    const allSelected = allIds.length > 0 && allIds.every(id => editAssignmentData.projectIds.includes(id));
                                                                    return allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
                                                                })()}
                                                            </button>
                                                        </div>
                                                        {/* BUD Filter Dropdown - aligned like Job Types box */}
                                                        <select
                                                            value={budFilter}
                                                            onChange={(e) => setBudFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                                            className="w-full text-sm border border-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                        >
                                                            <option value="all">ทุก BUD</option>
                                                            {masterData.buds?.filter(b => {
                                                                if (b.isActive === false) return false;
                                                                const projectCount = masterData.projects?.filter(p =>
                                                                    (p.budId === b.id || p.bud_id === b.id) &&
                                                                    p.isActive !== false &&
                                                                    p.isParent !== true &&
                                                                    p.isParent !== 1
                                                                ).length || 0;
                                                                return projectCount > 0;  // Only show BUDs with projects
                                                            }).map(bud => {
                                                                const projectCount = masterData.projects?.filter(p =>
                                                                    (p.budId === bud.id || p.bud_id === bud.id) &&
                                                                    p.isActive !== false &&
                                                                    p.isParent !== true &&
                                                                    p.isParent !== 1
                                                                ).length || 0;
                                                                return (
                                                                    <option key={bud.id} value={bud.id}>
                                                                        {bud.name} ({projectCount} โครงการ)
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                    {/* Project List (filtered by BUD, exclude parent projects) */}
                                                    <div className="border border-gray-400 shadow-sm rounded-lg h-96 overflow-y-auto bg-white">
                                                        {(() => {
                                                            const filteredProjects = masterData.projects
                                                                ?.filter(p => p.isActive !== false)
                                                                ?.filter(p => p.isParent !== true && p.isParent !== 1) // ✅ Exclude parent/group projects
                                                                ?.filter(p => budFilter === 'all' || p.budId === budFilter || p.bud_id === budFilter) || [];

                                                            return filteredProjects.length > 0 ? filteredProjects.map(p => {
                                                                const isSelected = editAssignmentData.projectIds.includes(p.id);
                                                                return (
                                                                    <label
                                                                        key={p.id}
                                                                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''
                                                                            }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                const newIds = e.target.checked
                                                                                    ? [...editAssignmentData.projectIds, p.id]
                                                                                    : editAssignmentData.projectIds.filter(x => x !== p.id);
                                                                                setEditAssignmentData({ ...editAssignmentData, projectIds: newIds });
                                                                            }}
                                                                        />
                                                                        <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                                                                            {p.name}
                                                                            <span className="ml-1.5 text-xs text-gray-500">({p.code})</span>
                                                                        </span>
                                                                    </label>
                                                                );
                                                            }) : (
                                                                <div className="text-sm text-gray-400 px-4 py-6 text-center">
                                                                    {budFilter === 'all' ? 'ไม่มีโครงการ' : 'ไม่มีโครงการใน BUD นี้'}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="mt-2 px-1 text-xs text-gray-600">
                                                        เลือกแล้ว: <span className="font-medium text-gray-900">{editAssignmentData.projectIds?.length || 0}</span> โครงการ
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* ----------------------------------------------------- */}


                                {/* Department Manager Assignment (New) */
                                    (() => {
                                        // Filter Logic: Show only departments in same BUD
                                        const selectedUserDeptId = editModal.user.departmentId;
                                        const selectedDeptObj = departmentMap.get(selectedUserDeptId);
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

                                                <div className="p-3 border border-gray-400 rounded-lg bg-gray-50 space-y-2">
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
                                                                    ? ` (⚠️ ปัจจุบัน: ${dept.manager.firstName || dept.manager.first_name})`
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


                                <div className="flex items-center gap-3 p-3 mt-4 border border-gray-400 rounded-lg bg-gray-50">
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
                            <div className="p-6 border-b border-gray-400 bg-gradient-to-r from-green-50 to-green-100 sticky top-0">
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

                                {/* ✨ Show filtered scope indicator or error */}
                                {approveModal.filteredScopes && (
                                    <>
                                        {/* Error: No Department */}
                                        {approveModal.filteredScopes._filterError === 'NO_DEPARTMENT' && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs text-red-700">
                                                    ⚠️ <strong>ไม่พบแผนก:</strong> {approveModal.filteredScopes._filterMessage}
                                                    <br />
                                                    <span className="text-red-500">กำลังแสดงโครงการทั้งหมด</span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Error: No BUD */}
                                        {approveModal.filteredScopes._filterError === 'NO_BUD' && (
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-xs text-yellow-700">
                                                    ⚠️ <strong>ไม่พบฝ่าย:</strong> {approveModal.filteredScopes._filterMessage}
                                                    <br />
                                                    <span className="text-yellow-600">กำลังแสดงโครงการทั้งหมด</span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Success: Filter Applied */}
                                        {approveModal.filteredScopes._filterApplied && (
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-xs text-blue-700">
                                                    💡 <strong>กรองโครงการแล้ว:</strong> แสดงเฉพาะโครงการในฝ่าย{' '}
                                                    <strong>{approveModal.filteredScopes._budName || 'ไม่ระบุ'}</strong>
                                                    {' '}({approveModal.filteredScopes.projects?.length || 0} โครงการ)
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Scope Configuration - Multi-Role Component */}
                                {approvalData.roles.length > 0 && (
                                    <ScopeConfigPanel
                                        selectedRoles={approvalData.roles}
                                        roleConfigs={approvalRoleConfigs}
                                        onConfigChange={setApprovalRoleConfigs}
                                        availableScopes={{
                                            projects: masterData.projects || [],
                                            buds: masterData.buds || [],
                                            tenants: masterData.tenants || []
                                        }}
                                        loading={scopesLoading}
                                    />
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
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
                            <div className="p-6 border-b border-gray-400 bg-gradient-to-r from-red-50 to-red-100">
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

                            <div className="p-6 border-t border-gray-400 bg-gray-50 flex justify-end gap-3">
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
