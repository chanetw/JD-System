/**
 * @file departments.js
 * @description Department Routes with RLS Context
 *
 * Features:
 * - Department listing with BUD and Manager info
 * - RLS tenant isolation
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware, requireAdmin } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/departments
 * ดึงรายการแผนกทั้งหมด
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;

    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        budId: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        // description: true, // Missing in DB
        bud: {
          select: { id: true, name: true, code: true }
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform to frontend format
    const transformed = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      budId: d.budId,
      budName: d.bud?.name,
      budCode: d.bud?.code,
      managerId: d.managerId,
      manager: d.manager ? (d.manager.displayName || `${d.manager.firstName} ${d.manager.lastName}`.trim()) : null,
      managerEmail: d.manager?.email,
      isActive: d.isActive,
      createdAt: d.createdAt
    }));

    res.json({
      success: true,
      data: transformed
    });

  } catch (error) {
    console.error('[Departments] Get departments error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_DEPARTMENTS_FAILED',
      message: 'ไม่สามารถดึงรายการแผนกได้'
    });
  }
});

/**
 * GET /api/departments/:id
 * ดึงรายละเอียดแผนกเดี่ยว
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getDatabase();
    const deptId = parseInt(id);

    if (isNaN(deptId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DEPARTMENT_ID',
        message: 'Department ID ไม่ถูกต้อง'
      });
    }

    const department = await prisma.department.findUnique({
      where: { id: deptId },
      include: {
        bud: {
          select: { id: true, name: true, code: true }
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'DEPARTMENT_NOT_FOUND',
        message: 'ไม่พบแผนกนี้'
      });
    }

    // Transform to frontend format
    const transformed = {
      id: department.id,
      name: department.name,
      code: department.code,
      budId: department.budId,
      bud: {
        id: department.bud?.id,
        name: department.bud?.name,
        code: department.bud?.code
      },
      managerId: department.managerId,
      manager: department.manager ? {
        id: department.manager.id,
        name: department.manager.displayName || `${department.manager.firstName} ${department.manager.lastName}`.trim(),
        email: department.manager.email,
        avatar: department.manager.avatarUrl
      } : null,
      isActive: department.isActive,
      createdAt: department.createdAt
    };

    res.json({
      success: true,
      data: transformed
    });

  } catch (error) {
    console.error('[Departments] Get department by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_DEPARTMENT_FAILED',
      message: 'ไม่สามารถดึงข้อมูลแผนกได้'
    });
  }
});


/**
 * POST /api/departments
 */
router.post('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const { name, code, budId, managerId, isActive } = req.body;

    const dept = await prisma.department.create({
      data: {
        tenantId,
        name,
        code,
        budId: budId ? parseInt(budId) : null,
        managerId: managerId ? parseInt(managerId) : null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.json({ success: true, data: dept });
  } catch (error) {
    console.error('[Departments] Create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
});

/**
 * PUT /api/departments/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const prisma = getDatabase();
    const id = parseInt(req.params.id);
    const tenantId = req.user.tenantId;
    const { name, code, budId, managerId, isActive } = req.body;

    const existing = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Department not found' });

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        budId: budId ? parseInt(budId) : null,
        managerId: managerId ? parseInt(managerId) : null,
        isActive
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Departments] Update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

/**
 * DELETE /api/departments/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const prisma = getDatabase();
    const id = parseInt(req.params.id);
    const tenantId = req.user.tenantId;

    const existing = await prisma.department.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Department not found' });

    // 1. Check Dependencies
    // Note: Main dependency for Department is usually Users (via departmentId or assignments)
    // Assuming simple relation for now: user.departmentId or user.departments (if M-N)
    // Typically in this schema, check if any users are assigned to this department

    // Check if any users have this department (assuming simple model or checking relation table)
    // Base on schema, let's check count of users in this dept
    const userCount = await prisma.user.count({
      where: { departmentId: id } // Adjust based on actual schema if it's M-N, but usually 1-N for main dept
    });

    if (userCount === 0) {
      // 2. No Dependencies -> Hard Delete 🗑️
      await prisma.department.delete({
        where: { id }
      });
      res.json({
        success: true,
        message: 'ลบข้อมูลถาวรเรียบร้อย (Hard Delete)',
        type: 'hard_delete'
      });
    } else {
      // 3. Has Dependencies -> Soft Delete (Inactive) 🛡️
      await prisma.department.update({
        where: { id },
        data: { isActive: false }
      });
      res.json({
        success: true,
        message: `ปิดการใช้งานเรียบร้อย (Soft Delete) เนื่องจากมีพนักงาน ${userCount} คนในแผนก`,
        type: 'soft_delete'
      });
    }

  } catch (error) {
    console.error('[Departments] Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
});

/**
 * GET /api/departments/by-manager/:userId
 * ดึงรายการแผนกที่ User เป็น Manager
 */
router.get('/by-manager/:userId', async (req, res) => {
  try {
    const prisma = getDatabase();
    const { userId } = req.params;
    const tenantId = req.user.tenantId;

    const departments = await prisma.department.findMany({
      where: {
        tenantId,
        managerId: parseInt(userId)
      },
      select: {
        id: true,
        name: true,
        code: true,
        budId: true,
        bud: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: departments
    });

  } catch (error) {
    console.error('[Departments] Get by manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments by manager'
    });
  }
});

/**
 * POST /api/departments/assign-manager
 * กำหนด User เป็น Manager ของ Department
 * 
 * Body: { userId: number, departmentIds: number[] }
 * 
 * Logic:
 * 1. ลบ User ออกจาก Manager ของทุกแผนกก่อน (Clean Slate)
 * 2. ตั้ง User เป็น Manager ของแผนกที่เลือก (ถ้ามี)
 * 3. บันทึก Audit Log
 */
router.post('/assign-manager', requireAdmin, async (req, res) => {
  try {
    const prisma = getDatabase();
    const { userId, departmentIds } = req.body;
    const tenantId = req.user.tenantId;

    // Validate Input
    if (!userId || !Array.isArray(departmentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: userId and departmentIds (array) are required'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Step 1: Get old assignments for Audit Log
      const oldDepts = await tx.department.findMany({
        where: {
          tenantId,
          managerId: parseInt(userId)
        },
        select: { id: true, name: true, code: true }
      });

      // Step 2: ลบ User ออกจาก Manager ของทุกแผนก (Clean Slate)
      await tx.department.updateMany({
        where: {
          tenantId,
          managerId: parseInt(userId)
        },
        data: { managerId: null }
      });

      // Step 3: ตั้ง User เป็น Manager ของแผนกใหม่ (ถ้ามี)
      const targetDeptId = departmentIds.length > 0 ? parseInt(departmentIds[0]) : null;

      if (targetDeptId) {
        await tx.department.update({
          where: { id: targetDeptId },
          data: { managerId: parseInt(userId) }
        });
      }

      // Step 4: Create Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: req.user.id, // Admin who performed action
          action: 'UPDATE_MANAGER',
          entityType: 'department', // Correct field name (was tableName)
          entityId: parseInt(userId), // Correct field name (was recordId)
          newValues: { // Correct field name (was newValue)
            previousDepartments: oldDepts.map(d => ({ id: d.id, name: d.name, code: d.code })),
            newDepartmentId: targetDeptId,
            reason: 'Manual Assignment via User Management'
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'Manager assignments updated successfully'
    });

  } catch (error) {
    console.error('[Departments] Assign manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign manager',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
