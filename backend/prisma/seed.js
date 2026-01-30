
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed...');

    // 1. Get Tenants
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return;
    const tenantId = tenant.id;

    // 2. Get Users
    const requester = await prisma.user.findFirst({
        where: {
            OR: [
                { email: 'wipa@sena.co.th' },
                { userRoles: { some: { roleName: 'requester' } } }
            ]
        }
    });
    const assignee = await prisma.user.findFirst({
        where: {
            OR: [
                { email: 'karn@sena.co.th' },
                { userRoles: { some: { roleName: 'assignee' } } }
            ]
        }
    });

    if (!requester || !assignee) return;

    // 3. Get Job Type
    const jobType = await prisma.jobType.findFirst();

    // 4. Create Sample Jobs
    const jobsData = [
        {
            djId: 'DJ-2026-001',
            subject: 'ทำป้ายโฆษณา Facebook (Overdue)',
            priority: 'urgent',
            status: 'assigned',
            deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            requesterId: requester.id,
            assigneeId: assignee.id,
            jobTypeId: jobType.id,
            brief: 'รายละเอียดงานด่วนมาก'
        },
        {
            djId: 'DJ-2026-002',
            subject: 'ออกแบบ Banner หน้าเว็บ (In Progress)',
            priority: 'normal',
            status: 'in_progress',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            requesterId: requester.id,
            assigneeId: assignee.id,
            jobTypeId: jobType.id,
            brief: 'Banner สำหรับหน้าแรก'
        },
        {
            djId: 'DJ-2026-003',
            subject: 'แก้งาน Artwork (Rework)',
            priority: 'urgent',
            status: 'rework',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            requesterId: requester.id,
            assigneeId: assignee.id,
            jobTypeId: jobType.id,
            brief: 'แก้ไขสีตามคอมเม้น'
        },
        {
            djId: 'DJ-2026-004',
            subject: 'Job รออนุมัติ (Pending Approval)',
            priority: 'low',
            status: 'pending_approval',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            requesterId: requester.id,
            assigneeId: null,
            jobTypeId: jobType.id,
            brief: 'รอหัวหน้าอนุมัติ'
        }
    ];

    for (const job of jobsData) {
        const exists = await prisma.job.findUnique({
            where: { tenantId_djId: { tenantId, djId: job.djId } }
        });
        if (!exists) {
            await prisma.job.create({
                data: {
                    ...job,
                    tenantId
                }
            });
            console.log(`✅ Created Job: ${job.djId}`);
        } else {
            console.log(`ℹ️ Job ${job.djId} already exists`);
        }
    }

    console.log('✅ Seeding Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
