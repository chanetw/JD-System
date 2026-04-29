/**
 * @file draft-read-logs.js
 * @description API Routes สำหรับบันทึกและดึงข้อมูล Draft Read Logs
 * 
 * Endpoints:
 * - POST /api/draft-read-logs/:jobId - บันทึกการเปิดอ่าน Draft
 * - GET /api/draft-read-logs/:jobId - ดึงข้อมูล Read Logs ของ Job
 * - GET /api/draft-read-logs/:jobId/status - เช็คว่า Requester อ่านแล้วหรือยัง
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import { notifyUserRealtime } from '../helpers/userSessionNotification.js';

const router = express.Router();
const prisma = getDatabase();

router.use(authenticateToken);
router.use(setRLSContextMiddleware);

const normalizeRoleValue = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role.toLowerCase();
  return String(role.roleName || role.name || role.role || '').toLowerCase();
};

const hasAdminRole = (roles = []) => roles.some(role => normalizeRoleValue(role) === 'admin');

const parseDraftFiles = (draftFiles) => {
  if (Array.isArray(draftFiles)) return draftFiles;

  if (typeof draftFiles === 'string') {
    try {
      const parsed = JSON.parse(draftFiles);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const extractDraftAttachmentIds = (draftFiles) => {
  const attachmentIds = new Set();

  parseDraftFiles(draftFiles).forEach((draftEntry) => {
    if (!draftEntry || typeof draftEntry !== 'object') {
      return;
    }

    const attachments = Array.isArray(draftEntry.attachments) ? draftEntry.attachments : [];
    attachments.forEach((attachment) => {
      const attachmentId = Number(attachment?.fileId ?? attachment?.id);
      if (Number.isInteger(attachmentId)) {
        attachmentIds.add(attachmentId);
      }
    });
  });

  return attachmentIds;
};

const getDisplayName = (user) => {
  if (!user) return 'Requester';
  return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Requester';
};

/**
 * POST /api/draft-read-logs/:jobId
 * บันทึกการเปิดอ่าน Draft Submission
 * 
 * Request Body: (optional - จะดึงจาก request headers)
 * - ipAddress (optional - จะดึงจาก req.ip)
 * - userAgent (optional - จะดึงจาก req.headers['user-agent'])
 */
router.post('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const parsedJobId = parseInt(jobId, 10);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (Number.isNaN(parsedJobId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'Job ID ไม่ถูกต้อง'
      });
    }

    // ดึง IP Address จาก request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
                   || req.headers['x-real-ip'] 
                   || req.ip 
                   || req.connection.remoteAddress 
                   || null;

    // ดึง User Agent จาก request headers
    const userAgent = req.headers['user-agent'] || null;

    console.log(`[Draft Read Log] Recording read for Job ${jobId} by User ${userId}`);
    console.log(`[Draft Read Log] IP: ${ipAddress}, User Agent: ${userAgent}`);

    // ตรวจสอบว่า Job มีอยู่จริงหรือไม่
    const job = await prisma.job.findUnique({
      where: { id: parsedJobId },
      select: { 
        id: true, 
        requesterId: true,
        status: true
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานที่ระบุ'
      });
    }

    // ตรวจสอบว่า User เป็น Requester ของงานนี้หรือไม่
    if (String(job.requesterId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'คุณไม่มีสิทธิ์เข้าถึงงานนี้'
      });
    }

    // บันทึก Read Log (ถ้ามีอยู่แล้วจะ skip เนื่องจาก unique constraint)
    const readLog = await prisma.$executeRaw`
      INSERT INTO "draft_read_logs" ("tenant_id", "job_id", "user_id", "ip_address", "user_agent")
      VALUES (${tenantId}, ${parsedJobId}, ${userId}, ${ipAddress}, ${userAgent})
      ON CONFLICT ("job_id", "user_id") DO NOTHING
      RETURNING *
    `;

    // ดึงข้อมูล Read Log ที่บันทึกไว้
    const existingLog = await prisma.$queryRaw`
      SELECT * FROM "draft_read_logs"
      WHERE "job_id" = ${parsedJobId} AND "user_id" = ${userId}
      LIMIT 1
    `;

    const logData = existingLog[0];

    res.json({
      success: true,
      message: 'บันทึกการเปิดอ่านเรียบร้อยแล้ว',
      data: {
        jobId: parsedJobId,
        userId,
        readAt: logData?.read_at,
        ipAddress: logData?.ip_address,
        isFirstRead: readLog > 0 // true ถ้าเป็นครั้งแรกที่อ่าน
      }
    });

  } catch (error) {
    console.error('[Draft Read Log] Error recording read:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'เกิดข้อผิดพลาดในการบันทึกการเปิดอ่าน'
    });
  }
});

/**
 * POST /api/draft-read-logs/:jobId/files/:attachmentId/view
 * บันทึกการเปิดดู draft attachment และแจ้งเตือน assignee ครั้งแรกเท่านั้น
 */
