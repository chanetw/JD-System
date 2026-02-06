
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Dumping create_audit_log function ---');
        const result = await prisma.$queryRaw`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'create_audit_log'
    `;

        if (Array.isArray(result)) {
            result.forEach(r => {
                console.log(r.prosrc);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
