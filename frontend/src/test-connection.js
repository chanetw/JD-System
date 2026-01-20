
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually for this standalone script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log(`📡 Connecting to ${supabaseUrl}...`);
    const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });

    if (error) {
        // 404 or 42P01 (undefined table) means we connected but table creates haven't run yet -> SUCCESS connecting
        if (error.code === '42P01' || error.status === 404 || error.message.includes('does not exist')) {
            console.log("✅ Connection Successful! (Database reached, but table 'tenants' not found as expected)");
        } else {
            console.error("❌ Connection Failed:", error.message);
        }
    } else {
        console.log("✅ Connection Successful! (Table 'tenants' found)");
    }
}

testConnection();
