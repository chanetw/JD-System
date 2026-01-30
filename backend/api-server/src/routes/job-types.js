/**
 * @file job-types.js
 * @description Job Types Management Routes
 * 
 * Features:
 * - CRUD Job Types
 * - CRUD Job Type Items (Sub-items)
 * - RLS Context Support
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setRLSContextMiddleware);

// ==========================================
// Job Types CRUD
// ==========================================

/**
 * GET /api/job-types
 * List all job types
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;

        const jobTypes = await prisma.jobType.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                description: true,
                slaWorkingDays: true,
                isActive: true,
                isActive: true,
                icon: true,
                colorTheme: true,
                attachments: true, // Select attachments
                jobTypeItems: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        defaultSize: true,
                        isRequired: true,
                        sortOrder: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Transform for frontend
        const transformed = jobTypes.map(jt => ({
            id: jt.id,
            name: jt.name,
            description: jt.description,
            sla: jt.slaWorkingDays, // Map to 'sla' for frontend
            sla: jt.slaWorkingDays, // Map to 'sla' for frontend
            isActive: jt.isActive,
            icon: jt.icon,
            attachments: jt.attachments || [], // Return attachments
            items: jt.jobTypeItems
        }));

        res.json({ success: true, data: transformed });
    } catch (error) {
        console.error('[JobTypes] List error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list job types',
            debug: error.message,
            code: error.code
        });
    }
});

/**
 * POST /api/job-types
 * Create new job type
 *
 * Validation:
 * - name: required, non-empty string
 * - sla: optional, defaults to 3 days
 * - attachments: optional, must be array if provided
 */
router.post('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;
        const { name, description, sla, status, isActive, icon, attachments } = req.body;

        // ✅ Validation: name is required
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: name is required'
            });
        }

        // ✅ Validation: sla must be a positive number if provided
        if (sla !== undefined) {
            const slaNum = parseInt(sla);
            if (isNaN(slaNum) || slaNum < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Field validation error: sla must be a positive number'
                });
            }
        }

        // ✅ Validation: attachments must be array if provided
        if (attachments !== undefined && !Array.isArray(attachments)) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: attachments must be an array'
            });
        }

        // ✅ Convert status string to isActive boolean if needed
        let jobIsActive = isActive;
        if (status !== undefined) {
            jobIsActive = status === 'active';
        } else if (isActive === undefined) {
            jobIsActive = true; // Default to active
        }

        const newJobType = await prisma.jobType.create({
            data: {
                tenantId,
                name: name.trim(),
                description: description || null,
                slaWorkingDays: sla ? parseInt(sla) : 3,
                isActive: jobIsActive,
                icon: icon || 'social',
                attachments: attachments && Array.isArray(attachments) ? attachments : []
            }
        });

        // Transform response to match frontend expectations
        const response = {
            id: newJobType.id,
            name: newJobType.name,
            description: newJobType.description,
            sla: newJobType.slaWorkingDays,
            isActive: newJobType.isActive,
            status: newJobType.isActive ? 'active' : 'inactive',
            icon: newJobType.icon,
            attachments: newJobType.attachments || []
        };

        res.json({ success: true, data: response });
    } catch (error) {
        console.error('[JobTypes] Create error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create job type',
            debug: error.code
        });
    }
});

/**
 * PUT /api/job-types/:id
 * Update job type
 *
 * Validation:
 * - id: must exist
 * - name: required if provided, non-empty
 * - sla: must be positive if provided
 * - attachments: must be array if provided
 */
router.put('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const { name, description, sla, isActive, status, icon, attachments } = req.body;

        // ✅ Validation: job type must exist
        const jobType = await prisma.jobType.findUnique({
            where: { id },
            select: { id: true, tenantId: true }
        });

        if (!jobType) {
            return res.status(404).json({
                success: false,
                message: `Job type with ID ${id} not found`
            });
        }

        // ✅ Validation: name cannot be empty if provided
        if (name !== undefined && (!name || !name.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: name cannot be empty'
            });
        }

        // ✅ Validation: sla must be positive if provided
        if (sla !== undefined) {
            const slaNum = parseInt(sla);
            if (isNaN(slaNum) || slaNum < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Field validation error: sla must be a positive number'
                });
            }
        }

        // ✅ Validation: attachments must be array if provided
        if (attachments !== undefined && !Array.isArray(attachments)) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: attachments must be an array'
            });
        }

        // ✅ Convert status string to isActive boolean if needed
        let updateIsActive = isActive;
        if (status !== undefined) {
            updateIsActive = status === 'active';
        }

        // Build update data object - only include provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (sla !== undefined) updateData.slaWorkingDays = parseInt(sla);
        if (updateIsActive !== undefined) updateData.isActive = updateIsActive;
        if (icon !== undefined) updateData.icon = icon;
        if (attachments !== undefined) {
            // Store as JSON array (PostgreSQL handles this automatically with Prisma)
            updateData.attachments = attachments.length > 0 ? attachments : [];
        }

        console.log('[JobTypes] Updating job type:', { id, updateData });

        const updated = await prisma.jobType.update({
            where: { id },
            data: updateData
        });

        // Transform response to match frontend expectations
        const response = {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            sla: updated.slaWorkingDays,
            isActive: updated.isActive,
            status: updated.isActive ? 'active' : 'inactive',
            icon: updated.icon,
            attachments: updated.attachments || []
        };

        res.json({ success: true, data: response });
    } catch (error) {
        console.error('[JobTypes] Update error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update job type',
            debug: error.code // PostgreSQL error code for debugging
        });
    }
});

