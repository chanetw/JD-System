import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend/api-server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client } = pg;

async function checkApprovals() {
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

        console.log('=== Checking Approvals for User 10006 ===\n');

        // 1. Check pending approvals for user 10006
        const pendingApprovals = await client.query(`
            SELECT
                a.id,
                a."jobId",
                a."approverId",
                a.status,
                a."stepNumber",
                j."djId",
                j.subject,
                j.status as job_status
            FROM approvals a
            JOIN jobs j ON a."jobId" = j.id
            WHERE a."approverId" = 10006
            AND a.status = 'pending'
            ORDER BY a."stepNumber"
        `);

        console.log(`Found ${pendingApprovals.rows.length} pending approvals:\n`);
        pendingApprovals.rows.forEach(row => {
            console.log(`  - Approval ID: ${row.id}`);
            console.log(`    Job ID: ${row.jobId} (${row.djId})`);
            console.log(`    Subject: ${row.subject}`);
            console.log(`    Step: ${row.stepNumber}`);
            console.log(`    Job Status: ${row.job_status}`);
            console.log(`    Approval Status: ${row.status}\n`);
        });

        // 2. Check all approvals for user 10006 (any status)
        const allApprovals = await client.query(`
            SELECT
                a.id,
                a."jobId",
                a.status,
                a."stepNumber",
                j."djId",
                j.status as job_status
            FROM approvals a
            JOIN jobs j ON a."jobId" = j.id
            WHERE a."approverId" = 10006
            ORDER BY a."stepNumber"
        `);

        console.log(`\nTotal approvals (all statuses): ${allApprovals.rows.length}\n`);

        // Group by status
        const byStatus = {};
        allApprovals.rows.forEach(row => {
            if (!byStatus[row.status]) byStatus[row.status] = 0;
            byStatus[row.status]++;
        });

        console.log('Breakdown by status:');
        Object.entries(byStatus).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        // 3. Check if approvals table exists and has data
        const totalApprovals = await client.query(`
            SELECT COUNT(*) FROM approvals
        `);
        console.log(`\nTotal approvals in database: ${totalApprovals.rows[0].count}`);

        // 4. Check jobs with pending_approval status
        const pendingJobs = await client.query(`
            SELECT
                id,
                "djId",
                subject,
                status,
                "currentLevel"
            FROM jobs
            WHERE status IN ('pending_approval', 'pending_level_1', 'pending_level_2')
            LIMIT 10
        `);

        console.log(`\nJobs with pending approval status: ${pendingJobs.rows.length}\n`);
        pendingJobs.rows.forEach(row => {
            console.log(`  - ${row.djId}: ${row.subject}`);
            console.log(`    Status: ${row.status}, Level: ${row.currentLevel}\n`);
        });

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkApprovals();
