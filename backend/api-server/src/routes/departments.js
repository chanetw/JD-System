/**
 * @file departments.js
 * @description Department Routes with RLS Context
 *
 * Features:
 * - Department listing with BUD and Manager info
 * - RLS tenant isolation
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
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
      include: {
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

export default router;
