import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Verifying Prisma Client fields...');
        // Attempt to select the new fields to see if Client validation passes
        const result = await prisma.approvalFlow.findFirst({
            select: {
                id: true,
                jobTypeId: true,
                tenantId: true
            }
        });
        console.log('✅ Prisma Client accepted `jobTypeId` field.');
    } catch (e) {
        console.error('❌ Prisma Client Verification Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
