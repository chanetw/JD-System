
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Searching for app.tenant_id in ALL RLS Policies ---');
        const policies = await prisma.$queryRaw`
      SELECT polname, polrelid::regclass::text as table_name, 
             pg_get_expr(polqual, polrelid) as polqual,
             pg_get_expr(polwithcheck, polrelid) as polwithcheck
      FROM pg_policy 
      WHERE pg_get_expr(polqual, polrelid) ILIKE '%app.tenant_id%'
         OR pg_get_expr(polwithcheck, polrelid) ILIKE '%app.tenant_id%'
    `;
        console.log(policies);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
