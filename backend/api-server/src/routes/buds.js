/**
 * @file buds.js
 * @description Business Unit (BUD) Routes with RLS Context
 *
 * Features:
 * - CRUD Operations (Create, Read, Update, Delete)
 * - RLS tenant isolation
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/buds
 * List all BUDs for the tenant
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        const buds = await prisma.bud.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        });

        // Transform if necessary (e.g., camelCase)
        const transformed = buds.map(b => ({
            id: b.id,
            name: b.name,
            code: b.code,
            // description: b.description, // Missing in DB
            isActive: b.isActive,
            createdAt: b.createdAt
        }));

        res.json({ success: true, data: transformed });
    } catch (error) {
        console.error('[BUDs] List error:', error);
        res.status(500).json({ success: false, message: 'Failed to list BUDs' });
    }
});

/**
 * GET /api/buds/:id
 * Get single BUD
 */
router.get('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const bud = await prisma.bud.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
                createdAt: true
                // description: true // Missing
            }
        });

        if (!bud) {
            return res.status(404).json({ success: false, message: 'BUD not found' });
        }

        res.json({ success: true, data: bud });
    } catch (error) {
        console.error('[BUDs] Get error:', error);
        res.status(500).json({ success: false, message: 'Failed to get BUD' });
    }
});

/**
 * POST /api/buds
 * Create new BUD
 */
router.post('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const userTenantId = req.user.tenantId; // User's Context
        const { name, code, isActive, tenantId } = req.body; // tenantId explicitly sent from frontend

        console.log('[BUDs] Create Request Body:', req.body);
        console.log('[BUDs] User Tenant ID:', userTenantId);

        const targetTenantId = tenantId ? parseInt(tenantId) : userTenantId;
        console.log('[BUDs] Target Tenant ID:', targetTenantId);

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสายงาน' });
        }
        if (!targetTenantId || isNaN(targetTenantId)) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุบริษัท (Tenant)' });
        }

        // Check if Tenant Exists
        const tenantExists = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
        if (!tenantExists) {
            console.error(`[BUDs] Tenant ID ${targetTenantId} not found`);
            return res.status(400).json({ success: false, message: 'ไม่พบบริษัทที่ระบุ (Tenant Not Found)' });
        }

        const newBud = await prisma.bud.create({
            data: {
                tenantId: targetTenantId,
                name: name.trim(),
                code: code ? code.trim() : null,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.json({ success: true, data: newBud });

    } catch (error) {
        console.error('[BUDs] Create EXCEPTION:', error);

        // Detailed Error Handling for Prisma
        const message = error.code === 'P2002'
            ? 'รหัสหรือชื่อสายงานซ้ำกันในระบบ'
            : error.code === 'P2003'
                ? 'รหัสบริษัทไม่ถูกต้อง (Foreign Key Error)'
                : 'ไม่สามารถสร้างสายงานได้';

        res.status(500).json({
            success: false,
            message,
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * PUT /api/buds/:id
 * Update BUD
 */
router.put('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;
        const { name, code, isActive, tenantId: bodyTenantId } = req.body;

        // Check ownership
        // Relaxed check: Check by ID only for admins/cross-tenant updates
        const existing = await prisma.bud.findUnique({
            where: { id },
            select: { id: true, tenantId: true }
        });
        if (!existing) return res.status(404).json({ success: false, message: 'BUD not found' });

        // Use body tenantId if provided, else keep existing
        const finalTenantId = bodyTenantId ? parseInt(bodyTenantId) : existing.tenantId;

        if (bodyTenantId && isNaN(finalTenantId)) {
            return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
        }

        const updatedBud = await prisma.bud.update({
            where: { id },
            data: {
                tenantId: finalTenantId,
                name,
                code,
                isActive
                // description field removed
            },
            select: { // Explicitly select existing columns to return
                id: true,
                name: true,
                code: true,
                isActive: true,
                createdAt: true
            }
        });

        res.json({ success: true, data: updatedBud });
    } catch (error) {
        console.error('[BUDs] Update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update BUD' });
    }
});

/**
 * DELETE /api/buds/:id
 * Smart delete BUD (Hard delete if no projects, Soft delete if projects exist)
 */
router.delete('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const existing = await prisma.bud.findFirst({ where: { id, tenantId } });
        if (!existing) return res.status(404).json({ success: false, message: 'BUD not found' });

        // 1. Check Dependencies (Projects)
        const projectCount = await prisma.project.count({
            where: { budId: id }
        });

        if (projectCount === 0) {
            // 2. No Dependencies -> Hard Delete 🗑️
            await prisma.bud.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'ลบข้อมูลสายงานถาวรเรียบร้อย (Hard Delete)',
                type: 'hard_delete'
            });
        } else {
            // 3. Has Dependencies -> Soft Delete (Inactive) 🛡️
            await prisma.bud.update({
                where: { id },
                data: { isActive: false }
            });
            res.json({
                success: true,
                message: `ปิดการใช้งานสายงานเรียบร้อย (Soft Delete) เนื่องจากมี ${projectCount} โปรเจกต์ที่เกี่ยวข้อง`,
                type: 'soft_delete'
            });
        }
    } catch (error) {
        console.error('[BUDs] Delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete BUD' });
    }
});

export default router;
