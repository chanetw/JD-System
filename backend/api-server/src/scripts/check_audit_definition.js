
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking audit_logs table definition ---');
        const columns = await prisma.$queryRaw`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
    `;
        console.log(columns);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
