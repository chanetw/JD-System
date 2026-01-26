/**
 * @file realtimeService.js
 * @description Real-time subscription service using Supabase Realtime
 * Provides live updates for jobs, notifications, and other entities
 */

import { supabase } from '../supabaseClient';

// Store active subscriptions for cleanup
const activeSubscriptions = new Map();

export const realtimeService = {
    /**
     * Subscribe to job changes for a tenant
     * @param {number} tenantId - Tenant ID
     * @param {Function} onInsert - Callback for new jobs
     * @param {Function} onUpdate - Callback for job updates
     * @param {Function} onDelete - Callback for job deletions
     * @returns {string} - Subscription ID for unsubscribing
     */
    subscribeToJobs: (tenantId, { onInsert, onUpdate, onDelete }) => {
        const subscriptionId = `jobs_${tenantId}_${Date.now()}`;

        const channel = supabase
            .channel(subscriptionId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'jobs',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log('🔔 New job created:', payload.new.dj_id);
                    onInsert?.(payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'jobs',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log('🔄 Job updated:', payload.new.dj_id);
                    onUpdate?.(payload.new, payload.old);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'jobs',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log('🗑️ Job deleted:', payload.old.id);
                    onDelete?.(payload.old);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Jobs subscription status: ${status}`);
            });

        activeSubscriptions.set(subscriptionId, channel);
        return subscriptionId;
    },

    /**
     * Subscribe to notifications for a user
     * @param {number} userId - User ID
     * @param {Function} onNewNotification - Callback for new notifications
     * @returns {string} - Subscription ID
     */
    subscribeToNotifications: (userId, onNewNotification) => {
        const subscriptionId = `notifications_${userId}_${Date.now()}`;

        const channel = supabase
            .channel(subscriptionId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('🔔 New notification:', payload.new.title);
                    onNewNotification?.(payload.new);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Notifications subscription status: ${status}`);
            });

        activeSubscriptions.set(subscriptionId, channel);
        return subscriptionId;
    },

    /**
     * Subscribe to approval status changes
     * @param {number} tenantId - Tenant ID
     * @param {Function} onApprovalChange - Callback for approval changes
     * @returns {string} - Subscription ID
     */
    subscribeToApprovals: (tenantId, onApprovalChange) => {
        const subscriptionId = `approvals_${tenantId}_${Date.now()}`;

        const channel = supabase
            .channel(subscriptionId)
            .on(
                'postgres_changes',
                {
                    event: '*', // All events
                    schema: 'public',
                    table: 'approvals',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    console.log('✅ Approval change:', payload.eventType);
                    onApprovalChange?.(payload.eventType, payload.new || payload.old);
                }
            )
            .subscribe();

        activeSubscriptions.set(subscriptionId, channel);
        return subscriptionId;
    },

    /**
     * Subscribe to a specific job for detail page
     * @param {number} jobId - Job ID
     * @param {Function} onUpdate - Callback for updates
     * @param {Function} onNewComment - Callback for new comments
     * @param {Function} onNewActivity - Callback for new activities
     * @returns {string} - Subscription ID
     */
    subscribeToJobDetail: (jobId, { onUpdate, onNewComment, onNewActivity }) => {
        const subscriptionId = `job_detail_${jobId}_${Date.now()}`;

        const channel = supabase
            .channel(subscriptionId)
            // Job updates
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'jobs',
                    filter: `id=eq.${jobId}`
                },
                (payload) => {
                    console.log('🔄 Job detail updated');
                    onUpdate?.(payload.new);
                }
            )
            // New comments
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'job_comments',
                    filter: `job_id=eq.${jobId}`
                },
                (payload) => {
                    console.log('💬 New comment on job');
                    onNewComment?.(payload.new);
                }
            )
            // New activities
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'job_activities',
                    filter: `job_id=eq.${jobId}`
                },
                (payload) => {
                    console.log('📝 New activity on job');
                    onNewActivity?.(payload.new);
                }
            )
            .subscribe();

        activeSubscriptions.set(subscriptionId, channel);
        return subscriptionId;
    },

    /**
     * Subscribe to user presence (online status)
     * @param {number} userId - Current user ID
     * @param {Function} onPresenceChange - Callback for presence changes
     * @returns {string} - Subscription ID
     */
    subscribeToPresence: (userId, onPresenceChange) => {
        const subscriptionId = `presence_${Date.now()}`;

        const channel = supabase
            .channel('online-users', {
                config: {
                    presence: {
                        key: String(userId)
                    }
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                console.log('👥 Presence sync:', Object.keys(presenceState).length, 'users');
                onPresenceChange?.('sync', presenceState);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('🟢 User joined:', key);
                onPresenceChange?.('join', { userId: key, presences: newPresences });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('🔴 User left:', key);
                onPresenceChange?.('leave', { userId: key, presences: leftPresences });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString()
                    });
                }
            });

        activeSubscriptions.set(subscriptionId, channel);
        return subscriptionId;
    },

    /**
     * Unsubscribe from a specific subscription
     * @param {string} subscriptionId - Subscription ID to remove
     */
    unsubscribe: async (subscriptionId) => {
        const channel = activeSubscriptions.get(subscriptionId);
        if (channel) {
            await supabase.removeChannel(channel);
            activeSubscriptions.delete(subscriptionId);
            console.log(`📡 Unsubscribed from: ${subscriptionId}`);
        }
    },

    /**
     * Unsubscribe from all active subscriptions
     * Useful when user logs out or component unmounts
     */
    unsubscribeAll: async () => {
        console.log(`📡 Unsubscribing from ${activeSubscriptions.size} channels...`);
        
        for (const [id, channel] of activeSubscriptions) {
            await supabase.removeChannel(channel);
        }
        
        activeSubscriptions.clear();
        console.log('📡 All subscriptions cleared');
    },

    /**
     * Get count of active subscriptions
     * @returns {number}
     */
    getActiveSubscriptionCount: () => {
        return activeSubscriptions.size;
    },

    /**
     * Get list of active subscription IDs
     * @returns {string[]}
     */
    getActiveSubscriptions: () => {
        return Array.from(activeSubscriptions.keys());
    }
};

export default realtimeService;
