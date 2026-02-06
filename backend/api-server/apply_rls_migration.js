import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres.putfusjtlzmvjmcwkefv:Sena%401775%40%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../../database/migrations/manual/008_add_user_roles_rls_policies.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('\n📄 Applying migration: 008_add_user_roles_rls_policies.sql\n');

        // Execute the migration
        await client.query(migrationSQL);

        console.log('✅ Migration applied successfully!\n');

        // Verify policies were created
        console.log('📋 Verifying RLS policies...\n');
        const policiesResult = await client.query(`
            SELECT
                tablename,
                policyname,
                cmd
            FROM pg_policies
            WHERE tablename IN ('user_roles', 'user_scope_assignments')
            ORDER BY tablename, policyname
        `);

        console.log('Current RLS Policies:');
        console.table(policiesResult.rows);

    } catch (err) {
        console.error('❌ Error applying migration:', err.message);
        console.error('Details:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
