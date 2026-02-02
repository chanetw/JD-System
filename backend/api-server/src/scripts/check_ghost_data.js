
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    console.log('--- Checking Buds ---');
    const buds = await prisma.bud.findMany({
        where: { name: { contains: 'Residential 1', mode: 'insensitive' } }
    });
    console.log('Buds found:', buds);

    console.log('\n--- Checking Assignments ---');
    const assignments = await prisma.userScopeAssignment.findMany({
        where: { scopeName: { contains: 'Residential 1', mode: 'insensitive' } }
    });
    console.log('Assignments found:', assignments);
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
