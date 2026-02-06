const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    const sqlFile = process.argv[2];

    if (!sqlFile) {
        console.error('❌ Please provide SQL file path');
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), sqlFile);
    console.log(`[Migration] Reading SQL file: ${filePath}`);

    try {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');

        // Split statements by semicolon, but ignore empty lines
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`[Migration] Found ${statements.length} SQL statements`);

        for (let i = 0; i < statements.length; i++) {
            const sql = statements[i];
            console.log(`[Migration] Executing statement ${i + 1}/${statements.length}...`);
            // console.log(sql.substring(0, 50) + '...');

            try {
                await prisma.$executeRawUnsafe(sql);
                console.log(`[Migration] ✅ Statement ${i + 1} success`);
            } catch (err) {
                // Ignore "Relation already exists" or "Table already exists" or "Policy already exists" errors if intentional
                if (err.message.includes('already exists')) {
                    console.warn(`[Migration] ⚠️  Warning: ${err.message.split('\n').pop()}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('[Migration] ✅✅✅ All statements executed successfully!');
    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
