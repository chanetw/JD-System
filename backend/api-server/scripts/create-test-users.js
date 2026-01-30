/**
 * @file create-test-users.js
 * @description สคริปต์สำหรับสร้าง Test Users สำหรับการทดสอบระบบตาม Role
 * 
 * สร้าง 4 User:
 * 1. Admin User - admin@test.com
 * 2. Manager User - manager@test.com
 * 3. Assignee User (Designer) - designer@test.com
 * 4. Requester User - requester@test.com
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 เริ่มสร้าง Test Users...\n');

    // ตรวจสอบว่ามี Tenant และ Department อยู่หรือไม่
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) {
        console.error('❌ ไม่พบ Tenant ในระบบ กรุณาสร้าง Tenant ก่อน');
        process.exit(1);
    }

    const departments = await prisma.department.findMany({
        where: { tenantId: tenant.id, isActive: true },
        take: 3
    });

    console.log(`✅ พบ Tenant: ${tenant.name} (ID: ${tenant.id})`);
    console.log(`✅ พบ ${departments.length} Departments\n`);

    // รหัสผ่านเริ่มต้น
    const defaultPassword = 'Test@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 1. สร้าง Admin User
    console.log('1️⃣ สร้าง Admin User...');
    const adminEmail = 'admin@test.com';
    const existingAdmin = await prisma.user.findFirst({
        where: { email: adminEmail, tenantId: tenant.id }
    });

    let adminUser;
    if (existingAdmin) {
        console.log(`   ⚠️  User ${adminEmail} มีอยู่แล้ว (ID: ${existingAdmin.id})`);
        adminUser = existingAdmin;
    } else {
        adminUser = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: hashedPassword,
                firstName: 'Admin',
                lastName: 'System',
                displayName: 'Admin System',
                tenantId: tenant.id,
                isActive: true
            }
        });
        console.log(`   ✅ สร้าง Admin User สำเร็จ (ID: ${adminUser.id})`);
    }

    // กำหนด Role Admin (ใช้ UserRole โดยตรง)
    const existingAdminRole = await prisma.userRole.findFirst({
        where: { userId: adminUser.id, roleName: 'admin' }
    });
    if (!existingAdminRole) {
        await prisma.userRole.create({
            data: {
                userId: adminUser.id,
                tenantId: tenant.id,
                roleName: 'admin',
                assignedAt: new Date()
            }
        });
        console.log(`   ✅ กำหนด Role 'admin' ให้ ${adminEmail}`);
    } else {
        console.log(`   ⚠️  Role 'admin' มีอยู่แล้วสำหรับ ${adminEmail}`);
    }

    // 2. สร้าง Manager User
    console.log('\n2️⃣ สร้าง Manager User...');
    const managerEmail = 'manager@test.com';
    const existingManager = await prisma.user.findFirst({
        where: { email: managerEmail, tenantId: tenant.id }
    });

    let managerUser;
    if (existingManager) {
        console.log(`   ⚠️  User ${managerEmail} มีอยู่แล้ว (ID: ${existingManager.id})`);
        managerUser = existingManager;
    } else {
        managerUser = await prisma.user.create({
            data: {
                email: managerEmail,
                passwordHash: hashedPassword,
                firstName: 'Manager',
                lastName: 'Test',
                displayName: 'Manager Test',
                tenantId: tenant.id,
                departmentId: departments[0]?.id || null,
                isActive: true
            }
        });
        console.log(`   ✅ สร้าง Manager User สำเร็จ (ID: ${managerUser.id})`);
    }

    // กำหนด Role Manager
    const existingManagerRole = await prisma.userRole.findFirst({
        where: { userId: managerUser.id, roleName: 'manager' }
    });
    if (!existingManagerRole) {
        await prisma.userRole.create({
            data: {
                userId: managerUser.id,
                tenantId: tenant.id,
                roleName: 'manager',
                assignedAt: new Date()
            }
        });
        console.log(`   ✅ กำหนด Role 'manager' ให้ ${managerEmail}`);
    } else {
        console.log(`   ⚠️  Role 'manager' มีอยู่แล้วสำหรับ ${managerEmail}`);
    }

    // 3. สร้าง Assignee User (Designer)
    console.log('\n3️⃣ สร้าง Assignee User (Designer)...');
    const designerEmail = 'designer@test.com';
    const existingDesigner = await prisma.user.findFirst({
        where: { email: designerEmail, tenantId: tenant.id }
    });

    let designerUser;
    if (existingDesigner) {
        console.log(`   ⚠️  User ${designerEmail} มีอยู่แล้ว (ID: ${existingDesigner.id})`);
        designerUser = existingDesigner;
    } else {
        designerUser = await prisma.user.create({
            data: {
                email: designerEmail,
                passwordHash: hashedPassword,
                firstName: 'Designer',
                lastName: 'Test',
                displayName: 'Designer Test',
                tenantId: tenant.id,
                departmentId: departments[1]?.id || null,
                isActive: true
            }
        });
        console.log(`   ✅ สร้าง Designer User สำเร็จ (ID: ${designerUser.id})`);
    }

    // กำหนด Role Assignee
    const existingAssigneeRole = await prisma.userRole.findFirst({
        where: { userId: designerUser.id, roleName: 'assignee' }
    });
    if (!existingAssigneeRole) {
        await prisma.userRole.create({
            data: {
                userId: designerUser.id,
                tenantId: tenant.id,
                roleName: 'assignee',
                assignedAt: new Date()
            }
        });
        console.log(`   ✅ กำหนด Role 'assignee' ให้ ${designerEmail}`);
    } else {
        console.log(`   ⚠️  Role 'assignee' มีอยู่แล้วสำหรับ ${designerEmail}`);
    }

    // 4. สร้าง Requester User
    console.log('\n4️⃣ สร้าง Requester User...');
    const requesterEmail = 'requester@test.com';
    const existingRequester = await prisma.user.findFirst({
        where: { email: requesterEmail, tenantId: tenant.id }
    });

    let requesterUser;
    if (existingRequester) {
        console.log(`   ⚠️  User ${requesterEmail} มีอยู่แล้ว (ID: ${existingRequester.id})`);
        requesterUser = existingRequester;
    } else {
        requesterUser = await prisma.user.create({
            data: {
                email: requesterEmail,
                passwordHash: hashedPassword,
                firstName: 'Requester',
                lastName: 'Test',
                displayName: 'Requester Test',
                tenantId: tenant.id,
                departmentId: departments[2]?.id || null,
                isActive: true
            }
        });
        console.log(`   ✅ สร้าง Requester User สำเร็จ (ID: ${requesterUser.id})`);
    }

    // กำหนด Role User (Requester)
    const existingUserRole = await prisma.userRole.findFirst({
        where: { userId: requesterUser.id, roleName: 'user' }
    });
    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: requesterUser.id,
                tenantId: tenant.id,
                roleName: 'user',
                assignedAt: new Date()
            }
        });
        console.log(`   ✅ กำหนด Role 'user' ให้ ${requesterEmail}`);
    } else {
        console.log(`   ⚠️  Role 'user' มีอยู่แล้วสำหรับ ${requesterEmail}`);
    }

    // สรุปผล
    console.log('\n' + '='.repeat(60));
    console.log('✅ สร้าง Test Users เสร็จสิ้น!\n');
    console.log('📋 รายการ Test Users:');
    console.log('   1. Admin:     admin@test.com     | Password: Test@123');
    console.log('   2. Manager:   manager@test.com   | Password: Test@123');
    console.log('   3. Designer:  designer@test.com  | Password: Test@123');
    console.log('   4. Requester: requester@test.com | Password: Test@123');
    console.log('='.repeat(60) + '\n');
}

main()
    .catch((e) => {
        console.error('❌ เกิดข้อผิดพลาด:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
