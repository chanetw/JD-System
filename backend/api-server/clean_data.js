
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting Data Cleanup...');

    try {
        // Delete jobs where project_id is NULL
        // Using executeRaw to bypass Prisma Schema Validation checks
        const result = await prisma.$executeRaw`
            DELETE FROM jobs 
            WHERE project_id IS NULL
        `;

        console.log(`✅ Successfully deleted ${result} invalid records.`);

    } catch (error) {
        console.error('❌ Cleanup Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
