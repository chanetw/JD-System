
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Searching for app.tenant_id usage in functions ---');
        const result = await prisma.$queryRaw`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE prosrc ILIKE '%app.tenant_id%'
    `;

        // Output properly formatted
        if (Array.isArray(result)) {
            result.forEach(r => {
                console.log(`\nFUNCTION: ${r.proname}`);
                console.log('-------------------------------------------');
                console.log(r.prosrc);
                console.log('-------------------------------------------');
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
