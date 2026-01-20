/**
 * @file create-assignment-table.js
 * @description Script สำหรับสร้าง table project_job_assignments ใน Supabase
 * วิธีใช้: node src/create-assignment-table.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_KEY ใน .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * SQL Script สำหรับสร้าง table
 */
const createTableSQL = `
-- ==========================================
-- ตารางกำหนดผู้รับงานอัตโนมัติ (Assignment Matrix)
-- Project + Job Type -> Assignee
-- ==========================================

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

-- Comment อธิบายตาราง
COMMENT ON TABLE project_job_assignments IS 'ตารางเก็บการจับคู่ โครงการ+ประเภทงาน กับ ผู้รับงานเริ่มต้น';
COMMENT ON COLUMN project_job_assignments.project_id IS 'ID ของโครงการ';
COMMENT ON COLUMN project_job_assignments.job_type_id IS 'ID ของประเภทงาน';
COMMENT ON COLUMN project_job_assignments.assignee_id IS 'ID ของผู้รับงานเริ่มต้น';

-- RLS Policy
ALTER TABLE project_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all access for project_job_assignments" 
    ON project_job_assignments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
`;

/**
 * ฟังก์ชันสร้าง table
 */
async function createTable() {
    try {
        console.log('🔄 กำลังสร้าง table project_job_assignments...');
        console.log(`📍 Database URL: ${SUPABASE_URL}`);

        // ใช้ RPC call เพื่อรัน raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: createTableSQL
        });

        if (error) {
            // ถ้า RPC ไม่มี ลองใช้วิธีอื่น
            console.warn('⚠️ RPC exec_sql ไม่พร้อมใช้งาน ลองใช้ REST API...');
            return await createTableViaREST();
        }

        console.log('✅ สร้าง table สำเร็จ!');
        console.log('📊 Table: project_job_assignments');
        return true;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        return false;
    }
}

/**
 * วิธี Alternative: ใช้ Supabase Management API
 */
async function createTableViaREST() {
    try {
        console.log('📡 ใช้วิธี Supabase Management API...');
        
        // ต้องใช้ Service Role Key เพื่อเรียก Management API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
                query: createTableSQL
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log('✅ สร้าง table สำเร็จ!');
        return true;
    } catch (error) {
        console.error('❌ Management API Error:', error.message);
        return false;
    }
}

/**
 * วิธี Alternative 2: ใช้ SQL Editor Manual
 */
async function showManualInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 วิธีสร้าง Table แบบ Manual:');
    console.log('='.repeat(60));
    console.log('\n1. เข้าไปที่ Supabase Dashboard');
    console.log('   URL: https://app.supabase.com/project/' + SUPABASE_URL.split('.')[0]);
    console.log('\n2. ไปที่ SQL Editor');
    console.log('\n3. สร้าง Query ใหม่ และ Paste SQL ข้างล่าง:\n');
    console.log('---');
    console.log(createTableSQL);
    console.log('---');
    console.log('\n4. คลิก "Run" หรือ Cmd+Enter');
    console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main Function
 */
async function main() {
    console.log('\n🚀 DJ System - Create Assignment Table Script\n');

    // ลองสร้าง table ผ่าน API
    const success = await createTable();

    if (!success) {
        console.log('\n⚠️ ไม่สามารถสร้าง table ผ่าน API ได้');
        console.log('ต้องสร้างแบบ Manual ดังนี้:\n');
        showManualInstructions();
        process.exit(1);
    }

    console.log('\n✨ เสร็จสิ้น! Table พร้อมใช้งาน\n');
    process.exit(0);
}

main();
