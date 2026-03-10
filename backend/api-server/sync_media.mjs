import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'completed' },
    select: { id: true, djId: true, subject: true, projectId: true, finalFiles: true, tenantId: true, completedBy: true }
  });

  console.log(`Found ${jobs.length} completed jobs`);
  
  for (const job of jobs) {
    if (job.finalFiles && Array.isArray(job.finalFiles)) {
      for (const file of job.finalFiles) {
        if (file.url) {
          // Check if it already exists
          const existing = await prisma.mediaFile.findFirst({
            where: { jobId: job.id, filePath: file.url }
          });
          if (!existing) {
             console.log(`Creating MediaFile for ${job.djId}: ${file.url}`);
             try {
                 await prisma.mediaFile.create({
                   data: {
                     tenant: { connect: { id: job.tenantId } }, // Fix tenant Missing Relation error
                     job: { connect: { id: job.id } },
                     project: job.projectId ? { connect: { id: job.projectId } } : undefined,
                     fileName: file.name || `ลิงก์ส่งงาน - ${job.djId}`,
                     filePath: file.url,
                     fileType: 'link', 
                     mimeType: 'text/uri-list',
                     user: job.completedBy ? { connect: { id: job.completedBy } } : undefined,
                     fileSize: 0,
                   }
                 });
                 console.log(`OK: ${job.djId}`);
             } catch (e) {
                 console.error(`Failed: ${job.djId} - ${e.message}`);
             }
          } else {
             console.log(`Already exists: ${job.djId}`);
          }
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
