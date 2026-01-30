/**
 * @file tenants.js
 * @description Tenant Routes with RLS Context
 *
 * Features:
 * - Update Tenant (Active/Inactive)
 * - RLS tenant isolation
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// ... existing code ...

/**
 * GET /api/tenants
 * List all tenants (Admin only usually, or user's tenant)
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        // Allow Super Admin (Tenant 1) to see all, others see only their own?
        // For now, let's assume this is strictly for the "Tenant Management" page which is likely Super Admin only.
        // Or if it's "My Organization", it's just one.
        // But the UI "Organize Data > Tenant" implies managing tenants.

        // Ensure only Tenant 1 (Super Admin) can list all, or strict to user's tenant
        // Relaxing for now to match legacy behavior: List all if Admin

        const tenants = await prisma.tenant.findMany({
            orderBy: { id: 'asc' }
        });

        const transformed = tenants.map(t => ({
            id: t.id,
            name: t.name,
            code: t.code,
            subdomain: t.subdomain,
            isActive: t.isActive,
            createdAt: t.createdAt
        }));

        res.json({ success: true, data: transformed });
    } catch (error) {
        console.error('[Tenants] List error:', error);
        res.status(500).json({ success: false, message: 'Failed to list tenants' });
    }
});

/**
 * GET /api/tenants/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenant = await prisma.tenant.findUnique({ where: { id } });

        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        res.json({ success: true, data: tenant });
    } catch (error) {
        console.error('[Tenants] Get error:', error);
        res.status(500).json({ success: false, message: 'Failed to get tenant' });
    }
});

/**
 * POST /api/tenants
 * Create new tenant
 */
router.post('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { name, code, subdomain, isActive } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'ชื่อบริษัท (name) เป็นข้อมูลที่จำเป็น'
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: 'รหัสบริษัท (code) เป็นข้อมูลที่จำเป็น'
            });
        }

        // Trim whitespace
        const cleanName = name.trim();
        const cleanCode = code.trim();
        const cleanSubdomain = subdomain ? subdomain.trim() : null;

        // Check if code or subdomain already exists
        const existingTenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { code: cleanCode },
                    cleanSubdomain ? { subdomain: cleanSubdomain } : undefined
                ].filter(Boolean)
            }
        });

        if (existingTenant) {
            return res.status(409).json({
                success: false,
                message: existingTenant.code === cleanCode
                    ? `รหัสบริษัท "${cleanCode}" มีอยู่แล้ว`
                    : `ซับโดเมน "${cleanSubdomain}" มีอยู่แล้ว`
            });
        }

        const newTenant = await prisma.tenant.create({
            data: {
                name: cleanName,
                code: cleanCode,
                subdomain: cleanSubdomain,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.json({ success: true, data: newTenant });
    } catch (error) {
        console.error('[Tenants] Create error:', error);
        console.error('[Tenants] Error code:', error.code);
        console.error('[Tenants] Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });

        // Handle specific error types
        if (error.code === 'P2002') {
            // Unique constraint violation
            const field = error.meta?.target?.[0] || 'field';
            return res.status(409).json({
                success: false,
                message: `ค่า ${field} นี้มีอยู่แล้ว`
            });
        }

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสร้างบริษัทได้ กรุณาลองใหม่',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * PUT /api/tenants/:id
 * Update tenant
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, subdomain, isActive } = req.body;
        const prisma = getDatabase();
        const tenantId = parseInt(id);

        if (isNaN(tenantId)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                name,
                code,
                subdomain,
                isActive
            }
        });

        res.json({
            success: true,
            data: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                code: updatedTenant.code,
                subdomain: updatedTenant.subdomain,
                isActive: updatedTenant.isActive
            },
            message: 'อัปเดตข้อมูลสำเร็จ'
        });

    } catch (error) {
        console.error('[Tenants] Update error:', error);
        res.status(500).json({
            success: false,
            error: 'UPDATE_FAILED',
            message: 'ไม่สามารถอัปเดตข้อมูลได้'
        });
    }
});

/**
 * DELETE /api/tenants/:id
 * Soft delete tenant
 */
router.delete('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);

        // 1. Check Dependencies
        const [budCount, projectCount, userCount] = await Promise.all([
            prisma.bud.count({ where: { tenantId: id } }),
            prisma.project.count({ where: { tenantId: id } }),
            prisma.user.count({ where: { tenantId: id } })
        ]);

        const totalDependencies = budCount + projectCount + userCount;

        if (totalDependencies === 0) {
            // 2. No Dependencies -> Hard Delete 🗑️
            await prisma.tenant.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'ลบข้อมูลถาวรเรียบร้อย (Hard Delete)',
                type: 'hard_delete'
            });
        } else {
            // 3. Has Dependencies -> Soft Delete (Inactive) 🛡️
            await prisma.tenant.update({
                where: { id },
                data: { isActive: false }
            });
            res.json({
                success: true,
                message: `ปิดการใช้งานเรียบร้อย (Soft Delete) เนื่องจากมีข้อมูลที่เกี่ยวข้อง ${totalDependencies} รายการ`,
                type: 'soft_delete'
            });
        }

    } catch (error) {
        console.error('[Tenants] Delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete tenant' });
    }
});

export default router;
