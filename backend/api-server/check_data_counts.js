
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking Database Counts ---');
        const userCount = await prisma.user.count();
        const tenantCount = await prisma.tenant.count();
        const projectCount = await prisma.project.count();
        const jobCount = await prisma.job.count();
        const jobTypeCount = await prisma.jobType.count();
        const budCount = await prisma.bud.count();

        console.log(`Users: ${userCount}`);
        console.log(`Tenants: ${tenantCount}`);
        console.log(`Projects: ${projectCount}`);
        console.log(`DesignJobs: ${jobCount}`);
        console.log(`JobTypes: ${jobTypeCount}`);
        console.log(`Buds: ${budCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