// ==========================================
// Job Type Items (Sub-items) CRUD
// ==========================================

/**
 * GET /api/job-types/:id/items
 * Get items for a specific job type
 */
router.get('/:id/items', async (req, res) => {
    try {
        const prisma = getDatabase();
        const jobTypeId = parseInt(req.params.id);

        const items = await prisma.jobTypeItem.findMany({
            where: { jobTypeId },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                jobTypeId: true,
                name: true,
                defaultSize: true,
                isRequired: true,
                sortOrder: true
                // Exclude createdAt to avoid schema sync issues
            }
        });

        res.json({ success: true, data: items });
    } catch (error) {
        console.error('[JobTypes] Get Items error:', error);
        res.status(500).json({ success: false, message: 'Failed to get items' });
    }
});

/**
 * POST /api/job-types/:id/items
 * Add item to job type
 *
 * Input validation:
 * - name: required, non-empty string
 * - jobTypeId: must exist and belong to user's tenant
 * - sortOrder: auto-incremented to avoid duplicates
 */
router.post('/:id/items', async (req, res) => {
    try {
        const prisma = getDatabase();
        const jobTypeId = parseInt(req.params.id);
        const { name, defaultSize, isRequired } = req.body;

        // ✅ Validation: name is required
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: name is required'
            });
        }

        // ✅ Validation: jobTypeId must exist
        const jobType = await prisma.jobType.findUnique({
            where: { id: jobTypeId },
            select: { id: true, tenantId: true }
        });

        if (!jobType) {
            return res.status(404).json({
                success: false,
                message: `Job type with ID ${jobTypeId} not found`
            });
        }

        // ✅ Validation: jobTypeId must belong to user's tenant (RLS check)
        if (req.user?.tenantId && jobType.tenantId !== req.user.tenantId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Job type belongs to a different tenant'
            });
        }

        // ✅ Auto-increment sortOrder to avoid duplicates
        const lastItem = await prisma.jobTypeItem.findFirst({
            where: { jobTypeId },
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true }
        });

        const nextSortOrder = (lastItem?.sortOrder ?? -1) + 1;

        // Use raw query to avoid createdAt schema mismatch
        const result = await prisma.$queryRaw`
            INSERT INTO job_type_items (job_type_id, name, default_size, is_required, sort_order)
            VALUES (${jobTypeId}, ${name.trim()}, ${defaultSize || '-'}, ${isRequired || false}, ${nextSortOrder})
            RETURNING id, job_type_id AS "jobTypeId", name, default_size AS "defaultSize", is_required AS "isRequired", sort_order AS "sortOrder"
        `;
        const newItem = result[0];

        res.json({ success: true, data: newItem });
    } catch (error) {
        console.error('[JobTypes] Add Item error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add item'
        });
    }
});

/**
 * PUT /api/job-types/items/:itemId
 * Update item
 *
 * Validation:
 * - name: required if provided
 * - itemId: must exist
 */
router.put('/items/:itemId', async (req, res) => {
    try {
        const prisma = getDatabase();
        const itemId = parseInt(req.params.itemId);
        const { name, defaultSize, isRequired, sortOrder } = req.body;

        // ✅ Validation: name is required if provided
        if (name !== undefined && (!name || !name.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Field validation error: name cannot be empty'
            });
        }

        // ✅ Validation: item must exist
        const item = await prisma.jobTypeItem.findUnique({
            where: { id: itemId },
            select: { id: true, jobTypeId: true }
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: `Job type item with ID ${itemId} not found`
            });
        }

        // Use raw query to avoid createdAt schema mismatch
        const result = await prisma.$queryRaw`
            UPDATE job_type_items
            SET 
                name = COALESCE(${name ? name.trim() : null}, name),
                default_size = COALESCE(${defaultSize}, default_size),
                is_required = COALESCE(${isRequired}, is_required),
                sort_order = COALESCE(${sortOrder}, sort_order)
            WHERE id = ${itemId}
            RETURNING id, job_type_id AS "jobTypeId", name, default_size AS "defaultSize", is_required AS "isRequired", sort_order AS "sortOrder"
        `;
        const updated = result[0];

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[JobTypes] Update Item error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update item'
        });
    }
});

/**
 * DELETE /api/job-types/items/:itemId
 * Delete item
 *
 * Validation:
 * - itemId: must exist before deletion
 */
router.delete('/items/:itemId', async (req, res) => {
    try {
        const prisma = getDatabase();
        const itemId = parseInt(req.params.itemId);

        // ✅ Validation: item must exist
        const item = await prisma.jobTypeItem.findUnique({
            where: { id: itemId },
            select: { id: true }
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: `Job type item with ID ${itemId} not found`
            });
        }

        await prisma.$executeRaw`DELETE FROM job_type_items WHERE id = ${itemId}`;

        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('[JobTypes] Delete Item error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete item'
        });
    }
});

export default router;
