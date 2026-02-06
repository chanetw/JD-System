
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.putfusjtlzmvjmcwkefv:Sena%401775%40%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();

        console.log('--- Checking users (V1) ---');
        const res = await client.query(`SELECT * FROM users WHERE email = 'admin@test.com'`);
        if (res.rows.length > 0) {
            console.log('Found in users (V1):', res.rows[0]);
        } else {
            console.log('Not found in users (V1)');
        }

        console.log('--- Checking v2_users (V2) ---');
        try {
            const resV2 = await client.query(`SELECT * FROM v2_users WHERE email = 'admin@test.com'`);
            if (resV2.rows.length > 0) {
                console.log('Found in v2_users:', resV2.rows[0]);
            } else {
                console.log('Not found in v2_users');
            }
        } catch (e) {
            console.log('v2_users table likely does not exist');
        }

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
