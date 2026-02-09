/**
 * @file analytics.js
 * @description Analytics Routes - ติดตามสถิติการเข้าถึงไฟล์
 * 
 * Features:
 * - Track file view/download clicks
 * - Update downloadCount in MediaFile table
 * - (Future) Store detailed analytics logs
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();
const prisma = getDatabase();

// ทุก routes ต้องมีการ authenticate และตั้งค่า RLS context
router.use(authenticateToken);
router.use(setRLSContextMiddleware);

/**
 * POST /api/analytics/track-click
 * บันทึกสถิติการกดดู/ดาวน์โหลดไฟล์
 * 
 * @body {number} fileId - ID ของไฟล์
 * @body {string} action - 'view' | 'download'
 */
router.post('/track-click', async (req, res) => {
    try {
        const { fileId, action } = req.body;

        // Validate input
        if (!fileId || !action) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_INPUT',
                message: 'กรุณาระบุ fileId และ action'
            });
        }

        const parsedFileId = parseInt(fileId);
        if (isNaN(parsedFileId)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_FILE_ID',
                message: 'fileId ต้องเป็นตัวเลข'
            });
        }

        // ตรวจสอบว่าไฟล์มีอยู่และผู้ใช้มีสิทธิ์เข้าถึง (RLS check)
        const file = await prisma.mediaFile.findFirst({
            where: {
                id: parsedFileId,
                tenantId: req.user.tenantId
            }
        });

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'FILE_NOT_FOUND',
                message: 'ไม่พบไฟล์นี้หรือคุณไม่มีสิทธิ์เข้าถึง'
            });
        }

        // เพิ่มค่า downloadCount
        const updatedFile = await prisma.mediaFile.update({
            where: { id: parsedFileId },
            data: {
                downloadCount: {
                    increment: 1
                }
            }
        });

        // TODO: (Optional) บันทึก Log ลง AnalyticsLog table
        // await prisma.analyticsLog.create({
        //     data: {
        //         fileId: parsedFileId,
        //         userId: req.user.userId,
        //         action,
        //         tenantId: req.user.tenantId
        //     }
        // });

        res.json({
            success: true,
            data: {
                fileId: parsedFileId,
                newCount: updatedFile.downloadCount,
                action
            },
            message: 'บันทึกสถิติสำเร็จ'
        });

    } catch (error) {
        console.error('[Analytics] Track click error:', error);
        res.status(500).json({
            success: false,
            error: 'TRACK_FAILED',
            message: 'ไม่สามารถบันทึกสถิติได้',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/stats
 * ดึงสถิติภาพรวม (Optional - for Admin Dashboard)
 */
router.get('/stats', async (req, res) => {
    try {
        // นับไฟล์ทั้งหมด
        const totalFiles = await prisma.mediaFile.count({
            where: { tenantId: req.user.tenantId }
        });

        // นับยอด Downloads รวม
        const result = await prisma.mediaFile.aggregate({
            where: { tenantId: req.user.tenantId },
            _sum: {
                downloadCount: true
            }
        });

        // ไฟล์ยอดนิยม Top 10
        const topFiles = await prisma.mediaFile.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { downloadCount: 'desc' },
            take: 10,
            select: {
                id: true,
                fileName: true,
                downloadCount: true,
                fileType: true,
                job: {
                    select: {
                        djId: true,
                        subject: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: {
                totalFiles,
                totalDownloads: result._sum.downloadCount || 0,
                topFiles
            }
        });

    } catch (error) {
        console.error('[Analytics] Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'GET_STATS_FAILED',
            message: 'ไม่สามารถดึงสถิติได้'
        });
    }
});

export default router;
