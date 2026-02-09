// Run manual migration to add next_job_type_id column

const { PrismaClient } = require('./node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔧 Running migration: add_next_job_type_id.sql\n');

    const sqlPath = path.join(__dirname, 'prisma/migrations/manual/add_next_job_type_id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Remove comment lines and split by semicolon
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;

      const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
      console.log(`Executing: ${preview}...`);

      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✓ Success\n');
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          console.log('⚠️  Already exists (skipping)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Verifying column exists...');

    // Verify the column was added
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'job_types'
        AND column_name = 'next_job_type_id'
    `;

    if (result.length > 0) {
      console.log('✅ Column verified:', result[0]);
    } else {
      console.log('❌ Column not found!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
