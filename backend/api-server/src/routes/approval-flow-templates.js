/**
 * @file approval-flow-templates.js
 * @description API Routes สำหรับจัดการ Approval Flow Templates (V2)
 * 
 * Endpoints:
 * - GET    /api/approval-flow-templates          : ดึงรายการ Templates ทั้งหมด
 * - GET    /api/approval-flow-templates/:id      : ดึง Template ตาม ID
 * - POST   /api/approval-flow-templates          : สร้าง Template ใหม่
 * - PUT    /api/approval-flow-templates/:id      : แก้ไข Template
 * - DELETE /api/approval-flow-templates/:id      : ลบ Template
 * - POST   /api/approval-flow-templates/:id/steps: เพิ่ม Step ใน Template
 * 
 * - GET    /api/project-flow-assignments/:projectId : ดึง Flow Assignment ของ Project
 * - POST   /api/project-flow-assignments            : สร้าง Assignment ใหม่
 * - PUT    /api/project-flow-assignments/:id        : แก้ไข Assignment
 * - DELETE /api/project-flow-assignments/:id        : ลบ Assignment
 */

import express from 'express';
import { requireAuth, requireAdmin, injectTenantId } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ========================================
// Middleware
// ========================================
router.use(requireAuth);
router.use(injectTenantId);

// ========================================
// Approval Flow Templates
// ========================================

/**
 * GET /api/approval-flow-templates
 * ดึงรายการ Templates ทั้งหมดของ Tenant
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const templates = await prisma.approvalFlowTemplate.findMany({
            where: { tenantId: req.tenantId, isActive: true },
            include: {
                steps: { orderBy: { level: 'asc' } },
                autoAssignUser: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('[ApprovalFlowTemplates] GET error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/approval-flow-templates/:id
 * ดึง Template ตาม ID พร้อม Steps
 */
