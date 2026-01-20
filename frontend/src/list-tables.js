
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log("🔍 Listing all tables in 'public' schema...");

    // We cannot query information_schema directly with standard client easily mostly restricted.
    // But we can try querying known tables to see if they error.

    const tables = ['tenants', 'buds', 'departments', 'projects', 'users', 'jobs'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table '${table}': NOT FOUND or Error (${error.message})`);
        } else {
            console.log(`✅ Table '${table}': Exists (Rows: ${count})`);
        }
    }
}

listTables();
