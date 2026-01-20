
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateProjects() {
    console.log("🔄 Activating all projects...");

    const { data, error } = await supabase
        .from('projects')
        .update({ is_active: true })
        .gt('id', 0) // Update all
        .select();

    if (error) {
        console.error("❌ Error updating projects:", error.message);
        return;
    }

    console.log(`✅ Successfully activated ${data.length} projects!`);
}

activateProjects();
