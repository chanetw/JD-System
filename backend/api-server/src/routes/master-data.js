/**
 * @file master-data.js
 * @description Master Data Routes with RLS Context
 *
 * Features:
 * - Fetch all master data in one request
 * - RLS tenant isolation
 * - Optimized with parallel queries
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/master-data
 * ดึง Master Data ทั้งหมด (Tenants, BUDs, Projects, JobTypes)
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;

    // Parallel queries for performance
    const [tenants, buds, projects, jobTypes] = await Promise.all([
      // Tenants
      prisma.tenant.findMany({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          subdomain: true,
          isActive: true
        }
      }),

      // BUDs
      prisma.bud.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      }),

      // Projects
      prisma.project.findMany({
        where: { tenantId },
        include: {
          bud: {
            select: { id: true, name: true, code: true }
          }
        },
        orderBy: { name: 'asc' }
      }),

      // Job Types
      prisma.jobType.findMany({
        where: { tenantId },
        include: {
          jobTypeItems: {
            select: {
              id: true,
              name: true,
              defaultSize: true,
              isRequired: true,
              sortOrder: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    // Transform to frontend format
    const transformed = {
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code,
        subdomain: t.subdomain,
        status: t.isActive ? 'Active' : 'Inactive'
      })),

      buds: buds.map(b => ({
        id: b.id,
        name: b.name,
        code: b.code,
        status: b.isActive ? 'Active' : 'Inactive',
        createdAt: b.createdAt
      })),

      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        budId: p.budId,
        budName: p.bud?.name,
        budCode: p.bud?.code,
        status: p.isActive ? 'Active' : 'Inactive',
        createdAt: p.createdAt
      })),

      jobTypes: jobTypes.map(jt => ({
        id: jt.id,
        name: jt.name,
        sla: jt.slaWorkingDays,
        slaWorkingDays: jt.slaWorkingDays,
        description: jt.description,
        icon: jt.icon,
        colorTheme: jt.colorTheme,
        status: jt.isActive ? 'active' : 'inactive',
        items: jt.jobTypeItems || []
      }))
    };

    res.json({
      success: true,
      data: transformed
    });

  } catch (error) {
    console.error('[MasterData] Get master data error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_MASTER_DATA_FAILED',
      message: 'ไม่สามารถดึง Master Data ได้'
    });
  }
});

export default router;
