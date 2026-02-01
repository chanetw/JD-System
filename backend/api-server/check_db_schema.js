import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking columns in approval_flows...');
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'approval_flows'
      ORDER BY column_name;
    `;
        console.log('Found columns:', columns);
    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
