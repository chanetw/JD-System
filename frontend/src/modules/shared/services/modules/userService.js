
import { supabase } from '../supabaseClient';
import { handleResponse, generateOTP } from '../utils';

export const userService = {
    // --- Users CRUD ---
    getUsers: async () => {
        const data = handleResponse(
            await supabase.from('users').select('*').order('id')
        );
        return data.map(u => {
            const firstName = u.first_name || '';
            const lastName = u.last_name || '';
            // Fix: Add name property which is used by UserManagement and others
            return {
                id: u.id,
                firstName: firstName,
                lastName: lastName,
                name: `${firstName} ${lastName}`.trim() || u.email, // Fallback to email if empty
                displayName: u.display_name || `${firstName} ${lastName}`.trim(),
                email: u.email,
                roles: [u.role], // Mock uses array
                role: u.role,
                avatar: u.avatar_url,
                isActive: u.is_active,
                tenantId: u.tenant_id
            };
        });
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

        console.log(`[DEV] OTP for ${email}: ${otp}`);
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
    }
};
