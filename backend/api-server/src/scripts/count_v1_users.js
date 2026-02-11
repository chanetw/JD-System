
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend/api-server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client } = pg;

async function countV1Users() {
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
        const res = await client.query('SELECT COUNT(*) FROM "users"');
        console.log('Total users in V1 (users table): ' + res.rows[0].count);

        // Also check roles breakdown if possible
        const rolesRes = await client.query(`
      SELECT r.name, COUNT(ur.id) as count 
      FROM user_roles ur 
      LEFT JOIN users u ON ur.user_id = u.id 
      LEFT JOIN roles r ON r.name = ur.role_name
      GROUP BY r.name
    `);

        if (rolesRes.rows.length > 0) {
            console.log('Brakdown by Role (V1):');
            rolesRes.rows.forEach(row => {
                console.log(`- ${row.name || row.role_name}: ${row.count}`);
            });
        }

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

countV1Users();
