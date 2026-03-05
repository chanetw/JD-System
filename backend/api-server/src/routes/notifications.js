/**
 * @file notifications.js
 * @description Notification API Routes
 * 
 * จัดการ:
 * - GET /api/notifications — ดึงรายการแจ้งเตือนของผู้ใช้
 * - PATCH /api/notifications/:id/read — ทำเครื่องหมายว่าอ่านแล้ว
 * - PATCH /api/notifications/read-all — ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

// All routes require authentication and RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * GET /api/notifications
 * ดึงรายการแจ้งเตือนของผู้ใช้ปัจจุบัน
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 50)
 * - unreadOnly (default: false)
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getDatabase();
        const userId = req.user.userId;
        const tenantId = req.user.tenantId;
        const { page = 1, limit = 50, unreadOnly = 'false' } = req.query;

        const where = {
            userId,
            tenantId
        };

        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({
                where: { userId, tenantId, isRead: false }
            })
        ]);

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Notifications] Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดในการดึงรายการแจ้งเตือน'
        });
    }
});

/**
 * PATCH /api/notifications/read-all
 * ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
 * 
 * ⚠️ ต้องอยู่ก่อน /:id/read เพื่อป้องกัน Express match "read-all" เป็น :id
 */
router.patch('/read-all', async (req, res) => {
    try {
        const prisma = getDatabase();
        const userId = req.user.userId;
        const tenantId = req.user.tenantId;

        const result = await prisma.notification.updateMany({
            where: {
                userId,
                tenantId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        res.json({
            success: true,
            message: `ทำเครื่องหมายว่าอ่านแล้ว ${result.count} รายการ`,
            updatedCount: result.count
        });
    } catch (error) {
        console.error('[Notifications] Mark all as read error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาด'
        });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * ทำเครื่องหมายว่าอ่านแล้ว (single)
 */
router.patch('/:id/read', async (req, res) => {
    try {
        const prisma = getDatabase();
        const userId = req.user.userId;
        const notificationId = parseInt(req.params.id);

        const result = await prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId
            },
            data: {
                isRead: true
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'ไม่พบรายการแจ้งเตือนนี้'
            });
        }

        res.json({
            success: true,
            message: 'ทำเครื่องหมายว่าอ่านแล้ว'
        });
    } catch (error) {
        console.error('[Notifications] Mark as read error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาด'
        });
    }
});

export default router;
