
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

        console.log('--- users columns ---');
        const usersCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log(usersCols.rows);

        console.log('--- user_roles columns ---');
        const rolesCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles'
    `);
        console.log(rolesCols.rows);

        // Also check content of user_roles
        console.log('--- user_roles content ---');
        const rolesContent = await client.query('SELECT * FROM user_roles');
        console.log(rolesContent.rows);

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