router.get('/:id', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;

        const template = await prisma.approvalFlowTemplate.findFirst({
            where: { id: parseInt(id), tenantId: req.tenantId },
            include: {
                steps: { orderBy: { level: 'asc' } },
                autoAssignUser: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('[ApprovalFlowTemplates] GET/:id error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/approval-flow-templates
 * สร้าง Template ใหม่พร้อม Steps
 * 
 * Body: { name, description, totalLevels, autoAssignType, autoAssignUserId, steps: [...] }
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { name, description, totalLevels, autoAssignType, autoAssignUserId, steps } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'name is required' });
        }

        const template = await prisma.approvalFlowTemplate.create({
            data: {
                tenantId: req.tenantId,
                name,
                description,
                totalLevels: totalLevels || 0,
                autoAssignType: autoAssignType || 'manual',
                autoAssignUserId: autoAssignUserId || null,
                isActive: true,
                steps: steps && steps.length > 0 ? {
                    create: steps.map((s, idx) => ({
                        level: s.level || (idx + 1),
                        name: s.name,
                        approverType: s.approverType || 'dept_manager',
                        requiredApprovals: s.requiredApprovals || 1
                    }))
                } : undefined
            },
            include: { steps: true }
        });

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        console.error('[ApprovalFlowTemplates] POST error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/approval-flow-templates/:id
 * แก้ไข Template
 * 
 * Body: { name, description, totalLevels, autoAssignType, autoAssignUserId }
 */
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;
        const { name, description, totalLevels, autoAssignType, autoAssignUserId } = req.body;

        const template = await prisma.approvalFlowTemplate.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                totalLevels,
                autoAssignType,
                autoAssignUserId,
                updatedAt: new Date()
            },
            include: { steps: true }
        });

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('[ApprovalFlowTemplates] PUT error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/approval-flow-templates/:id
 * Soft delete Template (set isActive = false)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;

        await prisma.approvalFlowTemplate.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        console.error('[ApprovalFlowTemplates] DELETE error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// Project Flow Assignments
// ========================================

/**
 * GET /api/project-flow-assignments/:projectId
 * ดึง Flow Assignments ของ Project
 */
router.get('/assignments/:projectId', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { projectId } = req.params;

        const assignments = await prisma.projectFlowAssignment.findMany({
            where: {
                projectId: parseInt(projectId),
                tenantId: req.tenantId,
                isActive: true
            },
            include: {
                template: { select: { id: true, name: true, totalLevels: true } },
                jobType: { select: { id: true, name: true } },
                approvers: {
                    where: { isActive: true },
                    include: { approver: { select: { id: true, firstName: true, lastName: true } } }
                }
            }
        });

        res.json({ success: true, data: assignments });
    } catch (error) {
        console.error('[ProjectFlowAssignments] GET error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/project-flow-assignments
 * สร้าง Flow Assignment ใหม่
 * 
 * Body: { projectId, jobTypeId (optional), templateId, overrideAutoAssign, autoAssignType, autoAssignUserId, approvers: [...] }
 */
router.post('/assignments', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { projectId, jobTypeId, templateId, overrideAutoAssign, autoAssignType, autoAssignUserId, approvers } = req.body;

        if (!projectId || !templateId) {
            return res.status(400).json({ success: false, error: 'projectId and templateId are required' });
        }

        const assignment = await prisma.projectFlowAssignment.create({
            data: {
                tenantId: req.tenantId,
                projectId: parseInt(projectId),
                jobTypeId: jobTypeId ? parseInt(jobTypeId) : null,
                templateId: parseInt(templateId),
                overrideAutoAssign: overrideAutoAssign || false,
                autoAssignType,
                autoAssignUserId,
                isActive: true,
                approvers: approvers && approvers.length > 0 ? {
                    create: approvers.map(a => ({
                        level: a.level,
                        approverId: a.approverId,
                        isActive: true
                    }))
                } : undefined
            },
            include: {
                template: true,
                jobType: true,
                approvers: true
            }
        });

        res.status(201).json({ success: true, data: assignment });
    } catch (error) {
        console.error('[ProjectFlowAssignments] POST error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/project-flow-assignments/:id
 * แก้ไข Flow Assignment
 */
router.put('/assignments/:id', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;
        const { templateId, overrideAutoAssign, autoAssignType, autoAssignUserId } = req.body;

        const assignment = await prisma.projectFlowAssignment.update({
            where: { id: parseInt(id) },
            data: {
                templateId,
                overrideAutoAssign,
                autoAssignType,
                autoAssignUserId
            },
            include: { template: true, jobType: true }
        });

        res.json({ success: true, data: assignment });
    } catch (error) {
        console.error('[ProjectFlowAssignments] PUT error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/project-flow-assignments/:id
 * Soft delete Assignment
 */
router.delete('/assignments/:id', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;

        await prisma.projectFlowAssignment.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        console.error('[ProjectFlowAssignments] DELETE error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// Project Flow Approvers
// ========================================

/**
 * POST /api/project-flow-approvers
 * เพิ่ม/อัปเดต Approver สำหรับ Assignment
 * 
 * Body: { assignmentId, level, approverId }
 */
router.post('/approvers', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { assignmentId, level, approverId } = req.body;

        // Upsert: ถ้ามี assignment_id + level + approver_id อยู่แล้ว ให้ตั้งเป็น active
        const existing = await prisma.projectFlowApprover.findFirst({
            where: { assignmentId: parseInt(assignmentId), level, approverId: parseInt(approverId) }
        });

        let approver;
        if (existing) {
            approver = await prisma.projectFlowApprover.update({
                where: { id: existing.id },
                data: { isActive: true }
            });
        } else {
            approver = await prisma.projectFlowApprover.create({
                data: {
                    assignmentId: parseInt(assignmentId),
                    level,
                    approverId: parseInt(approverId),
                    isActive: true
                }
            });
        }

        res.status(201).json({ success: true, data: approver });
    } catch (error) {
        console.error('[ProjectFlowApprovers] POST error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/project-flow-approvers/:id
 * Soft delete Approver
 */
router.delete('/approvers/:id', requireAdmin, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { id } = req.params;

        await prisma.projectFlowApprover.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({ success: true, message: 'Approver removed' });
    } catch (error) {
        console.error('[ProjectFlowApprovers] DELETE error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
