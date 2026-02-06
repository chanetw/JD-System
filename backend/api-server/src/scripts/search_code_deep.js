
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Searching for app.tenant_id in Trigger Definitions ---');
        const triggers = await prisma.$queryRaw`
      SELECT tgname, pg_get_triggerdef(oid) as def
      FROM pg_trigger
      WHERE pg_get_triggerdef(oid) ILIKE '%app.tenant_id%'
    `;
        console.log('Triggers:', triggers);

        console.log('--- Searching for app.tenant_id in View Definitions ---');
        const views = await prisma.$queryRaw`
      SELECT viewname, definition
      FROM pg_views
      WHERE definition ILIKE '%app.tenant_id%'
    `;
        console.log('Views:', views);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
