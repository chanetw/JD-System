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
import { getDatabase } from '../config/database.js';

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
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name)
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // ส่งข้อมูลผู้ใช้กลับ (ไม่รวม password)
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
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
router.get('/me', authenticateToken, async (req, res) => {
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
          include: {
            role: {
              select: {
                name: true,
                displayName: true
              }
            }
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

    res.json({
      success: true,
      data: user
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
 * POST /api/auth/logout
 * ออกจากระบบ (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // ในระบบจริงอาจมี blacklist token หรือ revoke token
  // แต่สำหรับ JWT stateless ให้ client ลบ token ออกเอง
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  });
});

export default router;
