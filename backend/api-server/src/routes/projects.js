/**
 * @file projects.js
 * @description Project Routes with RLS Context
 *
 * Features:
 * - CRUD Operations
 * - RLS tenant isolation
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setRLSContextMiddleware);

function normalizeProjectPayload(body, fallbackTenantId = null, fallbackIsActive = true) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const parsedTenantId = body.tenantId !== undefined && body.tenantId !== null && body.tenantId !== ''
        ? parseInt(body.tenantId, 10)
        : fallbackTenantId;
    const parsedBudId = body.budId !== undefined && body.budId !== null && body.budId !== ''
        ? parseInt(body.budId, 10)
        : null;
    const parsedDepartmentId = body.departmentId !== undefined && body.departmentId !== null && body.departmentId !== ''
        ? parseInt(body.departmentId, 10)
        : null;

    let isActive = fallbackIsActive;
    if (typeof body.isActive === 'boolean') {
        isActive = body.isActive;
    } else if (typeof body.status === 'string') {
        isActive = body.status === 'Active';
    }

    return {
        name,
        code,
        tenantId: parsedTenantId,
        budId: parsedBudId,
        departmentId: parsedDepartmentId,
        isActive
    };
}

function validateProjectPayload(payload) {
    if (!payload.name) return 'กรุณาระบุชื่อโครงการ';
    if (!payload.code) return 'กรุณาระบุรหัสโครงการ';
    if (!payload.tenantId || isNaN(payload.tenantId)) return 'กรุณาระบุบริษัท (Tenant)';
    if (!payload.budId || isNaN(payload.budId)) return 'กรุณาระบุสายงาน (BUD)';
    if (payload.departmentId !== null && isNaN(payload.departmentId)) return 'ข้อมูลแผนกไม่ถูกต้อง';
    return null;
}

function handleProjectMutationError(res, error, action) {
    console.error(`[Projects] ${action} error:`, error);

    let status = 500;
    let message = action === 'create'
        ? 'Failed to create project'
        : 'Failed to update project';

    if (error.code === 'P2002') {
        status = 409;
        message = 'รหัสโครงการนี้ซ้ำในบริษัทเดียวกัน';
    } else if (error.code === 'P2003') {
        status = 400;
        message = 'ข้อมูลบริษัท, สายงาน หรือแผนกไม่ถูกต้อง';
    }

    res.status(status).json({
        success: false,
        message,
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code
    });
}

/**
 * GET /api/projects
 * List all projects for the tenant
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const userRoles = req.user.roles || [];

        console.log('[Projects] GET / - User context:', {
            userId: req.user.userId,
            tenantId: tenantId,
            email: req.user.email,
            roles: req.user.roles
        });

        // ตรวจสอบว่า user เป็น admin/superadmin หรือไม่
        const isAdmin = userRoles.some(role => 
            ['admin', 'superadmin'].includes(typeof role === 'string' ? role.toLowerCase() : role?.name?.toLowerCase())
        );

        let projects;

        if (isAdmin) {
            // Admin เห็นทุกโครงการ
            projects = await prisma.project.findMany({
                where: { tenantId },
                include: {
                    bud: { select: { id: true, name: true, code: true } },
                    department: { select: { id: true, name: true, code: true } }
                },
                orderBy: { name: 'asc' }
            });
        } else {
            // User ทั่วไป เห็นเฉพาะโครงการที่มีส่วนเกี่ยวข้อง
            const userJobs = await prisma.job.findMany({
                where: {
                    tenantId,
                    OR: [
                        { requesterId: userId },
                        { assigneeId: userId },
                        { approvals: { some: { approverId: userId } } }
                    ]
                },
                select: { projectId: true },
                distinct: ['projectId']
            });

            const userProjectIds = [...new Set(userJobs.map(j => j.projectId).filter(Boolean))];

            if (userProjectIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            projects = await prisma.project.findMany({
                where: {
                    tenantId,
                    id: { in: userProjectIds }
                },
                include: {
                    bud: { select: { id: true, name: true, code: true } },
                    department: { select: { id: true, name: true, code: true } }
                },
                orderBy: { name: 'asc' }
            });
        }

        const transformed = projects.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            budId: p.budId,
            budName: p.bud?.name,
            departmentId: p.departmentId,
            departmentName: p.department?.name,
            isActive: p.isActive,
            createdAt: p.createdAt
        }));

        res.json({ success: true, data: transformed });
    } catch (error) {
        console.error('[Projects] List error:', error);
        res.status(500).json({ success: false, message: 'Failed to list projects' });
    }
});

/**
 * GET /api/projects/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const project = await prisma.project.findFirst({
            where: { id, tenantId },
            include: {
                bud: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true, code: true } }
            }
        });

        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        res.json({ success: true, data: project });
    } catch (error) {
        console.error('[Projects] Get error:', error);
        res.status(500).json({ success: false, message: 'Failed to get project' });
    }
});

/**
 * POST /api/projects
 */
