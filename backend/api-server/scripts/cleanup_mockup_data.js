
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to TRUE for safety

async function main() {
    console.log(`--- Cleanup Mockup Data (DRY_RUN: ${DRY_RUN}) ---`);

    try {
        // ==========================================
        // 1. Identify and Delete Mockup Jobs
        // ==========================================
        const jobsToDelete = await prisma.job.findMany({
            where: {
                OR: [
                    { djId: { startsWith: 'TEST-' } },
                    { subject: { contains: 'test', mode: 'insensitive' } },
                    { requester: { email: { endsWith: '@test.com' } } }
                ]
            },
            select: { id: true, djId: true, subject: true }
        });

        console.log(`\nFound ${jobsToDelete.length} Jobs to delete:`);
        jobsToDelete.forEach(j => console.log(`- [${j.id}] ${j.djId}: ${j.subject}`));

        if (!DRY_RUN && jobsToDelete.length > 0) {
            const deleteResult = await prisma.job.deleteMany({
                where: {
                    id: { in: jobsToDelete.map(j => j.id) }
                }
            });
            console.log(`✅ Deleted ${deleteResult.count} jobs.`);
        }

        // ==========================================
        // 2. Identify Test Users
        // ==========================================
        const usersToDelete = await prisma.user.findMany({
            where: {
                email: { endsWith: '@test.com' }
            },
            select: { id: true, email: true, displayName: true }
        });
        const userIds = usersToDelete.map(u => u.id);

        console.log(`\nFound ${usersToDelete.length} Users to delete:`);
        usersToDelete.forEach(u => console.log(`- [${u.id}] ${u.displayName} (${u.email})`));

        if (usersToDelete.length > 0) {

            // ==========================================
            // 3. Clean up User References (Before Deletion)
            // ==========================================

            // 3.1 Unassign from surviving Jobs (e.g. Real Job assigned to Test User)
            const assignedJobsCount = await prisma.job.count({
                where: { assigneeId: { in: userIds } }
            });
            console.log(`- Found ${assignedJobsCount} jobs assigned to test users.`);

            if (!DRY_RUN && assignedJobsCount > 0) {
                await prisma.job.updateMany({
                    where: { assigneeId: { in: userIds } },
                    data: { assigneeId: null }
                });
                console.log(`  ✅ Unassigned test users from ${assignedJobsCount} jobs.`);
            }

            // 3.2 Delete Approvals by Test Users
            const approvalsCount = await prisma.approval.count({
                where: { approverId: { in: userIds } }
            });
            console.log(`- Found ${approvalsCount} approvals by test users.`);

            if (!DRY_RUN && approvalsCount > 0) {
                await prisma.approval.deleteMany({
                    where: { approverId: { in: userIds } }
                });
                console.log(`  ✅ Deleted ${approvalsCount} approvals.`);
            }

            // 3.3 Check Department Managers
            // IF test user is manager, set to NULL (Schema has SetNull, but let's be explicit/safe)
            // Prisma handles SetNull if defined in schema, but verify schema:
            // manager User? @relation(..., onDelete: SetNull) -> Yes.

            // 3.4 Check Project Assignments
            // assignee User? @relation(..., onDelete: SetNull) -> Yes.

            // ==========================================
            // 4. Delete Users
            // ==========================================
            if (!DRY_RUN) {
                const deleteResult = await prisma.user.deleteMany({
                    where: {
                        id: { in: userIds }
                    }
                });
                console.log(`✅ Deleted ${deleteResult.count} users.`);
            }
        }

        if (DRY_RUN) {
            console.log('\n--- This was a DRY RUN. No data was deleted. ---');
            console.log('To execute: DRY_RUN=false node scripts/cleanup_mockup_data.js');
        }

    } catch (error) {
        console.error("Error cleanup data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
