
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSystem() {
    console.log('🧹 Starting System Cleanup...');

    try {
        // 1. Delete Notifications
        const deletedNotifications = await prisma.notification.deleteMany({});
        console.log(`✅ Deleted ${deletedNotifications.count} notifications.`);

        // 2. Delete Job Activities
        const deletedActivities = await prisma.jobActivity.deleteMany({});
        console.log(`✅ Deleted ${deletedActivities.count} job activities.`);

        // 3. Delete Job Comments
        // const deletedComments = await prisma.jobComment.deleteMany({});
        // console.log(`✅ Deleted ${deletedComments.count} job comments.`);

        // 4. Delete Approvals
        const deletedApprovals = await prisma.approval.deleteMany({});
        console.log(`✅ Deleted ${deletedApprovals.count} approvals.`);

        // 5. Delete Job Assignments (Project N:M) - Careful if this is config data
        // const deletedAssignments = await prisma.projectJobAssignment.deleteMany({});
        // console.log(`✅ Deleted ${deletedAssignments.count} project job assignments.`);

        // 6. Delete Jobs (Cascade should handle relations, but manual delete is safer)
        // Ordered to respect foreign keys (Child jobs first if self-referencing)
        const deletedJobs = await prisma.job.deleteMany({});
        console.log(`✅ Deleted ${deletedJobs.count} jobs.`);

        console.log('\n✨ System Cleanup Complete! Ready for fresh testing.');

    } catch (error) {
        console.error('❌ Error cleaning up system:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupSystem();
