
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend/api-server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client } = pg;

async function listTables() {
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

        // Query to list all tables in public schema
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('--- Database Tables ---');
        res.rows.forEach(row => {
            console.log(row.table_name);
        });
        console.log('-----------------------');

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

listTables();
