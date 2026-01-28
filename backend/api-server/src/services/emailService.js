/**
 * @file emailService.js
 * @description Email Service Integration
 * 
 * จัดการการส่ง email ผ่าน Email API
 * รองรับ templates ต่างๆ สำหรับระบบ DJ System
 */

import axios from 'axios';

export class EmailService {
  constructor() {
    this.emailApiUrl = process.env.EMAIL_API_URL || 'http://localhost:3001';
    this.apiKey = process.env.EMAIL_API_KEY;
  }

  /**
   * ส่ง email ผ่าน Email API
   * 
   * @param {string} to - Email ผู้รับ
   * @param {string} template - ชื่อ template
   * @param {Object} data - ข้อมูลสำหรับ template
   * @returns {Promise<Object>} - ผลลัพธ์การส่ง email
   */
  async sendEmail(to, template, data = {}) {
    try {
      const response = await axios.post(`${this.emailApiUrl}/api/send-email`, {
        to,
        template,
        data
      }, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messageId,
        template: response.data.template
      };
    } catch (error) {
      console.error('[EmailService] Send email failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'EMAIL_SEND_FAILED',
        message: 'ไม่สามารถส่ง email ได้'
      };
    }
  }

  /**
   * ส่ง email แบบ custom (ไม่ใช้ template)
   * 
   * @param {string} to - Email ผู้รับ
   * @param {string} subject - หัวข้อ email
   * @param {string} html - เนื้อหา HTML
   * @param {string} text - เนื้อหา Text (optional)
   * @returns {Promise<Object>} - ผลลัพธ์การส่ง email
   */
  async sendCustomEmail(to, subject, html, text) {
    try {
      const response = await axios.post(`${this.emailApiUrl}/api/send-custom`, {
        to,
        subject,
        html,
        text
      }, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messageId
      };
    } catch (error) {
      console.error('[EmailService] Send custom email failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'EMAIL_SEND_FAILED',
        message: 'ไม่สามารถส่ง email ได้'
      };
    }
  }

  // ==========================================
  // Business-specific email methods
  // ==========================================

  /**
   * แจ้งเตือนเมื่อมีการมอบหมายงาน
   * 
   * @param {Object} data - ข้อมูลงาน
   * @param {string} data.assigneeEmail - Email ของผู้รับมอบหมาย
   * @param {string} data.assigneeName - ชื่อผู้รับมอบหมาย
   * @param {string} data.jobId - ID ของงาน
   * @param {string} data.jobSubject - หัวข้องาน
   * @param {string} data.requesterName - ชื่อผู้ขอ
   */
  async notifyJobAssigned({ assigneeEmail, assigneeName, jobId, jobSubject, requesterName }) {
    return await this.sendEmail(assigneeEmail, 'job_assigned', {
      assigneeName,
      jobId,
      jobSubject,
      requesterName
    });
  }

  /**
   * แจ้งเตือนเมื่อสถานะงานเปลี่ยน
   * 
   * @param {Object} data - ข้อมูลงาน
   * @param {string[]} data.recipients - รายชื่อ email ผู้รับ
   * @param {string} data.jobId - ID ของงาน
   * @param {string} data.newStatus - สถานะใหม่
   * @param {string} data.jobSubject - หัวข้องาน
   * @param {string} data.updatedBy - ชื่อผู้อัปเดต
   */
  async notifyJobStatusChanged({ recipients, jobId, newStatus, jobSubject, updatedBy }) {
    const promises = recipients.map(email => 
      this.sendEmail(email, 'job_status_update', {
        recipientName: email.split('@')[0], // ใช้ส่วนแรกของ email ชั่วคราว
        jobId,
        newStatus,
        jobSubject,
        updatedBy
      })
    );

    const results = await Promise.allSettled(promises);
    return results;
  }

  /**
   * แจ้งเตือนเมื่องานใกล้ deadline
   * 
   * @param {Object} data - ข้อมูลงาน
   * @param {string} data.assigneeEmail - Email ของผู้รับมอบหมาย
   * @param {string} data.assigneeName - ชื่อผู้รับมอบหมาย
   * @param {string} data.jobId - ID ของงาน
   * @param {string} data.jobSubject - หัวข้องาน
   * @param {Date} data.deadline - วันที่ deadline
   */
  async notifyJobDeadline({ assigneeEmail, assigneeName, jobId, jobSubject, deadline }) {
    const subject = `⏰ งาน ${jobId} ใกล้ถึง deadline`;
    const html = `
      <h2>แจ้งเตือน Deadline</h2>
      <p>เรียน ${assigneeName},</p>
      <p>งาน <strong>${jobId} - ${jobSubject}</strong> จะถึง deadline ในวันที่ ${deadline.toLocaleDateString('th-TH')}</p>
      <p>กรุณาดำเนินการให้เสร็จสิ้นตามกำหนด</p>
      <br>
      <p>ขอบคุณครับ,<br>DJ System</p>
    `;

    return await this.sendCustomEmail(assigneeEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการสร้างผู้ใช้ใหม่
   * 
   * @param {Object} data - ข้อมูลผู้ใช้
   * @param {string} data.userEmail - Email ของผู้ใช้
   * @param {string} data.userName - ชื่อผู้ใช้
   * @param {string} data.tempPassword - รหัสผ่านชั่วคราว (ถ้ามี)
   */
  async notifyUserCreated({ userEmail, userName, tempPassword }) {
    const subject = '👋 ยินดีต้อนรับสู่ DJ System';
    const html = `
      <h2>ยินดีต้อนรับสู่ระบบ DJ System</h2>
      <p>เรียน ${userName},</p>
      <p>บัญชีของคุณได้ถูกสร้างขึ้นในระบบ DJ System เรียบร้อยแล้ว</p>
      ${tempPassword ? `<p>รหัสผ่านชั่วคราวของคุณ: <strong>${tempPassword}</strong></p>` : ''}
      <p>กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
      <br>
      <p>ขอบคุณครับ,<br>DJ System</p>
    `;

    return await this.sendCustomEmail(userEmail, subject, html);
  }
}

export default EmailService;
