
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRoles() {
    try {
        console.log('Checking roles for User 2...');
        const roles = await prisma.userRole.findMany({
            where: { userId: 2 }
        });
        console.log('Found roles:', roles);

        const scopes = await prisma.$executeRawUnsafe('SELECT * FROM user_scope_assignments WHERE user_id = 2');
        console.log('Found scopes count:', scopes); // executeRaw returns number of affected rows for insert/update, for select it might be different or we need queryRaw

        const scopesData = await prisma.$queryRaw`SELECT * FROM user_scope_assignments WHERE user_id = 2`;
        console.log('Found scopes data:', scopesData);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRoles();
