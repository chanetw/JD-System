/**
 * @file autoAssignService.js
 * @description Service สำหรับจัดการ Logic การ Assign งานอัตโนมัติ
 * ทำหน้าที่เป็น compatibility wrapper หลังย้าย auto-assign ไป backend
 */

/**
 * ค้นหาและ Assign งานให้ผู้รับผิดชอบตาม Matrix
 * 
 * @param {number|string} jobId - ID ของ Job ที่ต้องการ Assign
 * @param {number|string} projectId - Project ID
 * @param {number|string} jobTypeId - Job Type ID
 * @returns {Promise<{success: boolean, assigneeId: number|null, message: string}>}
 */
export const assignJobFromMatrix = async (jobId, projectId, jobTypeId) => {
    return {
        success: true,
        assigneeId: null,
        skipped: true,
        message: 'Auto-assignment is handled by the backend job workflow.'
    };
};
