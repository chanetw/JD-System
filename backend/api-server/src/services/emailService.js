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

  /**
   * แจ้งเตือนเมื่อการลงทะเบียนได้รับการอนุมัติ
   * ส่ง email พร้อมรหัสผ่านชั่วคราวให้ผู้ใช้
   *
   * @param {Object} data - ข้อมูลการอนุมัติ
   * @param {string} data.userEmail - Email ของผู้ใช้
   * @param {string} data.userName - ชื่อผู้ใช้
   * @param {string} data.temporaryPassword - รหัสผ่านชั่วคราว
   * @param {string} data.loginUrl - URL สำหรับเข้าสู่ระบบ
   */
  async notifyRegistrationApproved({ userEmail, userName, temporaryPassword, loginUrl }) {
    const subject = '✅ การลงทะเบียนได้รับการอนุมัติแล้ว - DJ System';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
          .password-box { background: #FEF3C7; border: 2px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .password { font-family: monospace; font-size: 24px; font-weight: bold; color: #B45309; letter-spacing: 2px; }
          .warning { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">🎉 ยินดีต้อนรับสู่ DJ System</h1>
          </div>
          <div class="content">
            <p>เรียน <strong>${userName}</strong>,</p>
            <p>การลงทะเบียนของคุณได้รับการอนุมัติเรียบร้อยแล้ว! ตอนนี้คุณสามารถเข้าสู่ระบบได้</p>

            <div class="password-box">
              <p style="margin: 0 0 10px 0; color: #92400E;">🔐 รหัสผ่านชั่วคราวของคุณ</p>
              <div class="password">${temporaryPassword}</div>
            </div>

            <div class="warning">
              <strong>⚠️ สำคัญ:</strong> เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้คุณเปลี่ยนรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่ที่จำได้และปลอดภัย
            </div>

            <h3>ขั้นตอนการเข้าใช้งาน:</h3>
            <ol>
              <li>เข้าสู่ระบบด้วยอีเมล: <strong>${userEmail}</strong></li>
              <li>ใช้รหัสผ่านชั่วคราวด้านบน</li>
              <li>ตั้งรหัสผ่านใหม่ของคุณ (อย่างน้อย 8 ตัวอักษร)</li>
              <li>เริ่มใช้งานระบบได้เลย!</li>
            </ol>

            ${loginUrl ? `<center><a href="${loginUrl}" class="button">เข้าสู่ระบบ</a></center>` : ''}
          </div>
          <div class="footer">
            <p>หากมีข้อสงสัย กรุณาติดต่อ Admin ของคุณ</p>
            <p>DJ System - Design Job Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
ยินดีต้อนรับสู่ DJ System

เรียน ${userName},

การลงทะเบียนของคุณได้รับการอนุมัติเรียบร้อยแล้ว!

รหัสผ่านชั่วคราวของคุณ: ${temporaryPassword}

⚠️ สำคัญ: เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้คุณเปลี่ยนรหัสผ่าน

ขั้นตอน:
1. เข้าสู่ระบบด้วยอีเมล: ${userEmail}
2. ใช้รหัสผ่านชั่วคราวด้านบน
3. ตั้งรหัสผ่านใหม่ของคุณ

ขอบคุณครับ,
DJ System
    `;

    return await this.sendCustomEmail(userEmail, subject, html, text);
  }

  /**
   * แจ้งเตือนเมื่อการลงทะเบียนถูกปฏิเสธ
   *
   * @param {Object} data - ข้อมูลการปฏิเสธ
   * @param {string} data.userEmail - Email ของผู้ใช้
   * @param {string} data.userName - ชื่อผู้ใช้
   * @param {string} data.reason - เหตุผลในการปฏิเสธ
   */
  async notifyRegistrationRejected({ userEmail, userName, reason }) {
    const subject = '❌ การลงทะเบียนไม่ได้รับการอนุมัติ - DJ System';
    const html = `
      <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #DC2626;">การลงทะเบียนไม่ได้รับการอนุมัติ</h2>
        <p>เรียน ${userName},</p>
        <p>เราขอแจ้งให้ทราบว่าคำขอลงทะเบียนของคุณไม่ได้รับการอนุมัติ</p>
        ${reason ? `<p><strong>เหตุผล:</strong> ${reason}</p>` : ''}
        <p>หากคุณคิดว่ามีข้อผิดพลาด กรุณาติดต่อ Admin เพื่อสอบถามเพิ่มเติม</p>
        <br>
        <p>ขอบคุณครับ,<br>DJ System</p>
      </div>
    `;

    return await this.sendCustomEmail(userEmail, subject, html);
  }
}

export default EmailService;
