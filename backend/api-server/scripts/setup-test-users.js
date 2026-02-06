
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser(email, roleName, firstName, lastName, tenantId, passwordHash) {
    const existingUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), tenantId }
    });

    let user;
    if (existingUser) {
        console.log(`   ⚠️  User ${email} already exists.`);
        user = existingUser;
    } else {
        user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                tenantId,
                isActive: true
            }
        });
        console.log(`   ✅ Created User: ${email}`);
    }

    // Ensure role exists
    const existingRole = await prisma.userRole.findFirst({
        where: { userId: user.id, roleName }
    });

    if (!existingRole) {
        await prisma.userRole.create({
            data: {
                userId: user.id,
                tenantId,
                roleName,
                assignedAt: new Date(),
                isActive: true
            }
        });
        console.log(`      + Role '${roleName}' assigned.`);
    }
}

async function main() {
    console.log('🚀 Starting Test User Setup...');

    // Config
    const TENANT_ID = 2; // Based on previous verified admin user
    const NEW_PASSWORD = 'Sena#1775';
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // 1. Create Requested Users
    console.log('\n1️⃣ Creating Users...');

    // Approvers (3)
    for (let i = 1; i <= 3; i++) {
        await createUser(`approver${i}@test.com`, 'approver', `Approver${i}`, 'Test', TENANT_ID, hashedPassword);
    }

    // Requesters (2)
    for (let i = 1; i <= 2; i++) {
        await createUser(`requester${i}@test.com`, 'requester', `Requester${i}`, 'Test', TENANT_ID, hashedPassword);
    }

    // Assignees (4)
    for (let i = 1; i <= 4; i++) {
        await createUser(`assignee${i}@test.com`, 'assignee', `Assignee${i}`, 'Test', TENANT_ID, hashedPassword);
    }

    // 2. Reset ALL Passwords
    console.log('\n2️⃣0 Resetting ALL passwords to:', NEW_PASSWORD);
    const updateResult = await prisma.user.updateMany({
        where: { tenantId: TENANT_ID }, // Limit to this tenant to be safe, or remove if global
        data: { passwordHash: hashedPassword }
    });
    console.log(`   ✅ Updated passwords for ${updateResult.count} users.`);

    // 3. Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Setup Complete');
    console.log('Login Checks (Tenant ID: 2):');
    console.log(`Approvers: approver1-3@test.com / ${NEW_PASSWORD}`);
    console.log(`Requesters: requester1-2@test.com / ${NEW_PASSWORD}`);
    console.log(`Assignees: assignee1-4@test.com / ${NEW_PASSWORD}`);
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
