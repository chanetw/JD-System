const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Department & BU Data (CJS) ---');

    // 1. Check all Business Units
    try {
        const bus = await prisma.bud.findMany();
        console.log('All Business Units:', bus);
    } catch (error) {
        console.error("Error fetching BUds:", error.message);
    }

    // 2. Check Departments and their linked BU
    try {
        const depts = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                budId: true, // Note: Schema field is budId, mapped to bud_id in DB, but Prisma client uses camelCase
                bud: true
            }
        });
        console.log('\nDepartments (Sample 5):', depts.slice(0, 5));
    } catch (error) {
        console.error("Error fetching departments:", error.message);
    }

    // 3. Check Users and their Department/BU
    try {
        const users = await prisma.user.findMany({
            take: 3,
            select: {
                id: true,
                firstName: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        bud: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        console.log('\nUsers (Sample 3):', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error fetching users:", error.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
