
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for Jobs with NULL Project ID...');

    try {
        // Query Raw to bypass Schema Validation
        const result = await prisma.$queryRaw`
            SELECT id, dj_id, subject, project_id 
            FROM jobs 
            WHERE project_id IS NULL
        `;

        const count = result.length;

        if (count > 0) {
            console.log(`❌ Found ${count} invalid records (project_id is null):`);
            result.forEach(job => {
                console.log(`   - ID: ${job.id}, DJ_ID: ${job.dj_id}, Subject: ${job.subject}`);
            });
            console.log('\n💡 Recommendation: DELETE these records if they are test data.');
        } else {
            console.log('✅ No invalid records found. All jobs have project_id.');
        }

    } catch (error) {
        console.error('❌ Check Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
