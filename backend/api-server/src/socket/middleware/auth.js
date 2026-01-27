/**
 * @file auth.js
 * @description Socket.io Authentication Middleware
 * 
 * ตรวจสอบ JWT Token เมื่อ client เชื่อมต่อ
 * และเก็บ User Info ไปยัง socket object
 */

import jwt from 'jsonwebtoken';

/**
 * @function authenticateSocket
 * @description Socket.io Middleware สำหรับตรวจสอบ JWT
 * 
 * Process:
 * 1. ดึง token จาก socket.handshake.auth
 * 2. ตรวจสอบ JWT signature และ expiry
 * 3. ถ้าถูก ต้อง attach user info ไปยัง socket object
 * 4. ถ้าผิด ให้ disconnect socket
 * 
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Callback function (next())
 * 
 * @throws {Error} ถ้า JWT ไม่ถูกต้อง
 * 
 * @example
 * // ตัวอย่างการใช้งาน:
 * io.use(authenticateSocket);
 */
export const authenticateSocket = (socket, next) => {
  try {
    // =====================================
    // ขั้นตอนที่ 1: ดึง Token จาก Auth Headers
    // =====================================
    
    const token = socket.handshake.auth.token;
    const tenantId = socket.handshake.auth.tenantId;

    // ตรวจสอบว่า token มีค่า
    if (!token) {
      console.error('[Socket Auth] Token not provided');
      return next(new Error('Missing authentication token'));
    }

    // ตรวจสอบว่า tenantId มีค่า
    if (!tenantId) {
      console.error('[Socket Auth] Tenant ID not provided');
      return next(new Error('Missing tenant ID'));
    }

    // =====================================
    // ขั้นตอนที่ 2: ตรวจสอบ JWT Signature
    // =====================================

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    // Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      console.error('[Socket Auth] JWT verification failed:', err.message);
      return next(new Error(`Authentication failed: ${err.message}`));
    }

    // =====================================
    // ขั้นตอนที่ 3: ตรวจสอบข้อมูล Decoded Token
    // =====================================

    // ตรวจสอบว่า userId มีค่า
    if (!decoded.userId) {
      console.error('[Socket Auth] Invalid token: missing userId');
      return next(new Error('Invalid token: missing userId'));
    }

    // ตรวจสอบว่า role มีค่า
    if (!decoded.role) {
      console.error('[Socket Auth] Invalid token: missing role');
      return next(new Error('Invalid token: missing role'));
    }

    // =====================================
    // ขั้นตอนที่ 4: Attach User Info ไปยัง Socket
    // =====================================

    // เก็บข้อมูล user ไปยัง socket.handshake.auth
    // (จะใช้ใน socket handlers)
    socket.handshake.auth.userId = decoded.userId;
    socket.handshake.auth.role = decoded.role;
    socket.handshake.auth.tenantId = tenantId;

    console.log('[Socket Auth] Authentication successful:', {
      userId: decoded.userId,
      role: decoded.role,
      tenantId: tenantId,
      socketId: socket.id
    });

    // ข้อมูล JWT อื่น ๆ (ตัวอย่าง)
    // socket.handshake.auth.email = decoded.email;
    // socket.handshake.auth.displayName = decoded.displayName;

    // =====================================
    // ขั้นตอนที่ 5: ยอม Connection (Call next())
    // =====================================

    next();
  } catch (err) {
    // จัดการ Error ที่ไม่คาดคิด
    console.error('[Socket Auth] Unexpected error:', err);
    next(new Error('Authentication error'));
  }
};

export default authenticateSocket;
