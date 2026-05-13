import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDraftSubmissionEmail,
  createJobApprovalEmail,
  createJobAssignmentEmail,
  createJobRejectionEmail
} from './emailTemplates.js';

test('approval emails explain one-time magic link policy', () => {
  const html = createJobApprovalEmail({
    djId: 'DJ-APPROVE-001',
    subject: 'ตรวจแบบ',
    priority: 'normal',
    magicLink: 'https://dj.sena.co.th/auth/magic-link?token=approve',
    approverName: 'Approver'
  });

  assert.match(html, /ลิงก์นี้ใช้ได้ 1 ครั้ง ภายใน 7 วัน/);
  assert.match(html, /ป้องกันการดำเนินการซ้ำหรือการส่งต่อลิงก์/);
});

test('assignment emails explain reusable 30-day magic link policy', () => {
  const html = createJobAssignmentEmail({
    djId: 'DJ-ASSIGN-001',
    subject: 'ออกแบบ Banner',
    priority: 'urgent',
    dueDate: '20 พ.ค. 2569',
    magicLink: 'https://dj.sena.co.th/auth/magic-link?token=view',
    assigneeName: 'Assignee'
  });

  assert.match(html, /ลิงก์นี้เข้าได้หลายครั้ง ภายใน 30 วัน/);
  assert.match(html, /เปิดดูรายละเอียดงานโดยไม่ต้องเข้าสู่ระบบซ้ำ/);
});

test('draft and detail emails use reusable 30-day magic link policy', () => {
  const draftHtml = createDraftSubmissionEmail({
    djId: 'DJ-DRAFT-001',
    subject: 'Draft งาน',
    assigneeName: 'Assignee',
    note: 'ส่งตรวจ',
    link: '',
    magicLink: 'https://dj.sena.co.th/auth/magic-link?token=draft',
    requesterName: 'Requester'
  });

  const rejectionHtml = createJobRejectionEmail({
    djId: 'DJ-REJECT-001',
    subject: 'งานถูกปฏิเสธ',
    reason: 'ข้อมูลไม่ครบ',
    magicLink: 'https://dj.sena.co.th/auth/magic-link?token=view',
    requesterName: 'Requester'
  });

  assert.match(draftHtml, /ลิงก์นี้เข้าได้หลายครั้ง ภายใน 30 วัน/);
  assert.match(rejectionHtml, /ลิงก์นี้เข้าได้หลายครั้ง ภายใน 30 วัน/);
});
