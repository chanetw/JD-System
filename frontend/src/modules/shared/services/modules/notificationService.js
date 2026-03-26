
import { supabase } from '../supabaseClient';
import httpClient from '../httpClient';

export const notificationService = {
    // --- Notification Settings ---

    getNotificationSettings: async (jobTypeId) => {
        try {
            const { data, error } = await supabase
                .from('notification_settings')
                .select('*')
                .eq('job_type_id', jobTypeId)
                .single();

            if (error) {
                // Return defaults if not found (PGRST116) or Table missing (PGRST204/42P01)
                // Console warning for debugging but don't crash
                console.warn('[Notification] Fetch settings failed (using defaults):', error.message);
                return notificationService.getDefaultSettings(jobTypeId);
            }

            return {
                id: data.id,
                jobTypeId: data.job_type_id,
                notifyRequester: data.notify_requester,
                notifyApprovers: data.notify_approvers,
                notifyAssignee: data.notify_assignee,
                customEmails: data.custom_emails || [],
                customUserIds: data.custom_user_ids || [],
                events: data.events || [],
                inAppEnabled: data.in_app_enabled,
                emailEnabled: data.email_enabled,
                isActive: data.is_active
            };
        } catch (err) {
            console.warn('[Notification] Exception fetching settings (using defaults):', err);
            return notificationService.getDefaultSettings(jobTypeId);
        }
    },

    getDefaultSettings: (jobTypeId) => ({
        id: 'default',
        jobTypeId: jobTypeId,
        notifyRequester: true,
        notifyApprovers: true,
        notifyAssignee: true,
        customEmails: [],
        customUserIds: [],
        events: ['job_created', 'job_approved', 'job_rejected', 'job_assigned', 'job_completed', 'urgent_impact'],
        inAppEnabled: true,
        emailEnabled: true, // Enable by default to ensure logging in notification_logs
        isActive: true
    }),

    saveNotificationSettings: async (jobTypeId, settings) => {
        const upsertData = {
            job_type_id: jobTypeId,
            notify_requester: settings.notifyRequester,
            notify_approvers: settings.notifyApprovers,
            notify_assignee: settings.notifyAssignee,
            custom_emails: settings.customEmails,
            custom_user_ids: settings.customUserIds,
            events: settings.events,
            in_app_enabled: settings.inAppEnabled,
            email_enabled: settings.emailEnabled,
            is_active: settings.isActive ?? true,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('notification_settings')
            .upsert(upsertData, {
                onConflict: 'job_type_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (error) throw error;
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
                // แปลง Prisma camelCase fields ให้ตรงกับที่ Frontend ใช้
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

            // Propagate critical errors so store can apply backoff/retry policy
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

    // --- Sending Notifications ---

    sendNotification: async (eventType, jobId, additionalData = {}) => {
        // 1. Get job details
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select(`
                *,
                job_type:job_types(*),
                requester:users!jobs_requester_id_fkey(*),
                assignee:users!jobs_assignee_id_fkey(*)
            `)
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            console.error('Job not found for notification:', jobId);
            return;
        }

        // 2. Get notification settings
        const settings = await notificationService.getNotificationSettings(job.job_type_id);
        if (!settings || !settings.isActive) {
            console.log('Notifications disabled for job type:', job.job_type_id);
            return;
        }

        // 3. Check if this event should be notified
        if (!settings.events?.includes(eventType)) {
            console.log('Event not configured for notification:', eventType);
            return;
        }

        // 4. Collect recipients
        const recipients = [];

        if (settings.notifyRequester && job.requester) {
            recipients.push({ userId: job.requester.id, email: job.requester.email });
        }
        if (settings.notifyAssignee && job.assignee) {
            recipients.push({ userId: job.assignee.id, email: job.assignee.email });
        }
        // TODO: Add approvers based on approval flow (need integration with adminService if complex)

        // Add custom users
        if (settings.customUserIds?.length > 0) {
            const { data: customUsers } = await supabase
                .from('users')
                .select('id, email')
                .in('id', settings.customUserIds);

            customUsers?.forEach(u => {
                if (!recipients.find(r => r.userId === u.id)) {
                    recipients.push({ userId: u.id, email: u.email });
                }
            });
        }

        // Add custom emails
        settings.customEmails?.forEach(email => {
            if (!recipients.find(r => r.email === email)) {
                recipients.push({ email });
            }
        });

        // 5. Create notifications
        const notificationTitle = getNotificationTitle(eventType, job);
        const notificationMessage = getNotificationMessage(eventType, job, additionalData);

        for (const recipient of recipients) {
            // In-App Notification
            if (settings.inAppEnabled && recipient.userId) {
                try {
                    await supabase.from('notifications').insert({
                        user_id: recipient.userId,
                        type: eventType,
                        title: notificationTitle,
                        message: notificationMessage,
                        job_id: jobId,
                        link: `/jobs/${jobId}`,
                        is_read: false,
                        metadata: additionalData
                    });
                } catch (err) {
                    console.warn('[Notification] Failed to send in-app notification:', err);
                }
            }

            // Email Notification (log for now)
            if (settings.emailEnabled && recipient.email) {
                console.log(`[EMAIL] To: ${recipient.email}, Subject: ${notificationTitle}`);

                // Log
                try {
                    await supabase.from('notification_logs').insert({
                        job_id: jobId,
                        event_type: eventType,
                        recipient_type: recipient.userId ? 'user' : 'custom_email',
                        recipient_email: recipient.email,
                        recipient_user_id: recipient.userId || null,
                        status: 'pending',
                        subject: notificationTitle,
                        body: notificationMessage
                    });
                } catch (err) {
                    console.warn('[Notification] Failed to log email notification:', err);
                }
            }
        }

        return { success: true, recipientCount: recipients.length };
    }
};

// --- Helpers ---

function getNotificationTitle(eventType, job) {
    const djId = job.dj_id || `DJ-${job.id}`;
    const titles = {
        'job_created': `📝 งานใหม่: ${djId}`,
        'job_approved': `✅ งานอนุมัติแล้ว: ${djId}`,
        'job_rejected': `❌ งานถูกปฏิเสธ: ${djId}`,
        'job_assigned': `👤 มอบหมายงาน: ${djId}`,
        'job_completed': `🎉 งานเสร็จสิ้น: ${djId}`,
        'job_cancelled': `🚫 ยกเลิกงาน: ${djId}`,
        'urgent_impact': `⚡ งานด่วนกระทบ: ${djId}`,
        'deadline_approaching': `⏰ ใกล้ถึงกำหนด: ${djId}`
    };
    return titles[eventType] || `แจ้งเตือน: ${djId}`;
}

function getNotificationMessage(eventType, job, additionalData) {
    const messages = {
        'job_created': `งาน "${job.subject}" ถูกสร้างขึ้นใหม่`,
        'job_approved': `งาน "${job.subject}" ได้รับการอนุมัติแล้ว`,
        'job_rejected': `งาน "${job.subject}" ถูกปฏิเสธ: ${additionalData.reason || ''}`,
        'job_assigned': `งาน "${job.subject}" ถูกมอบหมายให้คุณ`,
        'job_completed': `งาน "${job.subject}" เสร็จสิ้นแล้ว`,
        'job_cancelled': `งาน "${job.subject}" ถูกยกเลิก: ${additionalData.reason || ''}`,
        'urgent_impact': `งานด่วน "${job.subject}" กระทบกำหนดส่งงานอื่น`,
        'deadline_approaching': `งาน "${job.subject}" ใกล้ถึงกำหนดส่ง (พรุ่งนี้)`
    };
    return messages[eventType] || `มีการอัปเดตสำหรับงาน "${job.subject}"`;
}
