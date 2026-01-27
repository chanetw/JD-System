/**
 * @file socketService.js
 * @description Socket.io Client Service สำหรับ Real-time Communication
 * 
 * บริการนี้จัดการ:
 * - การเชื่อมต่อ Socket.io กับ Server
 * - JWT Authentication
 * - Event listeners และ emitters
 * - Automatic reconnection
 * - Connection lifecycle management
 */

import { io } from 'socket.io-client';

/**
 * Socket.io Client Instance
 * @type {Object|null}
 */
let socket = null;

/**
 * Connection status
 * @type {boolean}
 */
let isConnected = false;

/**
 * @function initializeSocket
 * @description เริ่มต้นการเชื่อมต่อ Socket.io กับ Server
 * 
 * @param {string} authToken - JWT Token สำหรับ Authentication
 * @param {number} tenantId - Tenant ID สำหรับ Multi-tenant isolation
 * 
 * @returns {Promise<Object>} Promise ของ socket instance
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * const socket = await socketService.initializeSocket(token, tenantId);
 * 
 * @throws {Error} เกิด Error ถ้า token ไม่ถูกต้อง
 */
export const initializeSocket = (authToken, tenantId) => {
  // =====================================
  // ขั้นตอนที่ 1: ตรวจสอบ Socket ยังไม่เชื่อมต่อ
  // =====================================
  if (socket) {
    console.warn('[socketService] Socket already connected');
    return socket;
  }

  // =====================================
  // ขั้นตอนที่ 2: ตั้งค่า Socket.io Connection
  // =====================================
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    // ใช้ WebSocket + HTTP Long Polling fallback
    // (ทำให้สามารถทำงานในสภาพแวดล้อมที่แตกต่างกันได้)
    transports: ['websocket', 'polling'],

    // ส่ง JWT Token ในส่วน auth
    // (Server ตรวจสอบ Token ก่อนอนุญาติการเชื่อมต่อ)
    auth: {
      token: authToken,
      tenantId: tenantId
    },

    // ตั้งค่า Reconnection (การเชื่อมต่อซ้ำอัตโนมัติ)
    reconnection: true,
    reconnectionDelay: 1000,      // รอ 1 วินาที ก่อนพยายาม reconnect
    reconnectionDelayMax: 5000,    // รอสูงสุด 5 วินาที
    reconnectionAttempts: 5,       // พยายาม reconnect สูงสุด 5 ครั้ง

    // อื่น ๆ
    autoConnect: true             // เชื่อมต่ออัตโนมัติ
  });

  // =====================================
  // ขั้นตอนที่ 3: ตั้งค่า Event Listeners
  // =====================================

  /**
   * Event: socket:connect
   * เปิดตัว: เมื่อ Socket เชื่อมต่อสำเร็จ
   */
  socket.on('connect', () => {
    isConnected = true;
    console.log('[socketService] Connected to server. Socket ID:', socket.id);
  });

  /**
   * Event: socket:disconnect
   * เปิดตัว: เมื่อ Socket ตัดการเชื่อมต่อ
   */
  socket.on('disconnect', (reason) => {
    isConnected = false;
    console.warn('[socketService] Disconnected from server. Reason:', reason);
  });

  /**
   * Event: connect_error
   * เปิดตัว: เมื่อเกิด Error ระหว่างการเชื่อมต่อ
   */
  socket.on('connect_error', (error) => {
    console.error('[socketService] Connection error:', error);
  });

  /**
   * Event: reconnect_attempt
   * เปิดตัว: เมื่อพยายาม Reconnect
   */
  socket.on('reconnect_attempt', () => {
    console.log('[socketService] Attempting to reconnect...');
  });

  /**
   * Event: reconnect
   * เปิดตัว: เมื่อ Reconnect สำเร็จ
   */
  socket.on('reconnect', () => {
    isConnected = true;
    console.log('[socketService] Reconnected to server');
  });

  return socket;
};

/**
 * @function disconnectSocket
 * @description ปิดการเชื่อมต่อ Socket.io
 * 
 * @returns {void}
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * socketService.disconnectSocket();
 */
