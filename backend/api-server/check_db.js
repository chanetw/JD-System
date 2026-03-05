require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.rejectionRequest.findUnique({ where: { id: 1 } });
  console.log("Rejection Request:", req);
  if (req) {
    console.log("Type of approverIds:", typeof req.approverIds);
    console.log("Is Array?", Array.isArray(req.approverIds));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
