
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Checking and fixing sequences...');

    const tables = [
        'tenants',
        'buds',
        'departments',
        'projects',
        'users',
        'jobs'
    ];

    for (const table of tables) {
        try {
            // Get max ID
            const result = await prisma.$queryRawUnsafe(`SELECT MAX(id) as max_id FROM "${table}"`);
            const maxId = result[0].max_id || 0;

            // Reset sequence
            const sequenceName = `${table}_id_seq`;
            // Note: sequence naming convention depends on PG setup. Usually table_id_seq.
            await prisma.$executeRawUnsafe(`SELECT setval('${sequenceName}', ${maxId + 1}, false)`);

            console.log(`✅ Fixed sequence for ${table}: set to ${maxId + 1}`);
        } catch (error) {
            console.error(`❌ Error fixing ${table}:`, error.message);
            // Fallback: Try public schema prefix if needed
            try {
                const sequenceName = `"public"."${table}_id_seq"`;
                await prisma.$executeRawUnsafe(`SELECT setval('${sequenceName}', (SELECT MAX(id) FROM "${table}") + 1)`);
                console.log(`✅ Fixed sequence for ${table} (with fallback)`);
            } catch (err2) {
                console.error(`Failed fallback for ${table}: ` + err2.message);
            }
        }
    }

    console.log('🎉 Done!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
