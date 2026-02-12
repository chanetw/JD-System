/**
 * @file useRealtimeAnalytics.js
 * @description Hook สำหรับ Real-time updates ของ Analytics Dashboard
 * 
 * วัตถุประสงค์:
 * - อัปเดต Dashboard แบบ Real-time เมื่อข้อมูลเปลี่ยน
 * - ใช้ useJobsRealtime สำหรับการเชื่อมต่อ WebSocket
 * - จัดการ Subscription และ Unsubscription
 */

import { useRef, useEffect, useCallback } from 'react';
import { useJobsRealtime } from '@shared/hooks/useRealtime';
import { useAuthStoreV2 } from '@core/stores/authStoreV2';

/**
 * @function useRealtimeAnalytics
 * @description Hook สำหรับ Real-time updates ของ Analytics Dashboard
 * @param {function} onDataChange - Callback function เมื่อข้อมูลเปลี่ยน
 * @returns {object} - { isConnected, error }
 */
export function useRealtimeAnalytics(onDataChange) {
    const { user } = useAuthStoreV2();
    const tenantId = user?.tenantId;

    // สร้าง callbacks object สำหรับ useJobsRealtime
    const callbacks = {
        onInsert: (payload) => {
            console.log('[Realtime Analytics] Job inserted:', payload);
            if (onDataChange) onDataChange(payload);
        },
        onUpdate: (payload) => {
            console.log('[Realtime Analytics] Job updated:', payload);
            if (onDataChange) onDataChange(payload);
        },
        onDelete: (payload) => {
            console.log('[Realtime Analytics] Job deleted:', payload);
            if (onDataChange) onDataChange(payload);
        }
    };

    // Subscribe ไปยัง jobs table
    useJobsRealtime(tenantId, callbacks, !!tenantId);

    return {
        isConnected: !!tenantId,
        error: null
    };
}

/**
 * @function useRealtimeAnalyticsWithRefetch
 * @description Hook สำหรับ Real-time updates พร้อม Refetch ข้อมูล
 * @param {function} refetch - Function สำหรับ Refetch ข้อมูล
 * @param {number} debounceMs - Debounce time ใน milliseconds (default: 1000)
 * @returns {object} - { isConnected, error }
 */
export function useRealtimeAnalyticsWithRefetch(refetch, debounceMs = 1000) {
    const { user } = useAuthStoreV2();
    const tenantId = user?.tenantId;
    const debounceTimerRef = useRef(null);

    /**
     * Debounced refetch - ใช้ useRef เพื่อหลีกเลี่ยง infinite loop
     */
    const debouncedRefetch = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (refetch) {
                refetch();
            }
        }, debounceMs);
    }, [refetch, debounceMs]);

    // สร้าง callbacks object สำหรับ useJobsRealtime
    const callbacks = {
        onInsert: (payload) => {
            console.log('[Realtime Analytics] Job inserted, refetching...', payload);
            debouncedRefetch();
        },
        onUpdate: (payload) => {
            console.log('[Realtime Analytics] Job updated, refetching...', payload);
            debouncedRefetch();
        },
        onDelete: (payload) => {
            console.log('[Realtime Analytics] Job deleted, refetching...', payload);
            debouncedRefetch();
        }
    };

    // Subscribe ไปยัง jobs table
    useJobsRealtime(tenantId, callbacks, !!tenantId);

    // Cleanup timer เมื่อ component unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        isConnected: !!tenantId,
        error: null
    };
}

export default {
    useRealtimeAnalytics,
    useRealtimeAnalyticsWithRefetch
};
