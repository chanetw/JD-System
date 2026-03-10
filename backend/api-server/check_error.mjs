import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'media_files'::regclass;
  `;
  console.log("Constraints on media_files:", result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
