/**
 * @file users.js
 * @description User Management Routes
 * 
 * จัดการ:
 * - CRUD operations สำหรับผู้ใช้
 * - User profile management
 * - Role assignment
 */

import express from 'express';
import { UserService } from '../services/userService.js';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';

const router = express.Router();
const userService = new UserService();

// Helper: Check if user has admin-level permissions (supports V1 + V2 roles)
function hasAdminRole(roles) {
  if (!roles || !Array.isArray(roles)) return false;
  // V1: 'admin', V2: 'SuperAdmin', 'OrgAdmin' (can manage users)
  return roles.some(role => ['admin', 'SuperAdmin', 'OrgAdmin'].includes(role));
}

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// ✅ GET User data with Roles (Admin/Secure) - Moved to top to avoid conflict
router.get('/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const tenantId = req.user.tenantId || 1;

    // TODO: Add permission check (Only Admin?)

    const result = await userService.getUserWithRoles(userId, tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/users
 * ดึงรายการผู้ใช้ทั้งหมด (แบบ paginated)
 * 
 * @query {number} page - หน้าที่ต้องการ (default: 1)
 * @query {number} limit - จำนวนต่อหน้า (default: 20)
 * @query {string} search - คำค้นหา
 * @query {boolean} isActive - สถานะการใช้งาน
 * @query {string} role - บทบาท
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, isActive, role } = req.query;

    const result = await userService.getUsers(req.user.tenantId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      role
    });

    res.json(result);

  } catch (error) {
    console.error('[Users] Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USERS_FAILED',
      message: 'ไม่สามารถดึงรายการผู้ใช้ได้'
    });
  }
});

/**
 * GET /api/users/:id
 * ดึงข้อมูลผู้ใช้รายบุคคล
 * 
 * @param {number} id - ID ของผู้ใช้
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USER_ID',
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    const prisma = userService.prisma;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: req.user.tenantId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true
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
        message: 'ไม่พบข้อมูลผู้ใช้นี้'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('[Users] Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USER_FAILED',
      message: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้'
    });
  }
});

/**
 * POST /api/users
 * สร้างผู้ใช้ใหม่
 * 
 * @body {string} email - Email
 * @body {string} password - Password
 * @body {string} firstName - ชื่อจริง
 * @body {string} lastName - นามสกุล
 * @body {string} displayName - ชื่อแสดง (optional)
 * @body {string} phone - เบอร์โทรศัพท์ (optional)
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, firstName, lastName, displayName, phone } = req.body;

    // ตรวจสอบ required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (email, password, firstName, lastName)'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์สร้างผู้ใช้ใหม่หรือไม่ (admin/SuperAdmin/OrgAdmin)
    if (!hasAdminRole(req.user.roles)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์สร้างผู้ใช้ใหม่'
      });
    }

    const result = await userService.createUser({
      tenantId: req.user.tenantId,
      email,
      password,
      firstName,
      lastName,
      displayName,
      phone
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('[Users] Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_USER_FAILED',
      message: 'ไม่สามารถสร้างผู้ใช้ใหม่ได้'
    });
  }
});

/**
 * PUT /api/users/:id
 * อัปเดตข้อมูลผู้ใช้
 * 
 * @param {number} id - ID ของผู้ใช้
 * @body {string} firstName - ชื่อจริง (optional)
 * @body {string} lastName - นามสกุล (optional)
 * @body {string} displayName - ชื่อแสดง (optional)
 * @body {string} phone - เบอร์โทรศัพท์ (optional)
 * @body {string} password - รหัสผ่านใหม่ (optional)
 * @body {boolean} isActive - สถานะการใช้งาน (optional)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USER_ID',
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์แก้ไขข้อมูลนี้หรือไม่
    // - admin/SuperAdmin/OrgAdmin สามารถแก้ไขได้ทุกคน
    // - user ปกติสามารถแก้ไขข้อมูลตัวเองได้
    if (!hasAdminRole(req.user.roles) && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้อื่น'
      });
    }

    const updateData = { ...req.body };

    // ถ้าไม่ใช่ admin ไม่สามารถเปลี่ยน isActive ได้
    if (!hasAdminRole(req.user.roles) && updateData.isActive !== undefined) {
      delete updateData.isActive;
    }

    const result = await userService.updateUser(userId, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('[Users] Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_USER_FAILED',
      message: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้'
    });
  }
});

/**
 * DELETE /api/users/:id
 * ลบผู้ใช้ (soft delete)
 * 
 * @param {number} id - ID ของผู้ใช้
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USER_ID',
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // เฉพาะ admin/SuperAdmin/OrgAdmin เท่านั้นที่สามารถลบผู้ใช้ได้
    if (!hasAdminRole(req.user.roles)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ลบผู้ใช้'
      });
    }

    // ไม่สามารถลบตัวเองได้
    if (req.user.userId === userId) {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_DELETE_SELF',
        message: 'ไม่สามารถลบบัญชีตัวเองได้'
      });
    }

    const result = await userService.deleteUser(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('[Users] Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_USER_FAILED',
      message: 'ไม่สามารถลบผู้ใช้ได้'
    });
  }
});

/**
 * POST /api/users/:id/roles
 * อัปเดตบทบาทของผู้ใช้ (Admin Only)
 * 
 * @param {number} id - ID ของผู้ใช้
 * @body {Array} roles - รายการบทบาทและ scope
 */
// ✅ GET User data with Roles (Admin/Secure)


router.post('/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USER_ID',
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    console.log('🔍 [DEBUG] /users/:id/roles payload:', {
      userId,
      user: req.user,
      bodyRoles: roles
    });

    // ตรวจสอบสิทธิ์ Admin (รองรับทั้ง V1 และ V2 role names)
    const isAdmin = hasAdminRole(req.user.roles);

    if (!isAdmin) {
      console.warn('[Users] Permission denied:', {
        userId: req.user.id,
        roles: req.user.roles,
        attempted: 'update user roles'
      });
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์จัดการบทบาท (ต้องการสิทธิ์ Admin)'
      });
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'ข้อมูล roles ไม่ถูกต้อง'
      });
    }

    console.log(`[Users] Updating roles for user ${userId} by admin ${req.user.id}`);

    const result = await userService.updateUserRoles(userId, roles, {
      executedBy: req.user.id,
      tenantId: req.user.tenantId
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('[Users] Update roles error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ROLES_FAILED',
      message: 'ไม่สามารถบันทึกบทบาทได้'
    });
  }
});

export default router;
