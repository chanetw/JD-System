/**
 * @file comments.js
 * @description Job Comments API Routes
 *
 * Features:
 * - CRUD operations for job comments
 * - @mention parsing with notifications
 * - Permission checking (requester, assignee, admin)
 * - Notification triggers on new comments
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';

const router = express.Router();
const notificationService = new NotificationService();

// All routes require authentication and RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * Check if user has access to view/comment on a job
 * @param {Object} job - Job object with requesterId and assigneeId
 * @param {Object} user - User object from request
 * @returns {boolean}
 */
const hasJobAccess = (job, user) => {
  return (
    job.requesterId === user.userId ||
    job.assigneeId === user.userId ||
    user.roles?.includes('admin') ||
    user.roles?.includes('manager')
  );
};

/**
 * Parse @mentions from comment text
 * Returns array of mentioned usernames (without @)
 * @param {string} text - Comment text
 * @returns {string[]} - Array of usernames
 */
const parseMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const matches = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)]; // Remove duplicates
};

/**
 * GET /api/jobs/:jobId/comments
 * Get all comments for a job
 */
router.get('/jobs/:jobId/comments', async (req, res) => {
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
        message: 'คุณไม่มีสิทธิ์ดู comments ของงานนี้'
      });
    }

    // Get comments with user info
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [comments, total] = await Promise.all([
      prisma.jobComment.findMany({
        where: {
          jobId: parseInt(jobId),
          tenantId
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.jobComment.count({
        where: {
          jobId: parseInt(jobId),
          tenantId
        }
      })
    ]);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[Comments] Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดในการดึง comments'
    });
  }
});

/**
 * POST /api/jobs/:jobId/comments
 * Create a new comment on a job
 * Triggers notifications to:
 * - Job assignee (if commenter is requester)
 * - Job requester (if commenter is assignee)
 * - @mentioned users
 */
router.post('/jobs/:jobId/comments', async (req, res) => {
  try {
    const prisma = getDatabase();
    const { jobId } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COMMENT',
        message: 'กรุณาระบุข้อความ comment'
      });
    }

    // Get job with requester/assignee info
    const job = await prisma.job.findFirst({
      where: {
        id: parseInt(jobId),
        tenantId
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        requesterId: true,
        assigneeId: true,
        requester: {
          select: { id: true, displayName: true, email: true }
        },
        assignee: {
          select: { id: true, displayName: true, email: true }
        }
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
        message: 'คุณไม่มีสิทธิ์ comment ในงานนี้'
      });
    }

    // Parse @mentions
    const mentionedUsernames = parseMentions(comment);
    let mentionedUsers = [];

    if (mentionedUsernames.length > 0) {
      // Find mentioned users by display name or email
      mentionedUsers = await prisma.user.findMany({
        where: {
          tenantId,
          OR: [
            { displayName: { in: mentionedUsernames } },
            { email: { in: mentionedUsernames.map(u => `${u}@%`) } }
          ]
        },
        select: { id: true, displayName: true, email: true }
      });
    }

    // Create comment
    const newComment = await prisma.jobComment.create({
      data: {
        tenantId,
        jobId: parseInt(jobId),
        userId,
        comment: comment.trim(),
        mentions: mentionedUsers.length > 0
          ? mentionedUsers.map(u => ({ id: u.id, name: u.displayName }))
          : null
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    // Get commenter info
    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true }
    });
    const commenterName = commenter?.displayName || 'Unknown';

    // Prepare notification recipients
    const notifyUserIds = new Set();

    // Notify job assignee if commenter is requester
    if (userId === job.requesterId && job.assigneeId && job.assigneeId !== userId) {
      notifyUserIds.add(job.assigneeId);
    }

    // Notify job requester if commenter is assignee
    if (userId === job.assigneeId && job.requesterId !== userId) {
      notifyUserIds.add(job.requesterId);
    }

    // Notify @mentioned users
    mentionedUsers.forEach(u => {
      if (u.id !== userId) {
        notifyUserIds.add(u.id);
      }
    });

    // Send notifications (with batching for regular comments)
    const notificationPromises = Array.from(notifyUserIds).map(recipientId => {
      const isMentioned = mentionedUsers.some(u => u.id === recipientId);

      // ✨ NEW: @mentioned users get instant notification (important!)
      if (isMentioned) {
        return notificationService.createNotification({
          tenantId,
          userId: recipientId,
          type: 'comment_mention',
          title: `${commenterName} mentioned you in ${job.djId}`,
          message: comment.substring(0, 200) + (comment.length > 200 ? '...' : ''),
          link: `/jobs/${jobId}`
        });
      }

      // ✨ NEW: Regular comments are queued for batching (prevents notification spam)
      return notificationService.queueCommentNotification({
        tenantId,
        userId: recipientId,
        jobId: parseInt(jobId),
        jobDjId: job.djId,
        commenterName,
        commentPreview: comment.substring(0, 100),
        io: req.app.get('io'),  // Pass Socket.io instance
        batchDelay: parseInt(process.env.COMMENT_BATCH_DELAY_MS || 30000)
      });
    });

    await Promise.allSettled(notificationPromises);

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          tenantId,
          jobId: parseInt(jobId),
          userId,
          action: 'comment_added',
          details: {
            commentId: newComment.id,
            commentPreview: comment.substring(0, 100),
            mentionCount: mentionedUsers.length
          }
        }
      });
    } catch (activityError) {
      console.warn('[Comments] Failed to log activity:', activityError.message);
    }

    res.status(201).json({
      success: true,
      data: newComment,
      meta: {
        notificationsSent: notifyUserIds.size,
        mentionsFound: mentionedUsers.length
      }
    });
  } catch (error) {
    console.error('[Comments] Create comment error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดในการสร้าง comment'
    });
  }
});

