
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Foreign Key Constraints for Projects...');

    try {
        const result = await prisma.$queryRaw`
            SELECT conname, confrelid::regclass::text, conrelid::regclass::text
            FROM pg_constraint
            WHERE conrelid = 'projects'::regclass
        `;

        console.log('Found Constraints:', result);
    } catch (error) {
        console.error('Check Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
