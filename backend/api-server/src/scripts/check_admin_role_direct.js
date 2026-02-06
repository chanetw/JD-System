
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.putfusjtlzmvjmcwkefv:Sena%401775%40%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query(`
      SELECT u.id, u.email, u."roleId", r.name as role_name 
      FROM "User" u 
      LEFT JOIN "Role" r ON u."roleId" = r.id 
      WHERE u.email = 'admin@test.com'
    `);

        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User admin@test.com not found');
        }

        // Also list all roles to see what IDs are available
        const rolesRes = await client.query('SELECT * FROM "Role"');
        console.log('Available Roles:', rolesRes.rows);

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