router.post('/:jobId/files/:attachmentId/view', async (req, res) => {
  try {
    const parsedJobId = parseInt(req.params.jobId, 10);
    const parsedAttachmentId = parseInt(req.params.attachmentId, 10);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (Number.isNaN(parsedJobId) || Number.isNaN(parsedAttachmentId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Job ID หรือ Attachment ID ไม่ถูกต้อง'
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: parsedJobId,
        tenantId
      },
      select: {
        id: true,
        djId: true,
        subject: true,
        requesterId: true,
        assigneeId: true,
        draftFiles: true,
        requester: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            email: true
          }
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

    if (String(job.requesterId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'เฉพาะ requester ของงานนี้เท่านั้นที่บันทึกการเปิดดูไฟล์ได้'
      });
    }

    const draftAttachmentIds = extractDraftAttachmentIds(job.draftFiles);
    if (!draftAttachmentIds.has(parsedAttachmentId)) {
      return res.status(400).json({
        success: false,
        error: 'ATTACHMENT_NOT_IN_DRAFT',
        message: 'ไฟล์นี้ไม่ได้อยู่ใน Draft ของงานนี้'
      });
    }

    const attachment = await prisma.mediaFile.findFirst({
      where: {
        id: parsedAttachmentId,
        tenantId,
        jobId: parsedJobId
      },
      select: {
        id: true,
        fileName: true
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'ATTACHMENT_NOT_FOUND',
        message: 'ไม่พบไฟล์ที่ระบุ'
      });
    }

    const insertResult = await prisma.$queryRaw`
      INSERT INTO "draft_attachment_view_logs" ("tenant_id", "job_id", "attachment_id", "viewer_user_id")
      VALUES (${tenantId}, ${parsedJobId}, ${parsedAttachmentId}, ${userId})
      ON CONFLICT ("job_id", "attachment_id", "viewer_user_id") DO NOTHING
      RETURNING "id", "first_viewed_at"
    `;

    const isFirstView = Array.isArray(insertResult) && insertResult.length > 0;
    const firstViewedAt = insertResult?.[0]?.first_viewed_at || null;

    if (isFirstView && job.assigneeId && String(job.assigneeId) !== String(userId)) {
      await notifyUserRealtime({
        req,
        tenantId,
        userId: job.assigneeId,
        type: 'draft_file_viewed',
        title: `👀 มีการเปิดไฟล์ Draft งาน ${job.djId}`,
        message: `${getDisplayName(job.requester)} เปิดดูไฟล์ "${attachment.fileName}" ในงาน "${job.subject}"`,
        link: `/jobs/${parsedJobId}`
      });
    }

    return res.json({
      success: true,
      data: {
        jobId: parsedJobId,
        attachmentId: parsedAttachmentId,
        isFirstView,
        firstViewedAt
      },
      message: isFirstView ? 'บันทึกการเปิดดูไฟล์ครั้งแรกเรียบร้อยแล้ว' : 'ไฟล์นี้ถูกบันทึกการเปิดดูไว้แล้ว'
    });
  } catch (error) {
    console.error('[Draft Read Log] Error recording attachment view:', error);
    return res.status(500).json({
      success: false,
      error: 'ATTACHMENT_VIEW_LOG_FAILED',
      message: 'เกิดข้อผิดพลาดในการบันทึกการเปิดดูไฟล์'
    });
  }
});

/**
 * GET /api/draft-read-logs/:jobId
 * ดึงข้อมูล Read Logs ทั้งหมดของ Job (สำหรับ Admin/Assignee)
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const parsedJobId = parseInt(jobId, 10);
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    if (Number.isNaN(parsedJobId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'Job ID ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่า Job มีอยู่จริงหรือไม่
    const job = await prisma.job.findUnique({
      where: { id: parsedJobId },
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

    // ตรวจสอบสิทธิ์ (เฉพาะ Requester, Assignee, หรือ Admin)
    const isRequester = job.requesterId === userId;
    const isAssignee = job.assigneeId === userId;
    const isAdmin = hasAdminRole(req.user.roles || []);

    if (!isRequester && !isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    }

    // ดึงข้อมูล Read Logs
    const readLogs = await prisma.$queryRaw`
      SELECT 
        drl.*,
        u.first_name,
        u.last_name,
        u.email
      FROM "draft_read_logs" drl
      LEFT JOIN "users" u ON drl.user_id = u.id
      WHERE drl.job_id = ${parsedJobId}
        AND drl.tenant_id = ${tenantId}
      ORDER BY drl.read_at DESC
    `;

    res.json({
      success: true,
      data: {
        jobId: parsedJobId,
        readLogs: readLogs.map(log => ({
          id: log.id,
          userId: log.user_id,
          userName: `${log.first_name} ${log.last_name}`,
          email: log.email,
          readAt: log.read_at,
          ipAddress: log.ip_address,
          userAgent: log.user_agent
        })),
        totalReads: readLogs.length
      }
    });

  } catch (error) {
    console.error('[Draft Read Log] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

/**
 * GET /api/draft-read-logs/:jobId/status
 * เช็คว่า Requester อ่าน Draft แล้วหรือยัง (สำหรับแสดงสถานะใน UI)
 */
router.get('/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    const parsedJobId = parseInt(jobId, 10);
    const tenantId = req.user.tenantId;

    if (Number.isNaN(parsedJobId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JOB_ID',
        message: 'Job ID ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่า Job มีอยู่จริงหรือไม่
    const job = await prisma.job.findUnique({
      where: { id: parsedJobId },
      select: { 
        id: true, 
        requesterId: true,
        status: true
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'ไม่พบงานที่ระบุ'
      });
    }

    // ดึงข้อมูล Read Log ของ Requester
    const readLog = await prisma.$queryRaw`
      SELECT * FROM "draft_read_logs"
      WHERE "job_id" = ${parsedJobId} 
        AND "user_id" = ${job.requesterId}
        AND "tenant_id" = ${tenantId}
      LIMIT 1
    `;

    const hasRead = readLog.length > 0;
    const logData = readLog[0];

    res.json({
      success: true,
      data: {
        jobId: parsedJobId,
        requesterId: job.requesterId,
        hasRead,
        readAt: logData?.read_at || null,
        ipAddress: logData?.ip_address || null
      }
    });

  } catch (error) {
    console.error('[Draft Read Log] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
    });
  }
});

export default router;
