/**
 * @file useNotifications.js
 * @description Custom Hook สำหรับจัดการ Notifications ผ่าน Socket.io
 * 
 * Hook นี้จัดการ:
 * - ฟัง Socket.io Events สำหรับ Notifications
 * - Update Zustand Notification Store
 * - Unread count calculation
 * - Mark as read functionality
 */

import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useNotificationStore } from '@core/stores/notificationStore';
import * as socketService from '@shared/services/socketService';

/**
 * @constant PRIORITY_LEVELS
 * @description Levels for notification priority filtering
 */
const PRIORITY_LEVELS = {
  CRITICAL: 'CRITICAL',  // สำคัญที่สุด
  HIGH: 'HIGH',          // สำคัญ
  MEDIUM: 'MEDIUM',      // ปกติ
  LOW: 'LOW'             // น้อย
};

/**
 * @function useNotifications
 * @description Hook สำหรับจัดการ Real-time Notifications
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.priorityFilter - Array of priorities to show in badge (default: ['CRITICAL', 'HIGH'])
 * 
 * @returns {Object} Notification state และ methods
 * @returns {Object.notifications} Array ของ Notifications ทั้งหมด
 * @returns {Object.unreadCount} จำนวน Unread notifications
 * @returns {Object.unreadHighPriority} จำนวน HIGH + CRITICAL unread
 * @returns {Object.markAsRead} Function สำหรับ Mark notification as read
 * @returns {Object.markAllAsRead} Function สำหรับ Mark ทั้งหมด as read
 * @returns {Object.deleteNotification} Function สำหรับลบ Notification
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * function NotificationCenter() {
 *   const {
 *     notifications,
 *     unreadCount,
 *     unreadHighPriority,
 *     markAsRead,
 *     markAllAsRead
 *   } = useNotifications();
 * 
 *   return (
 *     <div>
 *       <p>Unread: {unreadHighPriority}</p>
 *       {notifications.map(notif => (
 *         <div key={notif.id} onClick={() => markAsRead(notif.id)}>
 *           {notif.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 */
