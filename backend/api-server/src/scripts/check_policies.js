
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking RLS Policies on jobs table ---');
        const policies = await prisma.$queryRaw`
      SELECT polname, polcmd, polroles, 
             pg_get_expr(polqual, polrelid) as polqual, 
             pg_get_expr(polwithcheck, polrelid) as polwithcheck
      FROM pg_policy 
      WHERE polrelid = 'jobs'::regclass
    `;
        console.log(policies);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
