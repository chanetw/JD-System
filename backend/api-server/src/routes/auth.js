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
 * Supports both V1 and V2 token formats
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

  // Debug JWT verification
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[Auth] ⚠️ JWT_SECRET is not set in environment variables!');
    return res.status(500).json({
      success: false,
      error: 'SERVER_CONFIG_ERROR',
      message: 'JWT Secret not configured on server'
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('[Auth] JWT Verification Error:', {
        errorName: err.name,
        errorMessage: err.message,
        tokenLength: token.length,
        secretExists: !!jwtSecret
      });
      return res.status(403).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Token ไม่ถูกต้องหรือหมดอายุ',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (!user) {
      console.warn('[Auth] Token payload is empty or invalid');
      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN_PAYLOAD',
        message: 'Token payload is invalid'
      });
    }

    // Normalize token payload to support both V1 and V2 formats
    // V1: { sub, userId, tenantId, email, roles: [] }
    // V2: { sub, userId, tenantId, organizationId, email, roleId, role }
    const normalizedUser = {
      sub: user.sub || user.userId,
      userId: user.userId || user.id,
      tenantId: user.tenantId,
      email: user.email,
      // Support both V1 (roles array) and V2 (role string)
      roles: user.roles || (user.role ? [user.role] : []),
      // Add V2 specific fields if present
      organizationId: user.organizationId,
      roleId: user.roleId,
      role: user.role
    };

    // Validate required fields
    if (!normalizedUser.tenantId || !normalizedUser.userId) {
      console.warn('[Auth] Token missing required fields:', {
        userId: normalizedUser.userId,
        tenantId: normalizedUser.tenantId
      });
      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN_PAYLOAD',
        message: 'Token payload is invalid (missing userId or tenantId)'
      });
    }

    console.log('[Auth] ✅ Token verified successfully:', {
      userId: normalizedUser.userId,
      tenantId: normalizedUser.tenantId,
      roles: normalizedUser.roles,
      isV2Token: !!user.roleId // Check if it's a V2 token
    });

    req.user = normalizedUser;
    next();
  });
}

/**
 * Middleware to set RLS context for authenticated requests
 * Must be used AFTER authenticateToken middleware
 * Supports both V1 and V2 token formats
 */
export async function setRLSContextMiddleware(req, res, next) {
  try {
    if (req.user && req.user.tenantId) {
      const prisma = getDatabase();
      const tenantId = req.user.tenantId;

      console.log('[RLS Middleware] Setting RLS context:', {
        userId: req.user.userId,
        tenantId: tenantId,
        hasOrganizationId: !!req.user.organizationId
      });

      await setRLSContext(prisma, tenantId);
    } else {
      console.warn('[RLS Middleware] User or tenantId not available:', {
        hasUser: !!req.user,
        tenantId: req.user?.tenantId
      });
    }
    next();
  } catch (error) {
    console.error('[RLS Middleware] Error setting RLS context:', error.message);
    // Continue even if setting fails - don't block the request
    next();
  }
}

/**
 * Middleware สำหรับตรวจสอบความเป็น Admin
 * Supports both V1 (roles array) and V2 (role string) token formats
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Authentication required'
    });
  }

  // Check V1 format (roles array)
  if (req.user.roles && Array.isArray(req.user.roles) && req.user.roles.includes('admin')) {
    return next();
  }

  // Check V2 format (role string) - Admin roles in V2: SuperAdmin, OrgAdmin
  if (req.user.role && ['SuperAdmin', 'OrgAdmin', 'admin'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
    message: 'Admin access required'
  });
}

/**
 * Middleware สำหรับดึง tenantId มาจาก User Object
 */
export function injectTenantId(req, res, next) {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
}

/**
 * Helper alias สำหรับ authenticateToken
 */
export const requireAuth = authenticateToken;

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
 * POST /api/auth/login-demo
 * Demo Login Logic: Use selected userId to generate REAL token
 * (No password required - for DEMO purposes only)
 */
router.post('/login-demo', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const prisma = getDatabase();

    // 1. Fetch User (Read-Only)
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userRoles: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Generate Real JWT Token
    const tokenPayload = {
      sub: crypto.randomUUID(),
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.userRoles.map(ur => ur.roleName)
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // 3. Helper: Format User Response
    const { passwordHash, ...userWithoutPassword } = user;
    const formattedUser = {
      ...userWithoutPassword,
      roles: user.userRoles.map(ur => ur.roleName)
    };

    console.log(`[Auth] Demo Login Success for: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: formattedUser,
        token: accessToken,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('[Auth] Demo login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
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
        displayName: true,
        // phone: true, // Column missing in DB
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
 * GET /api/v2/auth/verify
 * Verify token and return user (Frontend V2 auth system)
 * Alias for /me endpoint
 */
router.get('/verify', authenticateToken, setRLSContextMiddleware, async (req, res) => {
  try {
    const prisma = getDatabase();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
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

    // Map user data to IUser format for frontend
    const formattedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
      roleName: user.userRoles?.[0]?.roleName || 'Member',
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      data: formattedUser
    });

  } catch (error) {
    console.error('[Auth] Verify token error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFY_FAILED',
      message: 'ไม่สามารถตรวจสอบ token ได้'
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
