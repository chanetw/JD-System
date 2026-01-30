/**
 * @file master-data.js
 * @description Master Data Routes with RLS Context
 *
 * Features:
 * - Fetch all master data in one request
 * - RLS tenant isolation
 * - Optimized with parallel queries
 * - In-memory cache (5 minutes TTL)
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ⚡ In-Memory Cache Configuration
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 นาที (300,000 ms)

/**
 * ฟังก์ชันตรวจสอบและดึงข้อมูลจาก Cache
 * @param {string} key - Cache key
 * @returns {object|null} - Cached data หรือ null ถ้าหมดอายุ
 */
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * ฟังก์ชันบันทึกข้อมูลลง Cache
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 */
function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/master-data
 * ดึง Master Data ทั้งหมด (Tenants, BUDs, Projects, JobTypes)
 * 
 * ⚡ Performance: ใช้ In-Memory Cache (TTL: 5 นาที)
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const cacheKey = `master-data-${tenantId}`;
    const shouldRefresh = req.query.refresh === 'true';

    // 🔍 ตรวจสอบ Cache ก่อน (ถ้าไม่ได้สั่ง Refresh)
    const cachedData = getCachedData(cacheKey);
    if (cachedData && !shouldRefresh) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true // บอก Frontend ว่าข้อมูลมาจาก Cache
      });
    }

    // Parallel queries for performance
    const [tenants, buds, departments, projects, holidays, jobTypes] = await Promise.all([
      // Tenants
      prisma.tenant.findMany({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          subdomain: true,
          code: true,
          subdomain: true,
          isActive: true
          // tenantId not needed for tenant itself (it is the ID)
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
          tenantId: true, // Added: Critical for frontend mapping
          createdAt: true
        },
        orderBy: { name: 'asc' }
      }),

      // Departments
      prisma.department.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          budId: true,
          managerId: true, // Needed for potential future features
          isActive: true,
          createdAt: true,
          bud: { select: { name: true } } // Include BUD name for convenience
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
        // tenantId is available by default in findMany if not using 'select' mode (except if 'include' masks it? No, include adds to it)
        // Ensure tenantId is returned. 'include' usually keeps scalar fields unless 'select' is used.
        // Here we use 'include', so all scalars (including tenantId) are returned.
        // So Projects might be fine?
        // Let's verify Project transformation.
        // But for safety/clarity, I can't mix select and include easily without detailed select.
        // Wait, standard findMany with include returns all model scalars. So tenantId IS there for projects.
        // But for BUDs, I used 'select', so I MUST add it.
        orderBy: { name: 'asc' }
      }),

      // Holidays
      prisma.holiday.findMany({
        where: { tenantId },
        orderBy: { date: 'asc' }
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
              name: true,
              defaultSize: true,
              isRequired: true,
              // sortOrder: true // Column missing in DB
            },
            // JobTypes also use 'include', so scalars returned.
            // Wait, line 70: prisma.jobType.findMany({ ... include: ... })
            // So JobTypes should be fine too.
            orderBy: { id: 'asc' }
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
        isActive: t.isActive,
        status: t.isActive ? 'Active' : 'Inactive'
      })),

      buds: buds.map(b => ({
        id: b.id,
        name: b.name,
        code: b.code,
        status: b.isActive ? 'Active' : 'Inactive',
        isActive: b.isActive,
        tenantId: b.tenantId,
        createdAt: b.createdAt
      })),

      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        budId: d.budId,
        budName: d.bud?.name,
        managerId: d.managerId,
        status: d.isActive ? 'Active' : 'Inactive',
        isActive: d.isActive,
        createdAt: d.createdAt
      })),

      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        budId: p.budId,
        budName: p.bud?.name,
        budCode: p.bud?.code,
        status: p.isActive ? 'Active' : 'Inactive',
        isActive: p.isActive,
        tenantId: p.tenantId,
        createdAt: p.createdAt
      })),

      holidays: (holidays || []).map(h => ({
        id: h.id,
        name: h.name,
        date: h.date,
        type: h.type || 'government',
        isRecurring: h.isRecurring,
        tenantId: h.tenantId
      })),

      jobTypes: jobTypes.map(jt => ({
        id: jt.id,
        name: jt.name,
        sla: jt.slaWorkingDays,
        slaWorkingDays: jt.slaWorkingDays,
        description: jt.description,
        icon: jt.icon,
        colorTheme: jt.colorTheme,
        attachments: jt.attachments || [], // Added mapping from DB
        status: jt.isActive ? 'active' : 'inactive',
        isActive: jt.isActive,
        tenantId: jt.tenantId,
        items: jt.jobTypeItems || []
      }))
    };

    // 💾 บันทึกลง Cache
    setCachedData(cacheKey, transformed);

    res.json({
      success: true,
      data: transformed,
      cached: false
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
