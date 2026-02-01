import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        const sqlPath = path.resolve('../database/fix_approval_flow_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and remove empty lines
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Executing ${statements.length} statements...`);

        for (const statement of statements) {
            try {
                console.log('--------------------------------------------------');
                console.log(statement);
                const result = await prisma.$executeRawUnsafe(statement);
                console.log('✅ Result:', result);
            } catch (innerError) {
                // Ignore "column already exists" errors for idempotency if needed, 
                // but let's log them to be sure.
                console.warn('⚠️ Warning/Error:', innerError.message);
            }
        }

        console.log('✅ Schema fix execution finished.');
    } catch (e) {
        console.error('❌ Fatal Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
