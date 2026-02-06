
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking job_types Schema ---');
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'job_types'
    `;
        console.log(columns);

        console.log('--- Checking job_types Policies ---');
        const policies = await prisma.$queryRaw`
      SELECT polname, 
             pg_get_expr(polqual, polrelid) as polqual
      FROM pg_policy 
      WHERE polrelid = 'job_types'::regclass
    `;
        console.log(policies);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
