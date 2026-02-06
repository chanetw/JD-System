
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

        // Update the user's role to SuperAdmin (ID 1)
        // Based on previous output, SuperAdmin should be ID 1, but I will query to be sure logic matches

        // First find SuperAdmin role id
        const roleRes = await client.query(`SELECT id FROM "Role" WHERE name = 'SuperAdmin' OR name = 'admin' LIMIT 1`);
        if (roleRes.rows.length === 0) {
            console.error('SuperAdmin role not found');
            return;
        }
        const adminRoleId = roleRes.rows[0].id;
        console.log(`Found Admin Role ID: ${adminRoleId}`);

        const updateRes = await client.query(`
      UPDATE "User"
      SET "roleId" = $1
      WHERE email = 'admin@test.com'
      RETURNING id, email, "roleId"
    `, [adminRoleId]);

        if (updateRes.rows.length > 0) {
            console.log('User updated successfully:', updateRes.rows[0]);
        } else {
            console.log('User admin@test.com not found for update');
        }

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