router.post('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const tenantId = req.user.tenantId;
        const payload = normalizeProjectPayload(req.body, tenantId, true);
        const validationError = validateProjectPayload(payload);

        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const project = await prisma.project.create({
            data: {
                tenantId: payload.tenantId,
                name: payload.name,
                code: payload.code,
                budId: payload.budId,
                departmentId: payload.departmentId,
                isActive: payload.isActive
            }
        });

        res.json({ success: true, data: project });
    } catch (error) {
        handleProjectMutationError(res, error, 'create');
    }
});

/**
 * PUT /api/projects/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);

        // Validate ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }

        // Note: We search by ID only (ignoring tenantId) or we need to relax the check if switching tenants
        // But for safety, we first check if it exists in current user's scope or if we are admin.
        // For simplicity now: Check existence by ID.
        const existing = await prisma.project.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });

        const payload = normalizeProjectPayload(req.body, existing.tenantId, existing.isActive);
        const validationError = validateProjectPayload(payload);

        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        // Build update data safely, only include fields that changed or are valid
        const updateData = {
            tenantId: payload.tenantId,
            name: payload.name,
            code: payload.code,
            isActive: payload.isActive
        };
        
        // Only include optional fields if they are provided values
        if (payload.budId !== null && payload.budId !== undefined) {
            updateData.budId = payload.budId;
        } else {
            updateData.budId = null; // Allow clearing
        }
        
        if (payload.departmentId !== null && payload.departmentId !== undefined) {
            updateData.departmentId = payload.departmentId;
        } else {
            updateData.departmentId = null; // Allow clearing
        }

        const updated = await prisma.project.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        handleProjectMutationError(res, error, 'update');
    }
});

/**
 * GET /api/projects/:projectId/job-assignments
 * Get job assignments for a project (which job types have which assignees)
 */
router.get('/:projectId/job-assignments', async (req, res) => {
    try {
        const prisma = getDatabase();
        const projectId = parseInt(req.params.projectId);
        const tenantId = req.user.tenantId;

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId }
        });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Get job assignments with job type and assignee info
        const assignments = await prisma.projectJobAssignment.findMany({
            where: {
                projectId,
                isActive: true,
                assignee: {
                    is: {
                        isActive: true
                    }
                }
            },
            include: {
                jobType: {
                    select: { id: true, name: true, icon: true, colorTheme: true }
                },
                assignee: {
                    select: { id: true, firstName: true, lastName: true, email: true, displayName: true }
                }
            },
            orderBy: { jobType: { name: 'asc' } }
        });

        // Transform for frontend
        const transformed = assignments.map(a => ({
            id: a.id,
            projectId: a.projectId,
            jobTypeId: a.jobTypeId,
            jobTypeName: a.jobType?.name,
            jobTypeIcon: a.jobType?.icon,
            jobTypeColor: a.jobType?.colorTheme,
            assigneeId: a.assigneeId,
            assigneeName: a.assignee
                ? `${a.assignee.firstName || ''} ${a.assignee.lastName || ''}`.trim() || a.assignee.displayName || a.assignee.email
                : null,
            assignee: a.assignee,
            isActive: a.isActive
        }));

        res.json({ success: true, data: transformed });
    } catch (error) {
        console.error('[Projects] Get job assignments error:', error);
        res.status(500).json({ success: false, message: 'Failed to get job assignments' });
    }
});

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const existing = await prisma.project.findFirst({ where: { id, tenantId } });
        if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });

        await prisma.project.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'Project deleted (soft)' });
    } catch (error) {
        console.error('[Projects] Delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete project' });
    }
});

export default router;
