import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import { notifyUserRealtime } from '../helpers/userSessionNotification.js';

const router = express.Router();

const isStrictAdmin = (req) => {
  const roleNames = [
    ...(Array.isArray(req.user?.roles) ? req.user.roles : []),
    req.user?.role
  ]
    .filter(Boolean)
    .map(role => String(role).toLowerCase());

  return roleNames.includes('admin') || roleNames.includes('superadmin');
};

router.use(authenticateToken);
router.use(setRLSContextMiddleware);
router.use((req, res, next) => {
  if (!isStrictAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }

  next();
});

router.get('/', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'pending';

    const where = {
      tenantId,
      ...(status && status !== 'all' ? { status } : {})
    };

    const userRequests = await prisma.userRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: userRequests.map(item => ({
        id: item.id,
        tenantId: item.tenantId,
        userId: item.userId,
        category: item.category,
        subject: item.subject,
        message: item.message,
        status: item.status,
        resolvedBy: item.resolvedBy,
        resolvedAt: item.resolvedAt,
        adminNote: item.adminNote,
        rejectedReason: item.rejectedReason,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        senderName: item.user.displayName || [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || item.user.email,
        senderEmail: item.user.email,
        sender: item.user
      }))
    });
  } catch (error) {
    console.error('[UserRequests] Get list error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USER_REQUESTS_FAILED',
      message: 'ไม่สามารถดึงรายการ User Request ได้'
    });
  }
});

router.get('/count', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;

    const pendingCount = await prisma.userRequest.count({
      where: {
        tenantId,
        status: 'pending'
      }
    });

    res.json({
      success: true,
      data: {
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('[UserRequests] Get count error:', error);
    res.status(500).json({
      success: false,
      error: 'GET_USER_REQUEST_COUNT_FAILED',
      message: 'ไม่สามารถดึงจำนวน User Request ได้'
    });
  }
});

router.put('/:id/resolve', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const requestId = parseInt(req.params.id, 10);
    const adminNote = String(req.body?.adminNote || '').trim();

    if (Number.isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST_ID',
        message: 'Request ID ไม่ถูกต้อง'
      });
    }

    if (!adminNote) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ADMIN_NOTE',
        message: 'กรุณาระบุหมายเหตุการดำเนินการ'
      });
    }

    const existing = await prisma.userRequest.findFirst({
      where: {
        id: requestId,
        tenantId
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'ไม่พบ User Request นี้'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'REQUEST_ALREADY_PROCESSED',
        message: 'คำขอนี้ถูกดำเนินการแล้ว'
      });
    }

    const updated = await prisma.userRequest.update({
      where: { id: requestId },
      data: {
        status: 'resolved',
        resolvedBy: req.user.userId,
        resolvedAt: new Date(),
        adminNote
      }
    });

    await notifyUserRealtime({
      req,
      tenantId,
      userId: updated.userId,
      type: 'request_resolved',
      title: `[แก้ไขแล้ว] ${updated.subject}`,
      message: `Admin ดำเนินการแล้ว: ${adminNote}`,
      link: null
    });

    res.json({
      success: true,
      data: updated,
      message: 'อัปเดต User Request เป็น resolved เรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('[UserRequests] Resolve error:', error);
    res.status(500).json({
      success: false,
      error: 'RESOLVE_USER_REQUEST_FAILED',
      message: 'ไม่สามารถ resolve User Request ได้'
    });
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const prisma = getDatabase();
    const tenantId = req.user.tenantId;
    const requestId = parseInt(req.params.id, 10);
    const rejectedReason = String(req.body?.rejectedReason || '').trim();

    if (Number.isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST_ID',
        message: 'Request ID ไม่ถูกต้อง'
      });
    }

    if (!rejectedReason) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REJECT_REASON',
        message: 'กรุณาระบุเหตุผลการปฏิเสธ'
      });
    }

    const existing = await prisma.userRequest.findFirst({
      where: {
        id: requestId,
        tenantId
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'ไม่พบ User Request นี้'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'REQUEST_ALREADY_PROCESSED',
        message: 'คำขอนี้ถูกดำเนินการแล้ว'
      });
    }

    const updated = await prisma.userRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        resolvedBy: req.user.userId,
        resolvedAt: new Date(),
        rejectedReason
      }
    });

    await notifyUserRealtime({
      req,
      tenantId,
      userId: updated.userId,
      type: 'request_rejected',
      title: `[ไม่สามารถดำเนินการ] ${updated.subject}`,
      message: `เหตุผล: ${rejectedReason}`,
      link: null
    });

    res.json({
      success: true,
      data: updated,
      message: 'ปฏิเสธ User Request เรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('[UserRequests] Reject error:', error);
    res.status(500).json({
      success: false,
      error: 'REJECT_USER_REQUEST_FAILED',
      message: 'ไม่สามารถ reject User Request ได้'
    });
  }
});

export default router;
