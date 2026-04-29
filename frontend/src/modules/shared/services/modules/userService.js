
import httpClient from '../httpClient';
import { normalizeRoleName } from '@shared/utils/permission.utils';

export const userService = {
    // --- Users CRUD ---
    /**
     * ดึงรายการ User ทั้งหมดผ่าน Backend API
     * ใช้ Backend API เพื่อ:
     * - รวมสิทธิ์และ tenant context ไว้ที่ server
     * - รวม Business Logic ไว้ที่ Backend
     * - ง่ายต่อการย้าย Database ในอนาคต
     */
    getUsers: async () => {
        try {
            // 1. Fetch Users via Backend API
            const response = await httpClient.get('/users?limit=1000');

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch users');
            }

            const result = response.data.data;
            const usersData = Array.isArray(result) ? result : result.data;

            // 2. Map to Frontend format directly using data from backend join
            return usersData.map(u => {
                const firstName = u.firstName || '';
                const lastName = u.lastName || '';

                // Map assigned scopes by type using scope_name directly
                const assignedScopes = {
                    tenants: [],
                    buds: [],
                    projects: []
                };

                // FIX: Use camelCase 'scopeAssignments' as returned by Backend (Prisma)
                const scopes = u.scopeAssignments || u.scope_assignments || [];

                scopes.forEach(s => {
                    // Use scopeName/scopeId (camelCase from Prisma) or fallback to snake_case if mixed
                    const scopeId = s.scopeId || s.scope_id;
                    const scopeName = s.scopeName || s.scope_name || `ID: ${scopeId}`;
                    const scopeLevel = s.scopeLevel || s.scope_level;

                    const scopeObj = {
                        id: scopeId,
                        name: scopeName,
                        code: ''
                    };

                    if (scopeLevel === 'tenant') {
                        assignedScopes.tenants.push(scopeObj);
                    } else if (scopeLevel === 'bud') {
                        assignedScopes.buds.push(scopeObj);
                    } else if (scopeLevel === 'project') {
                        assignedScopes.projects.push(scopeObj);
                    }
                });

                // Deduplicate
                assignedScopes.tenants = [...new Map(assignedScopes.tenants.map(item => [item.id, item])).values()];
                assignedScopes.buds = [...new Map(assignedScopes.buds.map(item => [item.id, item])).values()];
                assignedScopes.projects = [...new Map(assignedScopes.projects.map(item => [item.id, item])).values()];

                // Legacy support
                const assignedProjects = assignedScopes.projects;

                // Correctly map roles to objects expected by permission.utils.js
                // Each role should have its own scopes based on roleType in scopeAssignments
                const userRoles = (u.userRoles || []).map(r => {
                    const roleName = normalizeRoleName(r.roleName);

                    // Filter scopes that belong to this role
                    const roleScopes = scopes.filter(s => {
                        const sRoleType = normalizeRoleName(s.roleType || s.role_type);
                        return sRoleType === roleName;
                    }).map(s => ({
                        level: s.scopeLevel || s.scope_level,
                        scopeId: s.scopeId || s.scope_id,
                        scopeName: s.scopeName || s.scope_name || `ID: ${s.scopeId || s.scope_id}`
                    }));

                    return {
                        name: roleName,
                        isActive: true,
                        scopes: roleScopes
                    };
                });

                return {
                    id: u.id,
                    firstName: firstName,
                    lastName: lastName,
                    name: `${firstName} ${lastName}`.trim() || u.email,
                    
                    email: u.email,
                    roles: userRoles, // Return complete role objects with scopes
                    role: normalizeRoleName(u.userRoles?.[0]?.roleName) || null,
                    avatar: u.avatarUrl,
                    isActive: u.isActive,
                    tenantId: u.tenantId,
                    title: u.title,
                    phone: u.phone,
                    department: u.department,
                    departmentId: u.department?.id,
                    managedDepartments: u.managedDepartments || [], // Add this field for Manager Badge
                    assignedProjects: assignedProjects,
                    assignedScopes: assignedScopes
                };
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    /**
     * ดึงรายชื่อ User สำหรับหน้า Login (Mock Mode)
     * เรียกผ่าน API Server (Public endpoint)
     */
    getMockUsers: async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${API_URL}/auth/mock-users`);

            if (!response.ok) throw new Error('Failed to fetch mock users');

            return await response.json();
        } catch (error) {
            console.error('Error fetching mock users:', error);
            return [];
        }
    },

    /**
     * เข้าสู่ระบบ (Real Authentication)
     * @param {Object} credentials - { email, password, tenantId }
     */
    login: async (credentials) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password,
                    tenantId: credentials.tenantId || 1 // Default tenant
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // For now, return the user object as expected by authStore
            return {
                ...data.data.user,
                token: data.data.token // Attach token for authStore/interceptors to use
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Demo Login - Authenticate via UserId (No Password)
     * Calls specialized endpoint to get Valid JWT Token
     */
    loginDemo: async (userId) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${API_URL}/auth/login-demo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Demo Login failed');
            }

            return {
                ...data.data.user,
                token: data.data.token
            };
        } catch (error) {
            console.error('Demo Login error:', error);
            throw error;
        }
    },

    getCurrentUser: async () => {
        const response = await httpClient.get('/auth/me');
        if (!response.data?.success) return null;
        return response.data.data;
    },

    createUser: async (userData) => {
        const response = await httpClient.post('/users', userData);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to create user');
        }
        return response.data.data;
    },

    updateUser: async (id, userData) => {
        const response = await httpClient.put(`/users/${id}`, userData);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to update user');
        }
        return response.data.data;
    },

    deleteUser: async (id) => {
        const response = await httpClient.delete(`/users/${id}`);
        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to delete user');
        }
        return response.data;
    },

    // --- User Registration Requests ---

    /**
     * ส่งคำขอสมัครใช้งาน (Self-Service Registration)
     */
    submitRegistration: async (registrationData) => {
        const response = await httpClient.post('/users/registrations', {
            title: registrationData.title,
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            email: registrationData.email,
            phone: registrationData.phone,
            department: registrationData.department,
            position: registrationData.position,
            tenantId: registrationData.tenantId || 1
        });
        if (!response.data.success) {
            throw new Error(response.data.message || 'ไม่สามารถส่งคำขอสมัครได้');
        }
        return response.data.data;
    },

    /**
     * ดึงรายการคำขอสมัครที่รอการอนุมัติ
     * @param {string} status - 'pending', 'approved', 'rejected', หรือ 'all'
     * @returns {Promise<Array>} รายการคำขอสมัคร
     */
    getPendingRegistrations: async (status = 'pending') => {
        try {
            console.log('[userService] Fetching pending registrations with status:', status);

            // Use Backend API to keep tenant and permission context on the server
            const response = await httpClient.get(`/users/registrations/pending`, {
                params: { status }
            });

            if (!response.data.success) {
                console.warn('[userService] getPendingRegistrations failed:', response.data.message);
                return [];
            }

            const registrationsData = response.data.data || [];
            console.log('[userService] Fetched registrations:', registrationsData.length);

            return registrationsData;
        } catch (error) {
            console.error('[userService] Error fetching pending registrations:', error);
            throw error;
        }
    },

    /**
     * อนุมัติคำขอสมัครและสร้างผู้ใช้ใหม่
     * @param {number} registrationId - ID ของคำขอสมัคร
     * @param {number} adminUserId - ID ของ Admin ที่อนุมัติ
     */
    approveRegistration: async (registrationId, adminUserId) => {
        throw new Error('Use adminService.approveRegistration() with role and temporary password payload.');
    },

    /**
     * ปฏิเสธคำขอสมัคร พร้อมเหตุผล
     * @param {number} registrationId - ID ของคำขอสมัคร
     * @param {string} reason - เหตุผลการปฏิเสธ
     * @param {number} adminUserId - ID ของ Admin ที่ปฏิเสธ
     */
    rejectRegistration: async (registrationId, reason, adminUserId) => {
        try {
            console.log('[userService] Calling POST /v2/admin/reject-registration');
            
            // Use Backend API to reject registration
            const response = await httpClient.post(`/v2/admin/reject-registration`, {
                registrationRequestId: registrationId,
                reason: reason || 'Registration rejected by admin'
            });

            if (!response.data.success) {
                console.error('[userService] Reject failed:', response.data.message);
                throw new Error(response.data.message || 'Failed to reject registration');
            }

            console.log('[userService] Registration rejected:', response.data.data);
            return response.data;
        } catch (error) {
            console.error('[userService] rejectRegistration error:', error);
            throw error;
        }
    },

    sendApprovalEmail: async (email, firstName) => {
        try {
            console.log(`📧 ส่ง Email อนุมัติไปยัง ${email}`);
            // TODO: Implement actual email sending
        } catch (error) {
            console.error('Error sending approval email:', error);
        }
    },

    sendRejectionEmail: async (email, firstName, reason) => {
        try {
            console.log(`📧 ส่ง Email ปฏิเสธไปยัง ${email}: ${reason}`);
            // TODO: Implement actual email sending
        } catch (error) {
            console.error('Error sending rejection email:', error);
        }
    },

    // --- Role & Scope Assignment ---

    assignUserRoles: async (userId, tenantId, roles, assignedBy) => {
        try {
            const response = await httpClient.post(`/users/${userId}/roles`, { roles });
            if (!response.data?.success) throw new Error(response.data?.message || 'Failed to assign user roles');
            return response.data.data;
        } catch (error) {
            console.error('Error assigning user roles:', error);
            throw error;
        }
    },

    assignUserScope: async (userId, tenantId, scopeLevel, scopeId, scopeName, roleType, assignedBy) => {
        throw new Error('Use /users/:id/roles through adminService.saveUserRoles() to update scopes.');
    },

    assignUserScopes: async (userId, tenantId, scopeAssignments, assignedBy) => {
        throw new Error('Use /users/:id/roles through adminService.saveUserRoles() to update scopes.');
    },

    getUserScopes: async (userId) => {
        try {
            const response = await httpClient.get(`/users/${userId}/roles`);
            const roles = response.data?.data?.roles || [];
            return roles.flatMap(role => (role.scopes || []).map(scope => ({
                user_id: userId,
                scope_id: scope.scopeId,
                scope_level: scope.level,
                scope_name: scope.scopeName,
                role_type: role.name
            })));
        } catch (error) {
            console.error('Error getting user scopes:', error);
            throw error;
        }
    },

    updateUserScopes: async (userId, tenantId, scopeAssignments, assignedBy) => {
        throw new Error('Use /users/:id/roles through adminService.saveUserRoles() to update scopes.');
    },

    // --- Password Management ---

    requestPasswordReset: async (email) => {
        const response = await httpClient.post('/v2/auth/forgot-password', { email });
        if (!response.data?.success) throw new Error(response.data?.message || 'Failed to request password reset');
        return response.data;
    },

    resetPasswordWithOTP: async (email, otp, newPassword) => {
        throw new Error('OTP reset flow was replaced by token-based reset-password API.');
    },

    changePassword: async (currentPassword, newPassword) => {
        try {
            const response = await httpClient.post('/v2/auth/change-password', {
                currentPassword,
                newPassword,
            });

            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to change password');
            }

            return response.data;
        } catch (error) {
            console.error('[userService] changePassword error:', error);
            throw new Error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to change password'
            );
        }
    },

    // --- Demo Mode Helper ---

    /**
     * ดึงข้อมูลผู้ใช้สำหรับ Demo Mode ตามบทบาท (Legacy - ใช้ Mock Data)
     * @param {string} role - 'requester', 'approver', 'assignee', 'admin'
     * @deprecated ใช้ impersonate() แทน
     */
    getUserByRole: async (role) => {
        // Map role to specific demo user IDs (from users.json SEED)
        const demoUserMap = {
            'requester': 2,  // Somying (Marketing)
            'approver': 4,   // Wipa (Approver)
            'assignee': 5,   // Karn (Graphic)
            'admin': 1       // Admin System
        };

        const userId = demoUserMap[role] || 2;

        // Fetch full user details
        return await userService.getUserWithRoles(userId);
    },

    /**
     * ดึงข้อมูลผู้ใช้ปัจจุบันจาก Token (API Server)
     */
    getMe: async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('token');

            if (!token) return { success: false };

            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token} `
                }
            });

            const data = await response.json();
            if (!response.ok) return { success: false, error: data.message };

            return data; // { success: true, data: user }
        } catch (error) {
            console.error('getMe error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Admin Impersonation - สลับไปเป็น User จริงตาม Role (Real Data)
     * @param {string} role - 'requester', 'approver', 'assignee', 'admin'
     * @returns {Promise<{user: Object, token: string}>} User data และ JWT token ใหม่
     * 
     * Security: ต้องเป็น Admin เท่านั้นถึงจะใช้ได้ (Backend จะตรวจสอบ)
     */
    impersonate: async (role) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

            // ดึง token จาก Zustand persist storage หรือ localStorage
            let token = localStorage.getItem('token');

            // ถ้าไม่มีใน localStorage ให้ลองดึงจาก Zustand persist storage (dj-auth-storage)
            if (!token) {
                try {
                    const authStorage = localStorage.getItem('dj-auth-storage');
                    if (authStorage) {
                        const parsed = JSON.parse(authStorage);
                        token = parsed?.state?.user?.token || parsed?.state?.session?.access_token;
                    }
                } catch (e) {
                    console.warn('Could not parse auth storage:', e);
                }
            }

            if (!token) {
                throw new Error('ไม่พบ Token - กรุณาเข้าสู่ระบบใหม่');
            }

            const response = await fetch(`${API_URL}/auth/impersonate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify({ role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `ไม่สามารถสลับเป็น ${role} ได้`);
            }

            // Return user และ token ใหม่
            return {
                user: data.data.user,
                token: data.data.token,
                impersonatedBy: data.data.impersonatedBy
            };
        } catch (error) {
            console.error('Impersonate error:', error);
            throw error;
        }
    },

    /**
     * แก้ไขโปรไฟล์ตัวเอง (self-service)
     * @param {{ firstName?: string, lastName?: string, displayName?: string, phone?: string }} profileData
     * @returns {Promise<Object>}
     */
    updateMyProfile: async (profileData) => {
        try {
            const response = await httpClient.put('/users/me/profile', profileData);
            if (!response.data.success) {
                throw new Error(response.data.message || 'อัปเดตโปรไฟล์ไม่สำเร็จ');
            }
            return response.data;
        } catch (error) {
            console.error('[userService] updateMyProfile error:', error);
            throw error;
        }
    }
};
