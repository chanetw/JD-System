import { supabase } from '../supabaseClient';
import { handleResponse } from '../utils';
import api from '../apiService';

export const adminService = {
    // --- Master Data (Organization) ---
    getMasterData: async () => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            const response = await api.get('/master-data');

            if (!response.data.success) {
                console.warn('[adminService] Get master data failed:', response.data.message);
                return { tenants: [], buds: [], projects: [], jobTypes: [] };
            }

            return response.data.data;

        } catch (error) {
            console.error('[adminService] getMasterData error:', error);
            return { tenants: [], buds: [], projects: [], jobTypes: [] };
        }
    },

    getTenants: async () => {
        const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true).order('id');
        if (error) throw error;
        return data.map(t => ({ ...t, isActive: t.is_active }));
    },

    createTenant: async (tenantData) => {
        const payload = { ...tenantData, is_active: true };
        const { data, error } = await supabase.from('tenants').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateTenant: async (id, tenantData) => {
        const payload = { ...tenantData, is_active: tenantData.isActive };
        const { data, error } = await supabase.from('tenants').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteTenant: async (id) => {
        const { error } = await supabase.from('tenants').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    getBUDs: async () => {
        const { data, error } = await supabase.from('buds').select('*').eq('is_active', true).order('id');
        if (error) throw error;
        return data.map(b => ({ ...b, tenantId: b.tenant_id, isActive: b.is_active }));
    },

    createBUD: async (budData) => {
        const payload = {
            tenant_id: budData.tenantId || 1,
            name: budData.name,
            code: budData.code,
            is_active: true
        };
        const { data, error } = await supabase.from('buds').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateBUD: async (id, budData) => {
        const payload = {
            name: budData.name,
            code: budData.code,
            is_active: budData.isActive
        };
        const { data, error } = await supabase.from('buds').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteBUD: async (id) => {
        const { error } = await supabase.from('buds').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    getProjects: async () => {
        const data = handleResponse(
            await supabase.from('projects')
                .select(`*, bud:buds(name), department:departments(name), tenant:tenants(name)`)
                .eq('is_active', true)
                .order('id')
        );
        return data.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            budId: p.bud_id,
            budName: p.bud?.name,
            departmentId: p.department_id,
            departmentName: p.department?.name,
            tenantId: p.tenant_id,
            tenantName: p.tenant?.name,
            status: p.is_active ? 'active' : 'inactive'
        }));
    },

    createProject: async (projectData) => {
        const payload = {
            tenant_id: projectData.tenantId || 1,
            bud_id: projectData.budId,
            name: projectData.name,
            code: projectData.code,
            is_active: true
        };
        const { data, error } = await supabase.from('projects').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateProject: async (id, projectData) => {
        const payload = {
            name: projectData.name,
            code: projectData.code,
            bud_id: projectData.budId,
            tenant_id: projectData.tenantId,
            is_active: projectData.status === 'Active'
        };
        const { data, error } = await supabase.from('projects').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteProject: async (id) => {
        const { error } = await supabase.from('projects').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    getDepartments: async () => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            const response = await api.get('/departments');

            if (!response.data.success) {
                console.warn('[adminService] Get departments failed:', response.data.message);
                return [];
            }

            return response.data.data;

        } catch (error) {
            console.error('[adminService] getDepartments error:', error);
            return [];
        }
    },

    createDepartment: async (deptData) => {
        const payload = {
            tenant_id: 1,
            bud_id: deptData.budId,
            name: deptData.name,
            code: deptData.code,
            manager_id: deptData.managerId || null,
            is_active: true
        };
        const { data, error } = await supabase.from('departments').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateDepartment: async (id, deptData) => {
        const payload = {
            name: deptData.name,
            code: deptData.code,
            bud_id: deptData.budId,
            manager_id: deptData.managerId || null,
            is_active: deptData.isActive
        };
        const { data, error } = await supabase.from('departments').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteDepartment: async (id) => {
        const { error } = await supabase.from('departments').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- Job Types ---
    getJobTypes: async () => {
        const { data, error } = await supabase
            .from('job_types')
            .select(`*, items:job_type_items(*)`)
            .order('id');
        if (error) throw error;
        return (data || []).map(jt => ({ // Safe map
            id: jt.id,
            name: jt.name,
            description: jt.description,
            sla: jt.sla_days,
            icon: jt.icon,
            attachments: jt.attachments || [],
            status: jt.is_active ? 'active' : 'inactive',
            items: (jt.items || []).map(i => ({ // Safe items map
                id: i.id,
                name: i.name,
                defaultSize: i.default_size,
                isRequired: i.is_required
            }))
        }));
    },

    createJobType: async (jobTypeData) => {
        const payload = {
            tenant_id: 1,
            name: jobTypeData.name,
            description: jobTypeData.description,
            sla_days: jobTypeData.sla || 3,
            icon: jobTypeData.icon,
            attachments: jobTypeData.attachments,
            is_active: jobTypeData.status !== 'inactive'
        };
        const { data, error } = await supabase.from('job_types').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateJobType: async (id, jobTypeData) => {
        const payload = {
            name: jobTypeData.name,
            description: jobTypeData.description,
            sla_days: jobTypeData.sla,
            icon: jobTypeData.icon,
            attachments: jobTypeData.attachments,
            is_active: jobTypeData.status === 'active'
        };
        const { data, error } = await supabase.from('job_types').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteJobType: async (id) => {
        const { error } = await supabase.from('job_types').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- Job Type Items ---
    getJobTypeItems: async (jobTypeId) => {
        let query = supabase.from('job_type_items').select('*');
        if (jobTypeId) query = query.eq('job_type_id', jobTypeId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(i => ({
            id: i.id,
            jobTypeId: i.job_type_id,
            name: i.name,
            defaultSize: i.default_size,
            isRequired: i.is_required
        }));
    },

    createJobTypeItem: async (itemData) => {
        const payload = {
            job_type_id: itemData.jobTypeId,
            name: itemData.name,
            default_size: itemData.defaultSize,
            is_required: itemData.isRequired || false
        };
        const { data, error } = await supabase.from('job_type_items').insert([payload]).select().single();
        if (error) throw error;
        return {
            id: data.id,
            jobTypeId: data.job_type_id,
            name: data.name,
            defaultSize: data.default_size,
            isRequired: data.is_required
        };
    },

    updateJobTypeItem: async (id, itemData) => {
        const payload = {
            name: itemData.name,
            default_size: itemData.defaultSize,
            is_required: itemData.isRequired
        };
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
        const { data, error } = await supabase.from('job_type_items').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return {
            id: data.id,
            jobTypeId: data.job_type_id,
            name: data.name,
            defaultSize: data.default_size,
            isRequired: data.is_required
        };
    },

    deleteJobTypeItem: async (id) => {
        const { error } = await supabase.from('job_type_items').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- Approval Flows ---
    getApprovalFlows: async () => {
        const { data: flows, error } = await supabase.from('approval_flows')
            .select(`*, approver:users!approver_id(*)`)
            .order('level');
        if (error) throw error;

        const grouped = {};
        flows.forEach(f => {
            if (!grouped[f.project_id]) {
                grouped[f.project_id] = {
                    projectId: f.project_id,
                    levels: [],
                    includeTeamLead: f.include_team_lead || false,
                    teamLeadId: f.team_lead_id || null,
                    updatedAt: f.updated_at
                };
            }
            // Update includeTeamLead and teamLeadId if any row has it
            if (f.include_team_lead) {
                grouped[f.project_id].includeTeamLead = true;
            }
            if (f.team_lead_id) {
                grouped[f.project_id].teamLeadId = f.team_lead_id;
            }

            let lvl = grouped[f.project_id].levels.find(l => l.level === f.level);
            if (!lvl) {
                lvl = { level: f.level, approvers: [], logic: 'any' };
                grouped[f.project_id].levels.push(lvl);
            }
            if (f.approver) {
                lvl.approvers.push({
                    id: f.approver.id,
                    userId: f.approver.id,
                    name: f.approver.display_name,
                    role: f.approver.role,
                    avatar: f.approver.avatar_url
                });
            }
        });
        return Object.values(grouped);
    },

    getApprovalFlowByProject: async (projectIdentifier) => {
        let projectId = projectIdentifier;
        if (typeof projectIdentifier === 'string' && isNaN(projectIdentifier)) {
            const allFlows = await adminService.getApprovalFlows(); // Re-use
            // This part is tricky if we depend on 'name'. Safer to enforce ID.
            // But let's skip name resolution logic here to simplify.
        }

        const { data: flows, error } = await supabase.from('approval_flows')
            .select(`*, approver:users!approver_id(*)`)
            .eq('project_id', projectId)
            .order('level');

        if (error || !flows || flows.length === 0) return null;

        const levels = [];
        let includeTeamLead = false;
        let teamLeadId = null;

        flows.forEach(f => {
            // Extract team lead config from any row (typically first row has it)
            if (f.include_team_lead) {
                includeTeamLead = true;
            }
            if (f.team_lead_id) {
                teamLeadId = f.team_lead_id;
            }

            let lvl = levels.find(l => l.level === f.level);
            if (!lvl) {
                lvl = { level: f.level, approvers: [], logic: 'any', role: f.role };
                levels.push(lvl);
            }
            if (f.approver) {
                lvl.approvers.push({
                    id: f.approver.id,
                    name: f.approver.display_name,
                    role: f.approver.role,
                    avatar: f.approver.avatar_url,
                    userId: f.approver.id
                });
            }
        });

        // Resolve default assignee from Matrix
        const assignment = await adminService.getAssigneeByProjectAndJobType(projectId, null);

        return {
            projectId: projectId,
            levels: levels,
            includeTeamLead: includeTeamLead,
            teamLeadId: teamLeadId,
            defaultAssignee: assignment
        };
    },

    saveApprovalFlow: async (projectId, flowData) => {
        // Step 1: Delete old approval flows for this project
        const { error: delErr } = await supabase.from('approval_flows').delete().eq('project_id', projectId);
        if (delErr) throw delErr;

        // Step 2: Insert new approver levels
        const rowsToInsert = [];
        flowData.levels.forEach(lvl => {
            lvl.approvers.forEach(appr => {
                rowsToInsert.push({
                    project_id: projectId,
                    level: lvl.level,
                    approver_id: appr.userId  // ✅ FIX: Changed from appr.id to appr.userId
                });
            });
        });

        if (rowsToInsert.length > 0) {
            const { error: insErr } = await supabase.from('approval_flows').insert(rowsToInsert);
            if (insErr) throw insErr;
        }

        // Step 3: Save team lead config (include_team_lead + team_lead_id)
        if (rowsToInsert.length > 0) {
            // Update the first row with includeTeamLead and teamLeadId config
            const { error: configErr } = await supabase.from('approval_flows')
                .update({
                    include_team_lead: flowData.includeTeamLead || false,
                    team_lead_id: flowData.teamLeadId || null
                })
                .eq('project_id', projectId)
                .limit(1);

            if (configErr) console.warn('Failed to update team lead config:', configErr);
        }

        return { success: true };
    },

    updateApprovalFlow: async (flowId, flowData) => {
        return adminService.saveApprovalFlow(flowData.projectId, flowData);
    },

    createApprovalFlow: async (flowData) => {
        return adminService.saveApprovalFlow(flowData.projectId, flowData);
    },

    // --- Assignment Matrix ---
    getAssignmentMatrix: async (projectId) => {
        const { data, error } = await supabase
            .from('project_job_assignments')
            .select(`
                id,
                project_id,
                job_type_id,
                assignee_id,
                job_types ( id, name ),
                users:assignee_id ( id, first_name, last_name )
            `)
            .eq('project_id', projectId);

        if (error) return [];

        return data.map(item => ({
            id: item.id,
            jobTypeId: item.job_type_id,
            jobTypeName: item.job_types?.name || 'N/A',
            assigneeId: item.assignee_id,
            assigneeName: item.users ?
                [item.users.first_name, item.users.last_name].filter(Boolean).join(' ') :
                'ไม่ระบุ'
        }));
    },

    getAssigneeByProjectAndJobType: async (projectId, jobTypeId) => {
        let query = supabase
            .from('project_job_assignments')
            .select(`assignee_id, users:assignee_id ( id, first_name, last_name )`)
            .eq('project_id', projectId);

        if (jobTypeId) {
            query = query.eq('job_type_id', jobTypeId);
        } else {
            query = query.is('job_type_id', null);
        }

        const { data, error } = await query.single();
        if (error || !data) return null;

        return {
            id: data.assignee_id,
            name: data.users ?
                [data.users.first_name, data.users.last_name].filter(Boolean).join(' ') :
                null
        };
    },

    saveAssignmentMatrix: async (projectId, assignments) => {
        const upsertData = assignments.map(a => ({
            project_id: projectId,
            job_type_id: a.jobTypeId,
            assignee_id: a.assigneeId,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('project_job_assignments')
            .upsert(upsertData, {
                onConflict: 'project_id,job_type_id',
                ignoreDuplicates: false
            });

        if (error) throw error;
        return { success: true };
    },

    /**
     * ดึงวันหยุดทั้งหมด (พร้อมรายละเอียด สำหรับ UI)
     * @param {number} tenantId - รหัส Tenant
     * @returns {Promise<Array>} รายการวันหยุดพร้อม id, name, date, type
     */
    getHolidays: async (tenantId = 1) => {
        try {
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('date', { ascending: true });

            if (error) {
                console.warn('Error fetching holidays:', error.message);
                return [];
            }

            // Return full holiday objects for UI
            return (data || []).map(h => ({
                id: h.id,
                name: h.name,
                date: h.date,
                type: h.type || 'government',
                recurring: h.is_recurring || false,
                isRecurring: h.is_recurring || false
            }));
        } catch (err) {
            console.error('getHolidays error:', err);
            return [];
        }
    },

    /**
     * ดึงเฉพาะ Date objects ของวันหยุด (สำหรับ SLA calculation)
     * @param {number} tenantId - รหัส Tenant
     * @returns {Promise<Array<Date>>} รายการ Date objects
     */
    getHolidayDates: async (tenantId = 1) => {
        try {
            const { data, error } = await supabase
                .from('holidays')
                .select('date')
                .eq('tenant_id', tenantId);

            if (error) {
                console.warn('Error fetching holiday dates:', error.message);
                return [];
            }

            return (data || []).map(h => new Date(h.date));
        } catch (err) {
            console.error('getHolidayDates error:', err);
            return [];
        }
    },

    // Full holiday data with names (for Holiday Calendar UI) - Alias
    getHolidaysWithDetails: async (tenantId = 1) => {
        return adminService.getHolidays(tenantId);
    },

    /**
     * เพิ่มวันหยุดใหม่
     */
    addHoliday: async (holidayData, tenantId = 1) => {
        const payload = {
            tenant_id: tenantId,
            name: holidayData.name,
            date: holidayData.date,
            type: holidayData.type || 'government',
            is_recurring: holidayData.recurring || false
        };

        const { data, error } = await supabase
            .from('holidays')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            date: data.date,
            type: data.type,
            recurring: data.is_recurring
        };
    },

    // Alias for backwards compatibility
    createHoliday: async (holidayData, tenantId = 1) => {
        return adminService.addHoliday(holidayData, tenantId);
    },

    /**
     * แก้ไขวันหยุด
     */
    updateHoliday: async (id, holidayData) => {
        const payload = {
            name: holidayData.name,
            date: holidayData.date,
            type: holidayData.type || 'government',
            is_recurring: holidayData.recurring || false,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('holidays')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            date: data.date,
            type: data.type,
            recurring: data.is_recurring
        };
    },

    deleteHoliday: async (id) => {
        const { error } = await supabase
            .from('holidays')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    },

    // --- Users ---
    getUsers: async () => {
        // Fetch all users with department relation
        const { data, error } = await supabase.from('users')
            .select(`
                id, 
                display_name, 
                email, 
                role, 
                title, 
                phone_number, 
                department_id,
                department:departments!users_department_id_fkey(id, name),
                is_active, 
                avatar_url
            `)
            .order('display_name');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data.map(u => ({
            id: u.id,
            name: u.display_name,
            email: u.email,
            role: u.role,
            title: u.title,
            department: u.department?.name,
            departmentId: u.department_id,
            phone: u.phone_number,
            avatar: u.avatar_url,
            isActive: u.is_active
        }));
    },

    updateUser: async (id, userData) => {
        const payload = {
            phone_number: userData.phone,
            department_id: userData.departmentId,
            role: userData.role,
            is_active: userData.isActive,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ============================================
    // Multi-Role API Functions
    // ============================================

    /**
     * ดึงข้อมูล User พร้อม Roles และ Scopes
     * @param {number} userId - ID ของ user
     * @param {number} tenantId - ID ของ tenant
     * @returns {Promise<Object>} User object พร้อม roles และ scopes
     */
    getUserWithRoles: async (userId, tenantId = 1) => {
        try {
            // ดึงข้อมูล user พื้นฐาน
            const { data: user, error: userError } = await supabase
                .from('users')
                .select(`
                    id, 
                    display_name, 
                    email, 
                    first_name,
                    last_name,
                    role, 
                    title, 
                    phone_number, 
                    department_id,
                    department:departments!users_department_id_fkey(id, name),
                    is_active, 
                    avatar_url,
                    tenant_id
                `)
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!user) return null;

            console.log('[adminService] Raw user from DB:', user); // Debug Log

            // ดึง roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            if (rolesError) {
                console.warn('Error fetching user_roles:', rolesError);
            }

            // ดึง scope assignments
            const { data: scopes, error: scopesError } = await supabase
                .from('user_scope_assignments')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            if (scopesError) {
                console.warn('Error fetching user_scope_assignments:', scopesError);
            }

            // จัด structure ใหม่: group scopes by role
            const rolesWithScopes = (roles || []).map(role => ({
                id: role.id,
                name: role.role_name,
                isActive: role.is_active,
                assignedBy: role.assigned_by,
                assignedAt: role.assigned_at,
                scopes: (scopes || [])
                    .filter(s => s.role_type === role.role_name)
                    .map(s => ({
                        id: s.id,
                        level: s.scope_level?.toLowerCase(),
                        scopeId: s.scope_id,
                        scopeName: s.scope_name
                    }))
            }));

            const result = {
                id: user.id,
                name: user.display_name,
                email: user.email,
                firstName: user.first_name, // Added
                lastName: user.last_name,   // Added
                role: user.role, // Legacy field
                title: user.title,
                department: user.department?.name,
                departmentId: user.department_id,
                phone: user.phone_number,
                avatar: user.avatar_url,
                isActive: user.is_active,
                tenantId: user.tenant_id,
                roles: rolesWithScopes // Multi-role data
            };

            console.log('[adminService] getUserWithRoles Returns:', result); // Debug Log
            return result;
        } catch (err) {
            console.error('getUserWithRoles error:', err);
            throw err;
        }
    },

    /**
     * บันทึก Multiple Roles พร้อม Scopes
     * @param {number} userId - ID ของ user
     * @param {Array} roles - Array ของ roles พร้อม scopes
     * @param {number} assignedBy - ID ของ admin ที่กำหนด
     * @param {number} tenantId - ID ของ tenant
     * @returns {Promise<Object>} ผลลัพธ์การบันทึก
     */
    saveUserRoles: async (userId, roles, assignedBy, tenantId = 1) => {
        console.log('📋 saveUserRoles called with:', { userId, roles, assignedBy, tenantId });
        try {
            // Step 1: ลบ roles และ scopes เก่า
            const deleteResult1 = await supabase
                .from('user_scope_assignments')
                .delete()
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            console.log('✅ Deleted old scope assignments:', deleteResult1);

            const deleteResult2 = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            console.log('✅ Deleted old user roles:', deleteResult2);

            // Step 2: Insert roles ใหม่
            if (roles && roles.length > 0) {
                const roleRows = roles.map(r => ({
                    user_id: userId,
                    tenant_id: tenantId,
                    role_name: r.name,
                    assigned_by: assignedBy,
                    is_active: r.isActive !== false
                }));

                console.log('📝 Inserting role rows:', roleRows);

                const { error: roleErr, data: roleData } = await supabase
                    .from('user_roles')
                    .insert(roleRows);

                if (roleErr) {
                    console.error('❌ Role insert error:', roleErr);
                    throw roleErr;
                }

                console.log('✅ Inserted roles:', roleData);

                // Step 3: Insert scopes ใหม่
                const scopeRows = [];
                roles.forEach(role => {
                    const roleLevel = role.level || 'project'; // ดึง level จาก role config
                    if (role.scopes && role.scopes.length > 0) {
                        role.scopes.forEach(scope => {
                            scopeRows.push({
                                user_id: userId,
                                tenant_id: tenantId,
                                role_type: role.name,
                                scope_level: roleLevel, // ✅ ใช้ level จาก role config แทน scope
                                scope_id: scope.scopeId,
                                scope_name: scope.scopeName || null,
                                assigned_by: assignedBy,
                                is_active: true
                            });
                        });
                    }
                });

                if (scopeRows.length > 0) {
                    console.log('📝 Inserting scope rows:', scopeRows);

                    const { error: scopeErr, data: scopeData } = await supabase
                        .from('user_scope_assignments')
                        .insert(scopeRows);

                    if (scopeErr) {
                        console.error('❌ Scope insert error:', scopeErr);
                        throw scopeErr;
                    }

                    console.log('✅ Inserted scopes:', scopeData);
                }

                // Step 4: อัปเดต role หลักใน users table (legacy support)
                const primaryRole = roles[0]?.name || 'requester';
                console.log('📝 Updating primary role to:', primaryRole);

                const { error: updateErr, data: updateData } = await supabase
                    .from('users')
                    .update({
                        role: primaryRole
                    })
                    .eq('id', userId);

                if (updateErr) {
                    console.error('❌ Update error:', updateErr);
                } else {
                    console.log('✅ Updated users table:', updateData);
                }
            }

            return {
                success: true,
                message: 'บันทึกบทบาทสำเร็จ'
            };
        } catch (err) {
            console.error('saveUserRoles error:', err);
            throw err;
        }
    },

    /**
     * ดึง Scopes ที่มีให้เลือก (projects, buds)
     * @param {number} tenantId - ID ของ tenant
     * @returns {Promise<Object>} { projects, buds }
     */
    getAvailableScopes: async (tenantId = 1) => {
        try {
            const [projectsRes, budsRes, tenantsRes] = await Promise.all([
                supabase
                    .from('projects')
                    .select('id, name, code, bud_id')
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('buds')
                    .select('id, name, code')
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('tenants')
                    .select('id, name, code')
                    .eq('is_active', true)
                    .order('name')
            ]);

            return {
                projects: (projectsRes.data || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    code: p.code,
                    budId: p.bud_id
                })),
                buds: (budsRes.data || []).map(b => ({
                    id: b.id,
                    name: b.name,
                    code: b.code
                })),
                tenants: (tenantsRes.data || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    code: t.code
                }))
            };
        } catch (err) {
            console.error('getAvailableScopes error:', err);
            return { projects: [], buds: [], tenants: [] };
        }
    },

    /**
     * ดึง Users ที่มี role เป็น Approver (สำหรับ Approval Flow)
     * @param {number} budId - ID ของ BUD (optional - filter by scope)
     * @param {number} tenantId - ID ของ tenant
     * @returns {Promise<Array>} รายการ approvers
     */
    getApproversByScope: async (budId = null, tenantId = 1) => {
        try {
            // ดึง users ที่มี role = approver จาก user_roles
            let query = supabase
                .from('user_roles')
                .select(`
                    user_id,
                    users!inner(id, display_name, email, avatar_url, is_active)
                `)
                .eq('role_name', 'approver')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            const { data: approverRoles, error } = await query;

            if (error) {
                // Fallback: ดึงจาก users table โดยตรง
                const { data: fallbackUsers } = await supabase
                    .from('users')
                    .select('id, display_name, email, avatar_url')
                    .eq('role', 'approver')
                    .eq('is_active', true);

                return (fallbackUsers || []).map(u => ({
                    id: u.id,
                    name: u.display_name,
                    email: u.email,
                    avatar: u.avatar_url
                }));
            }

            // ถ้ามี budId → filter by scope
            if (budId && approverRoles && approverRoles.length > 0) {
                const userIds = approverRoles.map(r => r.user_id);

                const { data: scopes } = await supabase
                    .from('user_scope_assignments')
                    .select('user_id')
                    .in('user_id', userIds)
                    .eq('role_type', 'approver')
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true)
                    .or(`scope_level.eq.tenant,and(scope_level.eq.bud,scope_id.eq.${budId})`);

                const validUserIds = new Set((scopes || []).map(s => s.user_id));

                // ถ้าไม่มี scopes → ถือว่า legacy (full access)
                return approverRoles
                    .filter(r => validUserIds.size === 0 || validUserIds.has(r.user_id))
                    .map(r => ({
                        id: r.users.id,
                        name: r.users.display_name,
                        email: r.users.email,
                        avatar: r.users.avatar_url
                    }));
            }

            return (approverRoles || []).map(r => ({
                id: r.users.id,
                name: r.users.display_name,
                email: r.users.email,
                avatar: r.users.avatar_url
            }));
        } catch (err) {
            console.error('getApproversByScope error:', err);
            return [];
        }
    },

    /**
     * ดึง Users ที่มี role เป็น Assignee (สำหรับ Assignment)
     * @param {number} budId - ID ของ BUD (optional)
     * @param {number} tenantId - ID ของ tenant
     * @returns {Promise<Array>} รายการ assignees
     */
    getAssigneesByScope: async (budId = null, tenantId = 1) => {
        try {
            // ดึงจาก user_roles
            const { data: assigneeRoles, error } = await supabase
                .from('user_roles')
                .select(`
                    user_id,
                    users!inner(id, display_name, email, avatar_url, is_active)
                `)
                .eq('role_name', 'assignee')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            if (error) {
                // Fallback
                const { data: fallbackUsers } = await supabase
                    .from('users')
                    .select('id, display_name, email, avatar_url')
                    .eq('role', 'assignee')
                    .eq('is_active', true);

                return (fallbackUsers || []).map(u => ({
                    id: u.id,
                    name: u.display_name,
                    email: u.email,
                    avatar: u.avatar_url
                }));
            }

            return (assigneeRoles || []).map(r => ({
                id: r.users.id,
                name: r.users.display_name,
                email: r.users.email,
                avatar: r.users.avatar_url
            }));
        } catch (err) {
            console.error('getAssigneesByScope error:', err);
            return [];
        }
    }
};
