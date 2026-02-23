/**
 * @file approval.js
 * @description Approval Routes - จัดการการอนุมัติงาน
 * 
 * Features:
 * - Approval via email links
 * - IP address logging
 * - Approval token validation
 * - Audit trail
 */

import express from 'express';
import { ApprovalService } from '../services/approvalService.js';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import NotificationService from '../services/notificationService.js';
import { hasRole } from '../helpers/roleHelper.js';

const router = express.Router();
const approvalService = new ApprovalService();
const notificationService = new NotificationService();

/**
 * POST /api/approvals/request
 * สร้างคำขออนุมัติใหม่
 *
 * @body {number} jobId - ID ของงาน
 * @body {number} approverId - ID ของผู้อนุมัติ
 * @body {number} stepNumber - ลำดับขั้นตอน
 */
router.post('/request', authenticateToken, setRLSContextMiddleware, async (req, res) => {
  try {
    const { jobId, approverId, stepNumber } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // ตรวจสอบ required fields
    if (!jobId || !approverId || !stepNumber) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'กรุณาระบุข้อมูลให้ครบถ้วน'
      });
    }

    // ตรวจสอบสิทธิ์ (requester หรือ admin เท่านั้น)
    const job = await approvalService.prisma.job.findUnique({
      where: { id: jobId },
      select: { requesterId: true, tenantId: true }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานนี้'
      });
    }

    if (job.requesterId !== req.user.userId && !hasRole(req.user.roles, 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์สร้างคำขออนุมัติสำหรับงานนี้'
      });
    }

    const result = await approvalService.createApproval({
      jobId,
      approverId,
      stepNumber,
      ipAddress
    });

    if (result.success) {
      // ส่ง email แจ้งผู้อนุมัติ
      const approval = result.data;
      const approvalUrl = `${process.env.FRONTEND_URL}/approve/${approval.approvalToken}`;
      const rejectUrl = `${process.env.FRONTEND_URL}/reject/${approval.approvalToken}`;
      const viewUrl = `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`;

      await notificationService.sendNotification({
        tenantId: job.tenantId,
        userIds: [approverId],
        type: 'job_approval_request',
        title: 'คำขออนุมัติงาน',
        message: `มีคำขออนุมัติงาน ${approval.job.djId}`,
        link: viewUrl,
        sendEmail: true,
        emailData: {
          approverName: `${approval.approver.firstName} ${approval.approver.lastName}`,
          jobId: approval.job.djId,
          jobSubject: approval.job.subject,
          requesterName: `${approval.job.requester.firstName} ${approval.job.requester.lastName}`,
          priority: approval.job.priority,
          priorityText: approval.job.priority.toUpperCase(),
          createdAt: approval.job.createdAt.toLocaleDateString('th-TH'),
          deadline: approval.job.dueDate?.toLocaleDateString('th-TH'),
          brief: approval.job.description || approval.job.objective,
          attachments: [], // ต้องดึงจาก database จริง
          approveUrl,
          rejectUrl,
          viewUrl,
          approvalToken: approval.approvalToken
        }
      });

      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Approval] Create request error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_APPROVAL_FAILED',
      message: 'ไม่สามารถสร้างคำขออนุมัติได้'
    });
  }
});

/**
 * POST /api/approvals/approve
 * อนุมัติงาน (ผ่าน email link)
 * 
 * @body {string} token - Approval token
 * @body {string} comment - ความคิดเห็น (optional)
 */
router.post('/approve', async (req, res) => {
  try {
    const { token, comment } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'กรุณาระบุ approval token'
      });
    }

    const result = await approvalService.approveJob({ 
      token, 
      comment, 
      ipAddress,
      userAgent: req.headers['user-agent']
    });

    if (result.success) {
      const approval = result.data;
      
      // ส่ง email แจ้ง requester ว่างานได้รับการอนุมัติ
      await notificationService.sendNotification({
        tenantId: approval.job.tenantId,
        userIds: [approval.job.requesterId],
        type: 'job_approved',
        title: 'งานได้รับการอนุมัติ',
        message: `งาน ${approval.job.djId} ได้รับการอนุมัติแล้ว`,
        link: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`,
        sendEmail: true,
        emailData: {
          requesterName: `${approval.job.requester.firstName} ${approval.job.requester.lastName}`,
          jobId: approval.job.djId,
          jobSubject: approval.job.subject,
          approverName: `${approval.approver.firstName} ${approval.approver.lastName}`,
          approvedAt: new Date().toLocaleString('th-TH'),
          comment,
          assigneeName: approval.job.assignee ? 
            `${approval.job.assignee.firstName} ${approval.job.assignee.lastName}` : null,
          viewUrl: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`,
          approvalToken: token,
          approverIp: ipAddress
        }
      });

      // ถ้ามี assignee ให้ส่ง email แจ้งด้วย
      if (approval.job.assigneeId) {
        await notificationService.sendNotification({
          tenantId: approval.job.tenantId,
          userIds: [approval.job.assigneeId],
          type: 'job_assigned',
          title: 'ได้รับมอบหมายงานใหม่',
          message: `คุณได้รับมอบหมายงาน ${approval.job.djId}`,
          link: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`,
          sendEmail: true,
          emailData: {
            assigneeName: `${approval.job.assignee.firstName} ${approval.job.assignee.lastName}`,
            jobId: approval.job.djId,
            jobSubject: approval.job.subject,
            requesterName: `${approval.job.requester.firstName} ${approval.job.requester.lastName}`,
            priority: approval.job.priority,
            priorityText: approval.job.priority.toUpperCase(),
            assignedAt: new Date().toLocaleDateString('th-TH'),
            deadline: approval.job.dueDate?.toLocaleDateString('th-TH'),
            viewUrl: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`
          }
        });
      }

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Approval] Approve error:', error);
    res.status(500).json({
      success: false,
      error: 'APPROVE_FAILED',
      message: 'ไม่สามารถอนุมัติงานได้'
    });
  }
});

