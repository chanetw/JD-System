// Quick test to verify Prisma Client knows about nextJobTypeId

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testField() {
  try {
    console.log('Testing Prisma Client field recognition...\n');

    // Check if the field exists in Prisma's type definitions
    const modelFields = Object.keys(prisma.jobType.fields || {});
    console.log('✓ Prisma Client loaded successfully');

    // Try to query with nextJobTypeId
    const result = await prisma.jobType.findFirst({
      select: {
        id: true,
        name: true,
        nextJobTypeId: true  // This will fail if Prisma doesn't know about it
      }
    });

    console.log('✅ SUCCESS: Prisma Client recognizes nextJobTypeId field!');
    console.log('Sample result:', result);

  } catch (error) {
    console.error('❌ ERROR:', error.message);

    if (error.message.includes('Unknown arg')) {
      console.error('\n⚠️  The Prisma Client still doesn\'t recognize nextJobTypeId');
      console.error('This usually means:');
      console.error('  1. The schema.prisma has the field but client wasn\'t regenerated');
      console.error('  2. Or there\'s a mismatch between schema and client');
    } else if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n⚠️  The database column doesn\'t exist yet');
      console.error('Run: npx prisma db push --schema=./prisma/schema.prisma');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testField();
