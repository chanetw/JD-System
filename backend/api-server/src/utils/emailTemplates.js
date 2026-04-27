/**
 * @file emailTemplates.js
 * @description Email HTML Templates with Rose Theme
 */

/**
 * สร้าง Email HTML Template ด้วย Rose Theme
 * 
 * @param {Object} params
 * @param {string} params.title - หัวข้อ email
 * @param {string} params.heading - หัวข้อหลักใน email
 * @param {string} params.content - เนื้อหา HTML
 * @param {string} params.buttonText - ข้อความบนปุ่ม (optional)
 * @param {string} params.buttonUrl - URL ของปุ่ม (optional)
 * @param {string} params.footerText - ข้อความท้าย email (optional)
 * @returns {string} - HTML email template
 */
export function createEmailTemplate({ 
  title, 
  heading, 
  content, 
  buttonText = null, 
  buttonUrl = null,
  footerText = 'DJ System - ระบบจัดการงาน'
}) {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #fef2f2;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background-color: #f43f5e;
      background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 30px 25px;
      color: #374151;
      line-height: 1.6;
    }
    .email-body h2 {
      color: #be123c;
      margin-top: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body p {
      margin: 12px 0;
      font-size: 15px;
    }
    .email-body strong {
      color: #1f2937;
      font-weight: 600;
    }
    .info-box {
      background-color: #fff1f2;
      border-left: 4px solid #fb7185;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #e11d48;
      background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(251, 113, 133, 0.3);
      transition: all 0.3s ease;
    }
    .button:hover {
      box-shadow: 0 6px 8px rgba(251, 113, 133, 0.4);
      transform: translateY(-1px);
    }
    .email-footer {
      background-color: #fef2f2;
      padding: 20px;
      text-align: center;
      color: #4b5563;
      font-size: 13px;
      border-top: 1px solid #fecdd3;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #fecdd3, transparent);
      margin: 20px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 8px;
      }
      .email-body {
        padding: 20px 15px;
      }
      .button {
        padding: 12px 24px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#fef2f2;-webkit-font-smoothing:antialiased;">
  <div class="email-container" style="max-width:600px;margin:20px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div class="email-header" style="background-color:#f43f5e;">
      <h1 style="color:#ffffff;">${heading}</h1>
    </div>
    <div class="email-body" style="padding:30px 25px;color:#374151;line-height:1.6;">
      ${content}
      ${buttonText && buttonUrl ? `
      <div class="button-container">
        <a href="${buttonUrl}" class="button" style="background-color:#e11d48;color:#ffffff;text-decoration:none;">${buttonText}</a>
      </div>
      ` : ''}
    </div>
    <div class="email-footer">
      <p>${footerText}</p>
      <p style="margin-top: 8px; font-size: 12px;">
        📧 Email นี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * สร้าง Email สำหรับงานรออนุมัติ
 */
export function createJobApprovalEmail({ djId, subject, priority, magicLink, approverName }) {
  const content = `
    <h2>งานใหม่รอการอนุมัติ</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>ความสำคัญ:</strong> <span style="color: ${priority === 'urgent' ? '#dc2626' : priority === 'normal' ? '#f59e0b' : '#10b981'};">${priority === 'urgent' ? '🔴 เร่งด่วน' : priority === 'normal' ? '🟡 ปกติ' : '🟢 ต่ำ'}</span></p>
    </div>
    <p>เรียน คุณ${approverName ? approverName : ''},</p>
    <p>มีงานใหม่รอการอนุมัติจากคุณ กรุณาตรวจสอบและดำเนินการภายในระยะเวลาที่กำหนด</p>
  `;

  return createEmailTemplate({
    title: `📋 งานใหม่รออนุมัติ: ${djId}`,
    heading: `📋 งานใหม่รออนุมัติ`,
    content,
    buttonText: '🔐 อนุมัติงานทันที (ไม่ต้อง Login)',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับมอบหมายงาน
 */
export function createJobAssignmentEmail({ djId, subject, priority, dueDate, magicLink, assigneeName }) {
  const content = `
    <h2>คุณได้รับมอบหมายงานใหม่</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>ความสำคัญ:</strong> <span style="color: ${priority === 'urgent' ? '#dc2626' : priority === 'normal' ? '#f59e0b' : '#10b981'};">${priority === 'urgent' ? '🔴 เร่งด่วน' : priority === 'normal' ? '🟡 ปกติ' : '🟢 ต่ำ'}</span></p>
      ${dueDate ? `<p><strong>กำหนดส่ง:</strong> ${dueDate}</p>` : ''}
    </div>
    <p>เรียน คุณ${assigneeName ? assigneeName : ''},</p>
    <p>คุณได้รับมอบหมายงานใหม่ กรุณาเข้าระบบเพื่อดูรายละเอียดและเริ่มดำเนินการ</p>
  `;

  return createEmailTemplate({
    title: `👤 คุณได้รับมอบหมายงาน: ${djId}`,
    heading: `👤 งานใหม่สำหรับคุณ`,
    content,
    buttonText: '🔐 เริ่มทำงานทันที (ไม่ต้อง Login)',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับงานถูกปฏิเสธ
 */
export function createJobRejectionEmail({ djId, subject, reason, magicLink, requesterName }) {
  const content = `
    <h2>งานถูกปฏิเสธ</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>เหตุผล:</strong> ${reason}</p>
    </div>
    <p>เรียน คุณ${requesterName ? requesterName : ''},</p>
    <p>งานของคุณถูกปฏิเสธโดยผู้อนุมัติ กรุณาตรวจสอบเหตุผลและดำเนินการแก้ไข</p>
  `;

  return createEmailTemplate({
    title: `❌ งานถูกปฏิเสธ: ${djId}`,
    heading: `❌ งานถูกปฏิเสธ`,
    content,
    buttonText: '🔐 ดูรายละเอียด (ไม่ต้อง Login)',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับงานส่งมอบแล้ว
 */
export function createJobCompletionEmail({ djId, subject, note, magicLink, requesterName }) {
  const content = `
    <h2>งานส่งมอบเรียบร้อย</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      ${note ? `<p><strong>หมายเหตุ:</strong> ${note}</p>` : ''}
    </div>
    <p>เรียน คุณ${requesterName ? requesterName : ''},</p>
    <p>ผู้รับงานได้ส่งมอบงานเรียบร้อยแล้ว กรุณาตรวจสอบผลงาน</p>
  `;

  return createEmailTemplate({
    title: `✅ งานส่งมอบแล้ว: ${djId}`,
    heading: `✅ งานส่งมอบเรียบร้อย`,
    content,
    buttonText: '🔐 ตรวจสอบงาน (ไม่ต้อง Login)',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับ Draft ส่งมาแล้ว
 */
export function createDraftSubmissionEmail({ djId, subject, assigneeName, note, link, magicLink, requesterName }) {
  const content = `
    <h2>Draft งานส่งมาแล้ว</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>ผู้ส่ง:</strong> ${assigneeName}</p>
      ${note ? `<p><strong>หมายเหตุ:</strong> ${note}</p>` : ''}
      ${link ? `<p><strong>ลิงก์ Draft:</strong> <a href="${link}" style="color: #be123c;">${link}</a></p>` : ''}
    </div>
    <p>เรียน คุณ${requesterName ? requesterName : ''},</p>
    <p>ผู้รับงานได้ส่ง Draft มาให้ตรวจสอบ กรุณาให้ feedback ในระบบ</p>
  `;

  return createEmailTemplate({
    title: `📝 Draft งาน ${djId} ส่งมาแล้ว`,
    heading: `📝 Draft งานส่งมาแล้ว`,
    content,
    buttonText: '🔐 ตรวจสอบ Draft',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับขยายเวลางาน
 */
export function createJobExtensionEmail({ djId, subject, assigneeName, extensionDays, newDueDate, reason, magicLink, requesterName }) {
  const content = `
    <h2>ขอขยายเวลางาน</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${djId}</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>ผู้ขอ:</strong> ${assigneeName}</p>
      <p><strong>ขยายเวลา:</strong> ${extensionDays} วัน</p>
      <p><strong>กำหนดส่งใหม่:</strong> ${newDueDate}</p>
      <p><strong>เหตุผล:</strong> ${reason}</p>
    </div>
    <p>เรียน คุณ${requesterName ? requesterName : ''},</p>
    <p>ผู้รับงานขอขยายเวลาดำเนินการงาน กรุณาตรวจสอบและอนุมัติ</p>
  `;

  return createEmailTemplate({
    title: `⏰ งาน ${djId} ขอขยายเวลา`,
    heading: `⏰ ขอขยายเวลางาน`,
    content,
    buttonText: '🔐 ดูรายละเอียด (ไม่ต้อง Login)',
    buttonUrl: magicLink
  });
}

/**
 * สร้าง Email สำหรับรีเซตพาสโดย Admin
 */
export function createPasswordResetEmail({ userName, newPassword, loginUrl }) {
  const content = `
    <h2>🔐 รหัสผ่านของคุณถูกรีเซ็ต</h2>
    <p>เรียน คุณ${userName ? userName : ''},</p>
    <p>Admin ได้ทำการรีเซ็ตรหัสผ่านของคุณเรียบร้อยแล้ว</p>
    
    <div class="info-box">
      <p><strong>รหัสผ่านใหม่ของคุณ:</strong></p>
      <div style="font-family: monospace; font-size: 24px; font-weight: bold; color: #be123c; letter-spacing: 2px; text-align: center; margin: 15px 0;">
        ${newPassword}
      </div>
    </div>
    
    <div style="background: #fef2f2; border-left: 4px solid #fb7185; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong>⚠️ เพื่อความปลอดภัย:</strong> กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านทันที
    </div>
  `;

  return createEmailTemplate({
    title: '🔐 รหัสผ่านของคุณถูกรีเซ็ต - DJ System',
    heading: '🔐 รหัสผ่านถูกรีเซ็ต',
    content,
    buttonText: loginUrl ? '🔐 เข้าสู่ระบบ' : null,
    buttonUrl: loginUrl
  });
}

/**
 * สร้าง Email สำหรับขอลืมรหัสผ่าน (Forgot Password)
 */
export function createForgotPasswordEmail({ userName, resetUrl }) {
  const content = `
    <h2>🔑 เปลี่ยนรหัสผ่าน</h2>
    <p>เรียน คุณ${userName ? userName : ''},</p>
    <p>เราได้รับการแจ้งขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณใน DJ System</p>
    
    <div style="background: #fef2f2; border-left: 4px solid #fb7185; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong>หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน กรุณาละเว้นอีเมลฉบับนี้
    </div>
    
    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์ของคุณ:<br>
      <a href="${resetUrl}" style="color: #be123c; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  return createEmailTemplate({
    title: '🔑 รีเซ็ตรหัสผ่านของคุณ - DJ System',
    heading: '🔑 เปลี่ยนรหัสผ่าน',
    content,
    buttonText: '🔐 ตั้งรหัสผ่านใหม่',
    buttonUrl: resetUrl
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนสร้างผู้ใช้ใหม่
 */
export function createUserCreatedEmail({ userName, tempPassword }) {
  const content = `
    <h2>ยินดีต้อนรับสู่ระบบ DJ System</h2>
    <p>เรียน ${userName || ''},</p>
    <p>บัญชีของคุณได้ถูกสร้างขึ้นในระบบ DJ System เรียบร้อยแล้ว</p>
    ${tempPassword ? `<p><strong>รหัสผ่านชั่วคราวของคุณ:</strong> ${tempPassword}</p>` : ''}
    <p>กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
  `;

  return createEmailTemplate({
    title: '👋 ยินดีต้อนรับสู่ DJ System',
    heading: '👋 ยินดีต้อนรับ',
    content,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนสถานะงานเปลี่ยน
 */
export function createJobStatusChangedEmail({ jobId, newStatus, jobSubject, updatedBy }) {
  const content = `
    <h2>อัปเดตสถานะงาน</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${jobId}</p>
      <p><strong>หัวข้อ:</strong> ${jobSubject}</p>
      <p><strong>สถานะใหม่:</strong> ${newStatus}</p>
      <p><strong>โดย:</strong> ${updatedBy}</p>
    </div>
  `;

  return createEmailTemplate({
    title: `UPDATED: งาน ${jobId} เปลี่ยนสถานะเป็น ${newStatus}`,
    heading: '🔄 อัปเดตสถานะงาน',
    content,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนงานใกล้ deadline
 */
export function createJobDeadlineEmail({ assigneeName, jobId, jobSubject, deadline }) {
  const dueText = deadline ? new Date(deadline).toLocaleDateString('th-TH') : '-';
  const content = `
    <h2>แจ้งเตือน Deadline</h2>
    <div class="info-box">
      <p><strong>รหัสงาน:</strong> ${jobId}</p>
      <p><strong>หัวข้อ:</strong> ${jobSubject}</p>
      <p><strong>กำหนดส่ง:</strong> ${dueText}</p>
    </div>
    <p>เรียน ${assigneeName || ''},</p>
    <p>งานนี้ใกล้ถึงกำหนดส่ง กรุณาดำเนินการให้เสร็จสิ้นตามกำหนด</p>
  `;

  return createEmailTemplate({
    title: `⏰ งาน ${jobId} ใกล้ถึง deadline`,
    heading: '⏰ แจ้งเตือน Deadline',
    content,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนงานรอดำเนินการเกิน 24 ชั่วโมง
 */
export function createStaleJobReminderEmail({ assigneeName, jobId, jobSubject, statusText, jobUrl }) {
  const content = `
    <h2>เตือนการดำเนินการ</h2>
    <div class="info-box">
      <p><strong>งาน:</strong> ${jobId} - ${jobSubject}</p>
      <p><strong>สถานะ:</strong> ${statusText} (เกิน 24 ชั่วโมง)</p>
      <p><strong>ผู้รับงาน:</strong> ${assigneeName || '-'}</p>
    </div>
    <p>กรุณาเข้าระบบและดำเนินการโดยเร็ว</p>
  `;

  return createEmailTemplate({
    title: `⏰ เตือน: งาน ${jobId} รอดำเนินการเกิน 1 วัน`,
    heading: '⏰ เตือนการดำเนินการ',
    content,
    buttonText: '🔐 ดูรายละเอียดงาน',
    buttonUrl: jobUrl,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือน SLA ครบกำหนดพรุ่งนี้
 */
export function createSlaDeadlineReminderEmail({ recipientName, jobId, jobSubject, dueDateText, role = 'assignee', jobUrl }) {
  const introText = role === 'requester'
    ? `งาน <strong>${jobId} - ${jobSubject}</strong> ที่คุณร้องขอจะครบกำหนดในวันที่ <strong>${dueDateText}</strong>`
    : `งาน <strong>${jobId} - ${jobSubject}</strong> จะครบกำหนดในวันที่ <strong>${dueDateText}</strong>`;

  const guidanceText = role === 'requester'
    ? 'ติดตามสถานะงานได้ที่ลิงก์ด้านล่าง'
    : 'กรุณาดำเนินการให้เสร็จสิ้นตามกำหนด';

  const content = `
    <h2>แจ้งเตือน SLA Deadline</h2>
    <p>เรียน ${recipientName || ''},</p>
    <p>${introText}</p>
    <p>${guidanceText}</p>
    <div class="info-box">
      <p><strong>งาน:</strong> ${jobId} - ${jobSubject}</p>
      <p><strong>วันครบกำหนด:</strong> ${dueDateText}</p>
    </div>
    <p>ขอบคุณครับ,<br>DJ System</p>
  `;

  return createEmailTemplate({
    title: `⏰ งาน ${jobId} ครบกำหนดพรุ่งนี้`,
    heading: '⏰ แจ้งเตือน SLA Deadline',
    content,
    buttonText: '🔐 ดูรายละเอียดงาน',
    buttonUrl: jobUrl,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนการลงทะเบียนถูกปฏิเสธ
 */
export function createRegistrationRejectedEmail({ userName, reason }) {
  const content = `
    <h2>การลงทะเบียนไม่ได้รับการอนุมัติ</h2>
    <p>เรียน ${userName || ''},</p>
    <p>เราขอแจ้งให้ทราบว่าคำขอลงทะเบียนของคุณไม่ได้รับการอนุมัติ</p>
    ${reason ? `<div class="info-box"><p><strong>เหตุผล:</strong> ${reason}</p></div>` : ''}
    <p>หากคุณคิดว่ามีข้อผิดพลาด กรุณาติดต่อ Admin เพื่อสอบถามเพิ่มเติม</p>
  `;

  return createEmailTemplate({
    title: '❌ การลงทะเบียนไม่ได้รับการอนุมัติ - DJ System',
    heading: '❌ การลงทะเบียนไม่ได้รับการอนุมัติ',
    content,
  });
}

/**
 * สร้าง Email สำหรับแจ้งเตือนการลงทะเบียนได้รับการอนุมัติ
 */
export function createRegistrationApprovedEmail({ userEmail, userName, temporaryPassword, loginUrl }) {
  const content = `
    <h2>🎉 ยินดีต้อนรับสู่ DJ System</h2>
    <p>เรียน <strong>${userName || ''}</strong>,</p>
    <p>การลงทะเบียนของคุณได้รับการอนุมัติเรียบร้อยแล้ว! ตอนนี้คุณสามารถเข้าสู่ระบบได้</p>

    <div class="info-box">
      <p><strong>อีเมล:</strong> ${userEmail}</p>
      <p><strong>รหัสผ่านชั่วคราว:</strong></p>
      <p style="font-family: monospace; font-size: 22px; font-weight: 700; color: #9a3412; letter-spacing: 1px; text-align: center; margin: 12px 0;">${temporaryPassword}</p>
    </div>

    <div class="info-box" style="border-left-color:#ef4444; background-color:#fef2f2;">
      <p><strong>⚠️ สำคัญ:</strong> เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้คุณเปลี่ยนรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่ที่จำได้และปลอดภัย</p>
    </div>

    <p><strong>ขั้นตอนการเข้าใช้งาน:</strong></p>
    <ol>
      <li>เข้าสู่ระบบด้วยอีเมลของคุณ</li>
      <li>ใช้รหัสผ่านชั่วคราวด้านบน</li>
      <li>ตั้งรหัสผ่านใหม่ของคุณ (อย่างน้อย 8 ตัวอักษร)</li>
      <li>เริ่มใช้งานระบบได้ทันที</li>
    </ol>
  `;

  return createEmailTemplate({
    title: '✅ การลงทะเบียนได้รับการอนุมัติแล้ว - DJ System',
    heading: '✅ ลงทะเบียนสำเร็จ',
    content,
    buttonText: loginUrl ? '🔐 เข้าสู่ระบบ' : null,
    buttonUrl: loginUrl || null,
  });
}

export default {
  createEmailTemplate,
  createJobApprovalEmail,
  createJobAssignmentEmail,
  createJobRejectionEmail,
  createJobCompletionEmail,
  createDraftSubmissionEmail,
  createJobExtensionEmail,
  createPasswordResetEmail,
  createForgotPasswordEmail,
  createUserCreatedEmail,
  createJobStatusChangedEmail,
  createJobDeadlineEmail,
  createStaleJobReminderEmail,
  createSlaDeadlineReminderEmail,
  createRegistrationRejectedEmail,
  createRegistrationApprovedEmail
};
