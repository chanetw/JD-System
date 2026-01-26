/**
 * @file emailService.js
 * @description Email Service สำหรับส่ง email notifications
 * 
 * รองรับ:
 * - Registration Approval Email (พร้อม temp password)
 * - Registration Rejection Email (พร้อมเหตุผล)
 * - Job Assignment Notification
 * - Job Status Update Notification
 * 
 * ใช้ Backend Email API (SMTP) แทน Supabase Edge Function
 */

// Email API Configuration
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:3001';
const EMAIL_API_KEY = import.meta.env.VITE_EMAIL_API_KEY || '';

/**
 * Helper function สำหรับเรียก Email API
 * @param {string} endpoint - API endpoint
 * @param {object} body - Request body
 * @returns {Promise<object>} - API response
 */
const callEmailAPI = async (endpoint, body) => {
    const response = await fetch(`${EMAIL_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(EMAIL_API_KEY && { 'X-API-Key': EMAIL_API_KEY })
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
};

/**
 * ส่ง Email แจ้งการอนุมัติ User Registration
 * @param {string} email - Email ของ user
 * @param {string} firstName - ชื่อ user
 * @param {string} tempPassword - รหัสผ่านชั่วคราว
 * @returns {Promise<object>} - ผลลัพธ์การส่ง
 */
export const sendApprovalEmail = async (email, firstName, tempPassword) => {
    try {
        console.log(`📧 ส่ง Approval Email ไปยัง ${email}`);

        const data = await callEmailAPI('/api/send-email', {
            to: email,
            template: 'registration_approved',
            data: {
                firstName,
                email,
                tempPassword,
                loginUrl: `${window.location.origin}/login`
            }
        });

        console.log('✅ Approval email sent successfully:', data?.messageId);
        return { success: true, id: data?.messageId };

    } catch (error) {
        // Fallback: Log ไว้ แต่ไม่ throw error เพื่อไม่ให้ block approval
        console.warn('⚠️ Email service not available, logging instead:', {
            to: email,
            type: 'approval',
            tempPassword: '***hidden***',
            error: error.message
        });
        // ไม่ throw - email failure ไม่ควร block approval flow
        return { success: false, error: error.message, mock: true };
    }
};

/**
 * ส่ง Email แจ้งการปฏิเสธ User Registration
 * @param {string} email - Email ของ user
 * @param {string} firstName - ชื่อ user
 * @param {string} reason - เหตุผลการปฏิเสธ
 * @returns {Promise<object>} - ผลลัพธ์การส่ง
 */
export const sendRejectionEmail = async (email, firstName, reason) => {
    try {
        console.log(`📧 ส่ง Rejection Email ไปยัง ${email}`);

        const data = await callEmailAPI('/api/send-email', {
            to: email,
            template: 'registration_rejected',
            data: {
                firstName,
                rejectionReason: reason
            }
        });

        console.log('✅ Rejection email sent successfully:', data?.messageId);
        return { success: true, id: data?.messageId };

    } catch (error) {
        console.warn('⚠️ Email service not available, logging instead:', {
            to: email,
            type: 'rejection',
            reason,
            error: error.message
        });
        return { success: false, error: error.message, mock: true };
    }
};

/**
 * ส่ง Email แจ้งการได้รับมอบหมายงาน
 * @param {string} email - Email ของ assignee
 * @param {string} firstName - ชื่อ assignee
 * @param {object} jobData - ข้อมูลงาน
 * @returns {Promise<object>} - ผลลัพธ์การส่ง
 */
export const sendJobAssignmentEmail = async (email, firstName, jobData) => {
    try {
        console.log(`📧 ส่ง Job Assignment Email ไปยัง ${email}`);

        const data = await callEmailAPI('/api/send-email', {
            to: email,
            template: 'job_assigned',
            data: {
                firstName,
                jobId: jobData.dj_id || jobData.id,
                jobSubject: jobData.subject,
                dueDate: jobData.due_date,
                jobUrl: `${window.location.origin}/job/${jobData.id}`
            }
        });

        console.log('✅ Job assignment email sent successfully:', data?.messageId);
        return { success: true, id: data?.messageId };

    } catch (error) {
        console.warn('⚠️ Email service not available for job assignment:', error.message);
        return { success: false, error: error.message, mock: true };
    }
};

/**
 * ส่ง Email แจ้งการเปลี่ยนสถานะงาน
 * @param {string} email - Email ของ requester
 * @param {string} firstName - ชื่อ requester
 * @param {object} jobData - ข้อมูลงาน
 * @param {string} newStatus - สถานะใหม่
 * @param {string} comment - ความคิดเห็น (optional)
 * @returns {Promise<object>} - ผลลัพธ์การส่ง
 */
export const sendJobStatusUpdateEmail = async (email, firstName, jobData, newStatus, comment = '') => {
    try {
        console.log(`📧 ส่ง Job Status Update Email ไปยัง ${email}`);

        const statusLabels = {
            'approved': 'อนุมัติแล้ว',
            'rejected': 'ปฏิเสธ',
            'returned': 'ตีกลับ',
            'in_progress': 'กำลังดำเนินการ',
            'completed': 'เสร็จสิ้น',
            'cancelled': 'ยกเลิก'
        };

        const data = await callEmailAPI('/api/send-email', {
            to: email,
            template: 'job_status_update',
            data: {
                firstName,
                jobId: jobData.dj_id || jobData.id,
                jobSubject: jobData.subject,
                newStatus: statusLabels[newStatus] || newStatus,
                comment,
                jobUrl: `${window.location.origin}/job/${jobData.id}`
            }
        });

        console.log('✅ Job status update email sent successfully:', data?.messageId);
        return { success: true, id: data?.messageId };

    } catch (error) {
        console.warn('⚠️ Email service not available for status update:', error.message);
        return { success: false, error: error.message, mock: true };
    }
};

// Export all functions
export const emailService = {
    sendApprovalEmail,
    sendRejectionEmail,
    sendJobAssignmentEmail,
    sendJobStatusUpdateEmail
};

export default emailService;
