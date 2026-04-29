/**
 * @file scopeHelpers.js
 * @description Utilities สำหรับตรวจสอบ User Scope และ Authorization ผ่าน Backend API
 */

import httpClient from '@shared/services/httpClient';

const normalizeRoleName = (value) => String(value || '').toLowerCase();

const normalizeScope = (scope, userId, roleName = null) => {
    const scopeLevel = scope.scope_level || scope.scopeLevel || scope.level || 'project';
    const scopeId = scope.scope_id || scope.scopeId || scope.id || null;
    const scopeName = scope.scope_name || scope.scopeName || scope.name || '';
    const roleType = scope.role_type || scope.roleType || roleName;

    return {
        ...scope,
        user_id: userId,
        scope_id: scopeId,
        scope_level: String(scopeLevel).toLowerCase(),
        scope_name: scopeName,
        role_type: roleType,
        project_id: String(scopeLevel).toLowerCase() === 'project' ? scopeId : scope.project_id
    };
};

const getProjects = async () => {
    const response = await httpClient.get('/projects');
    if (!response.data?.success) return [];
    return response.data.data || [];
};

const getProjectById = async (projectId) => {
    const response = await httpClient.get(`/projects/${projectId}`);
    if (!response.data?.success) return null;
    return response.data.data || null;
};

/**
 * Get user's scope assignments
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Scope assignments
 */
export const getUserScopes = async (userId) => {
    try {
        const response = await httpClient.get(`/users/${userId}/roles`);
        if (!response.data?.success) return [];

        const user = response.data.data || {};
        const scopes = [];

        (user.roles || []).forEach(role => {
            (role.scopes || []).forEach(scope => {
                scopes.push(normalizeScope(scope, userId, role.name));
            });
        });

        return scopes;
    } catch (error) {
        console.error('Error fetching user scopes:', error);
        return [];
    }
};

/**
 * Check if user has scope for a specific project
 * @param {number} userId - User ID
 * @param {number} projectId - Project ID
 * @returns {Promise<boolean>} - Has scope or not
 */
export const hasProjectScope = async (userId, projectId) => {
    try {
        const scopes = await getUserScopes(userId);

        if (scopes.some(s => s.scope_level === 'tenant')) return true;

        const project = await getProjectById(projectId);
        if (!project) return false;

        if (scopes.some(s => s.scope_level === 'bud' && s.scope_id === project.budId)) return true;
        if (scopes.some(s => s.scope_level === 'project' && s.scope_id === Number(projectId))) return true;

        return false;
    } catch (error) {
        console.error('Error checking project scope:', error);
        return false;
    }
};

/**
 * Get all project IDs that user has access to
 * @param {number} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @returns {Promise<Set>} - Set of allowed project IDs
 */
export const getAllowedProjectIds = async (userId, tenantId) => {
    try {
        const scopes = await getUserScopes(userId);
        const allowedProjectIds = new Set();

        if (scopes.some(s => s.scope_level === 'tenant')) {
            const projects = await getProjects();
            projects.forEach(p => allowedProjectIds.add(p.id));
            return allowedProjectIds;
        }

        scopes
            .filter(s => s.scope_level === 'project')
            .forEach(s => allowedProjectIds.add(s.scope_id));

        const budIds = scopes.filter(s => s.scope_level === 'bud').map(s => s.scope_id);
        if (budIds.length > 0) {
            const projects = await getProjects();
            projects
                .filter(p => budIds.includes(p.budId))
                .forEach(p => allowedProjectIds.add(p.id));
        }

        return allowedProjectIds;
    } catch (error) {
        console.error('Error getting allowed projects:', error);
        return new Set();
    }
};

/**
 * Filter jobs by user's scope
 * @param {Array} jobs - All jobs
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Filtered jobs
 */
