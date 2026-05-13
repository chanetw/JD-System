import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const REQUIRED_COLUMNS = [
  'id',
  'tenant_id',
  'job_id',
  'version',
  'file_name',
  'file_path',
  'file_size',
  'file_type',
  'uploaded_by',
  'is_final',
  'created_at'
];

const toNumber = (value) => Number(value || 0);

async function main() {
  console.log('[Preflight] Checking job_deliverables storage contract...');

  const tableRows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'job_deliverables'
  `;

  if (tableRows.length === 0) {
    console.error('[Preflight] ❌ Missing table: public.job_deliverables');
    process.exitCode = 1;
    return;
  }

  const columnRows = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_deliverables'
  `;
  const existingColumns = new Set(columnRows.map((row) => row.column_name));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !existingColumns.has(column));

  if (missingColumns.length > 0) {
    console.error(`[Preflight] ❌ Missing columns: ${missingColumns.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const deliverableCount = await prisma.jobDeliverable.count();
  const completedRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM jobs
    WHERE status IN ('completed', 'closed')
      AND final_files IS NOT NULL
      AND final_files::text <> '[]'
  `;
  const missingDeliverableRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM jobs j
    WHERE j.status IN ('completed', 'closed')
      AND j.final_files IS NOT NULL
      AND j.final_files::text <> '[]'
      AND NOT EXISTS (
        SELECT 1
        FROM job_deliverables d
        WHERE d.job_id = j.id
          AND d.tenant_id = j.tenant_id
      )
  `;

  console.log('[Preflight] ✅ job_deliverables table and columns are ready');
  console.log(`[Preflight] Existing deliverables: ${deliverableCount}`);
  console.log(`[Preflight] Completed/closed jobs with final_files: ${toNumber(completedRows[0]?.count)}`);
  console.log(`[Preflight] Jobs with final_files but no deliverables: ${toNumber(missingDeliverableRows[0]?.count)}`);
}

main()
  .catch((error) => {
    console.error('[Preflight] Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
