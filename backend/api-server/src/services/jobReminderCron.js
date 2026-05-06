/**
 * Job Reminder Cron Service
 *
 * 1. checkStaleJobs: เตือน Assignee เมื่องานอยู่ใน approved/assigned เกิน 24 ชั่วโมง
 * 2. checkUpcomingSLA: เตือน Assignee + Requester เมื่องานจะครบกำหนดในอีก 1 วัน
 *
 * ป้องกัน spam: ตรวจสอบ notification ที่ส่งภายใน 24 ชม. แล้วหรือยัง
 *
 * Usage:
 * - Call jobReminderCron.start() in server startup
 * - Runs every 60 minutes
 */

import { getDatabase } from '../config/database.js';
import NotificationService from './notificationService.js';
import EmailService from './emailService.js';
import MagicLinkService from './magicLinkService.js';
import { createSlaDeadlineReminderEmail, createStaleJobReminderEmail } from '../utils/emailTemplates.js';

class JobReminderCron {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMinutes = 60; // ทุก 60 นาที
    this.magicLinkService = new MagicLinkService();
  }

  /**
   * Start the reminder cron job
   */
  start() {
    if (this.isRunning) {
      console.warn('[JobReminder] Cron already running');
      return;
    }

    console.log(`[JobReminder] Starting cron (every ${this.intervalMinutes} minutes)`);

    // Run immediately on start
    this.checkStaleJobs();
    this.checkUpcomingSLA();
    this.checkAssigneeRejectionTimeout();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkStaleJobs();
      this.checkUpcomingSLA();
      this.checkAssigneeRejectionTimeout();
    }, this.intervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  /**
   * Stop the reminder cron job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[JobReminder] Cron stopped');
  }

  /**
   * ค้นหางานที่ approved/assigned เกิน 24 ชม. และส่ง reminder ให้ Assignee
   */
  async checkStaleJobs() {
    try {
      const prisma = getDatabase();
      const notificationService = new NotificationService(prisma);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const staleJobs = await prisma.job.findMany({
        where: {
          status: { in: ['approved', 'assigned'] },
          assigneeId: { not: null },
          OR: [
            { assignedAt: { lt: twentyFourHoursAgo } },
            { assignedAt: null, createdAt: { lt: twentyFourHoursAgo } }
          ]
        },
        select: {
          id: true,
          djId: true,
          subject: true,
          status: true,
          tenantId: true,
          assigneeId: true,
          assignee: { select: { email: true, firstName: true, lastName: true } }
        }
      });

      if (staleJobs.length === 0) {
        console.log('[JobReminder] No stale approved/assigned jobs found');
        return;
      }

      console.log(`[JobReminder] Found ${staleJobs.length} stale jobs to remind`);

      let sentCount = 0;
      for (const job of staleJobs) {
        try {
          const existingReminder = await prisma.notification.findFirst({
            where: {
              userId: job.assigneeId,
              type: 'job_approved_reminder',
              link: `/jobs/${job.id}`,
              createdAt: { gte: twentyFourHoursAgo }
            }
          });

          if (existingReminder) continue;

          const statusText = job.status === 'approved' ? 'อนุมัติแล้ว' : 'ได้รับมอบหมาย';
          await notificationService.createNotification({
            tenantId: job.tenantId,
            userId: job.assigneeId,
            type: 'job_approved_reminder',
            title: `เตือน: งาน ${job.djId} รอดำเนินการเกิน 1 วัน`,
            message: `งาน "${job.subject}" สถานะ "${statusText}" เกิน 24 ชั่วโมงแล้ว กรุณาดำเนินการ`,
            link: `/jobs/${job.id}`
          });

          if (job.assignee?.email) {
            try {
              const emailSvc = new EmailService();
              const toName = `${job.assignee.firstName || ''} ${job.assignee.lastName || ''}`.trim();
              const magicLink = await this.magicLinkService.createJobActionLink({
                userId: job.assigneeId,
                jobId: job.id,
                action: 'view',
                djId: job.djId
              });
              await emailSvc.sendEmail(
                job.assignee.email,
                `⏰ เตือน: งาน ${job.djId} รอดำเนินการเกิน 1 วัน`,
                createStaleJobReminderEmail({
                  assigneeName: toName,
                  jobId: job.djId,
                  jobSubject: job.subject,
                  statusText,
                  jobUrl: magicLink
                })
              );
            } catch (emailErr) {
              console.error(`[JobReminder] Email failed for job ${job.djId}:`, emailErr.message);
            }
          }

          sentCount++;
        } catch (jobErr) {
          console.error(`[JobReminder] Failed to process job ${job.djId}:`, jobErr.message);
        }
      }

      console.log(`[JobReminder] Sent ${sentCount} stale reminders`);
    } catch (error) {
      console.error('[JobReminder] checkStaleJobs failed:', error);
    }
  }

  /**
   * ค้นหางานที่จะครบกำหนดในอีก 1 วัน และส่ง SLA reminder ให้ทั้ง Assignee และ Requester
   */
  async checkUpcomingSLA() {
    try {
      const prisma = getDatabase();
      const notificationService = new NotificationService(prisma);

      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const EXCLUDED_STATUSES = ['completed', 'closed', 'cancelled'];
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const upcomingJobs = await prisma.job.findMany({
        where: {
          isParent: false,
          dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
          status: { notIn: EXCLUDED_STATUSES }
        },
        select: {
          id: true,
          djId: true,
          subject: true,
          dueDate: true,
          tenantId: true,
          assigneeId: true,
          requesterId: true,
          assignee: { select: { email: true, firstName: true, lastName: true } },
          requester: { select: { email: true, firstName: true, lastName: true } }
        }
      });

      if (upcomingJobs.length === 0) {
        console.log('[JobReminder] No upcoming SLA jobs found');
        return;
      }

      console.log(`[JobReminder] Found ${upcomingJobs.length} jobs with SLA due tomorrow`);

      let sentCount = 0;
      for (const job of upcomingJobs) {
        const dueDateStr = job.dueDate
          ? new Date(job.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
          : '-';
        const jobLink = `/jobs/${job.id}`;

        // --- Assignee ---
        if (job.assigneeId) {
          try {
            const existingNoti = await prisma.notification.findFirst({
              where: {
                userId: job.assigneeId,
                type: 'sla_reminder',
                link: jobLink,
                createdAt: { gte: twentyFourHoursAgo }
              }
            });

            if (!existingNoti) {
              await notificationService.createNotification({
                tenantId: job.tenantId,
                userId: job.assigneeId,
                type: 'sla_reminder',
                title: `⏰ งาน ${job.djId} ครบกำหนดพรุ่งนี้`,
                message: `งาน "${job.subject}" จะครบกำหนดวันที่ ${dueDateStr} กรุณาดำเนินการให้เสร็จ`,
                link: jobLink
              });

              if (job.assignee?.email) {
                const emailSvc = new EmailService();
                const assigneeName = `${job.assignee.firstName || ''} ${job.assignee.lastName || ''}`.trim();
                const magicLink = await this.magicLinkService.createJobActionLink({
                  userId: job.assigneeId,
                  jobId: job.id,
                  action: 'view',
                  djId: job.djId
                });
                await emailSvc.sendEmail(
                  job.assignee.email,
                  `⏰ งาน ${job.djId} ครบกำหนดพรุ่งนี้`,
                  createSlaDeadlineReminderEmail({
                    recipientName: assigneeName,
                    jobId: job.djId,
                    jobSubject: job.subject,
                    dueDateText: dueDateStr,
                    role: 'assignee',
                    jobUrl: magicLink
                  })
                ).catch(err => console.error(`[JobReminder] Assignee email failed for ${job.djId}:`, err.message));
              }

              sentCount++;
            }
          } catch (err) {
            console.error(`[JobReminder] Assignee SLA reminder failed for ${job.djId}:`, err.message);
          }
        }

        // --- Requester ---
        if (job.requesterId) {
          try {
            const existingNoti = await prisma.notification.findFirst({
              where: {
                userId: job.requesterId,
                type: 'sla_reminder',
                link: jobLink,
                createdAt: { gte: twentyFourHoursAgo }
              }
            });

            if (!existingNoti) {
              await notificationService.createNotification({
                tenantId: job.tenantId,
                userId: job.requesterId,
                type: 'sla_reminder',
                title: `⏰ งาน ${job.djId} ครบกำหนดพรุ่งนี้`,
                message: `งาน "${job.subject}" ที่คุณร้องขอจะครบกำหนดวันที่ ${dueDateStr}`,
                link: jobLink
              });

              if (job.requester?.email) {
                const emailSvc = new EmailService();
                const requesterName = `${job.requester.firstName || ''} ${job.requester.lastName || ''}`.trim();
                const magicLink = await this.magicLinkService.createJobActionLink({
                  userId: job.requesterId,
                  jobId: job.id,
                  action: 'view',
                  djId: job.djId
                });
                await emailSvc.sendEmail(
                  job.requester.email,
                  `⏰ งาน ${job.djId} ครบกำหนดพรุ่งนี้`,
                  createSlaDeadlineReminderEmail({
                    recipientName: requesterName,
                    jobId: job.djId,
                    jobSubject: job.subject,
                    dueDateText: dueDateStr,
                    role: 'requester',
                    jobUrl: magicLink
                  })
                ).catch(err => console.error(`[JobReminder] Requester email failed for ${job.djId}:`, err.message));
              }

              sentCount++;
            }
          } catch (err) {
            console.error(`[JobReminder] Requester SLA reminder failed for ${job.djId}:`, err.message);
          }
        }
      }

      console.log(`[JobReminder] Sent ${sentCount} SLA deadline reminders`);
    } catch (error) {
      console.error('[JobReminder] checkUpcomingSLA failed:', error);
    }
  }

  /**
   * ตรวจสอบงานที่ assignee_rejected และ auto-close ถ้า deadline ผ่านไป
   * Deadline = 1 วันทำการตั้งแต่เวลาที่ปฏิเสธ
   */
  async checkAssigneeRejectionTimeout() {
    try {
      const prisma = getDatabase();
      const notificationService = new NotificationService(prisma);

      // ดึงงานทั้งหมดที่อยู่ใน assignee_rejected
      const rejectedJobs = await prisma.job.findMany({
        where: {
          status: 'assignee_rejected'
        },
        select: {
          id: true,
          djId: true,
          subject: true,
          tenantId: true,
          requesterId: true,
          assigneeId: true,
          requester: { select: { email: true, firstName: true, lastName: true } },
          assignee: { select: { email: true, firstName: true, lastName: true } }
        }
      });

      if (rejectedJobs.length === 0) {
        console.log('[JobReminder] No assignee_rejected jobs found');
        return;
      }

      console.log(`[JobReminder] Found ${rejectedJobs.length} assignee_rejected jobs to check`);

      const { countWorkingDaysBetween } = await import('./jobAcceptanceService.js');

      let autoClosedCount = 0;

      for (const job of rejectedJobs) {
        try {
          // หา timestamp ของการปฏิเสธจาก activity log
          const rejectionActivity = await prisma.activityLog.findFirst({
            where: {
              jobId: job.id,
              action: 'job_rejected_by_assignee'
            },
            orderBy: { createdAt: 'desc' }
          });

          if (!rejectionActivity) {
            console.warn(
              `[JobReminder] No rejection activity found for job ${job.djId}, skipping`
            );
            continue;
          }

          // นับวันทำการที่ผ่านไปแล้ว
          const now = new Date();
          const workingDaysElapsed = await countWorkingDaysBetween(
            rejectionActivity.createdAt,
            now,
            job.tenantId
          );

          // ถ้า >= 1 วันทำการ → auto-close
          if (workingDaysElapsed >= 1) {
            console.log(
              `[JobReminder] Auto-closing job ${job.djId} ` +
              `(${workingDaysElapsed} working days elapsed since rejection)`
            );

            // Update status to rejected
            const autoClosedAt = new Date();
            const description = `ระบบปิดงานอัตโนมัติ เพราะ approver ไม่ตัดสินใจ ภายในวันทำการที่กำหนด (${workingDaysElapsed} วันทำการ)`;
            const detail = {
              rejectionTimestamp: rejectionActivity.createdAt.toISOString(),
              workingDaysElapsed,
              autoClosedAt: autoClosedAt.toISOString()
            };

            const updateResult = await prisma.job.updateMany({
              where: {
                id: job.id,
                status: 'assignee_rejected'
              },
              data: {
                status: 'rejected'
              }
            });

            if (updateResult.count === 0) {
              console.log(
                `[JobReminder] Skip auto-close for ${job.djId} because status changed during processing`
              );
              continue;
            }

            // Log activity
            await prisma.jobActivity.create({
              data: {
                tenantId: job.tenantId,
                jobId: job.id,
                userId: null, // System action
                activityType: 'auto_closed_rejection_timeout',
                description,
                metadata: detail
              }
            });

            await prisma.activityLog.create({
              data: {
                jobId: job.id,
                userId: null,
                action: 'auto_closed_rejection_timeout',
                message: description,
                detail
              }
            });

            // Notify requester
            if (job.requesterId) {
              await notificationService
                .createNotification({
                  tenantId: job.tenantId,
                  userId: job.requesterId,
                  type: 'rejection_auto_closed',
                  title: `❌ งาน ${job.djId} ปฏิเสธอัตโนมัติ`,
                  message: `งาน "${job.subject}" ถูกปฏิเสธอัตโนมัติ ` +
                    `เพราะผู้อนุมัติไม่ตัดสินใจภายในกำหนดเวลา`,
                  link: `/jobs/${job.id}`
                })
                .catch(err =>
                  console.warn('[RejectionTimeout] Notification failed:', err.message)
                );
            }

            autoClosedCount++;
          }
        } catch (jobError) {
          console.error(
            `[JobReminder] Error checking job ${job.djId}:`,
            jobError.message
          );
          // Continue to next job
        }
      }

      if (autoClosedCount > 0) {
        console.log(
          `[JobReminder] Auto-closed ${autoClosedCount} rejection timeouts`
        );
      }
    } catch (error) {
      console.error('[JobReminder] checkAssigneeRejectionTimeout error:', error);
    }
  }
}

const jobReminderCron = new JobReminderCron();
export default jobReminderCron;
