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
import { getSupabaseClient } from '../config/supabase.js';
import { getDatabase } from '../config/database.js';
import EmailService from '../services/emailService.js';
import { notifyUserSessionUpdate } from '../helpers/userSessionNotification.js';
import { buildLoginUrl } from '../utils/frontendUrl.js';

const router = express.Router();
const userService = new UserService();
const emailService = new EmailService();

const generateTemporaryPassword = (length = 12) => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
};

// Case-insensitive role helper (centralized)
import { hasAdminRole } from '../helpers/roleHelper.js';

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// ✅ ⚡ GET User Edit Details (Combined endpoint - Performance optimized)
router.get('/:id/edit-details', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const tenantId = req.user.tenantId || 1;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USER_ID',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    console.log(`[Users Route] Getting edit details for user ${userId}`);
    const result = await userService.getUserEditDetails(userId, tenantId);
    res.json(result);
  } catch (error) {
    console.error('[Users Route] Error getting user edit details:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
});

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
    const { page, limit, search, isActive, role, departmentId } = req.query;

    const result = await userService.getUsers(req.user.tenantId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      role,
      departmentId: departmentId ? parseInt(departmentId) : undefined
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
    const {
      email,
      password,
      firstName,
      lastName,
      displayName,
      phone,
      title,
      departmentId,
      isActive = true
    } = req.body;

    // ตรวจสอบ required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (email, firstName, lastName)'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์สร้างผู้ใช้ใหม่หรือไม่ (Admin/Requester)
    if (!hasAdminRole(req.user.roles)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์สร้างผู้ใช้ใหม่'
      });
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const existingUser = await userService.prisma.user.findFirst({
      where: {
        tenantId: req.user.tenantId,
        email: normalizedEmail
      },
      select: { id: true }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'อีเมลนี้มีอยู่ในระบบแล้ว'
      });
    }

    const generatedPassword = password || generateTemporaryPassword();
    const mustChangePassword = !password;

    const result = await userService.createUser({
      tenantId: req.user.tenantId,
      email: normalizedEmail,
      password: generatedPassword,
      firstName,
      lastName,
      displayName,
      phone,
      title,
      departmentId,
      isActive,
      mustChangePassword
    });

    if (result.success) {
      const createdUser = result.data;
      let emailSent = false;

      try {
        await emailService.notifyRegistrationApproved({
          userEmail: createdUser.email,
          userName: createdUser.displayName || `${createdUser.firstName || ''} ${createdUser.lastName || ''}`.trim() || createdUser.email,
          temporaryPassword: generatedPassword,
          loginUrl: buildLoginUrl({ req })
        });
        emailSent = true;
      } catch (emailError) {
        console.warn('[Users] User created but email sending failed:', emailError.message);
      }

      return res.status(201).json({
        ...result,
        data: {
          ...createdUser,
          temporaryPassword: generatedPassword,
          mustChangePassword,
          emailSent
        },
        message: mustChangePassword
          ? 'สร้างผู้ใช้สำเร็จและส่งรหัสผ่านชั่วคราวแล้ว'
          : 'สร้างผู้ใช้สำเร็จ'
      });
    }

    res.status(400).json(result);
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
 * PUT /api/users/me/profile
 * แก้ไขโปรไฟล์ตัวเอง (self-service) — ไม่ต้องเป็น Admin
 *
 * @body {string} firstName - ชื่อจริง
 * @body {string} lastName - นามสกุล
 * @body {string} displayName - ชื่อแสดง (optional)
 * @body {string} phone - เบอร์โทร (optional)
 */
