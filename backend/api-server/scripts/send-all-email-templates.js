import EmailService from '../src/services/emailService.js';
import {
  createEmailTemplate,
  createJobApprovalEmail,
  createJobAssignmentEmail,
  createJobRejectionEmail,
  createJobCompletionEmail,
  createDraftSubmissionEmail,
  createJobExtensionEmail,
  createPasswordResetEmail,
  createForgotPasswordEmail,
} from '../src/utils/emailTemplates.js';

const targetEmail = process.argv[2] || process.env.TEMPLATE_TEST_EMAIL || 'test@example.com';
const now = new Date();
const nowLabel = now.toISOString();

const sample = {
  djId: 'DJ-260325-0001-01',
  subject: 'ทดสอบระบบอีเมลเทมเพลตทั้งหมด',
  priority: 'urgent',
  magicLink: 'https://dj.sena.co.th/magic-link/demo-token',
  dueDate: '30 มีนาคม 2026',
  note: 'ทดสอบหมายเหตุเพื่อดูการแสดงผลสีและความอ่านง่าย',
  draftLink: 'https://drive.google.com/example-draft-link',
  extensionDays: 2,
  newDueDate: '1 เมษายน 2026',
  reason: 'ทดสอบข้อความเหตุผลสำหรับ template',
  resetUrl: 'https://dj.sena.co.th/reset-password/demo-token',
  newPassword: 'Abc12345',
};

function makeGenericTemplate() {
  return createEmailTemplate({
    title: 'ทดสอบ Generic Template',
    heading: 'ทดสอบข้อความแจ้งเตือนทั่วไป',
    content: `
      <h2>ทดสอบสีและความคมชัด</h2>
      <div class="info-box">
        <p><strong>เวลา:</strong> ${nowLabel}</p>
        <p><strong>ผู้รับ:</strong> ${targetEmail}</p>
      </div>
      <p>หากอ่านข้อความนี้ได้ครบ แสดงว่า template พื้นฐานแสดงผลปกติ</p>
    `,
    buttonText: 'เปิดระบบ DJ',
    buttonUrl: 'https://dj.sena.co.th/login',
  });
}

function buildTemplatePayloads() {
  return [
    {
      subject: `TEMPLATE TEST [1/11] Generic - ${nowLabel}`,
      html: makeGenericTemplate(),
    },
    {
      subject: `TEMPLATE TEST [2/11] Job Approval - ${nowLabel}`,
      html: createJobApprovalEmail({
        djId: sample.djId,
        subject: sample.subject,
        priority: sample.priority,
        magicLink: sample.magicLink,
        approverName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [3/11] Job Assignment - ${nowLabel}`,
      html: createJobAssignmentEmail({
        djId: sample.djId,
        subject: sample.subject,
        priority: sample.priority,
        dueDate: sample.dueDate,
        magicLink: sample.magicLink,
        assigneeName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [4/11] Job Rejection - ${nowLabel}`,
      html: createJobRejectionEmail({
        djId: sample.djId,
        subject: sample.subject,
        reason: sample.reason,
        magicLink: sample.magicLink,
        requesterName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [5/11] Job Completion - ${nowLabel}`,
      html: createJobCompletionEmail({
        djId: sample.djId,
        subject: sample.subject,
        note: sample.note,
        magicLink: sample.magicLink,
        requesterName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [6/11] Draft Submission - ${nowLabel}`,
      html: createDraftSubmissionEmail({
        djId: sample.djId,
        subject: sample.subject,
        assigneeName: 'ชเนศวร์',
        note: sample.note,
        link: sample.draftLink,
        magicLink: sample.magicLink,
        requesterName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [7/11] Job Extension - ${nowLabel}`,
      html: createJobExtensionEmail({
        djId: sample.djId,
        subject: sample.subject,
        assigneeName: 'ชเนศวร์',
        extensionDays: sample.extensionDays,
        newDueDate: sample.newDueDate,
        reason: sample.reason,
        magicLink: sample.magicLink,
        requesterName: 'ชเนศวร์',
      }),
    },
    {
      subject: `TEMPLATE TEST [8/8] Password Reset - ${nowLabel}`,
      html: createPasswordResetEmail({
        userName: 'ชเนศวร์',
        newPassword: sample.newPassword,
        loginUrl: 'https://dj.sena.co.th/login',
      }),
    },
    {
      subject: `TEMPLATE TEST [bonus] Forgot Password - ${nowLabel}`,
      html: createForgotPasswordEmail({
        userName: 'ชเนศวร์',
        resetUrl: sample.resetUrl,
      }),
    },
  ];
}

async function run() {
  const emailService = new EmailService();

  console.log(`[Email Template Test] Target: ${targetEmail}`);
  const isSmtpReady = await emailService.verifyConnection();
  if (!isSmtpReady) {
    console.error('[Email Template Test] SMTP verify failed. Abort sending.');
    process.exit(1);
  }

  const payloads = buildTemplatePayloads();
  const summary = {
    success: 0,
    failed: 0,
    failedSubjects: [],
  };

  for (const payload of payloads) {
    // Send sequentially to make debugging easier when one template fails.
    const result = await emailService.sendEmail(targetEmail, payload.subject, payload.html);
    if (result.success) {
      summary.success += 1;
      console.log(`[OK] ${payload.subject}`);
    } else {
      summary.failed += 1;
      summary.failedSubjects.push(payload.subject);
      console.error(`[FAILED] ${payload.subject} -> ${result.error || result.message}`);
    }
  }

  console.log('\n===== SUMMARY =====');
  console.log(`Sent success: ${summary.success}`);
  console.log(`Sent failed : ${summary.failed}`);
  if (summary.failedSubjects.length > 0) {
    console.log('Failed subjects:');
    for (const item of summary.failedSubjects) {
      console.log(`- ${item}`);
    }
    process.exit(2);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('[Email Template Test] Unhandled error:', error);
  process.exit(1);
});
