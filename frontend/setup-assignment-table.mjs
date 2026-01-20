/**
 * @file setup-assignment-table.mjs
 * @description Script ง่ายๆ สำหรับสร้าง table project_job_assignments ใน Supabase
 * วิธีใช้: node setup-assignment-table.mjs
 */

const SUPABASE_URL = 'https://putfusjtlzmvjmcwkefv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dGZ1c2p0bHptdmptY3drZWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTE0ODksImV4cCI6MjA4NDQ2NzQ4OX0.Fxw0RZgAxwUFtalmMEp8vUeu6z17T2T25WKRvnvCG5A';

/**
 * SQL Script สำหรับสร้าง table
 */
const createTableSQL = `
CREATE TABLE IF NOT EXISTS project_job_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES job_types(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, job_type_id)
);

COMMENT ON TABLE project_job_assignments IS 'ตารางเก็บการจับคู่ โครงการ+ประเภทงาน กับ ผู้รับงานเริ่มต้น';
COMMENT ON COLUMN project_job_assignments.project_id IS 'ID ของโครงการ';
COMMENT ON COLUMN project_job_assignments.job_type_id IS 'ID ของประเภทงาน';
COMMENT ON COLUMN project_job_assignments.assignee_id IS 'ID ของผู้รับงานเริ่มต้น';

ALTER TABLE project_job_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for project_job_assignments" ON project_job_assignments;

CREATE POLICY "Allow all access for project_job_assignments" 
    ON project_job_assignments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
`;

async function createTable() {
    try {
        console.log('\n🚀 DJ System - Create Assignment Table\n');
        console.log('📍 Supabase URL:', SUPABASE_URL);
        console.log('🔄 กำลังสร้าง table project_job_assignments...\n');

        // เรียก Supabase SQL API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                query: createTableSQL
            })
        });

        const text = await response.text();

        if (!response.ok) {
            console.log('⚠️  REST API ไม่รองรับ raw SQL');
            console.log('📋 ต้องสร้าง Table แบบ Manual ผ่าน Supabase Dashboard:\n');
            printManualInstructions();
            process.exit(1);
        }

        console.log('✅ สร้าง table สำเร็จ!\n');
        console.log('📊 Table: project_job_assignments');
        console.log('✨ พร้อมใช้งาน!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📋 ต้องสร้าง Table แบบ Manual ผ่าน Supabase Dashboard:\n');
        printManualInstructions();
        process.exit(1);
    }
}

function printManualInstructions() {
    console.log('='.repeat(70));
    console.log('📚 วิธีสร้าง Table แบบ Manual (Recommended):');
    console.log('='.repeat(70));
    console.log('\n1️⃣  เข้าไปที่ Supabase Dashboard:');
    console.log('   https://app.supabase.com/project/putfusjtlzmvjmcwkefv\n');
    console.log('2️⃣  ไปที่ "SQL Editor" จากเมนูด้านซ้าย\n');
    console.log('3️⃣  คลิก "New Query" เพื่อสร้าง Query ใหม่\n');
    console.log('4️⃣  Paste SQL code ข้างล่างลงไป:\n');
    console.log('-'.repeat(70));
    console.log(createTableSQL);
    console.log('-'.repeat(70));
    console.log('\n5️⃣  คลิก "RUN" ที่มุมบนขวา (หรือ Cmd+Enter)\n');
    console.log('6️⃣  รอให้ Query เสร็จ ตรวจสอบให้ดี\n');
    console.log('✅ เพียงเท่านี้ Table ก็จะถูกสร้างเรียบร้อย!\n');
    console.log('='.repeat(70));
    console.log('\n💡 ถัดไป ให้รัน npm run dev เพื่อเริ่มใช้ระบบ\n');
}

createTable();
