/**
 * @file seed.js
 * @description DJ System - Database Seed Script
 *
 * สร้างข้อมูลเริ่มต้นสำหรับ local development:
 * - Tenant (องค์กร)
 * - Admin User (ผู้ดูแลระบบ)
 * - Roles (บทบาท)
 * - Users (ผู้ใช้งานตัวอย่าง)
 * - Department, Bud, Project, Job Types
 * - Sample Jobs
 *
 * รัน: npx prisma db seed --schema ./prisma/schema.prisma
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting DJ System Seed...\n');

    // ========================================
    // 1. สร้าง Tenant (องค์กร)
    // ========================================
    console.log('📋 Step 1: Creating Tenant...');
    const tenant = await prisma.tenant.upsert({
        where: { code: 'SENA' },
        update: {},
        create: {
            name: 'SENA Development',
            code: 'SENA',
            subdomain: 'sena',
            isActive: true
        }
    });
    console.log(`   ✅ Tenant: ${tenant.name} (ID: ${tenant.id})\n`);

    // ========================================
    // 2. สร้าง Roles (บทบาท)
    // ========================================
    console.log('📋 Step 2: Creating Roles...');
    const rolesData = [
        { name: 'admin', displayName: 'Administrator', description: 'ผู้ดูแลระบบ สิทธิ์เต็ม' },
        { name: 'approver', displayName: 'Approver', description: 'ผู้อนุมัติงาน' },
        { name: 'requester', displayName: 'Requester', description: 'ผู้ขอสร้างงาน (Marketing)' },
        { name: 'assignee', displayName: 'Assignee', description: 'ผู้รับงาน (Designer)' },
        { name: 'team_lead', displayName: 'Team Lead', description: 'หัวหน้าทีม' },
        { name: 'viewer', displayName: 'Viewer', description: 'ผู้ดูข้อมูลเท่านั้น' }
    ];

    for (const role of rolesData) {
        await prisma.role.upsert({
            where: { tenantId_name: { tenantId: tenant.id, name: role.name } },
            update: {},
            create: { tenantId: tenant.id, ...role }
        });
    }
    console.log(`   ✅ Created ${rolesData.length} roles\n`);

    // ========================================
    // 3. สร้าง Users (ผู้ใช้งาน)
    // ========================================
    console.log('📋 Step 3: Creating Users...');
    const defaultPassword = await bcrypt.hash('P@ssw0rd', 10);

    const usersData = [
        { email: 'admin@sena.co.th', firstName: 'Admin', lastName: 'System', displayName: 'Admin', role: 'admin' },
        { email: 'approver@sena.co.th', firstName: 'Somchai', lastName: 'Jaidee', displayName: 'สมชาย', role: 'approver' },
        { email: 'requester@sena.co.th', firstName: 'Wipa', lastName: 'Suksri', displayName: 'วิภา', role: 'requester' },
        { email: 'designer@sena.co.th', firstName: 'Karn', lastName: 'Thongdee', displayName: 'กานต์', role: 'assignee' },
        { email: 'teamlead@sena.co.th', firstName: 'Nattha', lastName: 'Boonchai', displayName: 'ณัฐฐา', role: 'team_lead' }
    ];

    const createdUsers = {};
    for (const u of usersData) {
        const user = await prisma.user.upsert({
            where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
            update: {},
            create: {
                tenantId: tenant.id,
                email: u.email,
                passwordHash: defaultPassword,
                firstName: u.firstName,
                lastName: u.lastName,
                displayName: u.displayName,
                isActive: true,
                status: 'APPROVED'
            }
        });
        createdUsers[u.role] = user;

        // สร้าง UserRole
        const existingRole = await prisma.userRole.findFirst({
            where: { tenantId: tenant.id, userId: user.id, roleName: u.role }
        });
        if (!existingRole) {
            await prisma.userRole.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                    roleName: u.role,
                    isActive: true
                }
            });
        }
        console.log(`   ✅ User: ${u.email} (${u.role})`);
    }
    console.log('');

    // ========================================
    // 4. สร้าง Bud (Business Unit)
    // ========================================
    console.log('📋 Step 4: Creating Bud...');
    const bud = await prisma.bud.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: 'MKT' } },
        update: {},
        create: {
            tenantId: tenant.id,
            name: 'Marketing',
            code: 'MKT',
            description: 'ฝ่ายการตลาด',
            isActive: true
        }
    });
    console.log(`   ✅ Bud: ${bud.name} (${bud.code})\n`);

    // ========================================
    // 5. สร้าง Department (แผนก)
    // ========================================
    console.log('📋 Step 5: Creating Department...');
    const dept = await prisma.department.upsert({
        where: { id: 1 },
        update: {},
        create: {
            tenantId: tenant.id,
            budId: bud.id,
            name: 'Design Team',
            code: 'DESIGN',
            managerId: createdUsers.team_lead?.id || null,
            isActive: true
        }
    });
    console.log(`   ✅ Department: ${dept.name}\n`);

    // ========================================
    // 6. สร้าง Project (โปรเจกต์)
    // ========================================
    console.log('📋 Step 6: Creating Project...');
    const project = await prisma.project.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: 'GENERAL' } },
        update: {},
        create: {
            tenantId: tenant.id,
            name: 'General Design Requests',
            code: 'GENERAL',
            budId: bud.id,
            departmentId: dept.id,
            isActive: true
        }
    });
    console.log(`   ✅ Project: ${project.name} (${project.code})\n`);

    // ========================================
    // 7. สร้าง Job Types (ประเภทงาน)
    // ========================================
    console.log('📋 Step 7: Creating Job Types...');
    const jobTypesData = [
        { name: 'Social Media Post', slaWorkingDays: 3, description: 'โพสต์ Social Media (Facebook, Instagram, LINE)' },
        { name: 'Banner Design', slaWorkingDays: 5, description: 'ออกแบบ Banner สำหรับเว็บไซต์หรือโฆษณา' },
        { name: 'Print Material', slaWorkingDays: 7, description: 'สื่อสิ่งพิมพ์ (โบรชัวร์, ใบปลิว, โปสเตอร์)' },
        { name: 'Video Editing', slaWorkingDays: 10, description: 'ตัดต่อวิดีโอ' },
        { name: 'Artwork Revision', slaWorkingDays: 2, description: 'แก้ไข Artwork ตาม Feedback' }
    ];

    const createdJobTypes = [];
    for (const jt of jobTypesData) {
        const jobType = await prisma.jobType.upsert({
            where: { id: createdJobTypes.length + 1 },
            update: {},
            create: {
                tenantId: tenant.id,
                name: jt.name,
                slaWorkingDays: jt.slaWorkingDays,
                description: jt.description,
                isActive: true
            }
        });
        createdJobTypes.push(jobType);
        console.log(`   ✅ Job Type: ${jt.name} (SLA: ${jt.slaWorkingDays} days)`);
    }
    console.log('');

    // ========================================
    // 8. สร้าง Sample Jobs (งานตัวอย่าง)
    // ========================================
    console.log('📋 Step 8: Creating Sample Jobs...');
    const requester = createdUsers.requester;
    const assignee = createdUsers.assignee;

    if (requester && assignee && createdJobTypes.length > 0) {
        const jobsData = [
            {
                djId: 'DJ-2026-001',
                subject: 'ทำป้ายโฆษณา Facebook',
                priority: 'urgent',
                status: 'assigned',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                requesterId: requester.id,
                assigneeId: assignee.id,
                jobTypeId: createdJobTypes[0].id,
                description: 'ทำป้ายโฆษณาขนาด 1200x628 สำหรับ Facebook Ads'
            },
            {
                djId: 'DJ-2026-002',
                subject: 'ออกแบบ Banner หน้าเว็บ',
                priority: 'normal',
                status: 'in_progress',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                requesterId: requester.id,
                assigneeId: assignee.id,
                jobTypeId: createdJobTypes[1].id,
                description: 'Banner สำหรับหน้าแรกเว็บไซต์ ขนาด 1920x600'
            },
            {
                djId: 'DJ-2026-003',
                subject: 'โบรชัวร์โปรเจกต์ใหม่',
                priority: 'normal',
                status: 'pending_approval',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                requesterId: requester.id,
                assigneeId: null,
                jobTypeId: createdJobTypes[2].id,
                description: 'โบรชัวร์สำหรับโปรเจกต์บ้านใหม่ A4 พับ 3 ตอน'
            }
        ];

        for (const job of jobsData) {
            const exists = await prisma.job.findUnique({
                where: { tenantId_djId: { tenantId: tenant.id, djId: job.djId } }
            });
            if (!exists) {
                await prisma.job.create({
                    data: {
                        tenantId: tenant.id,
                        projectId: project.id,
                        ...job
                    }
                });
                console.log(`   ✅ Job: ${job.djId} - ${job.subject} (${job.status})`);
            } else {
                console.log(`   ℹ️  Job ${job.djId} already exists`);
            }
        }
    }

    console.log('');
    console.log('========================================');
    console.log('✅ Seeding Complete!');
    console.log('========================================');
    console.log('');
    console.log('📋 ข้อมูล Login สำหรับทดสอบ:');
    console.log('┌──────────────────────────┬────────────┬──────────┐');
    console.log('│ Email                    │ Password   │ Role     │');
    console.log('├──────────────────────────┼────────────┼──────────┤');
    console.log('│ admin@sena.co.th         │ P@ssw0rd   │ admin    │');
    console.log('│ approver@sena.co.th      │ P@ssw0rd   │ approver │');
    console.log('│ requester@sena.co.th     │ P@ssw0rd   │ requester│');
    console.log('│ designer@sena.co.th      │ P@ssw0rd   │ assignee │');
    console.log('│ teamlead@sena.co.th      │ P@ssw0rd   │ team_lead│');
    console.log('└──────────────────────────┴────────────┴──────────┘');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Seed Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
