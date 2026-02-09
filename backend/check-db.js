import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const jobTypes = await prisma.jobType.findMany({
        where: {
            // We don't know the ID, but let's list all that have nextJobTypeId set
            nextJobTypeId: { not: null }
        },
        select: { id: true, name: true, nextJobTypeId: true }
    });

    console.log('--- Job Types with Next Job ---');
    console.log(JSON.stringify(jobTypes, null, 2));

    const all = await prisma.jobType.findMany({
        select: { id: true, name: true, nextJobTypeId: true }
    });
    console.log('--- All Job Types ---');
    console.log(JSON.stringify(all, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
