/**
 * @file scopeHelpers.js
 * @description Utilities สำหรับตรวจสอบ User Scope และ Authorization
 * 
 * Scope Levels:
 * - Tenant: เห็นทุกอย่างในบริษัท
 * - BUD: เห็นทุกโครงการในสายงาน
 * - Project: เห็นเฉพาะโครงการที่ระบุ
 */

import { supabase } from '@shared/services/supabaseClient';

/**
 * Get user's scope assignments
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Scope assignments
 */
export const getUserScopes = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_scope_assignments')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;
        return data || [];
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
        // Get user's scopes
        const scopes = await getUserScopes(userId);

        // Check if user has Tenant-level scope (see all)
        if (scopes.some(s => s.scope_level === 'Tenant')) {
            return true;
        }

        // Get project details
        const { data: project, error } = await supabase
            .from('projects')
            .select('id, bud_id, tenant_id')
            .eq('id', projectId)
            .single();

        if (error || !project) return false;

        // Check BUD-level scope
        if (scopes.some(s => 
            s.scope_level === 'BUD' && 
            s.scope_id === project.bud_id
        )) {
            return true;
        }

        // Check Project-level scope
        if (scopes.some(s => 
            s.scope_level === 'Project' && 
            s.scope_id === projectId
        )) {
            return true;
        }

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

        // If user has Tenant-level scope, get all projects in tenant
        if (scopes.some(s => s.scope_level === 'Tenant')) {
            const { data: allProjects } = await supabase
                .from('projects')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            (allProjects || []).forEach(p => allowedProjectIds.add(p.id));
            return allowedProjectIds;
        }

        // Add projects from Project-level scopes
        scopes
            .filter(s => s.scope_level === 'Project')
            .forEach(s => allowedProjectIds.add(s.scope_id));

        // Add projects from BUD-level scopes
        const budScopes = scopes.filter(s => s.scope_level === 'BUD');
        if (budScopes.length > 0) {
            const budIds = budScopes.map(s => s.scope_id);
            const { data: projects } = await supabase
                .from('projects')
                .select('id')
                .in('bud_id', budIds)
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            (projects || []).forEach(p => allowedProjectIds.add(p.id));
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

        // If user has Tenant-level scope, return all
        if (scopes.some(s => s.scope_level === 'Tenant')) {
            return jobs;
        }

        // Get allowed project IDs
        const allowedProjectIds = new Set();

        // Add projects from Project-level scopes
        scopes
            .filter(s => s.scope_level === 'Project')
            .forEach(s => allowedProjectIds.add(s.scope_id));

        // Add projects from BUD-level scopes
        const budScopes = scopes.filter(s => s.scope_level === 'BUD');
        if (budScopes.length > 0) {
            const budIds = budScopes.map(s => s.scope_id);
            const { data: projects } = await supabase
                .from('projects')
                .select('id')
                .in('bud_id', budIds);

            (projects || []).forEach(p => allowedProjectIds.add(p.id));
        }

        // Filter jobs
        return jobs.filter(job => allowedProjectIds.has(job.project_id));
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
 * Get user roles with scopes from user_roles table (Multi-Role format)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of roles with scopes
 */
export const getUserRolesWithScopes = async (userId) => {
    try {
        // Get active roles for user
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('id, role_name, is_active')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (rolesError) throw rolesError;
        if (!roles || roles.length === 0) return [];

        // Get scopes for each role
        const rolesWithScopes = await Promise.all(
            roles.map(async (role) => {
                const { data: scopes, error: scopesError } = await supabase
                    .from('user_scope_assignments')
                    .select('scope_level, scope_id, scope_name')
                    .eq('user_role_id', role.id)
                    .eq('is_active', true);

                if (scopesError) {
                    console.warn(`Error fetching scopes for role ${role.role_name}:`, scopesError);
                }

                return {
                    name: role.role_name,
                    isActive: role.is_active,
                    scopes: (scopes || []).map(s => ({
                        level: s.scope_level?.toLowerCase() || 'project',
                        scopeId: s.scope_id,
                        scopeName: s.scope_name || ''
                    }))
                };
            })
        );

        return rolesWithScopes;
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
        
        // Filter by specific role if provided
        const rolesToCheck = roleName 
            ? rolesWithScopes.filter(r => r.name === roleName)
            : rolesWithScopes;

        if (rolesToCheck.length === 0) return false;

        // Get project details
        const { data: project, error } = await supabase
            .from('projects')
            .select('id, bud_id, tenant_id')
            .eq('id', projectId)
            .single();

        if (error || !project) return false;

        // Check each role's scopes
        for (const role of rolesToCheck) {
            // No scopes = tenant level (can access all)
            if (!role.scopes || role.scopes.length === 0) {
                return true;
            }

            for (const scope of role.scopes) {
                if (scope.level === 'tenant') return true;
                if (scope.level === 'bud' && scope.scopeId === project.bud_id) return true;
                if (scope.level === 'project' && scope.scopeId === projectId) return true;
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
        
        // Filter by specific role if provided
        const rolesToCheck = roleName 
            ? rolesWithScopes.filter(r => r.name === roleName)
            : rolesWithScopes;

        if (rolesToCheck.length === 0) return [];

        const projectIds = new Set();

        for (const role of rolesToCheck) {
            // No scopes = tenant level (can access all)
            if (!role.scopes || role.scopes.length === 0) {
                const { data: allProjects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true);

                (allProjects || []).forEach(p => projectIds.add(p.id));
                return Array.from(projectIds); // Return all projects
            }

            for (const scope of role.scopes) {
                if (scope.level === 'tenant') {
                    // Tenant level = all projects
                    const { data: allProjects } = await supabase
                        .from('projects')
                        .select('id')
                        .eq('tenant_id', tenantId)
                        .eq('is_active', true);

                    (allProjects || []).forEach(p => projectIds.add(p.id));
                    return Array.from(projectIds);
                }

                if (scope.level === 'bud') {
                    // BUD level = all projects in BUD
                    const { data: budProjects } = await supabase
                        .from('projects')
                        .select('id')
                        .eq('bud_id', scope.scopeId)
                        .eq('is_active', true);

                    (budProjects || []).forEach(p => projectIds.add(p.id));
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
