/**
 * @file backfillNotifications.js
 * @description Script สำหรับสร้าง notifications ย้อนหลังจาก activity_logs
 * 
 * ตรวจสอบ activity_logs ที่เกี่ยวกับ:
 * - rebrief_requested → แจ้ง requester
 * - rebrief_submitted → แจ้ง assignee
 * - rebrief_accepted → แจ้ง requester
 * - job_completed / completed → แจ้ง requester
 * - draft_submitted → แจ้ง requester
 * - status_changed → แจ้งตามกรณี
 * 
 * Usage: node src/scripts/backfillNotifications.js
 */

import { getDatabase } from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const NOTIFICATION_MAP = {
  rebrief_requested: {
    type: 'rebrief_requested',
    getRecipient: (job) => job.requesterId,
    getTitle: (job) => `🔄 ขอข้อมูลเพิ่มเติม: ${job.djId}`,
    getMessage: (job, log) => `ผู้รับงานขอข้อมูลเพิ่มเติมสำหรับงาน "${job.subject}"`,
  },
  rebrief_submitted: {
    type: 'rebrief_submitted',
    getRecipient: (job) => job.assigneeId,
    getTitle: (job) => `✅ ข้อมูลเพิ่มเติมส่งมาแล้ว: ${job.djId}`,
    getMessage: (job) => `ผู้สั่งงานส่งข้อมูลเพิ่มเติมสำหรับงาน "${job.subject}" มาแล้ว`,
  },
  rebrief_accepted: {
    type: 'rebrief_accepted',
    getRecipient: (job) => job.requesterId,
    getTitle: (job) => `✅ งาน ${job.djId} รับแล้ว`,
    getMessage: (job) => `ผู้รับงานรับงาน "${job.subject}" แล้วหลัง Rebrief`,
  },
  completed: {
    type: 'job_completed',
    getRecipient: (job, log) => {
      // แจ้ง requester ถ้าคน complete ไม่ใช่ requester
      if (log.userId !== job.requesterId) return job.requesterId;
      return null;
    },
    getTitle: (job) => `✅ งาน ${job.djId} เสร็จสมบูรณ์`,
    getMessage: (job) => `งาน "${job.subject}" เสร็จสมบูรณ์แล้ว`,
  },
  draft_submitted: {
    type: 'draft_submitted',
    getRecipient: (job) => job.requesterId,
    getTitle: (job) => `📝 Draft ส่งมาให้ตรวจ: ${job.djId}`,
    getMessage: (job) => `ผู้รับงานส่ง Draft สำหรับงาน "${job.subject}" มาให้ตรวจ`,
  },
};

async function backfill() {
  console.log('🔄 Starting notification backfill...\n');

  const prisma = getDatabase();

  // ดึง activity_logs ที่เกี่ยวข้อง
  const targetActions = Object.keys(NOTIFICATION_MAP);
  
  const activities = await prisma.activityLog.findMany({
    where: {
      action: { in: targetActions }
    },
    include: {
      job: {
        select: {
          id: true,
          djId: true,
          subject: true,
          tenantId: true,
          requesterId: true,
          assigneeId: true,
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📋 พบ ${activities.length} activity logs ที่เกี่ยวข้อง\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const log of activities) {
    const config = NOTIFICATION_MAP[log.action];
    if (!config || !log.job) {
      skipped++;
      continue;
    }

    const recipientId = typeof config.getRecipient === 'function'
      ? config.getRecipient(log.job, log)
      : null;

    if (!recipientId) {
      skipped++;
      continue;
    }

    const link = `/jobs/${log.job.id}`;

    // ตรวจว่ามี notification นี้อยู่แล้วหรือยัง
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: config.type,
        link,
        createdAt: {
          gte: new Date(new Date(log.createdAt).getTime() - 60000), // ±1 นาที
          lte: new Date(new Date(log.createdAt).getTime() + 60000),
        }
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // สร้าง notification
    try {
      await prisma.notification.create({
        data: {
          tenantId: log.job.tenantId,
          userId: recipientId,
          type: config.type,
          title: config.getTitle(log.job),
          message: config.getMessage(log.job, log),
          link,
          isRead: false,
          createdAt: log.createdAt // ใช้เวลาเดียวกับ activity log
        }
      });
      created++;
      console.log(`  ✅ [${log.action}] ${log.job.djId} → user ${recipientId} (${log.createdAt.toISOString().slice(0,16)})`);
    } catch (err) {
      errors++;
      console.error(`  ❌ [${log.action}] ${log.job.djId}: ${err.message}`);
    }
  }

  console.log(`\n📊 สรุป:`);
  console.log(`  ✅ สร้างใหม่: ${created}`);
  console.log(`  ⏭️  ข้ามแล้ว (มีอยู่แล้ว/ไม่เข้าเงื่อนไข): ${skipped}`);
  console.log(`  ❌ Error: ${errors}`);
  console.log(`\n🏁 Backfill เสร็จสิ้น`);

  process.exit(0);
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
