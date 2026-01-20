
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

    // --- Tenants & Organization ---
    getTenants: async () => {
        return handleResponse(await supabase.from('tenants').select('*').eq('is_active', true).order('id'));
    },

    getBUDs: async () => {
        return handleResponse(await supabase.from('buds').select('*').eq('is_active', true).order('id'));
    },

    getDepartments: async () => {
        // Fetch with relations
        const data = handleResponse(
            await supabase.from('departments')
                .select(`
          *,
          bud:buds(name, code),
          manager:users!fk_manager(display_name)
        `)
                .eq('is_active', true)
                .order('id')
        );
        // Transform to match generic object structure if needed, or keeping Supabase structure is fine
        // Supabase returns nested objects: { ..., bud: { name: '...' } }
        return data;
    },

    // --- Projects ---
    getProjects: async () => {
        const data = handleResponse(
            await supabase.from('projects')
                .select(`
            *,
            bud:buds(name),
            department:departments(name)
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
    getJobTypes: async () => {
        // Need to include items
        const { data, error } = await supabase
            .from('job_types')
            .select(`*, items:job_type_items(*)`)
            .eq('is_active', true);

        if (error) throw error;

        return data.map(jt => ({
            id: jt.id,
            name: jt.name,
            sla: jt.sla_days,
            items: jt.items.map(i => ({
                id: i.id,
                name: i.name,
                defaultSize: i.default_size,
                isRequired: i.is_required
            }))
        }));
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
            job_type_id: parseInt(jobData.jobType), // Frontend might send ID now? check form
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
    }

};

export default apiDatabase;
