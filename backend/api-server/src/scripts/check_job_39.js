
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const job = await prisma.job.findUnique({
            where: { id: 40 }
        });

        console.log('--- Job 39 Status ---');
        console.log(JSON.stringify(job, null, 2));

        // Also check ApprovalFlows for this project
        if (job) {
            console.log(`Checking flows for Project ${job.projectId} and JobType ${job.jobTypeId}`);
            const flows = await prisma.approvalFlow.findMany({
                where: {
                    projectId: job.projectId,
                    isActive: true
                }
            });
            console.log('Flows:', JSON.stringify(flows, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
