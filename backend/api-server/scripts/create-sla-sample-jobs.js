/**
 * @file create-sla-sample-jobs.js
 * @description สร้างงานตัวอย่างสำหรับทดสอบ SLA แบบเสร็จพอดีและเสร็จก่อนกำหนด
 *
 * รัน: node scripts/create-sla-sample-jobs.js
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const setTime = (date, hours, minutes = 0) => {
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    return next;
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

async function getContext() {
    const tenant = await prisma.tenant.findFirst({
        orderBy: { id: 'asc' }
    });

    if (!tenant) {
        throw new Error('ไม่พบ tenant ในฐานข้อมูล');
    }

    const project = await prisma.project.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { id: 'asc' }
    });

    if (!project) {
        throw new Error(`ไม่พบ project สำหรับ tenant ${tenant.id}`);
    }

    const jobType = await prisma.jobType.findFirst({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { id: 'asc' }
    });

    if (!jobType) {
        throw new Error(`ไม่พบ job type สำหรับ tenant ${tenant.id}`);
    }

    const findUserFromRoles = async (roleNames) => {
        const roleMatch = await prisma.userRole.findFirst({
            where: {
                tenantId: tenant.id,
                isActive: true,
                roleName: { in: roleNames },
                user: { isActive: true }
            },
            include: { user: true },
            orderBy: { id: 'asc' }
        });

        return roleMatch?.user || null;
    };

    const requester =
        await findUserFromRoles(['requester', 'admin']) ||
        await prisma.user.findFirst({
            where: { tenantId: tenant.id, isActive: true },
            orderBy: { id: 'asc' }
        });

    if (!requester) {
        throw new Error(`ไม่พบ requester สำหรับ tenant ${tenant.id}`);
    }

    const assignee =
        await findUserFromRoles(['assignee', 'admin']) ||
        await prisma.user.findFirst({
            where: {
                tenantId: tenant.id,
                isActive: true,
                id: { not: requester.id }
            },
            orderBy: { id: 'asc' }
        }) ||
        requester;

    return { tenant, project, jobType, requester, assignee };
}

async function main() {
    console.log('🧪 Creating SLA sample jobs...\n');

    const { tenant, project, jobType, requester, assignee } = await getContext();
    const today = setTime(new Date(), 9, 0);

    const onTimeDueDate = setTime(addDays(today, 2), 17, 0);
    const onTimeStartedAt = setTime(addDays(today, 1), 9, 30);

    const earlyDueDate = setTime(addDays(today, 4), 17, 0);
    const earlyCompletedAt = setTime(addDays(today, 3), 11, 0);
    const earlyStartedAt = setTime(addDays(today, 2), 10, 0);

    const jobs = [
        {
            djId: 'DJ-SLA-ONTIME-EXAMPLE',
            subject: 'งานตัวอย่าง SLA - เสร็จพอดีเวลา',
            description: 'ใช้ทดสอบการแสดงผลกรณี completed_on_time ที่ completedAt ตรงกับ dueDate พอดี',
            priority: 'normal',
            dueDate: onTimeDueDate,
            assignedAt: setTime(today, 10, 0),
            startedAt: onTimeStartedAt,
            completedAt: onTimeDueDate,
            label: 'เสร็จพอดี SLA'
        },
        {
            djId: 'DJ-SLA-EARLY-EXAMPLE',
            subject: 'งานตัวอย่าง SLA - เสร็จก่อนเวลา',
            description: 'ใช้ทดสอบการแสดงผลกรณี completed_on_time ที่ completedAt เร็วกว่า dueDate',
            priority: 'normal',
            dueDate: earlyDueDate,
            assignedAt: setTime(addDays(today, 1), 9, 0),
            startedAt: earlyStartedAt,
            completedAt: earlyCompletedAt,
            label: 'เสร็จก่อน SLA'
        }
    ];

    for (const job of jobs) {
        const saved = await prisma.job.upsert({
            where: { djId: job.djId },
            update: {
                tenantId: tenant.id,
                projectId: project.id,
                jobTypeId: jobType.id,
                requesterId: requester.id,
                assigneeId: assignee.id,
                completedBy: assignee.id,
                status: 'completed',
                priority: job.priority,
                subject: job.subject,
                description: job.description,
                dueDate: job.dueDate,
                assignedAt: job.assignedAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            },
            create: {
                tenantId: tenant.id,
                projectId: project.id,
                jobTypeId: jobType.id,
                requesterId: requester.id,
                assigneeId: assignee.id,
                completedBy: assignee.id,
                djId: job.djId,
                status: 'completed',
                priority: job.priority,
                subject: job.subject,
                description: job.description,
                dueDate: job.dueDate,
                assignedAt: job.assignedAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            }
        });

        console.log(`✅ ${job.label}`);
        console.log(`   DJ ID: ${saved.djId}`);
        console.log(`   Subject: ${saved.subject}`);
        console.log(`   Due: ${saved.dueDate?.toISOString()}`);
        console.log(`   Completed: ${saved.completedAt?.toISOString()}`);
        console.log('');
    }

    console.log('🎉 SLA sample jobs are ready.');
}

main()
    .catch((error) => {
        console.error('❌ Failed to create SLA sample jobs:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });