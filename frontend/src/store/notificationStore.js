import { create } from 'zustand';
import { loadMockData, saveMockData } from '@/services/mockStorage';
import { useAuthStore } from './authStore';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: true });

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const allNotifications = loadMockData('notifications');
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) {
            set({ notifications: [], unreadCount: 0, isLoading: false });
            return;
        }

        // Filter for current user
        const userNotifications = allNotifications.filter(n => n.recipientId === currentUser.id);

        // Support role-based broadcast (Optional feature for future)
        // e.g., if n.role === 'admin'

        // Sort by date (Newest first)
        userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const unread = userNotifications.filter(n => !n.isRead).length;

        set({
            notifications: userNotifications,
            unreadCount: unread,
            isLoading: false
        });
    },

    markAsRead: async (id) => {
        const notifications = get().notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        );

        set({
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length
        });

        // Update storage
        // Note: In a real app, this would be an API call
        // For mock, we need to update the big list
        const allNotifications = loadMockData('notifications');
        const index = allNotifications.findIndex(n => n.id === id);
        if (index !== -1) {
            allNotifications[index].isRead = true;
            saveMockData('notifications', allNotifications);
        }
    },

    markAllAsRead: async () => {
        const notifications = get().notifications.map(n => ({ ...n, isRead: true }));

        set({
            notifications,
            unreadCount: 0
        });

        // Update storage
        const currentUser = useAuthStore.getState().user;
        const allNotifications = loadMockData('notifications');

        allNotifications.forEach(n => {
            if (n.recipientId === currentUser.id) {
                n.isRead = true;
            }
        });

        saveMockData('notifications', allNotifications);
    },

    // For adding new notification locally (e.g. via websocket in real app)
    addNotification: (notification) => {
        set(state => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1
        }));
    }
}));
