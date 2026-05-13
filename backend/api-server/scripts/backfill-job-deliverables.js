import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');

const getArgValue = (name) => {
  const prefix = `${name}=`;
  const arg = args.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};

const limitArg = Number(getArgValue('--limit'));
const limit = Number.isInteger(limitArg) && limitArg > 0 ? limitArg : null;
const jobIdArg = Number(getArgValue('--job-id'));
const targetJobId = Number.isInteger(jobIdArg) && jobIdArg > 0 ? jobIdArg : null;

const parseFinalFiles = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getFileId = (entry) => {
  const parsed = Number(entry?.fileId ?? entry?.file_id ?? entry?.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function main() {
  console.log(`[Backfill] job_deliverables ${shouldApply ? 'APPLY' : 'DRY RUN'} started`);

  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ['completed', 'closed'] },
      finalFiles: { not: null },
      ...(targetJobId ? { id: targetJobId } : {})
    },
    select: {
      id: true,
      djId: true,
      tenantId: true,
      completedAt: true,
      finalFiles: true
    },
    orderBy: { id: 'asc' },
    ...(limit ? { take: limit } : {})
  });

  const planned = [];
  const skipped = [];

  for (const job of jobs) {
    const existingForJob = await prisma.jobDeliverable.count({
      where: {
        tenantId: job.tenantId,
        jobId: job.id
      }
    });

    if (existingForJob > 0) {
      skipped.push({ jobId: job.id, djId: job.djId, reason: 'deliverables_exist' });
      continue;
    }

    const fileEntries = parseFinalFiles(job.finalFiles)
      .map((entry) => ({ entry, fileId: getFileId(entry) }))
      .filter((item) => item.fileId);

    if (fileEntries.length === 0) {
      skipped.push({ jobId: job.id, djId: job.djId, reason: 'no_file_entries' });
      continue;
    }

    const seenFileIds = new Set();
    for (const { fileId } of fileEntries) {
      if (seenFileIds.has(fileId)) {
        skipped.push({ jobId: job.id, djId: job.djId, fileId, reason: 'duplicate_file_id' });
        continue;
      }
      seenFileIds.add(fileId);

      const mediaFile = await prisma.mediaFile.findFirst({
        where: {
          id: fileId,
          tenantId: job.tenantId,
          jobId: job.id
        },
        select: {
          fileName: true,
          filePath: true,
          fileSize: true,
          fileType: true,
          uploadedBy: true
        }
      });

      if (!mediaFile) {
        skipped.push({ jobId: job.id, djId: job.djId, fileId, reason: 'missing_media_file' });
        continue;
      }

      planned.push({
        tenantId: job.tenantId,
        jobId: job.id,
        djId: job.djId,
        version: 1,
        fileName: mediaFile.fileName,
        filePath: mediaFile.filePath,
        fileSize: mediaFile.fileSize,
        fileType: mediaFile.fileType,
        uploadedBy: mediaFile.uploadedBy,
        isFinal: true,
        createdAt: job.completedAt || new Date()
      });
    }
  }

  if (shouldApply && planned.length > 0) {
    for (const item of planned) {
      const existing = await prisma.jobDeliverable.findFirst({
        where: {
          tenantId: item.tenantId,
          jobId: item.jobId,
          fileName: item.fileName,
          filePath: item.filePath
        },
        select: { id: true }
      });

      if (existing) {
        skipped.push({ jobId: item.jobId, djId: item.djId, reason: 'already_exists_on_apply' });
        continue;
      }

      await prisma.jobDeliverable.create({
        data: {
          tenantId: item.tenantId,
          jobId: item.jobId,
          version: item.version,
          fileName: item.fileName,
          filePath: item.filePath,
          fileSize: item.fileSize,
          fileType: item.fileType,
          uploadedBy: item.uploadedBy,
          isFinal: item.isFinal,
          createdAt: item.createdAt
        }
      });
    }
  }

  console.log('[Backfill] Summary');
  console.log(`  Jobs scanned: ${jobs.length}`);
  console.log(`  Planned inserts: ${planned.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`);

  if (planned.length > 0) {
    console.log('[Backfill] Planned sample:', planned.slice(0, 10).map((item) => ({
      jobId: item.jobId,
      djId: item.djId,
      fileName: item.fileName
    })));
  }

  if (skipped.length > 0) {
    console.log('[Backfill] Skipped sample:', skipped.slice(0, 20));
  }
}

main()
  .catch((error) => {
    console.error('[Backfill] Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
