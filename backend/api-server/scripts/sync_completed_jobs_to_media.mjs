/**
 * Sync Script: งานที่ส่งมอบแล้ว (completed) แต่ยังไม่มีใน MediaFile
 * 
 * วัตถุประสงค์:
 * - ดึงงานที่มี status = 'completed' และมี finalFiles
 * - ตรวจสอบว่ามี record ใน mediaFile แล้วหรือยัง
 * - ถ้ายังไม่มี -> insert เข้า mediaFile
 * 
 * วิธีรัน:
 * node backend/api-server/scripts/sync_completed_jobs_to_media.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncCompletedJobsToMedia() {
  console.log('[Sync] Starting sync completed jobs to media files...\n');

  try {
    // 1. ดึงงานที่ completed และมี finalFiles
    const completedJobs = await prisma.job.findMany({
      where: {
        status: { in: ['completed', 'closed'] },
        finalFiles: { not: null }
      },
      select: {
        id: true,
        djId: true,
        tenantId: true,
        projectId: true,
        finalFiles: true,
        completedBy: true,
        completedAt: true
      }
    });

    console.log(`[Sync] Found ${completedJobs.length} completed jobs with finalFiles\n`);

    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Loop แต่ละงาน
    for (const job of completedJobs) {
      try {
        // ตรวจสอบว่ามี mediaFile ของงานนี้แล้วหรือยัง
        const existingMedia = await prisma.mediaFile.findFirst({
          where: { jobId: job.id }
        });

        if (existingMedia) {
          console.log(`[Skip] Job ${job.djId} already has media files`);
          skippedCount++;
          continue;
        }

        // Parse finalFiles (อาจเป็น JSON string หรือ array)
        let attachments = [];
        if (typeof job.finalFiles === 'string') {
          try {
            attachments = JSON.parse(job.finalFiles);
          } catch (e) {
            console.warn(`[Warn] Job ${job.djId} has invalid finalFiles JSON:`, job.finalFiles);
            continue;
          }
        } else if (Array.isArray(job.finalFiles)) {
          attachments = job.finalFiles;
        } else {
          console.warn(`[Warn] Job ${job.djId} has unknown finalFiles format:`, typeof job.finalFiles);
          continue;
        }

        // ถ้าไม่มี attachments หรือเป็น array ว่าง
        if (!attachments || attachments.length === 0) {
          console.log(`[Skip] Job ${job.djId} has empty finalFiles`);
          skippedCount++;
          continue;
        }

        // 3. ตรวจสอบว่างานยังมีอยู่จริงในตาราง jobs
        const jobExists = await prisma.job.findUnique({
          where: { id: job.id }
        });

        if (!jobExists) {
          console.warn(`[Warn] Job ${job.djId} (ID: ${job.id}) not found in database, skipping...`);
          skippedCount++;
          continue;
        }

        // 4. Insert แต่ละ attachment เข้า mediaFile
        for (const att of attachments) {
          if (att.url) {
            try {
              await prisma.mediaFile.create({
                data: {
                  tenantId: job.tenantId,
                  jobId: job.id,
                  projectId: job.projectId,
                  fileName: att.name || `ลิงก์ส่งงาน - ${job.djId}`,
                  filePath: att.url,
                  fileType: 'link',
                  mimeType: 'text/uri-list',
                  uploadedBy: job.completedBy || 1, // fallback to admin if null
                  fileSize: 0,
                  createdAt: job.completedAt || new Date()
                }
              });
              console.log(`[Insert] ✅ Job ${job.djId} -> MediaFile: ${att.name || att.url}`);
              insertedCount++;
            } catch (insertError) {
              console.error(`[Error] Failed to insert media for Job ${job.djId}:`, insertError.message);
              errorCount++;
            }
          }
        }

      } catch (jobError) {
        console.error(`[Error] Job ${job.djId} failed:`, jobError.message);
        errorCount++;
      }
    }

    console.log('\n[Sync] Summary:');
    console.log(`  - Total Jobs: ${completedJobs.length}`);
    console.log(`  - Inserted: ${insertedCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);

  } catch (error) {
    console.error('[Sync] Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncCompletedJobsToMedia();
