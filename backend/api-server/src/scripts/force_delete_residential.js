
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceDelete() {
    console.log('--- Force Deleting Stale Assignment ---');

    // Delete specifically the one with scopeName 'Residential 1'
    const deleteResult = await prisma.userScopeAssignment.deleteMany({
        where: {
            scopeName: 'Residential 1'
        }
    });

    console.log(`🗑️ Force Deleted ${deleteResult.count} records with name 'Residential 1'.`);
}

forceDelete()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
