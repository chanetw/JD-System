/**
 * @file auditService.js
 * @description Audit Trail Service - Query and manage audit logs
 */

import { supabase } from '../supabaseClient';

export const auditService = {
    /**
     * Get audit trail for a specific entity
     * @param {string} entityType - Type of entity ('job', 'user', 'approval', etc.)
     * @param {number} entityId - ID of the entity
     * @param {number} limit - Maximum records to return
     * @returns {Promise<Array>}
     */
    getEntityAuditTrail: async (entityType, entityId, limit = 50) => {
        try {
            const { data, error } = await supabase.rpc('get_entity_audit_trail', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_limit: limit
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting entity audit trail:', error);
            return [];
        }
    },

    /**
     * Get user activity log
     * @param {number} userId - User ID
     * @param {number} days - Number of days to look back
     * @param {number} limit - Maximum records to return
     * @returns {Promise<Array>}
     */
    getUserActivity: async (userId, days = 30, limit = 100) => {
        try {
            const { data, error } = await supabase.rpc('get_user_activity', {
                p_user_id: userId,
                p_days: days,
                p_limit: limit
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting user activity:', error);
            return [];
        }
    },

    /**
     * Get tenant activity summary
     * @param {number} tenantId - Tenant ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Array>}
     */
    getTenantActivitySummary: async (tenantId, days = 7) => {
        try {
            const { data, error } = await supabase.rpc('get_tenant_activity_summary', {
                p_tenant_id: tenantId,
                p_days: days
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting tenant activity summary:', error);
            return [];
        }
    },

    /**
     * Query audit logs with filters
     * @param {Object} filters - Query filters
     * @param {number} filters.tenantId - Tenant ID
     * @param {number} filters.userId - Filter by user
     * @param {string} filters.action - Filter by action type
     * @param {string} filters.entityType - Filter by entity type
     * @param {string} filters.startDate - Start date (ISO string)
     * @param {string} filters.endDate - End date (ISO string)
     * @param {number} filters.limit - Max records (default: 100)
     * @param {number} filters.offset - Pagination offset
     * @returns {Promise<{data: Array, count: number}>}
     */
    queryAuditLogs: async (filters = {}) => {
        try {
            const {
                tenantId,
                userId,
                action,
                entityType,
                startDate,
                endDate,
                limit = 100,
                offset = 0
            } = filters;

            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }

            if (userId) {
                query = query.eq('user_id', userId);
            }

            if (action) {
                query = query.eq('action', action);
            }

            if (entityType) {
                query = query.eq('entity_type', entityType);
            }

            if (startDate) {
                query = query.gte('created_at', startDate);
            }

            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            return { data: data || [], count: count || 0 };
        } catch (error) {
            console.error('Error querying audit logs:', error);
            return { data: [], count: 0 };
        }
    },

    /**
     * Log a custom audit event (frontend-initiated)
     * @param {Object} auditData - Audit data
     * @param {number} auditData.tenantId - Tenant ID
     * @param {number} auditData.userId - User ID
     * @param {string} auditData.action - Action type
     * @param {string} auditData.entityType - Entity type
     * @param {number} auditData.entityId - Entity ID
     * @param {string} auditData.entityName - Entity name
     * @param {string} auditData.description - Description
     * @param {Object} auditData.metadata - Additional metadata
     * @returns {Promise<{success: boolean, id?: number}>}
     */
    logAuditEvent: async (auditData) => {
        try {
            const {
                tenantId,
                userId,
                action,
                entityType,
                entityId,
                entityName,
                description,
                metadata = {}
            } = auditData;

            const { data, error } = await supabase.rpc('create_audit_log', {
                p_tenant_id: tenantId,
                p_user_id: userId,
                p_action: action,
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_entity_name: entityName,
                p_description: description,
                p_metadata: metadata
            });

            if (error) throw error;

            return { success: true, id: data };
        } catch (error) {
            console.error('Error logging audit event:', error);
            return { success: false };
        }
    },

    /**
     * Get audit statistics for dashboard
     * @param {number} tenantId - Tenant ID
     * @param {number} days - Number of days
     * @returns {Promise<Object>}
     */
    getAuditStats: async (tenantId, days = 7) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('audit_logs')
                .select('action, entity_type')
                .eq('tenant_id', tenantId)
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            // Calculate statistics
            const stats = {
                totalEvents: data.length,
                byAction: {},
                byEntityType: {}
            };

            data.forEach(log => {
                // Count by action
                stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
                // Count by entity type
                stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting audit stats:', error);
            return {
                totalEvents: 0,
                byAction: {},
                byEntityType: {}
            };
        }
    },

    /**
     * Format action name for display
     * @param {string} action - Raw action name
     * @returns {string}
     */
    formatAction: (action) => {
        const actionMap = {
            'CREATE': 'สร้าง',
            'UPDATE': 'แก้ไข',
            'DELETE': 'ลบ',
            'HARD_DELETE': 'ลบถาวร',
            'RESTORE': 'กู้คืน',
            'LOGIN': 'เข้าสู่ระบบ',
            'LOGOUT': 'ออกจากระบบ',
            'VIEW': 'ดู',
            'EXPORT': 'ส่งออก',
            'APPROVE': 'อนุมัติ',
            'REJECT': 'ปฏิเสธ',
            'approved': 'อนุมัติ',
            'rejected': 'ปฏิเสธ',
            'pending': 'รอดำเนินการ',
            'ACTIVATE': 'เปิดใช้งาน',
            'DEACTIVATE': 'ปิดใช้งาน'
        };
        return actionMap[action] || action;
    },

    /**
     * Format entity type for display
     * @param {string} entityType - Raw entity type
     * @returns {string}
     */
    formatEntityType: (entityType) => {
        const typeMap = {
            'job': 'งาน',
            'user': 'ผู้ใช้',
            'approval': 'การอนุมัติ',
            'attachment': 'ไฟล์แนบ',
            'comment': 'ความคิดเห็น',
            'project': 'โครงการ',
            'notification': 'การแจ้งเตือน'
        };
        return typeMap[entityType] || entityType;
    },

    /**
     * Get action icon/emoji
     * @param {string} action - Action type
     * @returns {string}
     */
    getActionIcon: (action) => {
        const iconMap = {
            'CREATE': '➕',
            'UPDATE': '✏️',
            'DELETE': '🗑️',
            'HARD_DELETE': '❌',
            'RESTORE': '♻️',
            'LOGIN': '🔐',
            'LOGOUT': '🚪',
            'VIEW': '👁️',
            'EXPORT': '📤',
            'APPROVE': '✅',
            'REJECT': '❌',
            'approved': '✅',
            'rejected': '❌',
            'ACTIVATE': '🟢',
            'DEACTIVATE': '🔴'
        };
        return iconMap[action] || '📝';
    }
};

export default auditService;
