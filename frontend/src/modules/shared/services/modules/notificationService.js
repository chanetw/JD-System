import httpClient from '../httpClient';

const settingsKey = (jobTypeId) => `dj_notification_settings_${jobTypeId}`;

export const notificationService = {
    // --- Notification Settings ---

    getNotificationSettings: async (jobTypeId) => {
        try {
            const raw = localStorage.getItem(settingsKey(jobTypeId));
            if (!raw) return notificationService.getDefaultSettings(jobTypeId);

            return {
                ...notificationService.getDefaultSettings(jobTypeId),
                ...JSON.parse(raw)
            };
        } catch (err) {
            console.warn('[Notification] Failed to read local settings, using defaults:', err);
            return notificationService.getDefaultSettings(jobTypeId);
        }
    },

    getDefaultSettings: (jobTypeId) => ({
        id: 'default',
        jobTypeId,
        notifyRequester: true,
        notifyApprovers: true,
        notifyAssignee: true,
        customEmails: [],
        customUserIds: [],
        events: ['job_created', 'job_approved', 'job_rejected', 'job_assigned', 'job_completed', 'urgent_impact'],
        inAppEnabled: true,
        emailEnabled: true,
        isActive: true
    }),

    saveNotificationSettings: async (jobTypeId, settings) => {
        const data = {
            ...notificationService.getDefaultSettings(jobTypeId),
            ...settings,
            jobTypeId,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(settingsKey(jobTypeId), JSON.stringify(data));
        return data;
    },

    // --- Notification Actions (Fetch & Update) ---

    /**
     * ดึงรายการแจ้งเตือนของผู้ใช้จาก Backend API
     *
     * @param {number} userId - ID ของผู้ใช้ (ไม่ได้ใช้แล้ว เพราะ Backend ใช้ JWT token)
     * @returns {Promise<Array>} รายการ Notification (เรียงจากใหม่สุด, จำกัด 50 รายการ)
     */
    getNotifications: async (userId) => {
        try {
            const response = await httpClient.get('/notifications', {
                params: { limit: 50 }
            });

            if (response.data?.success) {
                return (response.data.data || []).map(n => ({
                    id: n.id,
                    userId: n.userId,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    link: n.link,
                    isRead: n.isRead,
                    createdAt: n.createdAt
                }));
            }

            return [];
        } catch (error) {
            console.error('[notificationService] getNotifications error:', error);

            if (error?.response?.status === 401 || error?.response?.status === 403 || error?.code === 'ECONNABORTED') {
                throw error;
            }

            return [];
        }
    },

    markNotificationAsRead: async (notificationId) => {
        try {
            const response = await httpClient.patch(`/notifications/${notificationId}/read`);
            return response.data;
        } catch (error) {
            console.error('[notificationService] markNotificationAsRead error:', error);
            throw error;
        }
    },

    markAllNotificationsAsRead: async (userId) => {
        try {
            const response = await httpClient.patch('/notifications/read-all');
            return response.data;
        } catch (error) {
            console.error('[notificationService] markAllNotificationsAsRead error:', error);
            throw error;
        }
    },

    // Backend services create job notifications now. This method remains only
    // for old callers so the frontend does not create duplicate notifications.
    sendNotification: async (eventType, jobId, additionalData = {}) => ({
        success: true,
        skipped: true,
        reason: 'handled_by_backend',
        eventType,
        jobId,
        additionalData
    })
};

export default notificationService;
