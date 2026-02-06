
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Searching for app.tenant_id in Column Defaults ---');
        const result = await prisma.$queryRaw`
      SELECT table_name, column_name, column_default
      FROM information_schema.columns 
      WHERE column_default ILIKE '%app.tenant_id%'
    `;
        console.log(result);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
