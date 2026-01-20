
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
    console.log("🔍 Checking 'tenants' table...");
    const { data, error } = await supabase
        .from('tenants')
        .select('*');

    if (error) {
        console.error("❌ Error fetching tenants:", error.message);
        return;
    }

    console.table(data.map(t => ({
        id: t.id,
        name: t.name,
        is_active: t.is_active
    })));
}

checkTenants();
