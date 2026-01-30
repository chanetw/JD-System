
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Testing Admin Queries...');

    try {
        console.log('1. Testing getMasterData (Projects)...');
        const { data, error } = await supabase.from('projects')
            .select(`*, bud:buds(name), tenant:tenants(name)`)
            .limit(5);

        if (error) {
            console.error('❌ Projects Query Failed:', error);
        } else {
            console.log('✅ Projects Query Success. Count:', data.length);
        }

        console.log('2. Testing getDepartments...');
        const { data: depts, error: deptError } = await supabase.from('departments')
            .select(`*, bud:buds(name, code), manager:users!fk_manager(display_name)`)
            .limit(5);

        if (deptError) {
            console.error('❌ Departments Query Failed:', deptError);
        } else {
            console.log('✅ Departments Query Success. Count:', depts.length);
        }

        console.log('3. Testing Buds & Tenants...');
        const { data: buds, error: budsError } = await supabase.from('buds').select('*').limit(5);
        if (budsError) console.error('❌ Buds Query Failed:', budsError);
        else console.log('✅ Buds Query Success. Count:', (buds || []).length);

        const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('*').limit(5);
        if (tenantsError) console.error('❌ Tenants Query Failed:', tenantsError);
        else console.log('✅ Tenants Query Success. Count:', (tenants || []).length);

    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

main();
