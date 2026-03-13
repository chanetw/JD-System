/**
 * @file emailService.js
 * @description Email Service Integration (SMTP Version)
 * 
 * จัดการการส่ง email ผ่าน SMTP (Nodemailer)
 * รองรับ templates ต่างๆ สำหรับระบบ DJ System
 */

import nodemailer from 'nodemailer';
import { getDatabase } from '../config/database.js';
import { createPasswordResetEmail, createForgotPasswordEmail } from '../utils/emailTemplates.js';

export class EmailService {
  constructor() {
    this.smtpHost = process.env.SMTP_HOST;
    this.smtpPort = parseInt(process.env.SMTP_PORT || '587');
    this.smtpSecure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
    this.smtpUser = process.env.SMTP_USER;
    this.smtpPass = process.env.SMTP_PASS;
    this.smtpFrom = process.env.SMTP_FROM || '"DJ System" <no-reply@djsystem.com>';

    // Create reusable transporter object using the default SMTP transport
    this.transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpSecure,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certs (useful for some dev environments)
      }
    });

    // Log configuration (without password)
    console.log('[EmailService] SMTP Configured:', {
      host: this.smtpHost,
      port: this.smtpPort,
      user: this.smtpUser,
      from: this.smtpFrom
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('[EmailService] SMTP Connection Verified ✅');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP Connection Failed ❌:', error);
      return false;
    }
  }

  /**
   * ส่ง email ผ่าน SMTP
   * 
   * @param {string} to - Email ผู้รับ
   * @param {string} subject - หัวข้อ email
   * @param {string} html - เนื้อหา HTML
   * @param {string} text - เนื้อหา Text (optional)
   * @returns {Promise<Object>} - ผลลัพธ์การส่ง email
   */
  async sendEmail(to, subject, html, text) {
    // Check if SMTP is configured
    if (!this.smtpHost || !this.smtpUser) {
      console.warn('[EmailService] SMTP not configured, skipping email to:', to);
      return {
        success: false,
        error: 'SMTP_NOT_CONFIGURED',
        message: 'ไม่ได้ตั้งค่า SMTP'
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.smtpFrom,
        to: to,
        subject: subject,
        text: text || "โปรดเปิดอ่านในรูปแบบ HTML",
        html: html,
      });

      console.log('[EmailService] Email sent:', info.messageId);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('[EmailService] Send email failed:', error);
      return {
        success: false,
        error: error.message || 'EMAIL_SEND_FAILED',
        message: 'ไม่สามารถส่ง email ได้'
      };
    }
  }

  // Wrapper for backward compatibility with 'sendCustomEmail' calls
  async sendCustomEmail(to, subject, html, text) {
    return this.sendEmail(to, subject, html, text);
  }

  // ==========================================
  // Business-specific email methods
  // ==========================================

  /**
   * แจ้งเตือนเมื่อมีการมอบหมายงาน
   */
  async notifyJobAssigned({ assigneeEmail, assigneeName, jobId, jobSubject, requesterName }) {
    // TODO: Use Template Engine if complex
    const subject = `📋 งานใหม่: ${jobId} - ${jobSubject}`;
    const html = `
      <h2>คุณได้รับมอบหมายงานใหม่</h2>
      <p>เรียน ${assigneeName},</p>
      <p>คุณได้รับมอบหมายงาน <strong>${jobId} - ${jobSubject}</strong></p>
      <p>ผู้ขอ: ${requesterName}</p>
      <br>
      <p>กรุณาตรวจสอบในระบบ DJ System</p>
    `;
    return await this.sendEmail(assigneeEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อสถานะงานเปลี่ยน
   */
  async notifyJobStatusChanged({ recipients, jobId, newStatus, jobSubject, updatedBy }) {
    const promises = recipients.map(email =>
      this.sendEmail(
        email,
        `UPDATED: งาน ${jobId} เปลี่ยนสถานะเป็น ${newStatus}`,
        `
          <h2>อัปเดตสถานะงาน</h2>
          <p>งาน <strong>${jobId} - ${jobSubject}</strong></p>
          <p>สถานะใหม่: <strong>${newStatus}</strong></p>
          <p>โดย: ${updatedBy}</p>
        `
      )
    );

    const results = await Promise.allSettled(promises);
    return results;
  }

  /**
   * แจ้งเตือนเมื่องานใกล้ deadline
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

    return await this.sendEmail(assigneeEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการสร้างผู้ใช้ใหม่
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

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อการลงทะเบียนได้รับการอนุมัติ
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

    return await this.sendEmail(userEmail, subject, html, text);
  }

  /**
   * แจ้งเตือนเมื่อการลงทะเบียนถูกปฏิเสธ
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

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการ Reset Password โดย Admin (Rose Theme)
   */
  async notifyPasswordReset({ userEmail, userName, newPassword, loginUrl }) {
    const subject = '🔐 รหัสผ่านของคุณถูกรีเซ็ต - DJ System';
    const html = createPasswordResetEmail({
      userName,
      newPassword,
      loginUrl
    });

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการขอลืมรหัสผ่าน (Forgot Password) - Rose Theme
   */
  async notifyForgotPassword({ userEmail, userName, resetUrl }) {
    const subject = '🔑 รีเซ็ตรหัสผ่านของคุณ - DJ System';
    const html = createForgotPasswordEmail({
      userName,
      resetUrl
    });

    return await this.sendEmail(userEmail, subject, html);
  }
}

export default EmailService;
