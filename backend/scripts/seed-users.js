
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('123456', 10);
    const tenantId = 1;

    // ==========================================
    // 1. Create/Update Requester
    // ==========================================
    const requesterEmail = 'requester@sena.co.th';
    let requester = await prisma.user.findFirst({
        where: {
            tenantId,
            email: requesterEmail
        }
    });

    if (requester) {
        requester = await prisma.user.update({
            where: { id: requester.id },
            data: { passwordHash, isActive: true }
        });
        console.log('Requester updated:', requester.email);
    } else {
        requester = await prisma.user.create({
            data: {
                tenantId,
                email: requesterEmail,
                passwordHash,
                firstName: 'Test',
                lastName: 'Requester',
                displayName: 'Test Requester',
                isActive: true
            }
        });
        console.log('Requester created:', requester.email);
    }

    // Ensure Role
    let reqRole = await prisma.role.findFirst({ where: { tenantId, name: 'requester' } });
    if (!reqRole) {
        reqRole = await prisma.role.create({
            data: { tenantId, name: 'requester', displayName: 'Requester' }
        });
    }

    // Assign Role
    const userRoleStart = await prisma.userRole.findFirst({
        where: { userId: requester.id, roleName: 'requester' }
    });

    if (!userRoleStart) {
        await prisma.userRole.create({
            data: {
                tenantId,
                userId: requester.id,
                roleName: 'requester'
            }
        });
    }


    // ==========================================
    // 2. Create/Update Approver
    // ==========================================
    const approverEmail = 'approver@sena.co.th';
    let approver = await prisma.user.findFirst({
        where: {
            tenantId,
            email: approverEmail
        }
    });

    if (approver) {
        approver = await prisma.user.update({
            where: { id: approver.id },
            data: { passwordHash, isActive: true }
        });
        console.log('Approver updated:', approver.email);
    } else {
        approver = await prisma.user.create({
            data: {
                tenantId,
                email: approverEmail,
                passwordHash,
                firstName: 'Test',
                lastName: 'Approver',
                displayName: 'Test Approver',
                isActive: true
            }
        });
        console.log('Approver created:', approver.email);
    }

    // Ensure Role
    let appRole = await prisma.role.findFirst({ where: { tenantId, name: 'approver' } });
    if (!appRole) {
        appRole = await prisma.role.create({
            data: { tenantId, name: 'approver', displayName: 'Approver' }
        });
    }

    const userRoleApp = await prisma.userRole.findFirst({
        where: { userId: approver.id, roleName: 'approver' }
    });

    if (!userRoleApp) {
        await prisma.userRole.create({
            data: {
                tenantId,
                userId: approver.id,
                roleName: 'approver'
            }
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
