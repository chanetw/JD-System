
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'password123';
    const tenantId = 1;
    const forcedId = 9999;

    console.log(`Creating/Updating admin user: ${email}...`);

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Check if user exists by email
    let user = await prisma.user.findFirst({
        where: {
            tenantId,
            email
        }
    });

    if (user) {
        // Update existing user
        console.log(`User found (ID: ${user.id}), updating...`);
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                isActive: true,
                firstName: 'Real',
                lastName: 'Admin'
            }
        });
    } else {
        // Check if ID 9999 is taken by someone else
        const userById = await prisma.user.findUnique({ where: { id: forcedId } });

        if (userById) {
            // ID 9999 exists but email is different (?) - Update it to become our admin? 
            // Or just let it fail? Let's update it to be our admin.
            console.log(`User ID ${forcedId} exists, hijacking as admin...`);
            user = await prisma.user.update({
                where: { id: forcedId },
                data: {
                    email,
                    passwordHash,
                    isActive: true,
                    firstName: 'Real',
                    lastName: 'Admin',
                    displayName: 'Real Admin',
                    tenantId // Ensure tenant matches
                }
            });
        } else {
            // Create new with forced ID
            console.log('User not found, creating with ID 9999...');
            user = await prisma.user.create({
                data: {
                    id: forcedId,
                    tenantId,
                    email,
                    passwordHash,
                    firstName: 'Real',
                    lastName: 'Admin',
                    displayName: 'Real Admin',
                    isActive: true
                }
            });
        }
    }

    console.log(`User ID: ${user.id} created/updated.`);

    // 2. Ensure Role 'admin' exists
    const existingRole = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            roleName: 'admin',
            tenantId
        }
    });

    if (!existingRole) {
        console.log('Assigning admin role...');
        await prisma.userRole.create({
            data: {
                userId: user.id,
                tenantId,
                roleName: 'admin',
                isActive: true
            }
        });
        console.log('Admin role assigned.');
    } else {
        console.log('User already has admin role.');
    }

    console.log('------------------------------------------------');
    console.log('Login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Tenant ID: ${tenantId}`);
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
