/**
 * @file emailService.js
 * @description Email Service Integration (SMTP Version)
 * 
 * จัดการการส่ง email ผ่าน SMTP (Nodemailer)
 * รองรับ templates ต่างๆ สำหรับระบบ DJ System
 */

import nodemailer from 'nodemailer';
import { getDatabase } from '../config/database.js';
import {
  createEmailTemplate,
  createJobExtensionEmail,
  createPasswordResetEmail,
  createForgotPasswordEmail,
  createUserCreatedEmail,
  createJobStatusChangedEmail,
  createJobDeadlineEmail,
  createRegistrationRejectedEmail,
  createRegistrationApprovedEmail,
} from '../utils/emailTemplates.js';

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
    const subject = `📋 งานใหม่: ${jobId} - ${jobSubject}`;
    const templatedHtml = `
      <h2>คุณได้รับมอบหมายงานใหม่</h2>
      <div class="info-box">
        <p><strong>รหัสงาน:</strong> ${jobId}</p>
        <p><strong>หัวข้อ:</strong> ${jobSubject}</p>
        <p><strong>ผู้ขอ:</strong> ${requesterName}</p>
      </div>
      <p>เรียน ${assigneeName || ''},</p>
      <p>กรุณาตรวจสอบงานนี้ในระบบ DJ System</p>
    `;
    const wrapped = createEmailTemplate({
      title: subject,
      heading: '📋 คุณได้รับมอบหมายงานใหม่',
      content: templatedHtml,
    });
    return await this.sendEmail(assigneeEmail, subject, wrapped);
  }

  /**
   * แจ้งเตือนเมื่อสถานะงานเปลี่ยน
   */
  async notifyJobStatusChanged({ recipients, jobId, newStatus, jobSubject, updatedBy }) {
    const promises = recipients.map(email =>
      this.sendEmail(
        email,
        `UPDATED: งาน ${jobId} เปลี่ยนสถานะเป็น ${newStatus}`,
        createJobStatusChangedEmail({ jobId, newStatus, jobSubject, updatedBy })
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
    const html = createJobDeadlineEmail({ assigneeName, jobId, jobSubject, deadline });

    return await this.sendEmail(assigneeEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการเลื่อนกำหนดส่งงาน
   */
  async sendExtensionNotification({
    to,
    jobId,
    jobSubject,
    assigneeName,
    extensionDays,
    reason,
    newDueDate,
    jobLink,
    requesterName
  }) {
    const subject = `⏰ งาน ${jobId} ขอขยายเวลา`;
    const html = createJobExtensionEmail({
      djId: jobId,
      subject: jobSubject,
      assigneeName,
      extensionDays,
      newDueDate,
      reason,
      magicLink: jobLink,
      requesterName
    });

    return await this.sendEmail(to, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อมีการสร้างผู้ใช้ใหม่
   */
  async notifyUserCreated({ userEmail, userName, tempPassword }) {
    const subject = '👋 ยินดีต้อนรับสู่ DJ System';
    const html = createUserCreatedEmail({ userName, tempPassword });

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * แจ้งเตือนเมื่อการลงทะเบียนได้รับการอนุมัติ
   */
  async notifyRegistrationApproved({ userEmail, userName, temporaryPassword, loginUrl }) {
    const subject = '✅ การลงทะเบียนได้รับการอนุมัติแล้ว - DJ System';
    const html = createRegistrationApprovedEmail({ userEmail, userName, temporaryPassword, loginUrl });

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
    const html = createRegistrationRejectedEmail({ userName, reason });

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
