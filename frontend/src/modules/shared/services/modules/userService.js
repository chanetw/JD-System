
import { supabase } from '../supabaseClient';
import { handleResponse, generateOTP } from '../utils';
import httpClient from '../httpClient';

export const userService = {
    // --- Users CRUD ---
    /**
     * ดึงรายการ User ทั้งหมดผ่าน Backend API
     * ใช้ Backend API แทน Supabase โดยตรงเพื่อ:
     * - Bypass RLS (Backend ใช้ service role)
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

                return {
                    id: u.id,
                    firstName: firstName,
                    lastName: lastName,
                    name: `${firstName} ${lastName}`.trim() || u.email,
                    displayName: u.displayName || `${firstName} ${lastName}`.trim(),
                    email: u.email,
                    roles: (u.userRoles || []).map(r => r.roleName),
                    role: u.userRoles?.[0]?.roleName || null,
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
     * เรียกผ่าน API Server (Public endpoint) แทนการเรียก Supabase โดยตรง (ติด RLS)
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

            // Store token if needed (though authStore handles session via Supabase usually, 
            // but here we are using custom auth endpoint. 
            // Ideally we should sync with Supabase Auth or just use the token returned)

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
        // For now, return hardcoded user ID 1 (Requester) or 2 (Approver) for testing
        // Or fetch dynamic if we had Auth context.
        // Mimic mockApi returning ID 1 ("Worawut")
        const { data } = await supabase.from('users').select('*').eq('id', 1).single();
        if (!data) return null;
        return {
            id: data.id,
            displayName: data.display_name,
            role: data.role,
            email: data.email,
            avatar: data.avatar_url
        };
    },

    createUser: async (userData) => {
        const payload = {
            tenant_id: userData.tenantId || 1,
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            display_name: userData.displayName || `${userData.firstName} ${userData.lastName}`,
            role: userData.role,
            is_active: true
        };
        const { data, error } = await supabase.from('users').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateUser: async (id, userData) => {
        const payload = {
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            display_name: userData.displayName,
            role: userData.role
        };
        const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteUser: async (id) => {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- User Registration Requests ---

    /**
     * ส่งคำขอสมัครใช้งาน (Self-Service Registration)
     */
    submitRegistration: async (registrationData) => {
        const { data, error } = await supabase
            .from('user_registration_requests')
            .insert({
                title: registrationData.title,
                first_name: registrationData.firstName,
                last_name: registrationData.lastName,
                email: registrationData.email,
                phone: registrationData.phone,
                department: registrationData.department,
                position: registrationData.position,
                reason: registrationData.reason,
                status: 'pending',
                tenant_id: 1 // Default tenant
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('อีเมลนี้มีการลงทะเบียนแล้ว');
            }
            throw error;
        }
        return data;
    },

    /**
     * ดึงรายการคำขอสมัครที่รอการอนุมัติ
     * @param {string} status - 'pending', 'approved', 'rejected', หรือ 'all'
     * @returns {Promise<Array>} รายการคำขอสมัคร
     */
    getPendingRegistrations: async (status = 'all') => {
        try {
            let query = supabase
                .from('user_registration_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (status !== 'all') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(req => ({
                id: req.id,
                email: req.email,
                title: req.title,
                firstName: req.first_name,
                lastName: req.last_name,
                phone: req.phone,
                department: req.department,
                position: req.position,
                status: req.status,
                createdAt: req.created_at,
                approvedBy: req.approved_by,
                rejectionReason: req.rejected_reason
            }));
        } catch (error) {
            console.error('Error fetching pending registrations:', error);
            throw error;
        }
    },

    /**
     * อนุมัติคำขอสมัครและสร้างผู้ใช้ใหม่
     * @param {number} registrationId - ID ของคำขอสมัคร
     * @param {number} adminUserId - ID ของ Admin ที่อนุมัติ
     */
    approveRegistration: async (registrationId, adminUserId) => {
        try {
            // 1. ดึงข้อมูลคำขอสมัคร
            const { data: registrationData, error: fetchError } = await supabase
                .from('user_registration_requests')
                .select('*')
                .eq('id', registrationId)
                .single();

            if (fetchError) throw fetchError;

            // 2. สร้างผู้ใช้ใหม่
            const newUser = {
                tenant_id: 1, // Default tenant
                email: registrationData.email,
                password_hash: 'temporary_hash', // TODO: สร้างรหัสผ่านจริง
                first_name: registrationData.first_name,
                last_name: registrationData.last_name,
                display_name: `${registrationData.first_name} ${registrationData.last_name}`,
                title: registrationData.title,
                phone: registrationData.phone,
                role: 'requester', // Default role for now, can be updated later via roles assignment
                must_change_password: true,
                is_active: true
            };

            const { data: userData, error: createUserError } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (createUserError) throw createUserError;

            // 3. อัปเดตสถานะคำขอสมัคร
            const { error: updateError } = await supabase
                .from('user_registration_requests')
                .update({
                    status: 'approved',
                    approved_by: adminUserId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', registrationId);

            if (updateError) throw updateError;

            // 4. ส่ง Email แจ้งการอนุมัติ
            await userService.sendApprovalEmail(registrationData.email, registrationData.first_name);

            return userData;
        } catch (error) {
            console.error('Error approving registration:', error);
            throw error;
        }
    },

    /**
     * ปฏิเสธคำขอสมัคร พร้อมเหตุผล
     * @param {number} registrationId - ID ของคำขอสมัคร
     * @param {string} reason - เหตุผลการปฏิเสธ
     * @param {number} adminUserId - ID ของ Admin ที่ปฏิเสธ
     */
    rejectRegistration: async (registrationId, reason, adminUserId) => {
        try {
            // 1. ดึงข้อมูลคำขอสมัคร
            const { data: registrationData, error: fetchError } = await supabase
                .from('user_registration_requests')
                .select('*')
                .eq('id', registrationId)
                .single();

            if (fetchError) throw fetchError;

            // 2. อัปเดตสถานะเป็น rejected
            const { error: updateError } = await supabase
                .from('user_registration_requests')
                .update({
                    status: 'rejected',
                    rejected_reason: reason,
                    approved_by: adminUserId, // ใช้ approved_by เพื่อบันทึกใครปฏิเสธ
                    updated_at: new Date().toISOString()
                })
                .eq('id', registrationId);

            if (updateError) throw updateError;

            // 3. ส่ง Email แจ้งการปฏิเสธ
            await userService.sendRejectionEmail(
                registrationData.email,
                registrationData.first_name,
                reason
            );
        } catch (error) {
            console.error('Error rejecting registration:', error);
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
            const roleRecords = roles.map(roleName => ({
                user_id: userId,
                tenant_id: tenantId,
                role_name: roleName,
                assigned_by: assignedBy,
                is_active: true
            }));

            const { data, error } = await supabase
                .from('user_roles')
                .insert(roleRecords)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error assigning user roles:', error);
            throw error;
        }
    },

    assignUserScope: async (userId, tenantId, scopeLevel, scopeId, scopeName, roleType, assignedBy) => {
        try {
            const { data, error } = await supabase
                .from('user_scope_assignments')
                .insert([{
                    user_id: userId,
                    tenant_id: tenantId,
                    scope_level: scopeLevel,
                    scope_id: scopeId || null,
                    scope_name: scopeName,
                    role_type: roleType,
                    assigned_by: assignedBy,
                    is_active: true
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error assigning user scope:', error);
            throw error;
        }
    },

    assignUserScopes: async (userId, tenantId, scopeAssignments, assignedBy) => {
        try {
            const records = scopeAssignments.map(assignment => ({
                user_id: userId,
                tenant_id: tenantId,
                scope_level: assignment.scopeLevel,
                scope_id: assignment.scopeId || null,
                scope_name: assignment.scopeName,
                role_type: assignment.roleType,
                assigned_by: assignedBy,
                is_active: true
            }));

            const { data, error } = await supabase
                .from('user_scope_assignments')
                .insert(records)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error assigning user scopes:', error);
            throw error;
        }
    },

    getUserScopes: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_scope_assignments')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user scopes:', error);
            throw error;
        }
    },

    updateUserScopes: async (userId, tenantId, scopeAssignments, assignedBy) => {
        try {
            // 1. Deactivate or Delete old scopes
            // For simplicity, we'll delete old active assignments for this user
            const { error: deleteError } = await supabase
                .from('user_scope_assignments')
                .delete()
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            // 2. Insert new scopes
            if (scopeAssignments.length > 0) {
                return await userService.assignUserScopes(userId, tenantId, scopeAssignments, assignedBy);
            }
            return [];
        } catch (error) {
            console.error('Error updating user scopes:', error);
            throw error;
        }
    },

    // --- Password Management ---

    requestPasswordReset: async (email) => {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .eq('is_active', true)
            .single();

        if (userError || !user) {
            throw new Error('ไม่พบอีเมลนี้ในระบบ');
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const { error } = await supabase
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token: otp,
                expires_at: expiresAt.toISOString(),
                is_used: false
            });

        if (error) throw error;

        console.log(`[DEV] OTP for ${email}: ${otp} `);
        return { success: true, message: 'OTP sent to email' };
    },

    resetPasswordWithOTP: async (email, otp, newPassword) => {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userError || !user) throw new Error('ไม่พบผู้ใช้');

        const { data: token, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('user_id', user.id)
            .eq('token', otp)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (tokenError || !token) throw new Error('OTP ไม่ถูกต้องหรือหมดอายุแล้ว');

        await supabase
            .from('password_reset_tokens')
            .update({ is_used: true })
            .eq('id', token.id);

        await supabase
            .from('users')
            .update({ must_change_password: false })
            .eq('id', user.id);

        return { success: true };
    },

    changePassword: async (currentPassword, newPassword) => {
        console.log('[DEV] Password changed');
        return { success: true };
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
    }
};
