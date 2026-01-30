
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Deep Relation Verification...');

    try {
        // 1. Verify Job -> JobActivities Relation
        console.log('👉 Checking Job -> jobActivities...');
        const job = await prisma.job.findFirst({
            include: {
                jobActivities: true,
                // Also check other renamed relations
                requester: true,
                assignee: true
            }
        });

        if (job) {
            console.log(`✅ Found Job ID: ${job.id} (${job.djId})`);
            console.log(`   - Requester: ${job.requester ? job.requester.firstName : 'None'}`);
            console.log(`   - Activities Count: ${job.jobActivities.length}`);
        } else {
            console.log('⚠️ No jobs found to verify.');
        }

        // 2. Verify User -> JobActivities Relation
        console.log('\n👉 Checking User -> jobActivities...');
        const user = await prisma.user.findFirst({
            where: { email: 'karn@sena.co.th' }, // Assignee usually has activities
            include: {
                jobActivities: true
            }
        });

        if (user) {
            console.log(`✅ Found User: ${user.firstName} (${user.email})`);
            console.log(`   - Activities Performed Count: ${user.jobActivities.length}`);
        } else {
            // Fallback to any user
            const anyUser = await prisma.user.findFirst({ include: { jobActivities: true } });
            if (anyUser) {
                console.log(`✅ Found User (Fallback): ${anyUser.firstName}`);
                console.log(`   - Activities Performed Count: ${anyUser.jobActivities.length}`);
            } else {
                console.log('⚠️ No users found.');
            }
        }

        console.log('\n🌟 TRUTH VERIFIED: Schema relations are working correctly!');

    } catch (error) {
        console.error('❌ VERIFICATION FAILED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
