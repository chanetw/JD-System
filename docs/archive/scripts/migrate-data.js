
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup Env & Client ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helpers ---
const readJson = (filePath) => {
    const fullPath = path.join(__dirname, '../../mock-data', filePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return null; // Return null if file missing, let handler decide
    }
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
};

// --- Migrators ---

async function migrateTenantsAndBuds() {
    console.log("\n📦 Migrating Tenants, BUDs, and Depts...");

    // 1. Tenants (Mock doesn't have separate tenant file usually, extracting from projects or creating static)
    // We will assume 2 main tenants from our known context
    const tenants = [
        { id: 1, name: "SENA Development", code: "SENA", subdomain: "sena", is_active: true },
        { id: 2, name: "SEN X", code: "SENX", subdomain: "senx", is_active: true }
    ];

    const { error: tErr } = await supabase.from('tenants').upsert(tenants);
    if (tErr) console.error("❌ Tenant Error:", tErr.message);
    else console.log("✅ Tenants done.");

    // 2. BUDs & Depts (From projects.json)
    const projectData = readJson('projects/projects.json');
    if (!projectData) return;

    // Extract unique BUDs
    const budsMap = new Map();
    // Also need to support Departments if in json, otherwise fallback

    projectData.buds?.forEach(b => {
        budsMap.set(b.id, {
            id: b.id,
            tenant_id: b.tenantId || 1, // Default to 1 if missing
            name: b.name,
            code: b.code,
            is_active: true
        });
    });

    if (budsMap.size > 0) {
        const { error: bErr } = await supabase.from('buds').upsert(Array.from(budsMap.values()));
        if (bErr) console.error("❌ BUDs Error:", bErr.message);
        else console.log(`✅ BUDs done (${budsMap.size} items).`);
    }

    // 3. Departments
    // If 'departments' array exists in projects.json (from recent update)
    if (projectData.departments && projectData.departments.length > 0) {
        const depts = projectData.departments.map(d => ({
            id: d.id,
            tenant_id: d.tenantId,
            bud_id: d.budId,
            name: d.name,
            code: d.code,
            manager_id: d.managerId,
            is_active: d.isActive
        }));
        const { error: dErr } = await supabase.from('departments').upsert(depts);
        if (dErr) console.error("❌ Departments Error:", dErr.message);
        else console.log(`✅ Departments done (${depts.length} items).`);
    }
}

async function migrateJobTypesAndItems() {
    console.log("\n📦 Migrating Job Types & Items...");
    const adminData = readJson('admin/admin.json');
    if (!adminData) return;

    // 1. Job Types (From Admin SLA)
    // Need to handle mapping. Admin JSON usually has "jobTypes" array
    // Our mock: { id, name, sla, items: [] } -> DB: job_types, job_type_items

    // We need to map mock ID to DB ID. If mock IDs are 1,2,3 we can keep them.
    const jobTypes = [];
    const JobTypeItems = [];

    // Assuming adminData.jobTypes structure
    // We might need to fetch them if structure is different
    // Let's assume standard structure based on files seen

    // Fallback: Use known sample data if file complex to parse perfectly without seeing it all
    // But since we are dev, we try to map.

    // Note: admin.json might have different structure, let's look at `jobTypeItems` array specifically
    if (adminData.jobTypes) {
        adminData.jobTypes.forEach(jt => {
            jobTypes.push({
                id: jt.id,
                tenant_id: 1, // Default
                name: jt.name,
                description: jt.description,
                sla_days: jt.sla || 3,
                is_active: jt.status === 'active'
            });
        });
    }

    if (jobTypes.length > 0) {
        const { error: jtErr } = await supabase.from('job_types').upsert(jobTypes);
        if (jtErr) console.error("❌ Job Types Error:", jtErr.message);
        else console.log(`✅ Job Types done (${jobTypes.length} items).`);
    }

    // 2. Job Type Items
    // If admin.json has specific 'jobTypeItems' array (from recent update)
    if (adminData.jobTypeItems) {
        const items = adminData.jobTypeItems.map(item => ({
            id: item.id,
            job_type_id: item.jobTypeId,
            name: item.name,
            default_size: item.defaultSize,
            is_required: item.isRequired
        }));

        const { error: jtiErr } = await supabase.from('job_type_items').upsert(items);
        if (jtiErr) console.error("❌ Job Type Items Error:", jtiErr.message);
        else console.log(`✅ Job Type Items done (${items.length} items).`);
    }
}

