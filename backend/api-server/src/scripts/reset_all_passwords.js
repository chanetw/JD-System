/**
 * Script: Reset all user passwords to '123456'
 * Usage: node src/scripts/reset_all_passwords.js
 */

import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;

async function resetAllPasswords() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        // Hash '123456'
        const defaultPassword = '123456';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Update all users
        const result = await client.query(`
      UPDATE users 
      SET password_hash = $1, must_change_password = true
      WHERE is_active = true
      RETURNING id, email
    `, [passwordHash]);

        console.log(`Successfully reset passwords for ${result.rowCount} users.`);
        console.log('Sample updated users:', result.rows.slice(0, 3));

    } catch (error) {
        console.error('Error resetting passwords:', error);
    } finally {
        await client.end();
    }
}

resetAllPasswords();
