/**
 * @file auditService.js
 * @description Audit Trail Service - Query and manage audit logs via backend APIs
 */

export const auditService = {
    /**
     * Get audit trail for a specific entity
     * @param {string} entityType - Type of entity ('job', 'user', 'approval', etc.)
     * @param {number} entityId - ID of the entity
     * @param {number} limit - Maximum records to return
     * @returns {Promise<Array>}
     */
    getEntityAuditTrail: async (entityType, entityId, limit = 50) => {
        return [];
    },

    /**
     * Get user activity log
     * @param {number} userId - User ID
     * @param {number} days - Number of days to look back
     * @param {number} limit - Maximum records to return
     * @returns {Promise<Array>}
     */
    getUserActivity: async (userId, days = 30, limit = 100) => {
        return [];
    },

    /**
     * Get tenant activity summary
     * @param {number} tenantId - Tenant ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Array>}
     */
    getTenantActivitySummary: async (tenantId, days = 7) => {
        return [];
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
        return { data: [], count: 0 };
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
        return { success: true, skipped: true, reason: 'backend_owned' };
    },

    /**
     * Get audit statistics for dashboard
     * @param {number} tenantId - Tenant ID
     * @param {number} days - Number of days
     * @returns {Promise<Object>}
     */
    getAuditStats: async (tenantId, days = 7) => {
        return {
            totalEvents: 0,
            byAction: {},
            byEntityType: {}
        };
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
