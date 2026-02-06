
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
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log('Tables:', res.rows.map(r => r.table_name));

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
