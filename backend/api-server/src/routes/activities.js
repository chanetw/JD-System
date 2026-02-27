/**
 * @file activities.js
 * @description Job Activities API Routes
 *
 * Features:
 * - List activities/logs for a specific job
 * - Permission checking (same as job access)
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// All routes require authentication and RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * Check if user has access to view job activities
 * @param {Object} job - Job object with requesterId and assigneeId
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const hasJobAccess = (job, user) => {
    // Determine user roles from various possible properties
    const roles = Array.isArray(user.roles)
        ? user.roles.map(r => r.toLowerCase())
        : (user.roleName ? [user.roleName.toLowerCase()] : []);

    return (
        job.requesterId === user.userId ||
        job.assigneeId === user.userId ||
        roles.includes('admin') ||
        roles.includes('manager') ||
        roles.includes('approver')
    );
};

/**
 * GET /api/jobs/:jobId/activities
 * Get all activities for a job
 */
router.get('/jobs/:jobId/activities', async (req, res) => {
    try {
        const prisma = getDatabase();
        const { jobId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user.userId;
        const tenantId = req.user.tenantId;

        // Get job to check access
        const job = await prisma.job.findFirst({
            where: {
                id: parseInt(jobId),
                tenantId
            },
            select: {
                id: true,
                requesterId: true,
                assigneeId: true
            }
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'JOB_NOT_FOUND',
                message: 'ไม่พบงานที่ระบุ'
            });
        }

        // Check access permission
        if (!hasJobAccess(job, req.user)) {
            return res.status(403).json({
                success: false,
                error: 'INSUFFICIENT_PERMISSIONS',
                message: 'คุณไม่มีสิทธิ์ดูประวัติกิจกรรมของงานนี้'
            });
        }

        // Get activities with user info
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [activities, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: {
                    jobId: parseInt(jobId)
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            // Use standard User fields from Prisma schema
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }, // Newest first
                skip,
                take: parseInt(limit)
            }),
            prisma.activityLog.count({
                where: {
                    jobId: parseInt(jobId)
                }
            })
        ]);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Activities] Get activities error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดในการดึงประวัติกิจกรรม'
        });
    }
});

export default router;
