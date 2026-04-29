/**
 * @file realtimeService.js
 * @description Legacy realtime subscription facade.
 *
 * Table-level realtime polling has been removed. Live updates should come from
 * Socket.io through socketService/useSocket.
 */

const activeSubscriptions = new Map();

const createDisabledSubscription = (prefix) => {
    const subscriptionId = `${prefix}_${Date.now()}`;
    activeSubscriptions.set(subscriptionId, { disabled: true });
    return subscriptionId;
};

export const realtimeService = {
    subscribeToJobs: () => createDisabledSubscription('jobs'),

    subscribeToNotifications: () => createDisabledSubscription('notifications'),

    subscribeToApprovals: () => createDisabledSubscription('approvals'),

    subscribeToJobDetail: () => createDisabledSubscription('job_detail'),

    subscribeToPresence: () => createDisabledSubscription('presence'),

    unsubscribe: async (subscriptionId) => {
        activeSubscriptions.delete(subscriptionId);
    },

    unsubscribeAll: async () => {
        activeSubscriptions.clear();
    },

    getActiveSubscriptionCount: () => activeSubscriptions.size,

    getActiveSubscriptions: () => Array.from(activeSubscriptions.keys())
};

export default realtimeService;
