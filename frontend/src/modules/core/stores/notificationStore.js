/**
 * @file notificationStore.js
 * @description Notification State Management (Zustand)
 * 
 * รับข้อมูล Notification จาก Database ผ่าน API
 * และจัดการ State ภายใน App
 */

import { create } from 'zustand';
import { api } from '@shared/services/apiService';
import { useAuthStoreV2 } from './authStoreV2';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    lastFetchAt: 0,
    disabledUntil: 0,
    consecutiveErrors: 0,

    /**
     * ดึงรายการ Notification จาก Database
     */
    fetchNotifications: async () => {
        const now = Date.now();
        const state = get();

        if (state.isLoading) {
            return;
        }

        if (state.disabledUntil && now < state.disabledUntil) {
            return;
        }

        if (state.lastFetchAt && (now - state.lastFetchAt) < 5000) {
            return;
        }

        set({ isLoading: true, lastFetchAt: now });

        try {
            const currentUser = useAuthStoreV2.getState().user;

            if (!currentUser) {
                set({ notifications: [], unreadCount: 0, isLoading: false });
                return;
            }

            // เรียก API ดึง Notifications (ถ้ามีฟังก์ชัน)
            // ถ้ายังไม่มี API function, ใช้ Empty Array ก่อน
            let userNotifications = [];
            if (typeof api.getNotifications === 'function') {
                userNotifications = await api.getNotifications(currentUser.id) || [];
            }

            // Sort by date (Newest first)
            userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const unread = userNotifications.filter(n => !n.isRead).length;

            set({
                notifications: userNotifications,
                unreadCount: unread,
                isLoading: false,
                consecutiveErrors: 0,
                disabledUntil: 0
            });
        } catch (error) {
            console.error('[notificationStore] fetchNotifications error:', error);

            const status = error?.response?.status;
            const nextConsecutiveErrors = (get().consecutiveErrors || 0) + 1;
            const shouldBackoff = status === 401 || status === 403 || error?.code === 'ECONNABORTED';
            const backoffMs = shouldBackoff
                ? Math.min(120000, Math.max(15000, nextConsecutiveErrors * 15000))
                : 0;

            set({
                notifications: [],
                unreadCount: 0,
                isLoading: false,
                consecutiveErrors: nextConsecutiveErrors,
                disabledUntil: backoffMs ? Date.now() + backoffMs : 0
            });
        }
    },

    /**
     * ทำเครื่องหมายว่าอ่านแล้ว
     */
    markAsRead: async (id) => {
        const notifications = get().notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        );

        set({
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length
        });

        // Update in Database (ถ้ามี API function)
        if (typeof api.markNotificationAsRead === 'function') {
            try {
                await api.markNotificationAsRead(id);
            } catch (error) {
                console.error('[notificationStore] markAsRead error:', error);
            }
        }
    },

    /**
     * ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
     */
    markAllAsRead: async () => {
        const notifications = get().notifications.map(n => ({ ...n, isRead: true }));

        set({
            notifications,
            unreadCount: 0
        });

        // Update in Database (ถ้ามี API function)
        if (typeof api.markAllNotificationsAsRead === 'function') {
            try {
                const currentUser = useAuthStoreV2.getState().user;
                await api.markAllNotificationsAsRead(currentUser?.id);
            } catch (error) {
                console.error('[notificationStore] markAllAsRead error:', error);
            }
        }
    },

    /**
     * เพิ่ม Notification ใหม่ (สำหรับ Real-time / WebSocket)
     * 
     * เมื่อ Socket.io ส่ง notification:new event มา
     * ให้เพิ่มลง notifications array และ update unreadCount
     */
    addNotification: (notification) => {
        set(state => {
            // ตรวจสอบว่า notification ยังไม่มี (ป้องกัน duplicate)
            const isDuplicate = state.notifications.some(n => n.id === notification.id);
            if (isDuplicate) {
                return state;
            }

            // เพิ่ม notification ใหม่ที่ด้านบน (newest first)
            return {
                notifications: [notification, ...state.notifications],
                // อัปเดต unreadCount เฉพาะถ้า notification ยังไม่ได้อ่าน
                unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
            };
        });
    },

    /**
     * ลบ Notification (สำหรับ Real-time / WebSocket)
     */
    deleteNotification: (notificationId) => {
        set(state => ({
            notifications: state.notifications.filter(n => n.id !== notificationId),
            // Recalculate unreadCount
            unreadCount: state.notifications.filter(n => !n.isRead && n.id !== notificationId).length
        }));
    }
}));
