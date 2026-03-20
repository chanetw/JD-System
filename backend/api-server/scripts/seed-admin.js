/**
 * @file seed-admin.js
 * @description สร้าง Tenant + Admin User + Roles สำหรับ Production
 * 
 * รัน: node scripts/seed-admin.js
 * หรือ: docker exec -it dj-backend node scripts/seed-admin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔐 DJ System - Admin Seed\n');

    // 1. Tenant
    console.log('📋 Step 1: Ensuring Tenant exists...');
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

    // 2. Roles
    console.log('📋 Step 2: Ensuring Roles exist...');
    const rolesData = [
        { name: 'admin', displayName: 'Administrator', description: 'ผู้ดูแลระบบ สิทธิ์เต็ม' },
        { name: 'approver', displayName: 'Approver', description: 'ผู้อนุมัติงาน' },
        { name: 'requester', displayName: 'Requester', description: 'ผู้ขอสร้างงาน' },
        { name: 'assignee', displayName: 'Assignee', description: 'ผู้รับงาน' },
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
    console.log(`   ✅ ${rolesData.length} roles ensured\n`);

    // 3. Admin User
    console.log('📋 Step 3: Creating Admin User...');
    const email = 'admin@sena.co.th';
    const passwordHash = await bcrypt.hash('P@ssw0rd', 10);

    const user = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: { passwordHash, isActive: true },
        create: {
            tenantId: tenant.id,
            email,
            passwordHash,
            firstName: 'Admin',
            lastName: 'System',
            displayName: 'Admin',
            isActive: true,
            status: 'APPROVED'
        }
    });
    console.log(`   ✅ User: ${email} (ID: ${user.id})\n`);

    // 4. Admin Role Assignment
    console.log('📋 Step 4: Assigning admin role...');
    const existingRole = await prisma.userRole.findFirst({
        where: { tenantId: tenant.id, userId: user.id, roleName: 'admin' }
    });
    if (!existingRole) {
        await prisma.userRole.create({
            data: {
                tenantId: tenant.id,
                userId: user.id,
                roleName: 'admin',
                isActive: true
            }
        });
        console.log('   ✅ Admin role assigned\n');
    } else {
        console.log('   ⚠️  Admin role already exists\n');
    }

    console.log('✅ Admin seed completed!');
    console.log(`   Email: ${email}`);
    console.log('   Password: P@ssw0rd');
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
