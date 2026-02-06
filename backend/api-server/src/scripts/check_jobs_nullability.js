
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking jobs columns nullability ---');
        const result = await prisma.$queryRaw`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
    `;
        console.log(result);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
