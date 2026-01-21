
/**
 * @file apiDatabase.js
 * @description Real Database API Service integrating with Supabase.
 * Implements the same interface as mockApi.js for easy swapping.
 */

import { supabase } from './supabaseClient';

// --- Helpers ---
const handleResponse = ({ data, error }) => {
    if (error) {
        console.error("Supabase API Error:", error);
        throw new Error(error.message);
    }
    return data;
};

// --- Mock Delay Helper (Optional, to match behavior if needed, otherwise removed) ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiDatabase = {

    // --- Initialization ---
    init: async () => {
        // No-op for DB, connection is handled by client
        console.log("Database Service Initialized");
    },

    // --- Master Data (รวมข้อมูลหลักทั้งหมดสำหรับหน้า Organization) ---
    getMasterData: async () => {
        // ดึงข้อมูล Tenants, BUDs, Projects, JobTypes พร้อมกัน
        const [tenantsRes, budsRes, projectsRes, jobTypesRes] = await Promise.all([
            supabase.from('tenants').select('*').order('id'),
            supabase.from('buds').select('*').order('id'),
            supabase.from('projects').select(`*, bud:buds(name), tenant:tenants(name)`).order('id'),
            supabase.from('job_types').select('*').order('id')
        ]);

        // Transform Tenants
        const tenants = (tenantsRes.data || []).map(t => ({
            ...t,
            isActive: t.is_active
        }));

        // Transform BUDs
        const buds = (budsRes.data || []).map(b => ({
            ...b,
            tenantId: b.tenant_id,
            isActive: b.is_active
        }));

        // Transform Projects
        const projects = (projectsRes.data || []).map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            budId: p.bud_id,
            budName: p.bud?.name,
            tenantId: p.tenant_id,
            tenantName: p.tenant?.name,
            status: p.is_active ? 'Active' : 'Inactive', // Map to standard status string used in Frontend
            isActive: p.is_active
        }));

        // Transform JobTypes
        const jobTypes = (jobTypesRes.data || []).map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            sla: t.sla_days, // Map sla_days -> sla
            icon: t.icon,
            tenantId: t.tenant_id,
            status: t.is_active ? 'active' : 'inactive',
            isActive: t.is_active
        }));

        return {
            tenants,
            buds,
            projects,
            jobTypes
        };
    },

    // --- Tenants & Organization ---
    getTenants: async () => {
        // For dropdowns, we might still want ONLY active ones. 
        // But OrganizationManagement uses getMasterData.
        // Let's keep this generic or assume it's for general usage (dropdowns).
        // If getting ALL for admin, they usually use getMasterData.
        // Let's stick to returning Active for dropdown usage safety, or make it return mapped data.
        // Context: CreateDJ uses this for dropdowns.
        const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true).order('id');
        if (error) throw error;
        return data.map(t => ({ ...t, isActive: t.is_active }));
    },

    getBUDs: async () => {
        const { data, error } = await supabase.from('buds').select('*').eq('is_active', true).order('id');
        if (error) throw error;
        return data.map(b => ({ ...b, tenantId: b.tenant_id, isActive: b.is_active }));
    },

    getDepartments: async () => {
        // Fetch with relations
        // Used in OrganizationManagement independently
        const { data, error } = await supabase.from('departments')
            .select(`
          *,
          bud:buds(name, code),
          manager:users!fk_manager(display_name)
        `)
            .order('id'); // Admin might want to see Inactive departments too? Assume yes.

        if (error) throw error;

        return data.map(d => ({
            ...d,
            budId: d.bud_id,
            managerId: d.manager_id,
            isActive: d.is_active
        }));
    },

    // --- Projects ---
    getProjects: async () => {
        const data = handleResponse(
            await supabase.from('projects')
                .select(`
            *,
            bud:buds(name),
            department:departments(name),
            tenant:tenants(name)
        `)
                .eq('is_active', true)
                .order('id')
        );

        // Transform specifically to match what Frontend expects (camelCase, flat hierarchy if mock did that)
        // Mock: { id, name, code, budId, departmentId, status, pm? }
        // DB: { id, name, code, bud_id, department_id, is_active... }
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

    // --- Users ---
    getUsers: async () => {
        const data = handleResponse(
            await supabase.from('users').select('*').order('id')
        );
        return data.map(u => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            displayName: u.display_name,
            email: u.email,
            roles: [u.role], // Mock uses array
            role: u.role,
            avatar: u.avatar_url,
            isActive: u.is_active,
            tenantId: u.tenant_id
        }));
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

    // --- Job Types ---
    // --- Job Types ---
    getJobTypes: async () => {
        // Need to include items
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
            attachments: jt.attachments || [], // Default to empty array
            status: jt.is_active ? 'active' : 'inactive',
            items: jt.items.map(i => ({
                id: i.id,
                name: i.name,
                defaultSize: i.default_size,
                isRequired: i.is_required
            }))
        }));
    },

    // --- Approval Flows ---
    getApprovalFlows: async () => {
        // Fetch raw flows
        const { data: flows, error } = await supabase.from('approval_flows')
            .select(`*, approver:users(*)`)
            .order('level');

        if (error) throw error;

        // Group by Project ID to match frontend structure
        // Frontend Expects: Array of { projectId, levels: [ { level: 1, approverId: X, approver: {...} } ] }
        const grouped = {};

        flows.forEach(f => {
            if (!grouped[f.project_id]) {
                grouped[f.project_id] = {
                    projectId: f.project_id,
                    levels: [],
                    updatedAt: f.updated_at
                };
            }

            // Push level info
            // Note: Frontend supports multi-approvers per level now (array 'approvers')
            // But Schema might simple. Let's adapt.
            // If schema is 1 row per approver rule:

            // Check if level already exists in group
            let lvl = grouped[f.project_id].levels.find(l => l.level === f.level);
            if (!lvl) {
                lvl = {
                    level: f.level,
                    approvers: [], // List of approvers
                    logic: 'any' // Default logic
                };
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
        // Find existing flows for this project
        // Note: projectIdentifier comes as name or ID. API prefers ID.
        // If it's a name, we might need to resolve it first.
        // But assuming ID for now or we fetch all and find.

        // For efficiency, if projectIdentifier is number/ID, query directly.
        // If not, fetch all (fallback).

        let projectId = projectIdentifier;
        if (typeof projectIdentifier === 'string' && isNaN(projectIdentifier)) {
            // Name provided? Resolve is hard without fetching projects.
            // Let's fetch all flows and find.
            const allFlows = await apiDatabase.getApprovalFlows();
            const projects = await apiDatabase.getProjects();
            const proj = projects.find(p => p.name === projectIdentifier);
            if (proj) projectId = proj.id;
        }

        const { data: flows, error } = await supabase.from('approval_flows')
            .select(`*, approver:users(*)`)
            .eq('project_id', projectId)
            .order('level');

        if (error || !flows || flows.length === 0) return null;

        // Transform
        const levels = [];
        flows.forEach(f => {
            // Check if level already exists in group
            let lvl = levels.find(l => l.level === f.level);
            if (!lvl) {
                lvl = {
                    level: f.level,
                    approvers: [], // List of approvers
                    logic: 'any', // Default logic
                    role: f.role
                };
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

        // Also get default assignee
        const assignment = await apiDatabase.getAssigneeByProjectAndJobType(projectId, null); // Assignee might depend on job type too?
        // CreateDJ passes 2nd arg? No.

        return {
            projectId: projectId,
            levels: levels,
            defaultAssignee: assignment // Might be null specific to job type
        };
    },

    // --- Holidays ---
    getHolidays: async () => {
        // Return empty array as table not yet created
        return [];
    },

    saveApprovalFlow: async (projectId, flowData) => {
        // flowData = { levels: [ { level: 1, approvers: [id, id] } ], defaultAssignee: ... }

        // 1. Delete existing flows for this project (Full replace strategy)
        const { error: delErr } = await supabase.from('approval_flows').delete().eq('project_id', projectId);
        if (delErr) throw delErr;

        // 2. Insert new flows
        const rowsToInsert = [];
        flowData.levels.forEach(lvl => {
            lvl.approvers.forEach(appr => {
                rowsToInsert.push({
                    project_id: projectId,
                    level: lvl.level,
                    approver_id: appr.id // Assuming appr object has ID
                });
            });
        });

        if (rowsToInsert.length > 0) {
            const { error: insErr } = await supabase.from('approval_flows').insert(rowsToInsert);
            if (insErr) throw insErr;
        }

        return { success: true };
    },

    // Alias สำหรับ Update (เรียกใช้ saveApprovalFlow เหมือนกัน)
    updateApprovalFlow: async (flowId, flowData) => {
        // flowData.projectId เป็น source ที่ถูกต้อง (Frontend ส่งมาให้)
        return apiDatabase.saveApprovalFlow(flowData.projectId, flowData);
    },

    // Alias สำหรับ Create (เรียกใช้ saveApprovalFlow เหมือนกัน)
    createApprovalFlow: async (flowData) => {
        return apiDatabase.saveApprovalFlow(flowData.projectId, flowData);
    },

    // --- Jobs ---
    getJobs: async (filters = {}) => {
        let query = supabase.from('jobs')
            .select(`
            *,
            project:projects(name),
            job_type:job_types(name),
            requester:users!jobs_requester_id_fkey(display_name, avatar_url),
            assignee:users!jobs_assignee_id_fkey(display_name, avatar_url)
         `)
            .order('created_at', { ascending: false });

        // Apply Filters
        if (filters.status && filters.status !== 'All') {
            query = query.eq('status', filters.status.toLowerCase());
        }

        const data = handleResponse(await query);

        // Transform
        return data.map(j => ({
            id: j.id,
            djId: j.dj_id,
            subject: j.subject,
            jobType: j.job_type?.name,
            project: j.project?.name,
            projectName: j.project?.name,
            status: j.status, // Database uses lowercase 'draft', frontend might expect 'Draft' - careful
            priority: j.priority,
            deadline: j.due_date,
            createdAt: j.created_at,
            requester: {
                name: j.requester?.display_name,
                avatar: j.requester?.avatar_url
            },
            assignee: j.assignee ? {
                name: j.assignee.display_name,
                avatar: j.assignee.avatar_url
            } : null
        }));
    },

    /**
     * ดึงรายการงานตาม Role ของผู้ใช้
     * @param {Object} user - ข้อมูลผู้ใช้ที่ล็อกอิน
     * @returns {Array} รายการงานที่ผู้ใช้มีสิทธิ์เห็น
     */
    getJobsByRole: async (user) => {
        try {
            // ดึงงานทั้งหมด
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    project:projects(name),
                    job_type:job_types(name),
                    requester:users!design_jobs_requester_id_fkey(display_name, avatar_url),
                    assignee:users!design_jobs_assignee_id_fkey(display_name, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.warn('Error fetching jobs by role:', error.message);
                return [];
            }

            // Transform data
            return (jobs || []).map(j => ({
                id: j.id,
                djId: j.dj_id,
                subject: j.subject,
                jobType: j.job_type?.name,
                project: j.project?.name,
                projectName: j.project?.name,
                status: j.status,
                priority: j.priority,
                deadline: j.due_date,
                createdAt: j.created_at,
                isOverdue: j.due_date ? new Date(j.due_date) < new Date() && j.status !== 'completed' : false,
                requester: j.requester ? {
                    name: j.requester.display_name,
                    avatar: j.requester.avatar_url
                } : null,
                assignee: j.assignee ? {
                    name: j.assignee.display_name,
                    avatar: j.assignee.avatar_url
                } : null
            }));
        } catch (err) {
            console.error('getJobsByRole error:', err);
            return [];
        }
    },

    getJobById: async (id) => {
        const { data, error } = await supabase.from('jobs')
            .select(`
            *,
            project:projects(*),
            job_type:job_types(*),
            requester:users!jobs_requester_id_fkey(*),
            assignee:users!jobs_assignee_id_fkey(*)
         `)
            .eq('id', id)
            .single();

        if (error) return null;

        return {
            id: data.id,
            djId: data.dj_id,
            subject: data.subject,
            status: data.status,
            priority: data.priority,
            deadline: data.due_date,
            brief: {
                objective: data.objective,
                headline: data.headline,
                subHeadline: data.sub_headline
            },
            requesterId: data.requester_id,
            assigneeId: data.assignee_id,
            projectId: data.project_id,
            jobTypeId: data.job_type_id
            // Additional fields mapping...
        };
    },

    createJob: async (jobData) => {
        // Map Frontend -> DB
        // Note: we need to handle sub-items transactionally ideally

        const payload = {
            tenant_id: 1, // Default
            project_id: parseInt(jobData.projectId),
            job_type_id: parseInt(jobData.jobTypeId), // Use ID from form data
            subject: jobData.subject,
            objective: jobData.brief?.objective,
            headline: jobData.brief?.headline,
            sub_headline: jobData.brief?.subHeadline,
            priority: jobData.priority,
            status: 'pending_approval', // Initial status
            requester_id: 1, // Current User Hardcoded
            due_date: jobData.deadline
        };

        const { data, error } = await supabase.from('jobs').insert([payload]).select().single();

        if (error) throw error;

        return {
            success: true,
            job: { id: data.id, djId: data.dj_id }
        };
    },

    // --- Approvals ---
    approveJob: async (jobId, approverId, comment) => {
        // Update status to 'in_progress' or next step
        const { error } = await supabase.from('jobs')
            .update({ status: 'in_progress', started_at: new Date() })
            .eq('id', jobId);

        if (error) throw error;

        // Log Activity
        await supabase.from('activity_logs').insert([{
            job_id: jobId,
            user_id: approverId,
            action: 'approve',
            message: comment || 'Job approved'
        }]);

        return { success: true };
    },

    // --- Job Types CRUD ---
    createJobType: async (jobTypeData) => {
        const payload = {
            tenant_id: 1,
            name: jobTypeData.name,
            description: jobTypeData.description,
            sla_days: jobTypeData.sla || 3,
            icon: jobTypeData.icon,
            attachments: jobTypeData.attachments,
            is_active: jobTypeData.status !== 'inactive' // Start active unless specified
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
        // Soft delete by setting is_active to false
        const { error } = await supabase.from('job_types').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- Job Type Items ---
    getJobTypeItems: async (jobTypeId) => {
        let query = supabase.from('job_type_items').select('*');
        if (jobTypeId) {
            query = query.eq('job_type_id', jobTypeId);
        }
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
        // Remove undefined keys
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

    // --- Users CRUD ---
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

    // --- Projects CRUD ---
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
            tenant_id: projectData.tenantId, // Fix: Update tenant_id
            is_active: projectData.status === 'Active' // Map Frontend 'Active'/'Inactive' to Boolean
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

    // --- Tenants CRUD ---
    createTenant: async (tenantData) => {
        const payload = {
            name: tenantData.name,
            code: tenantData.code,
            subdomain: tenantData.subdomain,
            is_active: true
        };
        const { data, error } = await supabase.from('tenants').insert([payload]).select().single();
        if (error) throw error;
        return data;
    },

    updateTenant: async (id, tenantData) => {
        const payload = {
            name: tenantData.name,
            code: tenantData.code,
            subdomain: tenantData.subdomain,
            is_active: tenantData.isActive
        };
        const { data, error } = await supabase.from('tenants').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    deleteTenant: async (id) => {
        const { error } = await supabase.from('tenants').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return { success: true };
    },

    // --- BUDs CRUD ---
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

    // --- Departments CRUD ---
    createDepartment: async (deptData) => {
        const payload = {
            tenant_id: 1, // Default or derive
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

    // --- Dashboard Stats ---
    /**
     * ดึงข้อมูลสถิติสำหรับ Dashboard
     * @returns {Object} สถิติงาน: newToday, dueToday, overdue, totalJobs, pending
     */
    getDashboardStats: async () => {
        try {
            // ดึงงานทั้งหมด
            const { data: jobs, error } = await supabase
                .from('design_jobs')
                .select('id, status, deadline, created_at');

            if (error) {
                console.warn('Error fetching dashboard stats:', error.message);
                return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, pending: 0 };
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let newToday = 0;
            let dueToday = 0;
            let overdue = 0;

            (jobs || []).forEach(job => {
                // นับงานใหม่วันนี้
                if (job.created_at) {
                    const createdAt = new Date(job.created_at);
                    createdAt.setHours(0, 0, 0, 0);
                    if (createdAt.getTime() === today.getTime()) newToday++;
                }

                // นับงานครบกำหนดวันนี้ และ overdue
                if (job.deadline) {
                    const dueDate = new Date(job.deadline);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate.getTime() === today.getTime()) dueToday++;
                    if (dueDate.getTime() < today.getTime() && job.status !== 'completed' && job.status !== 'closed') {
                        overdue++;
                    }
                }
            });

            return {
                newToday,
                dueToday,
                overdue,
                totalJobs: jobs?.length || 0,
                pending: (jobs || []).filter(j => j.status === 'pending_approval').length,
            };
        } catch (err) {
            console.error('getDashboardStats error:', err);
            return { newToday: 0, dueToday: 0, overdue: 0, totalJobs: 0, pending: 0 };
        }
    },

    // --- Assignment Matrix ---
    /**
     * ดึงข้อมูล Matrix การมอบหมายงานของ Project
     */
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

        if (error) {
            console.error('Error fetching assignment matrix:', error);
            return [];
        }

        // Transform Data ให้ใช้งานง่ายฝั่ง Frontend
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

    /**
     * ค้นหา Assignee ตาม Project และ Job Type (ใช้สำหรับ Auto-fill)
     */
    getAssigneeByProjectAndJobType: async (projectId, jobTypeId) => {
        let query = supabase
            .from('project_job_assignments')
            .select(`
                assignee_id,
                users:assignee_id ( id, first_name, last_name )
            `)
            .eq('project_id', projectId);

        if (jobTypeId) {
            query = query.eq('job_type_id', jobTypeId);
        } else {
            // If null, we might be looking for a default assignment (where job_type_id IS NULL)
            // or simply ignoring it?
            // Based on usage in getApprovalFlowByProject(projectId), we pass null.
            // If the intention is "find generic assignee for project", we check IS NULL.
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

    /**
     * บันทึกการตั้งค่า Assignment Matrix
     */
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
    }

};

export default apiDatabase;