router.put('/me/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, displayName, phone } = req.body;

    if (!firstName && !lastName && !displayName && !phone) {
      return res.status(400).json({
        success: false,
        error: 'NO_DATA',
        message: 'ไม่มีข้อมูลที่ต้องการอัปเดต'
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    // Auto-generate displayName if not provided
    if (!updateData.displayName && (updateData.firstName || updateData.lastName)) {
      updateData.displayName = `${updateData.firstName || ''} ${updateData.lastName || ''}`.trim();
    }

    const result = await userService.updateUser(userId, updateData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Users] Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_PROFILE_FAILED',
      message: 'ไม่สามารถอัปเดตโปรไฟล์ได้'
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
    // - Admin/Requester สามารถแก้ไขได้ทุกคน
    // - user ปกติสามารถแก้ไขข้อมูลตัวเองได้
    if (!hasAdminRole(req.user.roles) && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้อื่น'
      });
    }

    const prisma = getDatabase();
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: req.user.tenantId
      },
      select: {
        id: true,
        tenantId: true,
        isActive: true,
        firstName: true,
        lastName: true,
        displayName: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'ไม่พบข้อมูลผู้ใช้นี้'
      });
    }

    const updateData = { ...req.body };

    // ถ้าไม่ใช่ admin ไม่สามารถเปลี่ยน isActive ได้
    if (!hasAdminRole(req.user.roles) && updateData.isActive !== undefined) {
      delete updateData.isActive;
    }

    const result = await userService.updateUser(userId, updateData);

    if (result.success) {
      const adminEditedOtherUser = hasAdminRole(req.user.roles) && req.user.userId !== userId;
      const statusChanged = updateData.isActive !== undefined && existingUser.isActive !== updateData.isActive;

      if (adminEditedOtherUser) {
        await notifyUserSessionUpdate({
          req,
          tenantId: existingUser.tenantId,
          userId,
          requiresLogout: statusChanged,
          title: 'บัญชีของคุณถูกอัปเดตโดยผู้ดูแลระบบ',
          message: statusChanged
            ? 'ผู้ดูแลระบบได้ปรับสถานะบัญชีของคุณ กรุณาออกจากระบบและเข้าสู่ระบบใหม่อีกครั้ง'
            : 'ผู้ดูแลระบบได้อัปเดตข้อมูลบัญชีของคุณแล้ว'
        });
      }

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

    // เฉพาะ Admin/Requester เท่านั้นที่สามารถลบผู้ใช้ได้
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
      await notifyUserSessionUpdate({
        req,
        tenantId: req.user.tenantId,
        userId,
        requiresLogout: true,
        title: 'สิทธิ์การใช้งานของคุณถูกปรับโดยผู้ดูแลระบบ',
        message: 'ผู้ดูแลระบบได้ปรับบทบาทการใช้งานของคุณ กรุณาออกจากระบบและเข้าสู่ระบบใหม่เพื่อใช้งานสิทธิ์ล่าสุด'
      });

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

/**
 * POST /api/users/registrations
 * ส่งคำขอสมัครใช้งาน (Self-Service Registration) — Public endpoint ไม่ต้อง auth
 */
router.post('/registrations', async (req, res) => {
  try {
    const prisma = getDatabase();
    const { title, firstName, lastName, email, phone, department, position, tenantId = 1 } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'กรุณาระบุชื่อ นามสกุล และอีเมล'
      });
    }

    // ตรวจสอบอีเมลซ้ำ
    const existing = await prisma.userRegistrationRequest.findFirst({
      where: { email, tenantId: parseInt(tenantId), status: { not: 'rejected' } }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_REGISTERED',
        message: 'อีเมลนี้มีการลงทะเบียนแล้ว'
      });
    }

    const registration = await prisma.userRegistrationRequest.create({
      data: {
        tenantId: parseInt(tenantId),
        email,
        title: title || null,
        firstName,
        lastName,
        phone: phone || null,
        department: department || null,
        position: position || null,
        status: 'pending'
      }
    });

    console.log('[Users] New registration created:', registration.id, email);

    res.status(201).json({
      success: true,
      data: { id: registration.id, email: registration.email },
      message: 'ส่งคำขอสมัครสำเร็จ รอการอนุมัติจากผู้ดูแลระบบ'
    });

  } catch (error) {
    console.error('[Users] Submit registration error:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_REGISTRATION_FAILED',
      message: 'ไม่สามารถส่งคำขอสมัครได้'
    });
  }
});

/**
 * POST /api/users/registrations/:id/approve
 * อนุมัติคำขอสมัครและสร้างผู้ใช้ใหม่
 *
 * @param {number} id - Registration ID
 * @body {Array} roles - Array of role objects with structure: { name, scopes, level }
 * @body {string} tempPassword - Temporary password (hashed)
 */
