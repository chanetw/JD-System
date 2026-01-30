
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Jobs for User 1...');

    try {
        const jobCount = await prisma.job.count();
        console.log(`Total Jobs in DB: ${jobCount}`);

        const userJobs = await prisma.job.findMany({
            where: {
                OR: [
                    { requesterId: 1 },
                ]
            },
            take: 5
        });

        console.log(`Jobs where requesterId=1: ${userJobs.length}`);
        if (userJobs.length > 0) console.log('Sample Job:', userJobs[0]);

    } catch (error) {
        console.error('Check Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
