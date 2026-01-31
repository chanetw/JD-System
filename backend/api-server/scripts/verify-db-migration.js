import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from one level up (api-server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function checkDatabase() {
    console.log('Checking database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Check for must_change_password column
        const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'must_change_password';
    `);

        if (res.rows.length > 0) {
            console.log('✅ Column "must_change_password" FOUND!');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('❌ Column "must_change_password" NOT FOUND.');
        }

        // Check for status column
        const resStatus = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'status';
    `);

        if (resStatus.rows.length > 0) {
            console.log('✅ Column "status" FOUND!');
        } else {
            console.log('❌ Column "status" NOT FOUND.');
        }

    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await client.end();
    }
}

checkDatabase();
