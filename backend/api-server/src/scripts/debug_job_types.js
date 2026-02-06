
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Job Types ---');
        const jobTypes = await prisma.jobType.findMany({
            orderBy: { id: 'asc' }
        });

        console.log(`Found ${jobTypes.length} job types:`);
        jobTypes.forEach(t => console.log(`[${t.id}] ${t.name}`));

        const maxId = jobTypes.length > 0 ? Math.max(...jobTypes.map(t => t.id)) : 0;
        console.log(`Max ID in DB: ${maxId}`);

        // Check specifically for the one causing issues
        const targetName = 'Project Group (Parent)';
        const target = jobTypes.find(t => t.name === targetName);
        console.log(`Target '${targetName}' found?`, target ? `YES (ID: ${target.id})` : 'NO');

        // If we could check sequence, we would, but Prisma raw query is needed
        try {
            // Try getting next val to see where it is (Transaction rollback ensures no side effect if possible, or just checking value)
            // Note: checking currval or nextval depends on dialect. Postgres: `SELECT last_value FROM job_types_id_seq`
            const seqResult = await prisma.$queryRaw`SELECT last_value FROM "job_types_id_seq"`;
            console.log('Sequence State:', seqResult);
        } catch (e) {
            console.log('Could not check sequence directly:', e.message);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
