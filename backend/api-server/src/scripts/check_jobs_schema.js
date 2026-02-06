
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Jobs Table Schema ---');
        // Prisma doesn't have easy 'describe table', so we try raw query to info schema
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
    `;

        console.log('Columns in jobs table:');
        const cols = columns.map(c => c.column_name);
        console.log(cols.join(', '));

        console.log('Has is_parent?', cols.includes('is_parent'));
        console.log('Has parent_job_id?', cols.includes('parent_job_id'));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
