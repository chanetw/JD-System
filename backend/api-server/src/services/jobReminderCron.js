/**
 * Job Approved Reminder Cron Service
 *
 * เตือน Assignee เมื่องานอยู่ในสถานะ approved/assigned เกิน 24 ชั่วโมง
 * ส่ง notification ใน app + email
 *
 * ป้องกัน spam: ตรวจสอบว่ามี noti type 'job_approved_reminder' 
 * สำหรับ job นี้ภายใน 24 ชม. แล้วหรือยัง
 *
 * Usage:
 * - Call jobReminderCron.start() in server startup
 * - Runs every 60 minutes to check for stale approved jobs
 */

import { getDatabase } from '../config/database.js';
import NotificationService from './notificationService.js';
import EmailService from './emailService.js';

class JobReminderCron {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMinutes = 60; // ทุก 60 นาที
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

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkStaleJobs();
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
   * ค้นหางานที่ approved/assigned เกิน 24 ชม. และส่ง reminder
   */
  async checkStaleJobs() {
    try {
      const prisma = getDatabase();
      const notificationService = new NotificationService(prisma);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // หางานที่ approved/assigned เกิน 24 ชม.
      // ใช้ assignedAt สำหรับ assigned, createdAt สำหรับ approved (เพราะ schema ไม่มี updatedAt)
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
          assignee: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
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
          // ตรวจสอบว่าส่ง reminder ไปแล้วภายใน 24 ชม. หรือยัง
          const existingReminder = await prisma.notification.findFirst({
            where: {
              userId: job.assigneeId,
              type: 'job_approved_reminder',
              link: `/jobs/${job.id}`,
              createdAt: { gte: twentyFourHoursAgo }
            }
          });

          if (existingReminder) {
            continue; // ข้าม — ส่งไปแล้วภายใน 24 ชม.
          }

          // ส่ง notification ใน app
          const statusText = job.status === 'approved' ? 'อนุมัติแล้ว' : 'ได้รับมอบหมาย';
          await notificationService.createNotification({
            tenantId: job.tenantId,
            userId: job.assigneeId,
            type: 'job_approved_reminder',
            title: `เตือน: งาน ${job.djId} รอดำเนินการเกิน 1 วัน`,
            message: `งาน "${job.subject}" สถานะ "${statusText}" เกิน 24 ชั่วโมงแล้ว กรุณาดำเนินการ`,
            link: `/jobs/${job.id}`
          });

          // ส่ง email
          if (job.assignee?.email) {
            try {
              const emailSvc = new EmailService();
              const toName = `${job.assignee.firstName || ''} ${job.assignee.lastName || ''}`.trim();
              await emailSvc.sendEmail(
                job.assignee.email,
                `⏰ เตือน: งาน ${job.djId} รอดำเนินการเกิน 1 วัน`,
                `<h2>เตือนการดำเนินการ</h2>
                <p><strong>งาน:</strong> ${job.djId} - ${job.subject}</p>
                <p><strong>สถานะ:</strong> ${statusText} (เกิน 24 ชั่วโมง)</p>
                <p><strong>ผู้รับงาน:</strong> ${toName}</p>
                <p>กรุณาเข้าระบบและดำเนินการโดยเร็ว</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${job.id}">ดูรายละเอียดงาน</a></p>`
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

      console.log(`[JobReminder] Sent ${sentCount} reminders`);
    } catch (error) {
      console.error('[JobReminder] Check stale jobs failed:', error);
    }
  }
}

const jobReminderCron = new JobReminderCron();
export default jobReminderCron;
