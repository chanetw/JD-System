
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Triggers on jobs table ---');
        const triggers = await prisma.$queryRaw`
      SELECT tgname, pg_get_triggerdef(oid)
      FROM pg_trigger
      WHERE tgrelid = 'jobs'::regclass
    `;
        console.log(triggers);

        console.log('--- Checking Logic of Triggers ---');
        // If we identify a specific function name from above, we can inspect it.
        // For now, let's list functions used.

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
