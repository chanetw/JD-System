import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        orderBy: { id: 'asc' }
    });

    console.log('--- Tenant Dependency Check ---');
    for (const t of tenants) {
        const [budCount, projectCount, userCount, jobCount] = await Promise.all([
            prisma.bud.count({ where: { tenantId: t.id } }),
            prisma.project.count({ where: { tenantId: t.id } }),
            prisma.user.count({ where: { tenantId: t.id } }),
            prisma.job.count({ where: { tenantId: t.id } })
        ]);

        const total = budCount + projectCount + userCount;

        console.log(`Tenant: ${t.name} (Code: ${t.code}, ID: ${t.id})`);
        console.log(` - BUDs: ${budCount}`);
        console.log(` - Projects: ${projectCount}`);
        console.log(` - Users: ${userCount}`);
        console.log(` - Jobs: ${jobCount}`);
        console.log(` - Total Dependencies (for Delete): ${total}`);
        console.log('-------------------------------');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