/**
 * PUT /api/jobs/:jobId/comments/:commentId
 * Update a comment (only comment author can edit)
 */
router.put('/jobs/:jobId/comments/:commentId', async (req, res) => {
  try {
    const prisma = getDatabase();
    const { jobId, commentId } = req.params;
    const { comment } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_COMMENT',
        message: 'กรุณาระบุข้อความ comment'
      });
    }

    // Get existing comment
    const existingComment = await prisma.jobComment.findFirst({
      where: {
        id: parseInt(commentId),
        jobId: parseInt(jobId),
        tenantId
      }
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: 'COMMENT_NOT_FOUND',
        message: 'ไม่พบ comment ที่ระบุ'
      });
    }

    // Only comment author or admin can edit
    if (existingComment.userId !== userId && !req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์แก้ไข comment นี้'
      });
    }

    // Parse new @mentions
    const mentionedUsernames = parseMentions(comment);
    let mentionedUsers = [];

    if (mentionedUsernames.length > 0) {
      mentionedUsers = await prisma.user.findMany({
        where: {
          tenantId,
          OR: [
            { displayName: { in: mentionedUsernames } },
            { email: { in: mentionedUsernames.map(u => `${u}@%`) } }
          ]
        },
        select: { id: true, displayName: true }
      });
    }

    // Update comment
    const updatedComment = await prisma.jobComment.update({
      where: { id: parseInt(commentId) },
      data: {
        comment: comment.trim(),
        mentions: mentionedUsers.length > 0
          ? mentionedUsers.map(u => ({ id: u.id, name: u.displayName }))
          : null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    console.error('[Comments] Update comment error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดในการแก้ไข comment'
    });
  }
});

/**
 * DELETE /api/jobs/:jobId/comments/:commentId
 * Delete a comment (only comment author or admin can delete)
 */
router.delete('/jobs/:jobId/comments/:commentId', async (req, res) => {
  try {
    const prisma = getDatabase();
    const { jobId, commentId } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // Get existing comment
    const existingComment = await prisma.jobComment.findFirst({
      where: {
        id: parseInt(commentId),
        jobId: parseInt(jobId),
        tenantId
      }
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: 'COMMENT_NOT_FOUND',
        message: 'ไม่พบ comment ที่ระบุ'
      });
    }

    // Only comment author or admin can delete
    if (existingComment.userId !== userId && !req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ลบ comment นี้'
      });
    }

    // Delete comment
    await prisma.jobComment.delete({
      where: { id: parseInt(commentId) }
    });

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          tenantId,
          jobId: parseInt(jobId),
          userId,
          action: 'comment_deleted',
          details: {
            commentId: parseInt(commentId)
          }
        }
      });
    } catch (activityError) {
      console.warn('[Comments] Failed to log delete activity:', activityError.message);
    }

    res.json({
      success: true,
      message: 'ลบ comment สำเร็จ'
    });
  } catch (error) {
    console.error('[Comments] Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดในการลบ comment'
    });
  }
});

export default router;
