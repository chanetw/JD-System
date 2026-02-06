
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking RLS Policies on audit_logs table ---');
        const policies = await prisma.$queryRaw`
      SELECT polname, 
             pg_get_expr(polqual, polrelid) as polqual,
             pg_get_expr(polwithcheck, polrelid) as polwithcheck
      FROM pg_policy 
      WHERE polrelid = 'audit_logs'::regclass
    `;
        console.log(policies);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
