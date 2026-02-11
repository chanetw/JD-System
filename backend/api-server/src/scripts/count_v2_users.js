
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const { Client } = pg;

async function countV2Users() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not set in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT COUNT(*) FROM "v2_users"');
        console.log('Total users in v2_users table: ' + res.rows[0].count);
    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

countV2Users();
