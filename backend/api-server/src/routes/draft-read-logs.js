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
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

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
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

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
      where: { id: parseInt(jobId) },
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
      VALUES (${tenantId}, ${parseInt(jobId)}, ${userId}, ${ipAddress}, ${userAgent})
      ON CONFLICT ("job_id", "user_id") DO NOTHING
      RETURNING *
    `;

    // ดึงข้อมูล Read Log ที่บันทึกไว้
    const existingLog = await prisma.$queryRaw`
      SELECT * FROM "draft_read_logs"
      WHERE "job_id" = ${parseInt(jobId)} AND "user_id" = ${userId}
      LIMIT 1
    `;

    const logData = existingLog[0];

    res.json({
      success: true,
      message: 'บันทึกการเปิดอ่านเรียบร้อยแล้ว',
      data: {
        jobId: parseInt(jobId),
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
 * GET /api/draft-read-logs/:jobId
 * ดึงข้อมูล Read Logs ทั้งหมดของ Job (สำหรับ Admin/Assignee)
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // ตรวจสอบว่า Job มีอยู่จริงหรือไม่
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
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
    const isAdmin = req.user.roles?.some(r => r.name === 'Admin');

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
      WHERE drl.job_id = ${parseInt(jobId)}
        AND drl.tenant_id = ${tenantId}
      ORDER BY drl.read_at DESC
    `;

    res.json({
      success: true,
      data: {
        jobId: parseInt(jobId),
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
    const tenantId = req.user.tenantId;

    // ตรวจสอบว่า Job มีอยู่จริงหรือไม่
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
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
      WHERE "job_id" = ${parseInt(jobId)} 
        AND "user_id" = ${job.requesterId}
        AND "tenant_id" = ${tenantId}
      LIMIT 1
    `;

    const hasRead = readLog.length > 0;
    const logData = readLog[0];

    res.json({
      success: true,
      data: {
        jobId: parseInt(jobId),
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