async function migrateUsers() {
    console.log("\n📦 Migrating Users...");
    const userData = readJson('users/users.json');
    if (!userData || !userData.users) return;

    const users = userData.users.map(u => ({
        id: u.id,
        tenant_id: u.tenantId,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        display_name: u.displayName,
        role: u.roles ? u.roles[0] : 'user', // simple map
        // dept?
        is_active: u.isActive
    }));

    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error("❌ Users Error:", error.message);
    else console.log(`✅ Users done (${users.length} items).`);
}

async function migrateProjects() {
    console.log("\n📦 Migrating Projects...");
    const projectData = readJson('projects/projects.json');
    if (!projectData || !projectData.projects) return;

    const projects = projectData.projects.map(p => ({
        id: p.id,
        tenant_id: p.tenantId,
        bud_id: p.budId,
        // department_id: p.departmentId, // If available
        name: p.name,
        code: p.code,
        is_active: p.status === 'active'
    }));

    const { error } = await supabase.from('projects').upsert(projects);
    if (error) console.error("❌ Projects Error:", error.message);
    else console.log(`✅ Projects done (${projects.length} items).`);
}

async function migrateJobs() {
    console.log("\n📦 Migrating Jobs...");
    const jobData = readJson('jobs/jobs.json');
    if (!jobData || !jobData.designJobs) return;

    // Need to find jobTypeId from name if mock uses names, or map IDs if available
    // Mock jobs.json uses "jobType": "Social Media" (String) usually.
    // We need to query DB to get IDs first to map, or hardcode map if we know it.
    // For safety, we'll try to map by name.

    // Creating a map of JobTypeName -> JobTypeID
    const { data: dbJobTypes } = await supabase.from('job_types').select('id, name');
    const typeMap = {};
    if (dbJobTypes) {
        dbJobTypes.forEach(t => typeMap[t.name] = t.id);
    }

    // Prepare Jobs
    const jobs = [];

    // We iterate but can only map if types match. 
    // If type missing, maybe skip or set null?

    for (const j of jobData.designJobs) {
        const typeId = typeMap[j.jobType] || null; // Map string name to ID

        jobs.push({
            id: j.id,
            tenant_id: j.tenantId,
            project_id: null, // Hard to map project name "Sena Park Grand" to ID easily without another query.
            // For MVP script, we skip linking project here OR we fetch all projects to map name->id like we did for types.
            job_type_id: typeId,

            dj_id: j.djId,
            subject: j.subject,
            // description: j.brief? JSON? Or text?
            objective: j.brief?.objective,
            headline: j.brief?.headline,
            sub_headline: j.brief?.subHeadline,

            status: j.status,
            priority: j.priority,

            requester_id: j.requesterId,
            assignee_id: j.assigneeId,

            due_date: j.deadline,
            created_at: j.createdAt
            // completed_at... 
        });
    }

    // Insert (Chunks might be needed if too many, but for mock <100 is fine)
    if (jobs.length > 0) {
        const { error } = await supabase.from('jobs').upsert(jobs);
        if (error) console.error("❌ Jobs Error:", error.message);
        else console.log(`✅ Jobs done (${jobs.length} items).`);
    }
}

async function runMigration() {
    console.log("🚀 Starting Migration...");
    await migrateTenantsAndBuds();
    await migrateJobTypesAndItems();
    await migrateUsers(); // Need users before projects if projects have managers, but here simple
    await migrateProjects();
    await migrateJobs();
    console.log("\n✨ Migration Complete!");
}

runMigration();
