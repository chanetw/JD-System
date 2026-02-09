
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Analyzing Potential Mockup Data ---');

    try {
        // 1. Tenants
        const testTenants = await prisma.tenant.findMany({
            where: {
                OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { name: { contains: 'mock', mode: 'insensitive' } },
                    { code: { contains: 'test', mode: 'insensitive' } }
                ]
            }
        });
        console.log(`\nFound ${testTenants.length} potential test TENANTS:`);
        testTenants.forEach(t => console.log(`- [${t.id}] ${t.name} (${t.code})`));

        // 2. Users (Filter out system/admin users if necessary, but here just looking for patterns)
        const testUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: 'example.com' } },
                    { email: { contains: 'test' } },
                    { firstName: { contains: 'test', mode: 'insensitive' } },
                    { displayName: { contains: 'test', mode: 'insensitive' } }
                ]
            },
            take: 20
        });
        console.log(`\nFound ${testUsers.length} (showing top 20) potential test USERS:`);
        testUsers.forEach(u => console.log(`- [${u.id}] ${u.displayName} (${u.email})`));

        // 3. Projects
        const testProjects = await prisma.project.findMany({
            where: {
                OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { code: { contains: 'test', mode: 'insensitive' } }
                ]
            }
        });
        console.log(`\nFound ${testProjects.length} potential test PROJECTS:`);
        testProjects.forEach(p => console.log(`- [${p.id}] ${p.name} (${p.code})`));

        // 4. Jobs
        const testJobs = await prisma.job.findMany({
            where: {
                OR: [
                    { subject: { contains: 'test', mode: 'insensitive' } },
                    { subject: { contains: 'mock', mode: 'insensitive' } },
                    { djId: { contains: 'test', mode: 'insensitive' } },
                ]
            },
            take: 20
        });
        console.log(`\nFound ${testJobs.length} (showing top 20) potential test JOBS:`);
        testJobs.forEach(j => console.log(`- [${j.id}] ${j.djId}: ${j.subject}`));

        // Count total jobs to see scale
        const totalJobs = await prisma.job.count();
        console.log(`\nTotal Jobs in System: ${totalJobs}`);

    } catch (error) {
        console.error("Error analyzing data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
