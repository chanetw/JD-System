
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Fixing Job Types Sequence ---');

        // 1. Get current Max ID
        const result = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM "job_types"`;
        const maxId = Number(result[0].max_id);
        console.log(`Current Max ID in job_types: ${maxId}`);

        if (maxId > 0) {
            // 2. Update sequence
            // Note: We cast maxId to integer in the query or pass it as parameter
            // Prisma raw query with cleanup
            await prisma.$executeRawUnsafe(`SELECT setval('job_types_id_seq', ${maxId})`);
            console.log(`✅ Sequence 'job_types_id_seq' updated to ${maxId}`);

            // 3. Verify
            const seqResult = await prisma.$queryRaw`SELECT last_value FROM "job_types_id_seq"`;
            console.log('New Sequence State:', seqResult);
        } else {
            console.log('No data in job_types, no need to fix sequence.');
        }

    } catch (error) {
        console.error('Error fixing sequence:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
