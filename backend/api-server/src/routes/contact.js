/**
 * @file contact.js
 * @description Contact Admin API Route
 *
 * POST /api/contact-admin
 * - ผู้ใช้ส่งหัวข้อ + ประเภท + ข้อความถึง Admin ทุกคนใน tenant เดียวกัน
 * - สร้าง in-app notification + ส่ง email ถึง active admins
 */

import express from 'express';
import { authenticateToken, setRLSContextMiddleware } from './auth.js';
import { getDatabase } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import EmailService from '../services/emailService.js';

const router = express.Router();
const notificationService = new NotificationService();
const emailService = new EmailService();

const CATEGORY_LABELS = {
    bug: 'แจ้งปัญหาการใช้งาน (Bug)',
    access: 'ขอสิทธิ์การใช้งาน (Access)',
    request: 'คำขออื่น ๆ (Other Request)',
};

/**
 * POST /api/contact-admin
 * ส่งข้อความถึง Admin ทุกคนใน tenant ผ่าน in-app notification + email
 */
router.post('/', authenticateToken, setRLSContextMiddleware, async (req, res) => {
    try {
        const prisma = getDatabase();
        const { subject, category, message } = req.body;
        const senderUserId = req.user.userId;
        const tenantId = req.user.tenantId;

        // Validate input
        if (!subject?.trim() || !category || !message?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'กรุณาระบุ subject, category และ message',
            });
        }

        if (!CATEGORY_LABELS[category]) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_CATEGORY',
                message: 'ประเภทไม่ถูกต้อง กรุณาเลือก bug, access หรือ request',
            });
        }

        if (message.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'MESSAGE_TOO_SHORT',
                message: 'รายละเอียดต้องมีอย่างน้อย 10 ตัวอักษร',
            });
        }

        // Get sender info
        const sender = await prisma.user.findUnique({
            where: { id: senderUserId },
            select: { id: true, firstName: true, lastName: true, email: true, displayName: true },
        });

        const senderName = sender?.displayName ||
            [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
            sender?.email ||
            'Unknown User';

        const createdRequest = await prisma.userRequest.create({
            data: {
                tenantId,
                userId: senderUserId,
                category,
                subject: subject.trim(),
                message: message.trim(),
                status: 'pending'
            }
        });

        // Find all active Admin users in the same tenant
        const allUsers = await prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            include: {
                userRoles: {
                    where: { isActive: true },
                },
            },
        });

        const isAdminRoleName = (roleName) => {
            const normalized = String(roleName || '').toLowerCase();
            return normalized === 'admin' || normalized === 'superadmin';
        };

        // Filter to only Admin users
        const adminUsers = allUsers.filter(user =>
            user.userRoles.some(ur => isAdminRoleName(ur.roleName))
        ).map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
        }));

        if (adminUsers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'NO_ADMIN_FOUND',
                message: 'ไม่พบ Admin ที่ active ใน tenant นี้',
            });
        }

        const categoryLabel = CATEGORY_LABELS[category];
        const notificationTitle = `[${categoryLabel}] ${subject.trim()}`;
        const notificationMessage = `จาก ${senderName}: ${message.trim().substring(0, 200)}${message.trim().length > 200 ? '...' : ''}`;
        const notificationLink = `/admin/users?tab=requests&id=${createdRequest.id}`;

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e11d48;">ข้อความจากผู้ใช้งาน — DJ System</h2>
                <table style="width:100%; border-collapse:collapse; margin-top:16px;">
                    <tr>
                        <td style="padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:600; width:30%;">ผู้ส่ง</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">${senderName} (${sender?.email || '-'})</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:600;">ประเภท</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">${categoryLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:600; vertical-align:top;">รายละเอียด</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0; white-space:pre-wrap;">${message.trim()}</td>
                    </tr>
                </table>
                <p style="color:#64748b; font-size:12px; margin-top:16px;">
                    ส่งผ่าน DJ System Contact Form | ${new Date().toLocaleString('th-TH')}
                </p>
            </div>
        `;

        // Send in-app notification + email to all admin users concurrently
        const adminPromises = adminUsers.map(async (admin) => {
            // In-app notification
            await notificationService.createNotification({
                tenantId,
                userId: admin.id,
                type: 'contact_admin',
                title: notificationTitle,
                message: notificationMessage,
                link: notificationLink,
            });

            // Email (non-blocking — skip if SMTP not configured)
            if (admin.email) {
                await emailService.sendEmail(
                    admin.email,
                    `[DJ System] ข้อความจากผู้ใช้: ${subject.trim()}`,
                    emailHtml
                ).catch(err => console.warn('[ContactAdmin] Email failed for', admin.email, err.message));
            }
        });

        await Promise.allSettled(adminPromises);

        console.log(`[ContactAdmin] User ${senderUserId} sent contact to ${adminUsers.length} admin(s) in tenant ${tenantId}`);

        res.json({
            success: true,
            message: `ส่งข้อความถึง Admin สำเร็จ (${adminUsers.length} คน)`,
            sentTo: adminUsers.length,
            requestId: createdRequest.id,
        });
    } catch (error) {
        console.error('[ContactAdmin] Error:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'เกิดข้อผิดพลาดภายในระบบ',
        });
    }
});

export default router;
