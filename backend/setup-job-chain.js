// Set up sample job chain for testing sequential jobs

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function setupChain() {
  try {
    console.log('Setting up sample job chains...\n');

    // Chain 1: Social Media Post → Banner Web
    // When you select "Social Media Post", it automatically adds "Banner Web"
    const chain1 = await prisma.jobType.update({
      where: { id: 1 }, // Social Media Post
      data: { nextJobTypeId: 2 } // → Banner Web
    });
    console.log(`✅ Chain 1: "${chain1.name}" (ID: 1) → Banner Web (ID: 2)`);

    // Chain 2: Key Visual → Print Ad
    const chain2 = await prisma.jobType.update({
      where: { id: 6 }, // Key Visual
      data: { nextJobTypeId: 3 } // → Print Ad
    });
    console.log(`✅ Chain 2: "${chain2.name}" (ID: 6) → Print Ad (ID: 3)`);

    console.log('\n✅ Job chains configured!');
    console.log('\nNow when you select:');
    console.log('  - "Social Media Post" → "Banner Web" will be auto-added');
    console.log('  - "Key Visual" → "Print Ad" will be auto-added');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupChain();