/**
 * POST /api/approvals/reject
 * ปฏิเสธงาน (ผ่าน email link)
 * 
 * @body {string} token - Approval token
 * @body {string} comment - เหตุผลการปฏิเสธ
 */
router.post('/reject', async (req, res) => {
  try {
    const { token, comment } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'กรุณาระบุ approval token'
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_COMMENT',
        message: 'กรุณาระบุเหตุผลการปฏิเสธ'
      });
    }

    const result = await approvalService.rejectJob({ 
      token, 
      comment, 
      ipAddress,
      userAgent: req.headers['user-agent']
    });

    if (result.success) {
      const approval = result.data;
      
      // ส่ง email แจ้ง requester ว่างานถูกปฏิเสธ
      await notificationService.sendNotification({
        tenantId: approval.job.tenantId,
        userIds: [approval.job.requesterId],
        type: 'job_rejected',
        title: 'งานถูกปฏิเสธ',
        message: `งาน ${approval.job.djId} ถูกปฏิเสธ`,
        link: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}`,
        sendEmail: true,
        emailData: {
          requesterName: `${approval.job.requester.firstName} ${approval.job.requester.lastName}`,
          jobId: approval.job.djId,
          jobSubject: approval.job.subject,
          approverName: `${approval.approver.firstName} ${approval.approver.lastName}`,
          rejectedAt: new Date().toLocaleString('th-TH'),
          comment,
          editUrl: `${process.env.FRONTEND_URL}/jobs/${approval.jobId}/edit`,
          approvalToken: token,
          approverIp: ipAddress
        }
      });

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Approval] Reject error:', error);
    res.status(500).json({
      success: false,
      error: 'REJECT_FAILED',
      message: 'ไม่สามารถปฏิเสธงานได้'
    });
  }
});

/**
 * GET /api/approvals/history/:jobId
 * ดึงประวัติการอนุมัติของงาน
 *
 * @param {number} jobId - ID ของงาน
 */
router.get('/history/:jobId', authenticateToken, setRLSContextMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobIdNum = parseInt(jobId);

    if (isNaN(jobIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'ID งานไม่ถูกต้อง'
      });
    }

    // ตรวจสอบสิทธิ์ในการดูงาน
    const job = await approvalService.prisma.job.findUnique({
      where: { id: jobIdNum },
      select: { tenantId: true, requesterId: true, assigneeId: true }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานนี้'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ดูงานนี้หรือไม่
    const hasAccess = job.requesterId === req.user.userId || 
                     job.assigneeId === req.user.userId || 
                     hasRole(req.user.roles, 'admin');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'คุณไม่มีสิทธิ์ดูประวัติการอนุมัติของงานนี้'
      });
    }

    const result = await approvalService.getApprovalHistory(jobIdNum);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Approval] Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_HISTORY_FAILED',
      message: 'ไม่สามารถดึงประวัติการอนุมัติได้'
    });
  }
});

/**
 * POST /api/approvals/validate-token
 * ตรวจสอบความถูกต้องของ token (สำหรับ frontend)
 * 
 * @body {string} token - Approval token
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'กรุณาระบุ approval token'
      });
    }

    const result = await approvalService.validateApprovalToken(token);
    
    if (result.success) {
      // ส่งข้อมูลที่จำเป็นสำหรับ frontend
      const approval = result.data;
      res.json({
        success: true,
        data: {
          jobId: approval.jobId,
          jobSubject: approval.job.subject,
          approverName: `${approval.approver.firstName} ${approval.approver.lastName}`,
          requesterName: `${approval.job.requester.firstName} ${approval.job.requester.lastName}`,
          stepNumber: approval.stepNumber
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Approval] Validate token error:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATE_TOKEN_FAILED',
      message: 'ไม่สามารถตรวจสอบ token ได้'
    });
  }
});

export default router;
