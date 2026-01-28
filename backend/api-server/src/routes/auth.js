/**
 * @file auth.js
 * @description Authentication Routes
 * 
 * จัดการ:
 * - Login / Logout
 * - Token refresh
 * - Password reset
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';
import { getDatabase, setRLSContext } from '../config/database.js';
import crypto from 'crypto';

const router = express.Router();
const userService = new UserService();

/**
 * Middleware สำหรับตรวจสอบ JWT token
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Token ไม่ถูกต้องหรือหมดอายุ'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware to set RLS context for authenticated requests
 * Must be used AFTER authenticateToken middleware
 */
export async function setRLSContextMiddleware(req, res, next) {
  try {
    if (req.user && req.user.tenantId) {
      const prisma = getDatabase();
      await setRLSContext(prisma, req.user.tenantId);
    }
    next();
  } catch (error) {
    console.error('[RLS Middleware] Error:', error);
    // Continue even if setting fails
    next();
  }
}

/**
 * POST /api/auth/login
 * เข้าสู่ระบบ
 * 
 * @body {string} email - Email ของผู้ใช้
 * @body {string} password - Password
 * @body {number} tenantId - ID ของ tenant
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    // ตรวจสอบ required fields
    if (!email || !password || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // ค้นหาผู้ใช้
    const userResult = await userService.findByEmail(email, tenantId);
    if (!userResult.success) {
      return res.status(401).json(userResult);
    }

    const user = userResult.data;

    // ตรวจสอบว่าผู้ใช้ active อยู่หรือไม่
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'USER_INACTIVE',
        message: 'บัญชีผู้ใช้ถูกระงับการใช้งาน'
      });
    }

    // ตรวจสอบ password
    const isPasswordValid = await userService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // สร้าง JWT token
    const tokenPayload = {
      sub: crypto.randomUUID(), // Required by Supabase (Dummy UUID)
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.userRoles.map(ur => ur.roleName)
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // ส่งข้อมูลผู้ใช้กลับ (ไม่รวม password)
    const { passwordHash, ...userWithoutPassword } = user;

    // แปลง userRoles เป็น roles (array of strings) ให้ Frontend ใช้งานง่าย
    const formattedUser = {
      ...userWithoutPassword,
      roles: user.userRoles.map(ur => ur.roleName)
    };

    res.json({
      success: true,
      data: {
        user: formattedUser,
        token: accessToken,
        expiresIn: '24h'
      },
      message: 'เข้าสู่ระบบสำเร็จ'
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
});

/**
 * POST /api/auth/refresh
 * ต่ออายุ token
 * 
 * @body {string} token - JWT token ปัจจุบัน
 */


/**
 * GET /api/auth/mock-users
 * ดึงรายชื่อผู้ใช้สำหรับ Demo Login (Public)
 */
router.get('/mock-users', async (req, res) => {
  try {
    const prisma = getDatabase();

    // ดึง users ทั้งหมด (เฉพาะ fields ที่จำเป็นสำหรับการแสดงผลหน้า Login)
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        userRoles: true // Fetch all fields including role_name
      },
      orderBy: { id: 'asc' }
    });

    // Format ข้อมูลให้ตรงกับ Frontend
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
      roles: u.userRoles.map(ur => ur.roleName), // Using Prisma field name 'roleName'
      avatar: null // หรือใส่ default avatar url
    }));

    res.json(formattedUsers);

  } catch (error) {
    console.error('[Auth] Get mock users error:', error);
    res.status(500).json([]);
  }
});

