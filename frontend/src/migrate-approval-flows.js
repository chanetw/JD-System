
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateApprovalFlows() {
    console.log("🚀 Seeding Approval Flows...");

    // Mock Data for Approval Flows
    // Structure: One row per approver rule per project per level
    // Project 1: Sena Park Grand Ratchayothin (Level 1: Manager(3), Level 2: VP(4))
    // Project 2: Sena Villa Ratchapruek (Level 1: Manager(3))
    // Project 8: SENX Project 01 (Level 1: VP(4))

    const approvalFlows = [
        // Project 1 - Level 1 - Approver: User 3 (Somchai - Manager)
        {
            project_id: 1,
            level: 1,
            approver_id: 3,
            role: 'manager' // Fallback label
        },
        // Project 1 - Level 2 - Approver: User 4 (Wipa - VP)
        {
            project_id: 1,
            level: 2,
            approver_id: 4,
            role: 'vp'
        },
        // Project 2 - Level 1 - Approver: User 3 (Somchai - Manager)
        {
            project_id: 2,
            level: 1,
            approver_id: 3,
            role: 'manager'
        },
        // Project 3 - Level 1 - Approver: User 3
        {
            project_id: 3,
            level: 1,
            approver_id: 3,
            role: 'manager'
        },
        // Project 8 (SENX) - Level 1 - Approver: User 4
        {
            project_id: 8,
            level: 1,
            approver_id: 4,
            role: 'vp'
        }
    ];

    // Clear existing to avoid duplicates if re-run (or use Upsert if we had IDs)
    // Since this is init/seed, specific logic: delete for these projects first? No, just Insert.
    // Better: Delete all first to be clean or use upsert? 
    // Since we don't have PKs here easily, let's just insert.
    // Pro-tip: Delete all first for these projects.

    // Get project IDs we are touching
    const projectIds = [...new Set(approvalFlows.map(f => f.project_id))];
    await supabase.from('approval_flows').delete().in('project_id', projectIds);

    const { data, error } = await supabase.from('approval_flows').insert(approvalFlows).select();

    if (error) {
        console.error("❌ Error seeding approval flows:", error.message);
        return;
    }

    console.log(`✅ Successfully seeded ${data.length} approval flow rules!`);
}

migrateApprovalFlows();
