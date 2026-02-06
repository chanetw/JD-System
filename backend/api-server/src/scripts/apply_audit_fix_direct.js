
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Applying Audio Policy Fix via Prisma Client ---');
        const sqlPath = path.resolve('/Users/chanetw/Documents/DJ-System/backend/api-server/src/scripts/fix_audit_policy.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        // Split by statement manually
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            console.log('Executing:', stmt.substring(0, 50) + '...');
            await prisma.$executeRawUnsafe(stmt);
            console.log('Done.');
        }
        console.log('Success!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
