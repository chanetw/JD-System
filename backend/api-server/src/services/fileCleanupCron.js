/**
 * @file fileCleanupCron.js
 * @description Auto-delete ไฟล์เก่าหลังงาน completed/closed นาน FILE_RETENTION_DAYS วัน
 * 
 * ทำงานทุกคืน เวลา 02:00 น.
 * เงื่อนไขลบ: งานสถานะ completed/closed และ completedAt เกิน FILE_RETENTION_DAYS วัน
 * ประเภทไฟล์ที่ลบ: draft files, brief attachments, thumbnails
 * ไม่ลบ: media files ประเภท link (external links)
 * 
 * ENV: FILE_RETENTION_DAYS=30 (default)
 */

import { getDatabase } from '../config/database.js';
import { getStorageService } from './storageService.js';

const RETENTION_DAYS = parseInt(process.env.FILE_RETENTION_DAYS || '30', 10);
const CRON_HOUR = 2; // 02:00 น.

class FileCleanupCron {
  constructor() {
    this._timer = null;
  }

  /**
   * เริ่มต้น Cron
   */
  start() {
    console.log(`[FileCleanupCron] Starting — retention: ${RETENTION_DAYS} days, runs daily at ${CRON_HOUR}:00`);
    this._scheduleNext();
  }

  /**
   * หยุด Cron
   */
  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      console.log('[FileCleanupCron] Stopped');
    }
  }

  /**
   * คำนวณ ms จนถึง 02:00 น. วันถัดไป แล้ว schedule
   * @private
   */
  _scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(CRON_HOUR, 0, 0, 0);

    // ถ้าเวลา 02:00 น. ผ่านไปแล้วในวันนี้ → ตั้งเป็นพรุ่งนี้
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const msUntilNext = next.getTime() - now.getTime();
    console.log(`[FileCleanupCron] Next run: ${next.toISOString()} (in ${Math.round(msUntilNext / 1000 / 60)} minutes)`);

    this._timer = setTimeout(async () => {
      await this._run();
      this._scheduleNext(); // schedule วันถัดไป
    }, msUntilNext);
  }

  /**
   * ดำเนินการลบไฟล์
   * @private
   */
  async _run() {
    console.log(`[FileCleanupCron] ▶ Running file cleanup (retention: ${RETENTION_DAYS} days)`);
    const startTime = Date.now();

    try {
      const prisma = getDatabase();
      const storage = getStorageService();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      // ค้นหางานที่ completed/closed เกิน retention period
      const expiredJobs = await prisma.job.findMany({
        where: {
          status: { in: ['completed', 'closed'] },
          completedAt: { lte: cutoffDate }
        },
        select: {
          id: true,
          djId: true,
          completedAt: true,
          jobAttachments: {
            where: { deletedAt: null },
            select: { id: true, filePath: true, fileName: true }
          },
          mediaFiles: {
            where: {
              fileType: { not: 'link' } // ไม่ลบ external links
            },
            select: { id: true, filePath: true, fileName: true }
          }
        }
      });

      if (expiredJobs.length === 0) {
        console.log('[FileCleanupCron] No expired jobs found. Done.');
        return;
      }

      console.log(`[FileCleanupCron] Found ${expiredJobs.length} expired jobs`);

      let totalDeleted = 0;
      let totalFailed = 0;

      for (const job of expiredJobs) {
        const allFiles = [
          ...job.jobAttachments.map(f => ({ ...f, table: 'jobAttachment' })),
          ...job.mediaFiles.map(f => ({ ...f, table: 'mediaFile' }))
        ];

        if (allFiles.length === 0) continue;

        console.log(`[FileCleanupCron] Job ${job.djId}: deleting ${allFiles.length} files`);

        for (const file of allFiles) {
          try {
            // ลบไฟล์จาก disk/storage
            if (file.filePath) {
              const result = await storage.deleteFile(file.filePath);
              if (!result.success) {
                console.warn(`[FileCleanupCron] Storage delete failed for ${file.filePath}: ${result.message}`);
              }
            }

            // ลบ record จาก DB
            if (file.table === 'jobAttachment') {
              await prisma.jobAttachment.update({
                where: { id: file.id },
                data: { deletedAt: new Date() }
              });
            } else if (file.table === 'mediaFile') {
              await prisma.mediaFile.delete({ where: { id: file.id } });
            }

            totalDeleted++;
          } catch (fileError) {
            console.error(`[FileCleanupCron] Failed to delete file ${file.id}:`, fileError.message);
            totalFailed++;
          }
        }

        // บันทึก Activity Log
        try {
          await prisma.jobActivity.create({
            data: {
              jobId: job.id,
              tenantId: (await prisma.job.findUnique({ where: { id: job.id }, select: { tenantId: true } }))?.tenantId || 1,
              activityType: 'files_auto_cleaned',
              description: `Auto-deleted ${allFiles.length} files (retention: ${RETENTION_DAYS} days)`,
              metadata: {
                fileCount: allFiles.length,
                retentionDays: RETENTION_DAYS,
                completedAt: job.completedAt
              }
            }
          });
        } catch (logError) {
          console.warn(`[FileCleanupCron] Activity log failed for job ${job.djId}:`, logError.message);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[FileCleanupCron] ✅ Done in ${elapsed}ms — deleted: ${totalDeleted}, failed: ${totalFailed}`);

    } catch (error) {
      console.error('[FileCleanupCron] ❌ Run failed:', error);
    }
  }
}

const fileCleanupCron = new FileCleanupCron();
export default fileCleanupCron;