/**
 * POST /api/auth/refresh
 * ต่ออายุ token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'กรุณาระบุ token'
      });
    }

    // ตรวจสอบ token ปัจจุบัน
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    // สร้าง token ใหม่
    const newToken = jwt.sign({
      sub: decoded.sub || crypto.randomUUID(), // Maintian sub or create new
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      roles: decoded.roles
    }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: '24h'
      },
      message: 'ต่ออายุ token สำเร็จ'
    });

  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'TOKEN_REFRESH_FAILED',
      message: 'ไม่สามารถต่ออายุ token ได้'
    });
  }
});

/**
 * GET /api/auth/me
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
router.get('/me', authenticateToken, setRLSContextMiddleware, async (req, res) => {
  try {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            roleName: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // แปลงรูปแบบข้อมูลให้ Frontend (userRoles -> roles)
    const formattedUser = {
      ...user,
      roles: user.userRoles.map(ur => ur.roleName)
    };

    res.json({
      success: true,
      data: formattedUser
    });

  } catch (error) {
    console.error('[Auth] Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USER_FAILED',
      message: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้'
    });
  }
});

/**
 * POST /api/auth/impersonate
 * Admin สวมรอยเป็น User อื่นตาม Role (Real Data Impersonation)
 *
 * @body {string} role - Role ที่ต้องการสลับไป (requester, approver, assignee, admin)
 *
 * Security: ต้องเป็น Admin เท่านั้นถึงจะใช้ได้
 */
router.post('/impersonate', authenticateToken, setRLSContextMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const currentUser = req.user;

    // 1. Security Check: ต้องเป็น Admin เท่านั้น
    const isAdmin = currentUser.roles && currentUser.roles.some(r =>
      r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator'
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'เฉพาะ Admin เท่านั้นที่สามารถสลับ Role ได้'
      });
    }

    // 2. Validate role parameter
    const validRoles = ['requester', 'approver', 'assignee', 'admin'];
    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ROLE',
        message: `Role ไม่ถูกต้อง ต้องเป็น: ${validRoles.join(', ')}`
      });
    }

    const prisma = getDatabase();
    const targetRole = role.toLowerCase();

    // 3. Query User ที่มี Role ตรงกับที่ระบุ
    let targetUser;

    if (targetRole === 'admin') {
      // กลับมาเป็น Admin: ใช้ User ปัจจุบัน (original admin)
      targetUser = await prisma.user.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          isActive: true,
          userRoles: {
            some: {
              roleName: {
                in: ['admin', 'Admin', 'administrator', 'Administrator']
              }
            }
          }
        },
        include: {
          userRoles: true,
          tenant: true
        }
      });
    } else {
      // หา User ที่มี Role ตรงกับที่ระบุ
      targetUser = await prisma.user.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          isActive: true,
          userRoles: {
            some: {
              roleName: {
                contains: targetRole,
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          userRoles: true,
          tenant: true
        }
      });
    }

    // 4. ถ้าไม่เจอ User
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: `ไม่พบผู้ใช้ที่มี Role "${role}" ในระบบ`
      });
    }

    // 5. สร้าง JWT Token ใหม่สำหรับ Target User
    const tokenPayload = {
      sub: crypto.randomUUID(), // Compatibility for Supabase
      userId: targetUser.id,
      tenantId: targetUser.tenantId,
      email: targetUser.email,
      roles: targetUser.userRoles.map(ur => ur.roleName),
      impersonatedBy: currentUser.userId, // เก็บ original admin ID
      isImpersonating: true
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // 6. Format user data สำหรับ Frontend
    const { passwordHash, ...userWithoutPassword } = targetUser;

    console.log(`[Auth] Admin ${currentUser.email} impersonating as ${targetUser.email} (Role: ${role})`);

    res.json({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          displayName: targetUser.displayName || `${targetUser.firstName} ${targetUser.lastName}`.trim(),
          roles: targetUser.userRoles.map(ur => ur.roleName)
        },
        token: accessToken,
        expiresIn: '24h',
        impersonatedBy: currentUser.userId
      },
      message: `สลับเป็น ${targetUser.displayName || targetUser.email} สำเร็จ`
    });

  } catch (error) {
    console.error('[Auth] Impersonate error:', error);
    res.status(500).json({
      success: false,
      error: 'IMPERSONATE_FAILED',
      message: 'เกิดข้อผิดพลาดในการสลับ Role'
    });
  }
});

/**
 * POST /api/auth/logout
 * ออกจากระบบ (client-side token removal)
 */
router.post('/logout', authenticateToken, setRLSContextMiddleware, (req, res) => {
  // ในระบบจริงอาจมี blacklist token หรือ revoke token
  // แต่สำหรับ JWT stateless ให้ client ลบ token ออกเอง
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  });
});

export default router;
