require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, firstName: true, email: true } });
  console.log("Users:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
