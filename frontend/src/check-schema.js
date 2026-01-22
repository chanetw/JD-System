// Check Supabase Database Schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("🔍 Checking Supabase Database Schema...\n");
    
    // List of expected tables from the development plan
    const expectedTables = [
        'tenants',
        'users',
        'projects',
        'job_types',
        'jobs',
        'job_files',
        'job_history',
        'comments',
        'approvals',
        'approval_flows',
        'user_registration_requests',
        'password_reset_tokens',
        'email_templates',
        'notifications',
        'notification_settings',
        'notification_logs'
    ];

    console.log("📊 Checking Tables:");
    console.log("=".repeat(60));

    const existingTables = [];
    const missingTables = [];

    for (const table of expectedTables) {
        const { data, error } = await supabase
            .from(table)
            .select('count', { count: 'exact', head: true });

        if (error) {
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log(`❌ ${table.padEnd(30)} - NOT FOUND`);
                missingTables.push(table);
            } else {
                console.log(`⚠️  ${table.padEnd(30)} - ERROR: ${error.message}`);
            }
        } else {
            console.log(`✅ ${table.padEnd(30)} - EXISTS`);
            existingTables.push(table);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`\n📈 Summary:`);
    console.log(`   Existing Tables: ${existingTables.length}/${expectedTables.length}`);
    console.log(`   Missing Tables:  ${missingTables.length}/${expectedTables.length}`);

    if (missingTables.length > 0) {
        console.log(`\n⚠️  Missing Tables:`);
        missingTables.forEach(table => console.log(`   - ${table}`));
    }

    // Check some important columns in existing tables
    console.log("\n\n🔍 Checking Important Columns:");
    console.log("=".repeat(60));

    if (existingTables.includes('job_types')) {
        const { data } = await supabase.from('job_types').select('*').limit(1);
        if (data && data[0]) {
            const columns = Object.keys(data[0]);
            console.log("\n✅ job_types columns:");
            console.log(`   ${columns.join(', ')}`);
            
            const requiredCols = ['default_requires_approval', 'default_levels', 'default_assignee_id'];
            const missing = requiredCols.filter(col => !columns.includes(col));
            if (missing.length > 0) {
                console.log(`\n   ⚠️  Missing columns for Master Approval Flow:`);
                missing.forEach(col => console.log(`      - ${col}`));
            }
        }
    }

    if (existingTables.includes('jobs')) {
        const { data } = await supabase.from('jobs').select('*').limit(1);
        if (data && data[0]) {
            const columns = Object.keys(data[0]);
            console.log("\n✅ jobs columns:");
            console.log(`   ${columns.join(', ')}`);
            
            const requiredCols = ['auto_approved_levels', 'completed_at', 'completed_by', 'final_files'];
            const missing = requiredCols.filter(col => !columns.includes(col));
            if (missing.length > 0) {
                console.log(`\n   ⚠️  Missing columns for Auto-Approve & Completion:`);
                missing.forEach(col => console.log(`      - ${col}`));
            }
        }
    }

    if (existingTables.includes('users')) {
        const { data } = await supabase.from('users').select('*').limit(1);
        if (data && data[0]) {
            const columns = Object.keys(data[0]);
            console.log("\n✅ users columns:");
            console.log(`   ${columns.join(', ')}`);
            
            const requiredCols = ['title', 'must_change_password', 'sso_provider', 'sso_user_id'];
            const missing = requiredCols.filter(col => !columns.includes(col));
            if (missing.length > 0) {
                console.log(`\n   ⚠️  Missing columns for SSO & User Management:`);
                missing.forEach(col => console.log(`      - ${col}`));
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Schema Check Complete!\n");
}

checkSchema().catch(console.error);
