
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanData() {
    console.log('--- Verifying BUD ID 1 ---');
    const bud = await prisma.bud.findUnique({
        where: { id: 1 }
    });

    if (bud) {
        console.log('⚠️ BUD ID 1 exists:', bud);
        console.log('Not deleting assignment, but maybe we should update the name?');
    } else {
        console.log('✅ BUD ID 1 does NOT exist. Proceeding to delete ghost assignments...');

        const deleteResult = await prisma.userScopeAssignment.deleteMany({
            where: {
                scopeId: 1,
                scopeName: 'Residential 1',
                scopeLevel: 'bud'
            }
        });

        console.log(`🗑️ Deleted ${deleteResult.count} ghost records.`);
    }
}

cleanData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