export const disconnectSocket = () => {
  // ตรวจสอบว่า Socket ยังเชื่อมต่ออยู่
  if (socket) {
    socket.disconnect();  // ปิดการเชื่อมต่อ
    socket = null;        // ลบ Socket instance
    isConnected = false;
    console.log('[socketService] Socket disconnected');
  }
};

/**
 * @function getSocket
 * @description ดึงค่า Socket instance ปัจจุบัน
 * 
 * @returns {Object|null} Socket instance หรือ null ถ้ายังไม่เชื่อมต่อ
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * const socket = socketService.getSocket();
 * if (socket) {
 *   socket.emit('notification:read', { notificationId: 123 });
 * }
 */
export const getSocket = () => socket;

/**
 * @function isSocketConnected
 * @description ตรวจสอบว่า Socket เชื่อมต่ออยู่หรือไม่
 * 
 * @returns {boolean} true = เชื่อมต่ออยู่, false = ไม่เชื่อมต่อ
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * if (socketService.isSocketConnected()) {
 *   console.log('Socket ready to use');
 * }
 */
export const isSocketConnected = () => isConnected;

/**
 * @function emit
 * @description ส่ง Event ไปยัง Server
 * 
 * @param {string} eventName - ชื่อ Event (เช่น 'notification:read')
 * @param {Object} data - ข้อมูลที่ส่งไป
 * @param {Function} callback - Callback function สำหรับ Acknowledgement
 * 
 * @returns {void}
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * socketService.emit('notification:read', { notificationId: 123 }, (response) => {
 *   console.log('Server acknowledged:', response);
 * });
 */
export const emit = (eventName, data, callback) => {
  // ตรวจสอบว่า Socket เชื่อมต่ออยู่
  if (!socket || !isConnected) {
    console.warn('[socketService] Socket not connected. Cannot emit event:', eventName);
    return;
  }

  // ส่ง Event ไปยัง Server
  if (callback) {
    socket.emit(eventName, data, callback);
  } else {
    socket.emit(eventName, data);
  }
};

/**
 * @function on
 * @description ฟัง Event จาก Server
 * 
 * @param {string} eventName - ชื่อ Event ที่จะฟัง
 * @param {Function} callback - Callback function สำหรับจัดการ Event
 * 
 * @returns {Function} Unsubscribe function
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * const unsubscribe = socketService.on('notification:new', (notification) => {
 *   console.log('New notification:', notification);
 * });
 * 
 * // เมื่อต้องการยกเลิกการฟัง
 * unsubscribe();
 */
export const on = (eventName, callback) => {
  // ตรวจสอบว่า Socket มี Instance
  if (!socket) {
    console.warn('[socketService] Socket not initialized');
    return () => {};
  }

  // ตั้งค่า Event Listener
  socket.on(eventName, callback);

  // คืนค่า Unsubscribe function
  // (สำหรับลบการฟัง Event)
  return () => {
    socket.off(eventName, callback);
  };
};

/**
 * @function off
 * @description ยกเลิกการฟัง Event จาก Server
 * 
 * @param {string} eventName - ชื่อ Event ที่จะยกเลิก
 * @param {Function} callback - Callback function ที่จะลบ
 * 
 * @returns {void}
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * socketService.off('notification:new', myCallback);
 */
export const off = (eventName, callback) => {
  // ตรวจสอบว่า Socket มี Instance
  if (!socket) {
    console.warn('[socketService] Socket not initialized');
    return;
  }

  // ลบ Event Listener
  socket.off(eventName, callback);
};

/**
 * @function once
 * @description ฟัง Event เพียงครั้งเดียว แล้วลบ Listener อัตโนมัติ
 * 
 * @param {string} eventName - ชื่อ Event ที่จะฟัง
 * @param {Function} callback - Callback function สำหรับจัดการ Event
 * 
 * @returns {void}
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * socketService.once('notification:new', (notification) => {
 *   console.log('First notification:', notification);
 * });
 */
export const once = (eventName, callback) => {
  // ตรวจสอบว่า Socket มี Instance
  if (!socket) {
    console.warn('[socketService] Socket not initialized');
    return;
  }

  // ตั้งค่า One-time Event Listener
  socket.once(eventName, callback);
};

/**
 * @constant socketService
 * @description Export ทั้งหมด เป็น Module
 */
export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  emit,
  on,
  off,
  once
};