export const useNotifications = (options = {}) => {
  // =====================================
  // ขั้นตอนที่ 1: ตั้งค่า Configuration
  // =====================================
  const {
    priorityFilter = [PRIORITY_LEVELS.CRITICAL, PRIORITY_LEVELS.HIGH]
  } = options;

  // =====================================
  // ขั้นตอนที่ 2: ดึงข้อมูลจาก Hooks
  // =====================================

  // Socket.io connection
  const { socket, connected } = useSocket();

  // Notification Store (Zustand)
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  // =====================================
  // ขั้นตอนที่ 3: ตั้งค่า Callbacks
  // =====================================

  /**
   * @function handleNewNotification
   * @description จัดการ Event ใหม่เมื่อ Server ส่ง Notification
   * 
   * @param {Object} notification - ข้อมูล Notification จาก Server
   */
  const handleNewNotification = useCallback((notification) => {
    // เพิ่ม Notification ใหม่เข้าไปใน Store
    useNotificationStore.getState().addNotification(notification);
    console.log('[useNotifications] New notification received:', notification);
  }, []);

  /**
   * @function handleUnreadCount
   * @description ดึงจำนวน Unread count จาก Server
   * 
   * @param {Object} data - ข้อมูลจาก Server
   * @param {number} data.count - จำนวน Unread notifications
   */
  const handleUnreadCount = useCallback((data) => {
    console.log('[useNotifications] Unread count updated:', data.count);
    // Note: Store จะแสดงจำนวน Unread โดย Filter HIGH + CRITICAL เท่านั้น
  }, []);

  /**
   * @function handleNotificationRead
   * @description Server บอกว่า Notification ถูกอ่านแล้ว (ผู้ใช้อื่น)
   * 
   * @param {Object} data - ข้อมูล Notification ที่ถูกอ่าน
   */
  const handleNotificationRead = useCallback((data) => {
    console.log('[useNotifications] Notification marked as read:', data.id);
  }, []);

  // =====================================
  // ขั้นตอนที่ 4: ตั้งค่า Event Listeners ตอน Mount
  // =====================================
  useEffect(() => {
    // ตรวจสอบว่า Socket เชื่อมต่ออยู่
    if (!connected || !socket) {
      return;
    }

    try {
      // ฟัง Event: notification:new (Notification ใหม่จาก Server)
      const unsubscribeNew = socketService.on('notification:new', handleNewNotification);

      // ฟัง Event: notification:unread-count (Unread count อัปเดต)
      const unsubscribeCount = socketService.on('notification:unread-count', handleUnreadCount);

      // ฟัง Event: notification:read (Notification ถูกอ่านแล้ว)
      const unsubscribeRead = socketService.on('notification:read', handleNotificationRead);

      console.log('[useNotifications] Socket event listeners set up');

      // =====================================
      // ขั้นตอนที่ 5: Cleanup ตอน Unmount
      // =====================================
      return () => {
        // ยกเลิกการฟัง Events
        unsubscribeNew();
        unsubscribeCount();
        unsubscribeRead();
        console.log('[useNotifications] Socket event listeners cleaned up');
      };
    } catch (err) {
      console.error('[useNotifications] Error setting up listeners:', err);
    }
  }, [socket, connected, handleNewNotification, handleUnreadCount, handleNotificationRead]);

  // =====================================
  // ขั้นตอนที่ 6: คำนวณ Unread count สำหรับ HIGH + CRITICAL เท่านั้น
  // =====================================

  /**
   * @constant unreadHighPriority
   * @description นับเฉพาะ CRITICAL + HIGH priority ที่ยังไม่ได้อ่าน
   * 
   * เนื่องจากในการออกแบบ Badge ควรแสดง Priority สูงเท่านั้น
   * (ลดการรบกวน focus ของผู้ใช้)
   */
  const unreadHighPriority = notifications.filter(
    notif => !notif.isRead && priorityFilter.includes(notif.priority)
  ).length;

  // =====================================
  // ขั้นตอนที่ 7: Define Local Actions
  // =====================================

  /**
   * @function onMarkAsRead
   * @description Mark single notification as read
   * - Update local store
   * - Emit socket event to server
   * 
   * @param {number} notificationId - ID ของ Notification
   * 
   * @example
   * onMarkAsRead(123);
   */
  const onMarkAsRead = useCallback((notificationId) => {
    // Update local store
    markAsRead(notificationId);

    // Emit event to server
    socketService.emit('notification:read', { notificationId });
  }, [markAsRead]);

  /**
   * @function onMarkAllAsRead
   * @description Mark all notifications as read
   * - Update local store
   * - Emit socket event to server
   * 
   * @example
   * onMarkAllAsRead();
   */
  const onMarkAllAsRead = useCallback(() => {
    // Update local store
    markAllAsRead();

    // Emit event to server
    socketService.emit('notification:read-all', {});
  }, [markAllAsRead]);

  /**
   * @function onDeleteNotification
   * @description Delete notification
   * - Update local store
   * - Emit socket event to server
   * 
   * @param {number} notificationId - ID ของ Notification
   * 
   * @example
   * onDeleteNotification(123);
   */
  const onDeleteNotification = useCallback((notificationId) => {
    // Update local store
    deleteNotification(notificationId);

    // Emit event to server
    socketService.emit('notification:delete', { notificationId });
  }, [deleteNotification]);

  // =====================================
  // ขั้นตอนที่ 8: Return ค่า
  // =====================================
  return {
    notifications,           // Array ของ Notifications ทั้งหมด
    unreadCount,            // จำนวน Unread ทั้งหมด
    unreadHighPriority,     // จำนวน HIGH + CRITICAL unread (สำหรับ Badge)
    markAsRead: onMarkAsRead,           // Function Mark single as read
    markAllAsRead: onMarkAllAsRead,     // Function Mark all as read
    deleteNotification: onDeleteNotification  // Function Delete
  };
};

export default useNotifications;
