/**
 * @file adminActions.test.js
 * @description Integration tests สำหรับ Admin Hard Delete + Edit Priority
 *
 * รันด้วย: node --test backend/api-server/src/services/adminActions.test.js
 * หรือ: cd backend/api-server && npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VALID_PRIORITIES,
  canonicalizePriority,
  normalizePriority,
  isValidPriority,
  parseWritablePriority,
  getNotificationRecipients,
  JOB_NOTIFICATION_EVENTS,
} from '../constants/jobConstants.js';

// ==========================================
// Test: Priority Validation
// ==========================================

describe('Priority Constants', () => {
  it('VALID_PRIORITIES มีแค่ normal และ urgent', () => {
    assert.deepEqual(VALID_PRIORITIES, ['normal', 'urgent']);
  });

  it('normalizePriority: แปลงค่าเก่าเป็น normal', () => {
    assert.equal(normalizePriority('high'), 'normal');
    assert.equal(normalizePriority('low'), 'normal');
    assert.equal(normalizePriority('medium'), 'normal');
    assert.equal(normalizePriority(null), 'normal');
    assert.equal(normalizePriority(undefined), 'normal');
    assert.equal(normalizePriority(''), 'normal');
  });

  it('normalizePriority: ค่าที่ถูกต้องผ่านตรง', () => {
    assert.equal(normalizePriority('normal'), 'normal');
    assert.equal(normalizePriority('urgent'), 'urgent');
    assert.equal(normalizePriority('NORMAL'), 'normal');
    assert.equal(normalizePriority('URGENT'), 'urgent');
  });

  it('canonicalizePriority: trim + lower-case โดยไม่ map legacy', () => {
    assert.equal(canonicalizePriority(' URGENT '), 'urgent');
    assert.equal(canonicalizePriority(' Normal '), 'normal');
    assert.equal(canonicalizePriority(null), '');
  });

  it('isValidPriority: ตรวจค่าที่รับได้', () => {
    assert.equal(isValidPriority('normal'), true);
    assert.equal(isValidPriority('urgent'), true);
    assert.equal(isValidPriority('high'), false);
    assert.equal(isValidPriority('low'), false);
    assert.equal(isValidPriority(null), false);
  });

  it('parseWritablePriority: reject legacy/invalid values สำหรับ write endpoint', () => {
    assert.equal(parseWritablePriority('urgent'), 'urgent');
    assert.equal(parseWritablePriority(' NORMAL '), 'normal');
    assert.equal(parseWritablePriority('high'), null);
    assert.equal(parseWritablePriority('medium'), null);
    assert.equal(parseWritablePriority(''), null);
  });
});

// ==========================================
// Test: Notification Recipients
// ==========================================

describe('Notification Recipients', () => {
  it('getNotificationRecipients: ส่งให้ requester + assignee สำหรับ priority_changed', () => {
    const job = { requesterId: 1, assigneeId: 2 };
    const recipients = getNotificationRecipients(JOB_NOTIFICATION_EVENTS.PRIORITY_CHANGED, job);
    assert.deepEqual(recipients.sort(), [1, 2]);
  });

  it('getNotificationRecipients: ส่งให้ requester เท่านั้นสำหรับ approval_request', () => {
    const job = { requesterId: 1, assigneeId: 2 };
    const recipients = getNotificationRecipients(JOB_NOTIFICATION_EVENTS.APPROVAL_REQUEST, job);
    assert.deepEqual(recipients, [1]);
  });

  it('getNotificationRecipients: deduplicate เมื่อ requester = assignee', () => {
    const job = { requesterId: 1, assigneeId: 1 };
    const recipients = getNotificationRecipients(JOB_NOTIFICATION_EVENTS.HARD_DELETED, job);
    assert.deepEqual(recipients, [1]);
  });

  it('getNotificationRecipients: ไม่มี assignee ให้ส่งเฉพาะ requester', () => {
    const job = { requesterId: 5, assigneeId: null };
    const recipients = getNotificationRecipients(JOB_NOTIFICATION_EVENTS.CHAIN_DELETED, job);
    assert.deepEqual(recipients, [5]);
  });
});