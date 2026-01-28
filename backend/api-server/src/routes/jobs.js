/**
 * @file jobs.js
 * @description Job Routes with RLS Context
 *
 * Features:
 * - Role-based job filtering
 * - RLS tenant isolation
 * - Pagination support
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/jobs
 * ดึงงานตามบทบาทและ filters
 *
 * @query {string} role - 'requester' | 'assignee' | 'approver' | 'admin'
 * @query {string} status - Filter by status
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 */
router.get('/', async (req, res) => {
  try {
    const { role = 'requester', status, page = 1, limit = 50 } = req.query;
    const prisma = getDatabase();
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    let where = { tenantId };

    // Role-based filtering
    switch (role.toLowerCase()) {
      case 'requester':
        where.requesterId = userId;
        break;
      case 'assignee':
        where.assigneeId = userId;
        break;
      case 'approver':
      case 'manager':
        where.status = { in: ['pending_approval', 'pending_level_1', 'pending_level_2'] };
        break;
      case 'admin':
        // Admin sees all jobs (no additional filter)
        break;
    }

    // Status filtering
    if (status) {
      if (status === 'todo') {
        where.status = { in: ['assigned'] };
      } else if (status === 'in_progress') {
        where.status = 'in_progress';
      } else if (status === 'waiting') {
        where.status = { in: ['correction', 'pending_approval'] };
      } else if (status === 'done') {
        where.status = { in: ['completed', 'closed'] };
      } else {
        where.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, code: true }
          },
          jobType: {
            select: { id: true, name: true, icon: true, colorTheme: true, slaWorkingDays: true }
          },
          requester: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take
      }),
      prisma.job.count({ where })
    ]);

    // Transform to frontend format
    const transformed = jobs.map(j => ({
      id: j.id,
      djId: j.djId,
      subject: j.subject,
      status: j.status,
      priority: j.priority,
      jobType: j.jobType?.name,
      jobTypeId: j.jobTypeId,
      jobTypeIcon: j.jobType?.icon,
      jobTypeColor: j.jobType?.colorTheme,
      slaWorkingDays: j.jobType?.slaWorkingDays,
      project: j.project?.name,
      projectId: j.projectId,
      projectCode: j.project?.code,
      deadline: j.dueDate,
      createdAt: j.createdAt,
      requesterId: j.requesterId,
      requester: j.requester?.displayName || `${j.requester?.firstName} ${j.requester?.lastName}`.trim(),
      requesterAvatar: j.requester?.avatarUrl,
      assigneeId: j.assigneeId,
      assignee: j.assignee?.displayName || (j.assignee ? `${j.assignee?.firstName} ${j.assignee?.lastName}`.trim() : null),
      assigneeAvatar: j.assignee?.avatarUrl
    }));

    res.json({
      success: true,
      data: transformed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Jobs] Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_JOBS_FAILED',
      message: 'ไม่สามารถดึงรายการงานได้'
    });
  }
});

/**
 * GET /api/jobs/:id
 * ดึงรายละเอียดงานเดี่ยว
 *
 * @param {number} id - Job ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getDatabase();
    const jobId = parseInt(id);

    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'Job ID ไม่ถูกต้อง'
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: { id: true, name: true, code: true }
        },
        jobType: {
          select: { id: true, name: true, icon: true, colorTheme: true, slaWorkingDays: true }
        },
        requester: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, email: true }
        },
        jobItems: {
          select: { id: true, name: true, quantity: true, size: true, status: true }
        },
        attachments: {
          select: { id: true, filePath: true, fileName: true, fileSize: true, createdAt: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานนี้'
      });
    }

    // Check permission
    const hasAccess = job.requesterId === req.user.userId ||
                     job.assigneeId === req.user.userId ||
                     req.user.roles.includes('admin');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ดูงานนี้'
      });
    }

    // Transform to frontend format
    const transformed = {
      id: job.id,
      djId: job.djId,
      subject: job.subject,
      status: job.status,
      priority: job.priority,
      objective: job.objective,
      description: job.description,
      headline: job.headline,
      subHeadline: job.subHeadline,
      jobTypeId: job.jobTypeId,
      jobType: job.jobType?.name,
      projectId: job.projectId,
      project: job.project?.name,
      projectCode: job.project?.code,
      deadline: job.dueDate,
      createdAt: job.createdAt,
      requesterId: job.requesterId,
      requester: {
        id: job.requester?.id,
        name: job.requester?.displayName || `${job.requester?.firstName} ${job.requester?.lastName}`.trim(),
        email: job.requester?.email,
        avatar: job.requester?.avatarUrl
      },
      assigneeId: job.assigneeId,
      assignee: job.assignee ? {
        id: job.assignee.id,
        name: job.assignee.displayName || `${job.assignee.firstName} ${job.assignee.lastName}`.trim(),
        email: job.assignee.email,
        avatar: job.assignee.avatarUrl
      } : null,
      items: job.jobItems || [],
      attachments: job.attachments || []
    };

    res.json({
      success: true,
      data: transformed
    });

  } catch (error) {
    console.error('[Jobs] Get job by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_JOB_FAILED',
      message: 'ไม่สามารถดึงข้อมูลงานได้'
    });
  }
});

export default router;
