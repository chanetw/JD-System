/**
 * @file notificationService.js
 * @description Notification Service - จัดการการแจ้งเตือนทั้งในระบบและ email
 * 
 * รวมการทำงานระหว่าง:
 * - Real-time notifications (Socket.io)
 * - Email notifications
 * - Database notifications
 */

import { getDatabase } from '../config/database.js';
import EmailService from './emailService.js';
import {
  createEmailTemplate,
  createJobApprovalEmail,
  createJobAssignmentEmail,
  createJobRejectionEmail
} from '../utils/emailTemplates.js';

export class NotificationService {
  constructor() {
    this.prisma = getDatabase();
    this.emailService = new EmailService();
  }

  /**
   * สร้าง notification ในระบบ (Single)
   * 
   * @param {Object} notificationData - ข้อมูล notification
   * @param {number} notificationData.tenantId - ID ของ tenant
   * @param {number} notificationData.userId - ID ของผู้รับ
   * @param {string} notificationData.type - ประเภท (job_assigned, status_changed, etc.)
   * @param {string} notificationData.title - หัวข้อ
   * @param {string} notificationData.message - ข้อความ
   * @param {string} notificationData.link - ลิงก์ (optional)
   * @returns {Promise<Object>} - ผลลัพธ์การสร้าง notification
   */
  async createNotification({ tenantId, userId, type, title, message, link }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type,
          title,
          message,
          link
        }
      });

      // Auto-cleanup: เก็บแค่ 10 รายการล่าสุดต่อ user
      this.cleanupNotifications(userId).catch(err =>
        console.error('[NotificationService] Cleanup failed (non-blocking):', err)
      );

      return {
        success: true,
        data: notification
      };
    } catch (error) {
      console.error('[NotificationService] Create notification failed:', error);
      return {
        success: false,
        error: 'CREATE_NOTIFICATION_FAILED',
        message: 'ไม่สามารถสร้างการแจ้งเตือนได้'
      };
    }
  }

  /**
   * สร้าง notification หลายรายการพร้อมกัน (Batch)
   * 
   * @param {Array<Object>} notificationsData - Array ของข้อมูล notification
   * @returns {Promise<Object>}
   */
  async createMany(notificationsData) {
    try {
      if (!notificationsData || notificationsData.length === 0) return { success: true, count: 0 };

      // Map data to match Prisma createMany input if needed or create loop if schema strict
      // Assuming simple structure
      const data = notificationsData.map(n => ({
        tenantId: n.tenantId || 1, // Default if missing
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: false,
        createdAt: new Date()
      }));

      const result = await this.prisma.notification.createMany({
        data: data
      });

      return { success: true, count: result.count };
    } catch (error) {
      console.error('[NotificationService] Create Many Failed:', error);
      // Fallback to simpler loop if createMany fails validation? No, trust prisma
      return { success: false, error: error.message };
    }
  }

  /**
   * ส่ง notification ทั้งในระบบและ email
   * 
   * @param {Object} options - ตัวเลือกการส่ง notification
   * @param {number} options.tenantId - ID ของ tenant
   * @param {number[]} options.userIds - รายชื่อ ID ผู้รับ
   * @param {string} options.type - ประเภท notification
   * @param {string} options.title - หัวข้อ
   * @param {string} options.message - ข้อความ
   * @param {string} options.link - ลิงก์ (optional)
   * @param {boolean} options.sendEmail - ส่ง email ด้วยหรือไม่ (default: false)
   * @param {Object} options.emailData - ข้อมูลสำหรับ email (optional)
   * @param {Object} options.io - Socket.io instance (สำหรับ real-time)
   * @returns {Promise<Object>} - ผลลัพธ์การส่ง notification
   */
  async sendNotification({
    tenantId,
    userIds,
    type,
    title,
    message,
    link,
    sendEmail = false,
    emailData = null,
    io = null
  }) {
    const results = {
      database: { success: true, sent: 0, failed: 0 },
      email: { success: true, sent: 0, failed: 0 },
      realtime: { success: true, sent: 0, failed: 0 }
    };

    try {
      // 1. สร้าง notification ใน database
      for (const userId of userIds) {
        const result = await this.createNotification({
          tenantId,
          userId,
          type,
          title,
          message,
          link
        });

        if (result.success) {
          results.database.sent++;
        } else {
          results.database.failed++;
        }
      }

      // 2. ส่ง email (ถ้าเปิดใช้)
      if (sendEmail && emailData) {
        const emailPromises = userIds.map(async (userId) => {
          try {
            // ดึงข้อมูลผู้ใช้เพื่อเอา email
            const user = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { email: true, firstName: true, lastName: true }
            });

            if (user && user.email) {
              let emailResult;
              const buttonUrl = emailData?.magicLink
                || emailData?.viewUrl
                || emailData?.editUrl
                || (/^https?:\/\//i.test(link || '') ? link : null);

              const genericEmailHtml = buttonUrl
                ? createEmailTemplate({
                    title,
                    heading: title,
                    content: `<p>${message}</p>`,
                    buttonText: emailData?.buttonText || 'เปิดงานในระบบ',
                    buttonUrl
                  })
                : `<p>${message}</p>`;

              // เลือก method ตามประเภท
              switch (type) {
                case 'job_assigned':
                  if (buttonUrl) {
                    emailResult = await this.emailService.sendEmail(
                      user.email,
                      title,
                      createJobAssignmentEmail({
                        djId: emailData.jobId,
                        subject: emailData.jobSubject,
                        priority: emailData.priority,
                        dueDate: emailData.deadline,
                        magicLink: buttonUrl,
                        assigneeName: emailData.assigneeName || `${user.firstName} ${user.lastName}`.trim()
                      })
                    );
                  } else {
                    emailResult = await this.emailService.notifyJobAssigned({
                      ...emailData,
                      assigneeEmail: user.email,
                      assigneeName: `${user.firstName} ${user.lastName}`
                    });
                  }
                  break;
                case 'job_approval_request':
                  if (emailData?.magicLink) {
                    emailResult = await this.emailService.sendEmail(
                      user.email,
                      title,
                      createJobApprovalEmail({
                        djId: emailData.jobId,
                        subject: emailData.jobSubject,
                        priority: emailData.priority,
                        magicLink: emailData.magicLink,
                        approverName: emailData.approverName || `${user.firstName} ${user.lastName}`.trim()
                      })
                    );
                  } else {
                    emailResult = await this.emailService.sendCustomEmail(user.email, title, genericEmailHtml);
                  }
                  break;
                case 'job_rejected':
                  if (buttonUrl) {
                    emailResult = await this.emailService.sendEmail(
                      user.email,
                      title,
                      createJobRejectionEmail({
                        djId: emailData.jobId,
                        subject: emailData.jobSubject,
                        reason: emailData.comment || emailData.reason || message,
                        magicLink: buttonUrl,
                        requesterName: emailData.requesterName || `${user.firstName} ${user.lastName}`.trim()
                      })
                    );
                  } else {
                    emailResult = await this.emailService.sendCustomEmail(user.email, title, genericEmailHtml);
                  }
                  break;
                case 'job_status_changed':
                  emailResult = await this.emailService.notifyJobStatusChanged({
                    ...emailData,
                    recipients: [user.email]
                  });
                  break;
                case 'user_created':
                  emailResult = await this.emailService.notifyUserCreated({
                    ...emailData,
                    userEmail: user.email,
                    userName: `${user.firstName} ${user.lastName}`
                  });
                  break;
                default:
                  emailResult = await this.emailService.sendCustomEmail(user.email, title, genericEmailHtml);
              }

              if (emailResult.success) {
                results.email.sent++;
              } else {
                results.email.failed++;
              }
            }
          } catch (error) {
            console.error('[NotificationService] Email send failed:', error);
            results.email.failed++;
          }
        });

        await Promise.allSettled(emailPromises);
      }

      // 3. ส่ง real-time notification (ถ้ามี Socket.io)
      if (io) {
        for (const userId of userIds) {
          try {
            const room = `tenant_${tenantId}:user_${userId}`;
            io.to(room).emit('notification', {
              type,
              title,
              message,
              link,
              timestamp: new Date().toISOString()
            });
            results.realtime.sent++;
          } catch (error) {
            console.error('[NotificationService] Real-time send failed:', error);
            results.realtime.failed++;
          }
        }
      }

      return {
        success: true,
        results,
        message: 'ส่งการแจ้งเตือนเรียบร้อยแล้ว'
      };

    } catch (error) {
      console.error('[NotificationService] Send notification failed:', error);
      return {
        success: false,
        error: 'SEND_NOTIFICATION_FAILED',
        message: 'ไม่สามารถส่งการแจ้งเตือนได้',
        results
      };
    }
  }

  /**
   * ดึงรายการ notifications ของผู้ใช้
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @param {Object} options - ตัวเลือกการ query
   * @returns {Promise<Object>} - รายการ notifications
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null
    } = options;

    try {
      const where = { userId };

      if (unreadOnly) {
        where.isRead = false;
      }

      if (type) {
        where.type = type;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.notification.count({ where })
      ]);

      return {
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      console.error('[NotificationService] Get notifications failed:', error);
      return {
        success: false,
        error: 'GET_NOTIFICATIONS_FAILED',
        message: 'ไม่สามารถดึงรายการแจ้งเตือนได้'
      };
    }
  }

  /**
   * ทำเครื่องหมายว่าอ่านแล้ว
   * 
   * @param {number} notificationId - ID ของ notification
   * @param {number} userId - ID ของผู้ใช้ (สำหรับ verify)
   * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId
        },
        data: {
          isRead: true
        }
      });

      return {
        success: true,
        data: {
          updatedCount: notification.count
        },
        message: 'ทำเครื่องหมายว่าอ่านแล้ว'
      };
    } catch (error) {
      console.error('[NotificationService] Mark as read failed:', error);
      return {
        success: false,
        error: 'MARK_AS_READ_FAILED',
        message: 'ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้'
      };
    }
  }
  /**
   * Auto-cleanup: เก็บแค่ maxKeep รายการล่าสุดต่อ user
   * ลบอันที่อ่านแล้ว (เก่าสุด) ก่อน ถ้ายังเกินให้ลบ unread เก่าสุด
   * 
   * @param {number} userId - ID ของผู้ใช้
   * @param {number} maxKeep - จำนวนสูงสุดที่เก็บ (default: 10)
   */
  async cleanupNotifications(userId, maxKeep = 10) {
    try {
      const total = await this.prisma.notification.count({
        where: { userId }
      });

      if (total <= maxKeep) return;

      // ดึง notifications เรียงตาม: อ่านแล้วก่อน (isRead DESC), เก่าก่อน (createdAt ASC)
      const allNotifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: [
          { isRead: 'desc' },   // อ่านแล้ว (true) มาก่อน → ลบก่อน
          { createdAt: 'asc' }  // เก่าก่อน → ลบก่อน
        ],
        select: { id: true }
      });

      // ลบส่วนที่เกิน maxKeep (เอาตั้งแต่ต้น list = อ่านแล้ว+เก่าสุด)
      const toDelete = allNotifications.slice(0, total - maxKeep);
      if (toDelete.length > 0) {
        await this.prisma.notification.deleteMany({
          where: {
            id: { in: toDelete.map(n => n.id) }
          }
        });
        console.log(`[NotificationService] Cleanup: Deleted ${toDelete.length} old notifications for user ${userId}`);
      }
    } catch (error) {
      console.error('[NotificationService] Cleanup notifications failed:', error);
    }
  }
}

export default NotificationService;
