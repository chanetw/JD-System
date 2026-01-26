/**
 * @file autoAssignService.js
 * @description Service สำหรับจัดการ Logic การ Assign งานอัตโนมัติ
 * ทำหน้าที่ค้นหา Assignee จาก Matrix (Project + JobType) และอัปเดตงาน
 */

import { supabase } from '@shared/services/supabaseClient';

/**
 * ค้นหาและ Assign งานให้ผู้รับผิดชอบตาม Matrix
 * 
 * @param {number|string} jobId - ID ของ Job ที่ต้องการ Assign
 * @param {number|string} projectId - Project ID
 * @param {number|string} jobTypeId - Job Type ID
 * @returns {Promise<{success: boolean, assigneeId: number|null, message: string}>}
 */
export const assignJobFromMatrix = async (jobId, projectId, jobTypeId) => {
    try {
        console.log(`[AutoAssign] Processing Job #${jobId} (Project: ${projectId}, Type: ${jobTypeId})`);

        // 1. ค้นหา Assignee จากตาราง project_job_assignments
        // โดยใช้เงื่อนไข: project_id AND job_type_id AND is_active = true
        const { data: assignment, error: queryError } = await supabase
            .from('project_job_assignments')
            .select('assignee_id')
            .eq('project_id', parseInt(projectId))
            .eq('job_type_id', parseInt(jobTypeId))
            .eq('is_active', true)
            .maybeSingle(); // ใช้ maybeSingle เพราะอาจจะไม่เจอ (ไม่ถือว่า Error)

        if (queryError) {
            console.error('[AutoAssign] Matrix query error:', queryError);
            return { success: false, message: 'Matrix query failed' };
        }

        if (!assignment || !assignment.assignee_id) {
            console.warn('[AutoAssign] No assignee found in matrix.');
            // ไม่เจอ Matrix -> ปล่อยเป็น null (Pending Assignment)
            // TODO: อาจจะแจ้งเตือน Admin ว่ามีงานหลุด Matrix
            return { success: true, assigneeId: null, message: 'No matrix rule found' };
        }

        const assigneeId = assignment.assignee_id;
        console.log(`[AutoAssign] Found Assignee: User #${assigneeId}`);

        // 2. อัปเดตตาราง jobs
        // Set assignee_id และเปลี่ยน status เป็น 'assigned' (หรือตาม Workflow ที่ตกลง)
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                assignee_id: assigneeId,
                status: 'assigned', // เปลี่ยนสถานะเป็น "จ่ายงานแล้ว" ทันที
                updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(jobId));

        if (updateError) {
            console.error('[AutoAssign] Job update error:', updateError);
            throw updateError;
        }

        // 3. (Optional) สร้าง Notification แจ้งเตือน Assignee
        // TODO: เรียก notificationService.create() ที่นี่ในอนาคต

        return { success: true, assigneeId: assigneeId, message: 'Job assigned successfully' };

    } catch (error) {
        console.error('[AutoAssign] Critical Error:', error);
        return { success: false, message: error.message };
    }
};
