
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 9 }
        });
        console.log('User 9:', user);

        const user1 = await prisma.user.findUnique({ where: { id: 1 } });
        console.log('User 1 (Requester):', user1);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
