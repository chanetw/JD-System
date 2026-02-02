const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Department & BU Data ---');

    // 1. Check all Business Units
    const bus = await prisma.businessUnit.findMany();
    console.log('All Business Units:', bus);

    // 2. Check Departments and their linked BU
    const depts = await prisma.department.findMany({
        select: {
            id: true,
            name: true,
            bud_id: true,
            bud: true
        }
    });
    console.log('\nDepartments (Sample 5):', depts.slice(0, 5));

    // 3. Check Users and their Department/BU (Mimic UserService)
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
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
