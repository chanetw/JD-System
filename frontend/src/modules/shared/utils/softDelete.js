/**
 * @file softDelete.js
 * @description Soft Delete utility functions for jobs, users, and other entities
 */

import { supabase } from '../services/supabaseClient';

/**
 * Soft delete a job
 * @param {number} jobId - Job ID to delete
 * @param {number} deletedBy - User ID who is deleting
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const softDeleteJob = async (jobId, deletedBy) => {
    try {
        const { data, error } = await supabase.rpc('soft_delete_job', {
            p_job_id: jobId,
            p_deleted_by: deletedBy
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error soft deleting job:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Restore a soft-deleted job
 * @param {number} jobId - Job ID to restore
 * @param {number} restoredBy - User ID who is restoring
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const restoreJob = async (jobId, restoredBy) => {
    try {
        const { data, error } = await supabase.rpc('restore_deleted_job', {
            p_job_id: jobId,
            p_restored_by: restoredBy
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error restoring job:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Soft delete a user
 * @param {number} userId - User ID to delete
 * @param {number} deletedBy - Admin user ID who is deleting
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const softDeleteUser = async (userId, deletedBy) => {
    try {
        const { data, error } = await supabase.rpc('soft_delete_user', {
            p_user_id: userId,
            p_deleted_by: deletedBy
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error soft deleting user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get deleted jobs (for admin/recovery purposes)
 * @param {number} tenantId - Tenant ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Array>}
 */
export const getDeletedJobs = async (tenantId, days = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data, error } = await supabase
            .from('jobs')
            .select(`
                *,
                project:projects(name),
                job_type:job_types(name),
                deleted_by_user:users!jobs_deleted_by_fkey(display_name)
            `)
            .eq('tenant_id', tenantId)
            .not('deleted_at', 'is', null)
            .gte('deleted_at', cutoffDate.toISOString())
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error getting deleted jobs:', error);
        return [];
    }
};

/**
 * Get deleted users (for admin/recovery purposes)
 * @param {number} tenantId - Tenant ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Array>}
 */
export const getDeletedUsers = async (tenantId, days = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                deleted_by_user:users!users_deleted_by_fkey(display_name)
            `)
            .eq('tenant_id', tenantId)
            .not('deleted_at', 'is', null)
            .gte('deleted_at', cutoffDate.toISOString())
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error getting deleted users:', error);
        return [];
    }
};

/**
 * Check if a record can be permanently deleted
 * (Records older than 90 days can be permanently deleted)
 * @param {string} deletedAt - ISO date string of when the record was deleted
 * @returns {boolean}
 */
export const canPermanentlyDelete = (deletedAt) => {
    if (!deletedAt) return false;
    
    const deleteDate = new Date(deletedAt);
    const now = new Date();
    const diffDays = Math.floor((now - deleteDate) / (1000 * 60 * 60 * 24));
    
    return diffDays >= 90;
};

/**
 * Get days until permanent deletion
 * @param {string} deletedAt - ISO date string of when the record was deleted
 * @returns {number} - Days remaining (negative if already past)
 */
export const getDaysUntilPermanentDeletion = (deletedAt) => {
    if (!deletedAt) return null;
    
    const deleteDate = new Date(deletedAt);
    const permanentDeleteDate = new Date(deleteDate);
    permanentDeleteDate.setDate(permanentDeleteDate.getDate() + 90);
    
    const now = new Date();
    const diffDays = Math.floor((permanentDeleteDate - now) / (1000 * 60 * 60 * 24));
    
    return diffDays;
};

export default {
    softDeleteJob,
    restoreJob,
    softDeleteUser,
    getDeletedJobs,
    getDeletedUsers,
    canPermanentlyDelete,
    getDaysUntilPermanentDeletion
};
