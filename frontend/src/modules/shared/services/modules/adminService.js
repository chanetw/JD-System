
import { supabase } from '../supabaseClient';
import { handleResponse } from '../utils';

export const adminService = {
    // --- Master Data (Organization) ---
    getMasterData: async () => {
        const [tenantsRes, budsRes, projectsRes, jobTypesRes] = await Promise.all([
            supabase.from('tenants').select('*').order('id'),
            supabase.from('buds').select('*').order('id'),
            supabase.from('projects').select(`*, bud:buds(name), tenant:tenants(name)`).order('id'),
            supabase.from('job_types').select('*').order('id')
        ]);

        const tenants = (tenantsRes.data || []).map(t => ({ ...t, isActive: t.is_active }));
        const buds = (budsRes.data || []).map(b => ({ ...b, tenantId: b.tenant_id, isActive: b.is_active }));

        const projects = (projectsRes.data || []).map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            budId: p.bud_id,
            budName: p.bud?.name,
            tenantId: p.tenant_id,
            tenantName: p.tenant?.name,
            status: p.is_active ? 'Active' : 'Inactive',
            isActive: p.is_active
        }));

        const jobTypes = (jobTypesRes.data || []).map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            sla: t.sla_days,
            icon: t.icon,
            tenantId: t.tenant_id,
            status: t.is_active ? 'active' : 'inactive',
            isActive: t.is_active
        }));

        return { tenants, buds, projects, jobTypes };
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
        const { data, error } = await supabase.from('departments')
            .select(`*, bud:buds(name, code), manager:users!fk_manager(display_name)`)
            .order('id');
        if (error) throw error;
        return data.map(d => ({
            ...d,
            budId: d.bud_id,
            managerId: d.manager_id,
            isActive: d.is_active
        }));
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
        return data.map(jt => ({
            id: jt.id,
            name: jt.name,
            description: jt.description,
            sla: jt.sla_days,
            icon: jt.icon,
            attachments: jt.attachments || [],
            status: jt.is_active ? 'active' : 'inactive',
            items: jt.items.map(i => ({
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
        return data.map(i => ({
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
            .select(`*, approver:users(*)`)
            .order('level');
        if (error) throw error;

        const grouped = {};
        flows.forEach(f => {
            if (!grouped[f.project_id]) {
                grouped[f.project_id] = {
                    projectId: f.project_id,
                    levels: [],
                    updatedAt: f.updated_at
                };
            }
            let lvl = grouped[f.project_id].levels.find(l => l.level === f.level);
            if (!lvl) {
                lvl = { level: f.level, approvers: [], logic: 'any' };
                grouped[f.project_id].levels.push(lvl);
            }
            if (f.approver) {
                lvl.approvers.push({
                    id: f.approver.id,
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
            .select(`*, approver:users(*)`)
            .eq('project_id', projectId)
            .order('level');

        if (error || !flows || flows.length === 0) return null;

        const levels = [];
        flows.forEach(f => {
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
            defaultAssignee: assignment
        };
    },

    saveApprovalFlow: async (projectId, flowData) => {
        const { error: delErr } = await supabase.from('approval_flows').delete().eq('project_id', projectId);
        if (delErr) throw delErr;

        const rowsToInsert = [];
        flowData.levels.forEach(lvl => {
            lvl.approvers.forEach(appr => {
                rowsToInsert.push({
                    project_id: projectId,
                    level: lvl.level,
                    approver_id: appr.id
                });
            });
        });

        if (rowsToInsert.length > 0) {
            const { error: insErr } = await supabase.from('approval_flows').insert(rowsToInsert);
            if (insErr) throw insErr;
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

    getHolidays: async () => {
        return [];
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
    }
};
