// Check if nextJobTypeId is properly set and returned

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('Checking job types with nextJobTypeId...\n');

    const jobTypes = await prisma.jobType.findMany({
      select: {
        id: true,
        name: true,
        nextJobTypeId: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('All Job Types:');
    console.log('─'.repeat(60));

    for (const jt of jobTypes) {
      const hasNext = jt.nextJobTypeId ? `→ Next: ${jt.nextJobTypeId}` : '(no chain)';
      console.log(`ID ${jt.id}: ${jt.name.padEnd(30)} ${hasNext}`);
    }

    console.log('\n─'.repeat(60));

    const withChain = jobTypes.filter(jt => jt.nextJobTypeId);
    console.log(`\nJob Types with chain: ${withChain.length}`);

    if (withChain.length === 0) {
      console.log('\n⚠️  No job types have nextJobTypeId set!');
      console.log('To test sequential jobs, set nextJobTypeId for a job type.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
