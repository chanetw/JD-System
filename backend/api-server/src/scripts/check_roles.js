
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.putfusjtlzmvjmcwkefv:Sena%401775%40%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();

        // Check distinct role names
        console.log('--- Distinct Role Names ---');
        const roles = await client.query('SELECT DISTINCT role_name FROM user_roles');
        console.log(roles.rows);

        // Check user_roles for user 10000
        console.log('--- Current Role for User 10000 ---');
        const userRole = await client.query('SELECT * FROM user_roles WHERE user_id = 10000');
        console.log(userRole.rows);

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