export const filterJobsByScope = async (jobs, userId) => {
    try {
        const scopes = await getUserScopes(userId);

        if (scopes.some(s => s.scope_level === 'tenant')) return jobs;

        const allowedProjectIds = await getAllowedProjectIds(userId);
        if (allowedProjectIds.size === 0) return jobs;

        return jobs.filter(job => allowedProjectIds.has(job.projectId || job.project_id));
    } catch (error) {
        console.error('Error filtering jobs by scope:', error);
        return [];
    }
};

/**
 * Check if user has any scope (for authorization)
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - Has any scope or not
 */
export const hasAnyScope = async (userId) => {
    const scopes = await getUserScopes(userId);
    return scopes.length > 0;
};

// =========================================
// Multi-Role Support Functions
// =========================================

/**
 * Get user roles with scopes from Backend API
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of roles with scopes
 */
export const getUserRolesWithScopes = async (userId) => {
    try {
        const response = await httpClient.get(`/users/${userId}/roles`);
        if (!response.data?.success) return [];

        return (response.data.data?.roles || []).map(role => ({
            ...role,
            name: normalizeRoleName(role.name),
            scopes: (role.scopes || []).map(scope => ({
                level: String(scope.level || scope.scopeLevel || 'project').toLowerCase(),
                scopeId: scope.scopeId || scope.scope_id || scope.id,
                scopeName: scope.scopeName || scope.scope_name || scope.name || ''
            }))
        }));
    } catch (error) {
        console.error('Error getting user roles with scopes:', error);
        return [];
    }
};

/**
 * Check if user can access a project based on Multi-Role scopes
 * @param {number} userId - User ID
 * @param {number} projectId - Project ID
 * @param {string} roleName - Optional: specific role to check (e.g., 'requester', 'approver')
 * @returns {Promise<boolean>}
 */
export const canAccessProject = async (userId, projectId, roleName = null) => {
    try {
        const rolesWithScopes = await getUserRolesWithScopes(userId);
        const rolesToCheck = roleName
            ? rolesWithScopes.filter(r => normalizeRoleName(r.name) === normalizeRoleName(roleName))
            : rolesWithScopes;

        if (rolesToCheck.length === 0) return false;

        const project = await getProjectById(projectId);
        if (!project) return false;

        for (const role of rolesToCheck) {
            if (!role.scopes || role.scopes.length === 0) return true;

            for (const scope of role.scopes) {
                if (scope.level === 'tenant') return true;
                if (scope.level === 'bud' && scope.scopeId === project.budId) return true;
                if (scope.level === 'project' && scope.scopeId === Number(projectId)) return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking project access:', error);
        return false;
    }
};

/**
 * Get all accessible project IDs for user based on Multi-Role scopes
 * @param {number} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} roleName - Optional: specific role to check
 * @returns {Promise<number[]>} - Array of project IDs
 */
export const getAccessibleProjectIds = async (userId, tenantId, roleName = null) => {
    try {
        const rolesWithScopes = await getUserRolesWithScopes(userId);
        const rolesToCheck = roleName
            ? rolesWithScopes.filter(r => normalizeRoleName(r.name) === normalizeRoleName(roleName))
            : rolesWithScopes;

        if (rolesToCheck.length === 0) return [];

        const projects = await getProjects();
        const projectIds = new Set();

        for (const role of rolesToCheck) {
            if (!role.scopes || role.scopes.length === 0) {
                projects.forEach(p => projectIds.add(p.id));
                return Array.from(projectIds);
            }

            for (const scope of role.scopes) {
                if (scope.level === 'tenant') {
                    projects.forEach(p => projectIds.add(p.id));
                    return Array.from(projectIds);
                }

                if (scope.level === 'bud') {
                    projects
                        .filter(p => p.budId === scope.scopeId)
                        .forEach(p => projectIds.add(p.id));
                }

                if (scope.level === 'project') {
                    projectIds.add(scope.scopeId);
                }
            }
        }

        return Array.from(projectIds);
    } catch (error) {
        console.error('Error getting accessible project IDs:', error);
        return [];
    }
};
