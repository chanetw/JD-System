import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_ACTION_MODES,
  normalizeNotificationLink,
  resolveNotificationAction
} from './notificationActionPolicy.js';

test('user session update is message-only even with legacy /profile link', () => {
  const result = resolveNotificationAction({
    type: 'user_session_update',
    title: 'บัญชีของคุณถูกอัปเดต',
    message: 'ผู้ดูแลระบบได้อัปเดตข้อมูลบัญชีของคุณแล้ว',
    link: '/profile'
  });

  assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.MESSAGE_ONLY);
  assert.equal(result.targetUrl, null);
  assert.match(result.displayMessage, /อัปเดตข้อมูลบัญชี/);
});

test('job link resolves to job view target', () => {
  const result = resolveNotificationAction({
    type: 'job_assigned',
    title: 'คุณได้รับมอบหมายงาน',
    link: '/jobs/42'
  });

  assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.JOB_VIEW);
  assert.equal(result.targetUrl, '/jobs/42');
  assert.equal(result.targetJobId, 42);
});

test('localhost absolute links are normalized to relative path', () => {
  assert.equal(normalizeNotificationLink('http://localhost/profile'), '/profile');
  assert.equal(normalizeNotificationLink('http://localhost:5173/jobs/15?x=1'), '/jobs/15?x=1');
});

test('admin contact notifications keep admin route target', () => {
  const result = resolveNotificationAction({
    type: 'contact_admin',
    title: 'ข้อความจากผู้ใช้',
    link: '/admin/users?tab=requests&id=7'
  });

  assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.ADMIN_ROUTE);
  assert.equal(result.targetUrl, '/admin/users?tab=requests&id=7');
});

test('unknown or missing links become message-only', () => {
  const result = resolveNotificationAction({
    type: 'request_resolved',
    title: '[แก้ไขแล้ว] เปลี่ยนข้อมูล',
    message: 'Admin ดำเนินการแล้ว: แก้ไขข้อมูลเรียบร้อย',
    link: null
  });

  assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.MESSAGE_ONLY);
  assert.match(result.displayMessage, /Admin ดำเนินการแล้ว/);
});