router.post('/registrations/:id/approve', async (req, res) => {
  try {
    const { id: registrationId } = req.params;
    const { roles, tempPassword } = req.body;
    const tenantId = req.user.tenantId || 1;
    const currentUserId = req.user.id;

    // Check if user is admin
    const isAdmin = hasAdminRole(req.user.roles);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์อนุมัติการสมัคร'
      });
    }

    // Validate input
    if (!registrationId || !roles || !Array.isArray(roles) || !tempPassword) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: 'ข้อมูลไม่ครบถ้วน (registrationId, roles, tempPassword)'
      });
    }

    console.log('[Users] Approving registration:', registrationId);

    const prisma = getDatabase();

    // 1. Fetch registration data
    const regData = await prisma.userRegistrationRequest.findFirst({
      where: { id: parseInt(registrationId), tenantId }
    });

    if (!regData) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'ไม่พบคำขอสมัครนี้'
      });
    }

    // 2. Create new user in users table
    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: regData.email,
        passwordHash: tempPassword,
        firstName: regData.firstName,
        lastName: regData.lastName,
        displayName: `${regData.firstName} ${regData.lastName}`,
        title: regData.title,
        phone: regData.phone,
        isActive: true,
        status: 'APPROVED'
      }
    });

    console.log('[Users] New user created:', newUser.id);

    // 3. Create roles using updateUserRoles method
    if (roles && roles.length > 0) {
      try {
        const roleResult = await userService.updateUserRoles(newUser.id, roles, {
          executedBy: currentUserId,
          tenantId: tenantId
        });
        if (!roleResult.success) {
          console.warn('[Users] Role creation warning:', roleResult.message);
        }
      } catch (roleError) {
        console.warn('[Users] Failed to create role:', roleError.message);
        // Continue despite role creation error - user is already created
      }
    }

    // 4. Update registration status
    await prisma.userRegistrationRequest.update({
      where: { id: parseInt(registrationId) },
      data: {
        status: 'approved',
        approvedBy: currentUserId
      }
    });

    res.json({
      success: true,
      data: { userId: newUser.id, email: newUser.email },
      message: 'อนุมัติและสร้างผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('[Users] Approve registration error:', error);
    res.status(500).json({
      success: false,
      error: 'APPROVE_REGISTRATION_FAILED',
      message: 'ไม่สามารถอนุมัติการสมัครได้',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/users/registrations/pending
 * ดึงรายการคำขอสมัครที่รอการอนุมัติ
 *
 * @query {string} status - 'pending' (default), 'approved', 'rejected', or 'all'
 */
router.get('/registrations/pending', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const tenantId = req.user.tenantId || 1;

    // Check if user is admin
    const isAdmin = hasAdminRole(req.user.roles);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ดูรายการสมัคร'
      });
    }

    console.log('[Users] Fetching pending registrations for tenant:', tenantId);

    const prisma = getDatabase();

    const where = status !== 'all'
      ? { tenantId, status }
      : { tenantId };

    const data = await prisma.userRegistrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Map database fields to frontend format
    const mappedData = (data || []).map(reg => ({
      id: reg.id,
      email: reg.email,
      title: reg.title,
      firstName: reg.firstName,
      lastName: reg.lastName,
      phone: reg.phone,
      department: reg.department,
      position: reg.position,
      status: reg.status,
      createdAt: reg.createdAt,
      approvedBy: reg.approvedBy,
      rejectionReason: reg.rejectedReason
    }));

    res.json({
      success: true,
      data: mappedData,
      message: `Found ${mappedData.length} pending registrations`
    });

  } catch (error) {
    console.error('[Users] Registrations fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_REGISTRATIONS_FAILED',
      message: 'ไม่สามารถดึงรายการสมัครได้'
    });
  }
});



/**
 * GET /api/users/:id/assignments
 * ดึงรายการงานที่ได้รับมอบหมาย
 */
router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }

    const result = await userService.getUserAssignments(userId);
    res.json(result);
  } catch (error) {
    console.error('[Users] Get assignments error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * POST /api/users/:id/assignments/check-conflict
 * ตรวจสอบความขัดแย้งก่อนมอบหมายงาน
 * Body: { jobTypeIds: [], projectIds: [] }
 */
router.post('/:id/assignments/check-conflict', async (req, res) => {
  try {
    const { id } = req.params;
    const { jobTypeIds, projectIds } = req.body;
    const userId = parseInt(id);

    if (!Array.isArray(jobTypeIds) || !Array.isArray(projectIds)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    const result = await userService.checkAssignmentConflicts(userId, jobTypeIds, projectIds);
    res.json(result);
  } catch (error) {
    console.error('[Users] Check conflict error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * POST /api/users/:id/assignments
 * บันทึกการมอบหมายงาน (Upsert) - รองรับทั้ง BUD-level และ Project-level
 * Body: { jobTypeIds: [], budIds: [], projectIds: [] }
 * Roles: Admin Only
 */
router.post('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { jobTypeIds, budIds = [], projectIds = [] } = req.body;
    const userId = parseInt(id);

    // Permission Check
    if (!hasAdminRole(req.user.roles)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await userService.updateUserAssignments(
      userId,
      { jobTypeIds, budIds, projectIds },
      {
        executedBy: req.user.id,
        tenantId: req.user.tenantId
      }
    );

    if (result.success) {
      await notifyUserSessionUpdate({
        req,
        tenantId: req.user.tenantId,
        userId,
        requiresLogout: false,
        title: 'ขอบเขตงานของคุณถูกอัปเดตโดยผู้ดูแลระบบ',
        message: 'ผู้ดูแลระบบได้ปรับโครงการหรือขอบเขตงานของคุณแล้ว ระบบจะอัปเดตข้อมูลล่าสุดให้อัตโนมัติ'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Users] Update assignments error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
