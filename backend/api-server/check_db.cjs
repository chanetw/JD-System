require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.rejectionRequest.findUnique({ where: { id: 1 } });
  
  if (req) {
    console.log("Before manual update:", req.approverIds);
    console.log("Type:", typeof req.approverIds, Array.isArray(req.approverIds));

    // Force update to include ID 4 (IDApp4) for testing
    await prisma.rejectionRequest.update({
      where: { id: 1 },
      data: { approverIds: [10006, 4] }
    });

    const updated = await prisma.rejectionRequest.findUnique({ where: { id: 1 } });
    console.log("After manual update:", updated.approverIds);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
