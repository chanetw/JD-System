import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        const sqlPath = path.resolve('../database/manual_fix_approval_flow.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL Fix...');
        console.log(sql);

        // Split by semicolon to handle multiple statements if needed, 
        // but $executeRawUnsafe usually handles one string or multiple depending on driver.
        // For safety, let's run it as one block if supported, or split.
        // Prisma executeRaw usually handles multiple statements for Postgres.

        const result = await prisma.$executeRawUnsafe(sql);
        console.log('Result:', result);
        console.log('✅ Schema fixed successfully.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
