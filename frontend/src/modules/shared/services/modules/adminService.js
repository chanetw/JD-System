import { supabase } from '../supabaseClient';
import { handleResponse } from '../utils';
import httpClient from '../httpClient';

export const adminService = {
    // --- Master Data (Organization) ---
    getMasterData: async (shouldRefresh = false) => {
        try {
            // ✓ NEW: Use Backend REST API with RLS context
            const response = await httpClient.get('/master-data', {
                params: { refresh: shouldRefresh }
            });

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
        try {
            // ✓ NEW: Use Backend REST API
            const response = await httpClient.get('/tenants');
            if (!response.data.success) throw new Error(response.data.message);
            return response.data.data;
        } catch (error) {
            console.error('[adminService] getTenants error:', error);
            // Fallback to empty if fails, but ideally throw
            throw error;
        }
    },

    createTenant: async (tenantData) => {
        // ✓ NEW: Use Backend REST API with validation

        // Client-side validation
        if (!tenantData.name || !tenantData.name.trim()) {
            throw new Error('ชื่อบริษัท (name) เป็นข้อมูลที่จำเป็น');
        }
        if (!tenantData.code || !tenantData.code.trim()) {
            throw new Error('รหัสบริษัท (code) เป็นข้อมูลที่จำเป็น');
        }

        const payload = {
            name: tenantData.name.trim(),
            code: tenantData.code.trim(),
            subdomain: tenantData.subdomain ? tenantData.subdomain.trim() : null,
            isActive: true
        };

        try {
            const response = await httpClient.post('/tenants', payload);
            if (!response.data.success) throw new Error(response.data.message);
            return response.data.data;
        } catch (error) {
            // Extract more specific error message from response
            const message = error.response?.data?.message || error.message || 'ไม่สามารถสร้างบริษัทได้';
            throw new Error(message);
        }
    },

    updateTenant: async (id, tenantData) => {
        try {
            // ✓ NEW: Use Backend REST API
            const payload = { ...tenantData, isActive: tenantData.isActive };
            const response = await httpClient.put(`/tenants/${id}`, payload);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Update failed');
            }

            return response.data.data;
        } catch (error) {
            console.error('[adminService] updateTenant error:', error);
            throw error;
        }
    },

    deleteTenant: async (id) => {
        // ✓ NEW: Use Backend REST API
        const response = await httpClient.delete(`/tenants/${id}`);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data; // Return full response to check deletion type
    },

    getBUDs: async () => {
        const response = await httpClient.get('/buds');
        return response.data.data;
    },

    createBud: async (budData) => {
        const response = await httpClient.post('/buds', budData);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    updateBud: async (id, budData) => {
        const response = await httpClient.put(`/buds/${id}`, budData);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    deleteBud: async (id) => {
        const response = await httpClient.delete(`/buds/${id}`);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    },

    getProjects: async () => {
        const response = await httpClient.get('/projects');
        return response.data.data;
    },

    createProject: async (projectData) => {
        const response = await httpClient.post('/projects', projectData);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    updateProject: async (id, projectData) => {
        const payload = { ...projectData, isActive: projectData.status === 'Active' };
        const response = await httpClient.put(`/projects/${id}`, payload);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    deleteProject: async (id) => {
        const response = await httpClient.delete(`/projects/${id}`);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    },

    getDepartments: async () => {
        try {
            console.log('[adminService] Calling GET /departments...');
            // ✓ NEW: Use Backend REST API with RLS context
            const response = await httpClient.get('/departments');

            console.log('[adminService] GET /departments response:', response.data);

            if (!response.data.success) {
                console.warn('[adminService] Get departments failed:', response.data.message);
                return [];
            }

            console.log('[adminService] Departments loaded:', response.data.data?.length || 0, 'items');
            return response.data.data;

        } catch (error) {
            console.error('[adminService] getDepartments error:', error);
            console.error('[adminService] Error response:', error.response?.data);
            return [];
        }
    },

    createDepartment: async (deptData) => {
        const response = await httpClient.post('/departments', deptData);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    updateDepartment: async (id, deptData) => {
        const response = await httpClient.put(`/departments/${id}`, deptData);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data.data;
    },

    deleteDepartment: async (id) => {
        const response = await httpClient.delete(`/departments/${id}`);
        if (!response.data.success) throw new Error(response.data.message);
        return response.data;
    },

    // --- Job Types ---
    getJobTypes: async (shouldRefresh = false) => {
        try {
            // ✓ NEW: Use Backend REST API (Consolidated)
            // Pass refresh param to bypass cache
            const response = await httpClient.get('/master-data', {
                params: { refresh: shouldRefresh }
            });

            if (!response.data.success) {
                console.warn('[adminService] Get job types failed:', response.data.message);
                return [];
            }

            // Extract jobTypes from masterData
            const jobTypes = response.data.data.jobTypes || [];

            // Map to match component expectations
            return jobTypes.map(jt => ({
                id: jt.id,
                name: jt.name,
                description: jt.description,
                sla: jt.slaWorkingDays, // Note: filed name changed in master-data
                icon: jt.icon,
                attachments: jt.attachments || [],
                status: jt.isActive ? 'active' : 'inactive',
                // Items are already nested in master-data response
                items: (jt.items || []).map(i => ({
                    id: i.id,
                    jobTypeId: jt.id, // Ensure jobTypeId is present
                    name: i.name,
                    defaultSize: i.defaultSize,
                    isRequired: i.isRequired
                }))
            }));

        } catch (error) {
            console.error('[adminService] getJobTypes error:', error);
            return [];
        }
    },

    // --- Job Types ---
    /**
     * Create new job type
     * ✅ FIXED: Proper payload sanitization and validation
     */
    createJobType: async (jobTypeData) => {
        // Validate required fields
        if (!jobTypeData.name || !jobTypeData.name.trim()) {
            throw new Error('Job type name is required');
        }

        // Build sanitized payload (only send valid fields)
        const payload = {
            name: jobTypeData.name.trim(),
            description: jobTypeData.description || '',
            sla: parseInt(jobTypeData.sla) || 3,
            sla: parseInt(jobTypeData.sla) || 3,
            isActive: jobTypeData.status === 'active', // Convert status to isActive
            icon: jobTypeData.icon || 'social',
            attachments: Array.isArray(jobTypeData.attachments)
                ? jobTypeData.attachments
                : (jobTypeData.attachments ? [jobTypeData.attachments] : [])
        };

        try {
            const response = await httpClient.post('/job-types', payload);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to create job type');
            }
            return response.data.data;
        } catch (error) {
            console.error('[adminService] createJobType error:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Failed to create job type'
            );
        }
    },

    /**
     * Update existing job type
     * ✅ FIXED: Proper payload sanitization and validation
     */
    updateJobType: async (id, jobTypeData) => {
        // Validate required fields if provided
        if (jobTypeData.name !== undefined && (!jobTypeData.name || !jobTypeData.name.trim())) {
            throw new Error('Job type name cannot be empty');
        }

        // Build sanitized payload (only send provided fields)
        const payload = {};
        if (jobTypeData.name !== undefined) payload.name = jobTypeData.name.trim();
        if (jobTypeData.description !== undefined) payload.description = jobTypeData.description;
        if (jobTypeData.sla !== undefined) payload.sla = parseInt(jobTypeData.sla);
        if (jobTypeData.status !== undefined) {
            payload.isActive = jobTypeData.status === 'active'; // Convert status to isActive
        }
        if (jobTypeData.isActive !== undefined) {
            payload.isActive = jobTypeData.isActive;
        }
        if (jobTypeData.icon !== undefined) payload.icon = jobTypeData.icon;
        if (jobTypeData.attachments !== undefined) {
            payload.attachments = Array.isArray(jobTypeData.attachments)
                ? jobTypeData.attachments
                : (jobTypeData.attachments ? [jobTypeData.attachments] : []);
        }

        // Only send if there are fields to update
        if (Object.keys(payload).length === 0) {
            throw new Error('No fields to update');
        }

        try {
            const response = await httpClient.put(`/job-types/${id}`, payload);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update job type');
            }
            return response.data.data;
        } catch (error) {
            console.error('[adminService] updateJobType error:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Failed to update job type'
            );
        }
    },

    /**
     * Delete (soft delete) job type by setting isActive to false
     * ✅ FIXED: Proper payload handling
     */
    deleteJobType: async (id) => {
        const payload = { isActive: false };
        try {
            const response = await httpClient.put(`/job-types/${id}`, payload);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to delete job type');
            }
            return { success: true };
        } catch (error) {
            console.error('[adminService] deleteJobType error:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Failed to delete job type'
            );
        }
    },

    // --- Job Type Items ---

    /**
     * Get items (Already included in getMasterData or getJobTypes, but if needed separately)
     * For now, we rely on master data cache in frontend.
     */
    getJobTypeItems: async (jobTypeId) => {
        try {
            const response = await httpClient.get(`/job-types/${jobTypeId}/items`);
            if (!response.data.success) {
                console.warn('[adminService] Get job type items failed:', response.data.message);
                return [];
            }
            // Map to match component expectations
            return response.data.data.map(i => ({
                id: i.id,
                jobTypeId: i.jobTypeId,
                name: i.name,
                defaultSize: i.defaultSize,
                isRequired: i.isRequired
            }));
        } catch (error) {
            console.error('[adminService] getJobTypeItems error:', error);
            return [];
        }
    },

    createJobTypeItem: async (itemData) => {
        // ✓ NEW: Use Backend REST API with client-side validation

        // Input validation
        if (!itemData.jobTypeId) {
            throw new Error('Job Type ID is required');
        }
        if (!itemData.name || !itemData.name.trim()) {
            throw new Error('Item name is required');
        }

        const payload = {
            name: itemData.name.trim(),
            defaultSize: itemData.defaultSize,
            isRequired: itemData.isRequired || false
        };

        try {
            const response = await httpClient.post(`/job-types/${itemData.jobTypeId}/items`, payload);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to create item');
            }

            // Return format expected by frontend
            const data = response.data.data;
            return {
                id: data.id,
                jobTypeId: data.jobTypeId,
                name: data.name,
                defaultSize: data.defaultSize,
                isRequired: data.isRequired
            };
        } catch (error) {
            console.error('[adminService] createJobTypeItem error:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Failed to create job type item'
            );
        }
    },

    updateJobTypeItem: async (id, itemData) => {
        // ✓ NEW: Use Backend REST API
        const payload = {
            name: itemData.name,
            defaultSize: itemData.defaultSize,
            isRequired: itemData.isRequired
        };
        const response = await httpClient.put(`/job-types/items/${id}`, payload);
        if (!response.data.success) throw new Error(response.data.message);

        const data = response.data.data;
        return {
            id: data.id,
            jobTypeId: data.jobTypeId,
            name: data.name,
            defaultSize: data.defaultSize,
            isRequired: data.isRequired
        };
    },

    deleteJobTypeItem: async (id) => {
        // ✓ NEW: Use Backend REST API
        const response = await httpClient.delete(`/job-types/items/${id}`);
        if (!response.data.success) throw new Error(response.data.message);
        return { success: true };
    },

    // --- Approval Flows ---
    getAllApprovalFlows: async () => {
        // ดึง Approval Flows ทั้งหมด (สำหรับ Admin)
        // ใช้ใน ApprovalFlow.jsx เพื่อนับจำนวนโครงการที่ตั้งค่าแล้ว
        try {
            const response = await httpClient.get('/approval-flows'); // ไม่ส่ง projectId
            if (!response.data.success) {
                console.error('[adminService] getAllApprovalFlows error:', response.data.message);
                return [];
            }

            // Backend returns array of flows
            return response.data.data || [];
        } catch (error) {
            console.error('[adminService] getAllApprovalFlows error:', error);
            return [];
        }
    },

    getApprovalFlows: async () => {
        // V1 Extended: Get all flows from database (default flows only, jobTypeId = null)
        try {
            const { data: flows, error } = await supabase.from('approval_flows')
                .select('*')
                .is('job_type_id', null) // Only get default flows
                .eq('is_active', true)
                .order('project_id');

            if (error) throw error;

            // Transform V1 Extended structure to frontend format
            return flows.map(f => ({
                id: f.id,
                projectId: f.project_id,
                jobTypeId: f.job_type_id,
                skipApproval: f.skip_approval,
                autoAssignType: f.auto_assign_type,
                autoAssignUserId: f.auto_assign_user_id,
                name: f.name,
                levels: f.approver_steps || [], // approverSteps stored as JSON
                includeTeamLead: f.conditions?.includeTeamLead || false,
                teamLeadId: f.conditions?.teamLeadId || null,
                updatedAt: f.updated_at
            }));
        } catch (error) {
            console.error('[adminService] getApprovalFlows error:', error);
            return [];
        }
    },

    getApprovalFlowByProject: async (projectIdentifier) => {
        let projectId = projectIdentifier;
        // Basic check, assume projectId is passed

        try {
            const response = await httpClient.get('/approval-flows', { params: { projectId } });
            if (!response.data.success) return null;

            // Backend returns { projectId, levels: [...], includeTeamLead, teamLeadId }
            return response.data.data;
        } catch (error) {
            console.error('[adminService] getApprovalFlowByProject error:', error);
            return null;
        }
    },

    saveApprovalFlow: async (projectId, flowData) => {
        try {
            const payload = { ...flowData, projectId }; // Ensure projectId is in body
            const response = await httpClient.post('/approval-flows', payload);

            if (!response.data.success) throw new Error(response.data.message);
            return { success: true };
        } catch (error) {
            console.error('[adminService] saveApprovalFlow error:', error);
            if (error.response) {
                console.error('[adminService] Error Status:', error.response.status);
                console.error('[adminService] Error Data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    },

    updateApprovalFlow: async (flowId, flowData) => {
        return adminService.saveApprovalFlow(flowData.projectId, flowData);
    },

    createApprovalFlow: async (flowData) => {
        return adminService.saveApprovalFlow(flowData.projectId, flowData);
    },

    /**
     * Get job assignments for a project (which job types have which assignees)
     * @param {number} projectId
     * @returns {Promise<Array>}
     */
    getProjectJobAssignments: async (projectId) => {
        try {
            const response = await httpClient.get(`/projects/${projectId}/job-assignments`);
            if (!response.data.success) return [];
            return response.data.data || [];
        } catch (error) {
            console.error('[adminService] getProjectJobAssignments error:', error);
            return [];
        }
    },

    /**
     * Create bulk flows from job assignments
     * @param {Object} params - { projectId, jobTypeIds, skipApproval, name }
     * @returns {Promise<Object>}
     */
    createBulkFlowsFromAssignments: async ({ projectId, jobTypeIds, skipApproval, name }) => {
        try {
            const response = await httpClient.post('/approval-flows/bulk-from-assignments', {
                projectId,
                jobTypeIds,
                skipApproval,
                name
            });
            if (!response.data.success) throw new Error(response.data.message);
            return response.data;
        } catch (error) {
            console.error('[adminService] createBulkFlowsFromAssignments error:', error);
            throw error;
        }
    },

    // --- Assignment Matrix ---
    getAssignmentMatrix: async (projectId) => {
        try {
            const response = await httpClient.get('/approval-flows/matrix', { params: { projectId } });
            if (!response.data.success) return [];

            // Transform if needed, but backend looks similar
            // Backend returns project_job_assignments include jobType, assignee
            // Frontend expects { id, jobTypeId, jobTypeName, assigneeId, assigneeName }

            const matrix = response.data.data || [];
            return matrix.map(item => ({
                id: item.id,
                jobTypeId: item.jobTypeId,
                jobTypeName: item.jobType?.name || 'N/A',
                assigneeId: item.assigneeId,
                assigneeName: item.assignee ?
                    [item.assignee.firstName, item.assignee.lastName].filter(Boolean).join(' ') :
                    'ไม่ระบุ'
            }));
        } catch (error) {
            console.error('[adminService] getAssignmentMatrix error:', error);
            return [];
        }
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
        try {
            const response = await httpClient.post('/approval-flows/matrix', { projectId, assignments });
            if (!response.data.success) throw new Error(response.data.message);
            return { success: true };
        } catch (error) {
            console.error('[adminService] saveAssignmentMatrix error:', error);
            throw error;
        }
    },

    /**
     * ดึงวันหยุดทั้งหมด (พร้อมรายละเอียด สำหรับ UI)
     * @param {number} tenantId - รหัส Tenant
     * @returns {Promise<Array>} รายการวันหยุดพร้อม id, name, date, type
     */
    getHolidays: async (tenantId = 1) => {
        // ✓ NEW: Use Backend REST API (Consolidated)
        try {
            const response = await httpClient.get('/holidays');

            if (!response.data.success) {
                console.warn('[adminService] Get holidays failed:', response.data.message);
                return [];
            }

            // Return full holiday objects for UI
            return (response.data.data || []).map(h => ({
                id: h.id,
                name: h.name,
                date: h.date,
                type: h.type || 'government',
                recurring: h.isRecurring || false,
                isRecurring: h.isRecurring || false
            }));
        } catch (err) {
            console.error('[adminService] getHolidays error:', err);
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
            const response = await httpClient.get('/holidays');

            if (!response.data.success) {
                console.warn('[adminService] Get holiday dates failed:', response.data.message);
                return [];
            }

            return (response.data.data || []).map(h => new Date(h.date));
        } catch (err) {
            console.error('[adminService] getHolidayDates error:', err);
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
        // ✓ NEW: Use Backend REST API
        try {
            const payload = {
                name: holidayData.name,
                date: holidayData.date,
                type: holidayData.type || 'government',
                isRecurring: holidayData.recurring || false
            };

            const response = await httpClient.post('/holidays', payload);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Add holiday failed');
            }

            const data = response.data.data;
            return {
                id: data.id,
                name: data.name,
                date: data.date,
                type: data.type,
                recurring: data.isRecurring
            };
        } catch (error) {
            console.error('[adminService] addHoliday error:', error);
            throw error;
        }
    },

    // Alias for backwards compatibility
    createHoliday: async (holidayData, tenantId = 1) => {
        return adminService.addHoliday(holidayData, tenantId);
    },

    /**
     * แก้ไขวันหยุด
     */
    /**
     * แก้ไขวันหยุด
     */
    updateHoliday: async (id, holidayData) => {
        // ✓ NEW: Use Backend REST API
        try {
            const payload = {
                name: holidayData.name,
                date: holidayData.date,
                type: holidayData.type || 'government',
                isRecurring: holidayData.recurring || false
            };

            const response = await httpClient.put(`/holidays/${id}`, payload);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Update holiday failed');
            }

            return response.data.data;
        } catch (error) {
            console.error('[adminService] updateHoliday error:', error);
            throw error;
        }
    },

    deleteHoliday: async (id) => {
        // ✓ NEW: Use Backend REST API
        try {
            const response = await httpClient.delete(`/holidays/${id}`);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Delete failed');
            }
            return { success: true };
        } catch (error) {
            console.error('[adminService] deleteHoliday error:', error);
            throw error;
        }
    },

    updateUser: async (id, userData) => {
        // ✓ Use Backend API instead of direct Supabase (RLS blocked)
        console.log('[adminService] Updating user via Backend API:', id, userData);

        const payload = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            phone: userData.phone,
            title: userData.title,
            departmentId: userData.departmentId ? parseInt(userData.departmentId, 10) : null,
            email: userData.email,
            isActive: userData.isActive
        };

        const response = await httpClient.put(`/users/${id}`, payload);

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update user');
        }

        console.log('[adminService] User updated successfully:', response.data);
        return response.data.data;
    },

    /**
     * ดึงรายการผู้ใช้ทั้งหมดผ่าน Backend API (Support Pagination)
     * @param {number} page - หน้าที่ต้องการ (default 1)
     * @param {number} limit - จำนวนต่อหน้า (default 20)
     * @returns {Promise<Object>} Object containing { data: usersArray, pagination: paginationMeta }
     */
    getUsers: async (page = 1, limit = 20) => {
        try {
            const response = await httpClient.get('/users', {
                params: { page, limit }
            });

            if (!response.data.success) {
                console.warn('[adminService] getUsers failed:', response.data.message);
                return { data: [], pagination: {} };
            }

            // Backend returns: { success: true, data: { data: [...], pagination: {...} } }
            const resultData = response.data.data;
            const usersRaw = resultData.data || [];
            const pagination = resultData.pagination || {};

            console.log('[adminService] getUsers raw data sample:', usersRaw.slice(0, 2).map(u => ({
                id: u.id,
                name: u.displayName || u.firstName,
                department: u.department,
                roleName: u.roleName,
                userRoles: u.userRoles
            })));

            const users = usersRaw.map(u => {
                // Process scope assignments to match UI expectations
                const scopeAssignments = u.scope_assignments || [];

                // Group scopes by type
                const tenantScopes = [];
                const budScopes = [];
                const projectScopes = [];

                scopeAssignments.forEach(scope => {
                    const scopeObj = {
                        id: scope.scope_id,
                        name: scope.scope_name,
                        level: scope.scope_level
                    };

                    if (scope.scope_level === 'tenant') {
                        tenantScopes.push(scopeObj);
                    } else if (scope.scope_level === 'bud') {
                        budScopes.push(scopeObj);
                    } else if (scope.scope_level === 'project') {
                        projectScopes.push(scopeObj);
                    }
                });

                return {
                    id: u.id,
                    name: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
                    displayName: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    avatar: u.avatarUrl,
                    phone: u.phone,
                    title: u.title,
                    department: u.department,
                    role: u.role, // Legacy role
                    roleName: u.roleName || u.role?.name || 'Member',
                    roles: u.roles || [], // New multi-roles
                    isActive: u.isActive,
                    tenantId: u.tenantId,
                    departmentId: u.department?.id,
                    // Managed departments for manager badge
                    managedDepartments: u.managedDepartments || [],
                    // Assigned Scopes for UI
                    assignedScopes: {
                        tenants: tenantScopes,
                        buds: budScopes,
                        projects: projectScopes
                    },
                    assignedProjects: projectScopes,
                    scope_assignments: scopeAssignments
                };
            });

            return {
                data: users,
                pagination
            };

        } catch (error) {
            console.error('[adminService] getUsers error:', error);
            return [];
        }
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
            console.log(`[adminService] Getting user with roles (Backend API): ${userId}`);

            // Call Backend API instead of direct Supabase
            // Because RLS might block access to user_roles/scopes
            const response = await httpClient.get(`/users/${userId}/roles`);

            if (response.data && response.data.success) {
                console.log('[adminService] getUserWithRoles Returns:', response.data.data);
                return response.data.data;
            } else {
                console.warn('Backend returned error:', response.data);
                throw new Error(response.data?.message || 'Failed to fetch user roles');
            }
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
        try {
            console.log('💾 Saving roles via Backend API:', { userId, roles, assignedBy, tenantId });

            // Call Backend API instead of direct Supabase to avoid RLS issues
            const response = await httpClient.post(`/users/${userId}/roles`, {
                roles
            });

            if (response.data.success) {
                console.log('✅ Save roles success');
                return {
                    success: true,
                    message: 'บันทึกบทบาทสำเร็จ'
                };
            } else {
                throw new Error(response.data.message || 'Unknown error');
            }
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
                httpClient.get('/projects'),
                httpClient.get('/buds'),
                httpClient.get('/tenants')
            ]);

            return {
                projects: (projectsRes.data.data || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    code: p.code,
                    budId: p.budId || p.bud_id
                })),
                buds: (budsRes.data.data || []).map(b => ({
                    id: b.id,
                    name: b.name,
                    code: b.code
                })),
                tenants: (tenantsRes.data.data || []).map(t => ({
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
    },

    // --- Department Manager Assignment ---
    /**
     * ดึงรายการแผนกที่ User เป็น Manager
     */
    getDepartmentsByManager: async (userId) => {
        try {
            const response = await httpClient.get(`/departments/by-manager/${userId}`);
            return response.data.success ? response.data.data : [];
        } catch (error) {
            console.error('[adminService] getDepartmentsByManager error:', error);
            return [];
        }
    },

    /**
     * อัพเดทการกำหนด Manager ของ Department
     * @param {number} userId - User ID ที่จะเป็น Manager
     * @param {number[]} departmentIds - Array ของ Department IDs (ส่งแค่ 1 ตัวสำหรับ Single Select)
     */
    updateDepartmentManagers: async (userId, departmentIds) => {
        try {
            const response = await httpClient.post('/departments/assign-manager', {
                userId: parseInt(userId),
                departmentIds: departmentIds.map(id => parseInt(id))
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update managers');
            }

            return response.data;
        } catch (error) {
            console.error('[adminService] updateDepartmentManagers error:', error);
            throw error;
        }
    },

    /**
     * อนุมัติคำขอสมัครและสร้างผู้ใช้ใหม่
     * @param {number} registrationId - ID ของคำขอสมัคร
     * @param {Array} roles - Array of role objects: { name, scopes, level }
     * @param {string} tempPassword - Temporary password (hashed)
     * @returns {Promise<Object>} - Result from backend
     */
    approveRegistration: async (registrationId, roles, tempPassword) => {
        try {
            console.log('[adminService] Calling POST /users/registrations/:id/approve');

            const response = await httpClient.post(`/users/registrations/${registrationId}/approve`, {
                roles,
                tempPassword
            });

            if (!response.data.success) {
                console.error('[adminService] Approve failed:', response.data.message);
                throw new Error(response.data.message || 'Failed to approve registration');
            }

            console.log('[adminService] Registration approved:', response.data.data);
            return response.data;
        } catch (error) {
            console.error('[adminService] approveRegistration error:', error);
            throw error;
        }
    }
};
