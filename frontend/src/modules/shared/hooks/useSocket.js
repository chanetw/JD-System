/**
 * @file useSocket.js
 * @description Custom Hook สำหรับ Socket.io Connection Management
 * 
 * Hook นี้จัดการ:
 * - การเชื่อมต่อ Socket.io อัตโนมัติตอน Component Mount
 * - Cleanup connection ตอน Component Unmount
 * - JWT Authentication ผ่าน Auth Store
 * - Connection status tracking
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@core/stores/authStore';
import * as socketService from '@shared/services/socketService';

/**
 * @function useSocket
 * @description Hook สำหรับเชื่อมต่อและจัดการ Socket.io
 * 
 * @param {boolean} autoConnect - อนุญาติให้เชื่อมต่ออัตโนมัติ (default: true)
 * 
 * @returns {Object} Socket connection state และ methods
 * @returns {Object.socket} Socket instance
 * @returns {Object.connected} Connection status
 * @returns {Object.error} Error message (if any)
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * function MyComponent() {
 *   const { socket, connected, error } = useSocket();
 * 
 *   useEffect(() => {
 *     if (connected) {
 *       console.log('Socket connected');
 *       // ตั้งค่า Event Listeners
 *     }
 *   }, [connected]);
 * 
 *   return (
 *     <div>
 *       Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
 *       {error && <p>Error: {error}</p>}
 *     </div>
 *   );
 * }
 */
export const useSocket = (autoConnect = true) => {
  // =====================================
  // ขั้นตอนที่ 1: ดึงข้อมูล Auth จาก Store
  // =====================================
  const { authToken, user } = useAuthStore();

  // =====================================
  // ขั้นตอนที่ 2: ตั้งค่า State สำหรับ Connection
  // =====================================

  /**
   * @state socket
   * Socket.io instance (เซฟไว้เพื่ออ้างอิงใน Component)
   */
  const [socket, setSocket] = useState(null);

  /**
   * @state connected
   * Connection status (true = เชื่อมต่ออยู่, false = ไม่เชื่อมต่อ)
   */
  const [connected, setConnected] = useState(false);

  /**
   * @state error
   * Error message (ถ้าเกิด Error ระหว่างการเชื่อมต่อ)
   */
  const [error, setError] = useState(null);

  // =====================================
  // ขั้นตอนที่ 3: เชื่อมต่อ Socket ตอน Component Mount
  // =====================================
  useEffect(() => {
    // ตรวจสอบว่าต้องเชื่อมต่อหรือไม่
    if (!autoConnect || !authToken || !user) {
      return;
    }

    try {
      // เรียกใช้ socketService เพื่อเชื่อมต่อ
      // ส่ง JWT Token และ Tenant ID เพื่อ Authentication
      const newSocket = socketService.initializeSocket(authToken, user.tenantId);

      // เก็บ Socket instance ใน State
      setSocket(newSocket);

      // =====================================
      // ขั้นตอนที่ 4: ตั้งค่า Event Listeners
      // =====================================

      /**
       * Event: connect
       * เปิดตัว: เมื่อ Socket เชื่อมต่อสำเร็จ
       */
      const handleConnect = () => {
        setConnected(true);
        setError(null);
        console.log('[useSocket] Connected');
      };

      /**
       * Event: disconnect
       * เปิดตัว: เมื่อ Socket ตัดการเชื่อมต่อ
       */
      const handleDisconnect = () => {
        setConnected(false);
        console.log('[useSocket] Disconnected');
      };

      /**
       * Event: connect_error
       * เปิดตัว: เมื่อเกิด Error ระหว่างการเชื่อมต่อ
       */
      const handleError = (err) => {
        setError(err?.message || 'Connection error');
        console.error('[useSocket] Error:', err);
      };

      // ตั้งค่า Event Listeners บน Socket
      newSocket.on('connect', handleConnect);
      newSocket.on('disconnect', handleDisconnect);
      newSocket.on('connect_error', handleError);

      // =====================================
      // ขั้นตอนที่ 5: Cleanup ตอน Component Unmount
      // =====================================
      return () => {
        // ลบ Event Listeners
        newSocket.off('connect', handleConnect);
        newSocket.off('disconnect', handleDisconnect);
        newSocket.off('connect_error', handleError);

        // ปิดการเชื่อมต่อ Socket
        socketService.disconnectSocket();
        setSocket(null);
        setConnected(false);
      };
    } catch (err) {
      // จัดการ Error
      setError(err?.message || 'Failed to initialize socket');
      console.error('[useSocket] Initialization error:', err);
    }
  }, [autoConnect, authToken, user?.tenantId]); // Dependencies

  // คืนค่า Socket state
  return {
    socket,           // Socket instance
    connected,        // Connection status
    error             // Error message
  };
};

export default useSocket;
