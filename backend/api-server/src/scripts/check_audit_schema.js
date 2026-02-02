
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
    console.log('--- Checking AuditLogs Table Schema ---');
    try {
        // Query information_schema to see actual columns
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs';
    `;
        console.log('Columns in audit_logs:', columns);
    } catch (err) {
        console.error('Error querying schema:', err);
    }
}

checkSchema()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
