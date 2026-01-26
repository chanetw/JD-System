/**
 * @file useRealtime.js
 * @description React hooks for real-time subscriptions
 */

import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '../services/modules/realtimeService';

/**
 * Hook for subscribing to job changes
 * @param {number} tenantId - Tenant ID
 * @param {Object} callbacks - Callback functions
 * @param {boolean} enabled - Whether subscription is enabled
 */
export const useJobsRealtime = (tenantId, callbacks = {}, enabled = true) => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!enabled || !tenantId) return;

        // Subscribe
        subscriptionRef.current = realtimeService.subscribeToJobs(
            tenantId,
            callbacks
        );

        // Cleanup on unmount
        return () => {
            if (subscriptionRef.current) {
                realtimeService.unsubscribe(subscriptionRef.current);
            }
        };
    }, [tenantId, enabled]);

    return subscriptionRef.current;
};

/**
 * Hook for subscribing to notifications
 * @param {number} userId - User ID
 * @param {Function} onNewNotification - Callback for new notifications
 * @param {boolean} enabled - Whether subscription is enabled
 */
export const useNotificationsRealtime = (userId, onNewNotification, enabled = true) => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!enabled || !userId) return;

        subscriptionRef.current = realtimeService.subscribeToNotifications(
            userId,
            onNewNotification
        );

        return () => {
            if (subscriptionRef.current) {
                realtimeService.unsubscribe(subscriptionRef.current);
            }
        };
    }, [userId, enabled]);

    return subscriptionRef.current;
};

/**
 * Hook for subscribing to approvals
 * @param {number} tenantId - Tenant ID
 * @param {Function} onApprovalChange - Callback for approval changes
 * @param {boolean} enabled - Whether subscription is enabled
 */
export const useApprovalsRealtime = (tenantId, onApprovalChange, enabled = true) => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!enabled || !tenantId) return;

        subscriptionRef.current = realtimeService.subscribeToApprovals(
            tenantId,
            onApprovalChange
        );

        return () => {
            if (subscriptionRef.current) {
                realtimeService.unsubscribe(subscriptionRef.current);
            }
        };
    }, [tenantId, enabled]);

    return subscriptionRef.current;
};

/**
 * Hook for subscribing to job detail page
 * @param {number} jobId - Job ID
 * @param {Object} callbacks - Callback functions
 * @param {boolean} enabled - Whether subscription is enabled
 */
export const useJobDetailRealtime = (jobId, callbacks = {}, enabled = true) => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!enabled || !jobId) return;

        subscriptionRef.current = realtimeService.subscribeToJobDetail(
            jobId,
            callbacks
        );

        return () => {
            if (subscriptionRef.current) {
                realtimeService.unsubscribe(subscriptionRef.current);
            }
        };
    }, [jobId, enabled]);

    return subscriptionRef.current;
};

/**
 * Hook for user presence (online status)
 * @param {number} userId - Current user ID
 * @param {Function} onPresenceChange - Callback for presence changes
 * @param {boolean} enabled - Whether subscription is enabled
 */
export const usePresence = (userId, onPresenceChange, enabled = true) => {
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!enabled || !userId) return;

        subscriptionRef.current = realtimeService.subscribeToPresence(
            userId,
            onPresenceChange
        );

        return () => {
            if (subscriptionRef.current) {
                realtimeService.unsubscribe(subscriptionRef.current);
            }
        };
    }, [userId, enabled]);

    return subscriptionRef.current;
};

/**
 * Hook for cleaning up all subscriptions on logout
 */
export const useRealtimeCleanup = () => {
    const cleanup = useCallback(async () => {
        await realtimeService.unsubscribeAll();
    }, []);

    return cleanup;
};

export default {
    useJobsRealtime,
    useNotificationsRealtime,
    useApprovalsRealtime,
    useJobDetailRealtime,
    usePresence,
    useRealtimeCleanup
};
