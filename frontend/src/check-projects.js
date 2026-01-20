
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    console.log("🔍 Checking 'projects' table...");
    const { data, error, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("❌ Error fetching projects:", error.message);
        return;
    }

    console.log(`✅ Found ${count} projects:`);
    console.table(data.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name.substring(0, 30),
        active: p.is_active
    })));
}

checkProjects();
