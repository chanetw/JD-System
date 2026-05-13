import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPROVAL_HISTORY_CATEGORIES,
  ASSIGNEE_REJECTABLE_ACTION_STATUSES,
  ASSIGNEE_REJECTED_STATUSES,
  getApprovalHistoryPresentation,
  hasAdminOverridePrefix,
  isApprovalActionableStatus,
  isApprovalWaitingStatus
} from './jobQueueConfig.js';

test('approval waiting/actionable status helpers classify queue statuses correctly', () => {
  assert.equal(isApprovalWaitingStatus('pending_approval'), true);
  assert.equal(isApprovalWaitingStatus('pending_level_2'), true);
  assert.equal(isApprovalWaitingStatus('pending_dependency'), true);
  assert.equal(isApprovalActionableStatus('pending_approval'), true);
  assert.equal(isApprovalActionableStatus('pending_level_2'), true);
  assert.equal(isApprovalActionableStatus('pending_dependency'), false);
});

test('assignee queue groups include legacy pending rejection without allowing invalid action statuses', () => {
  assert.equal(ASSIGNEE_REJECTED_STATUSES.includes('pending_rejection'), true);
  assert.equal(ASSIGNEE_REJECTABLE_ACTION_STATUSES.includes('pending_approval'), false);
  assert.equal(ASSIGNEE_REJECTABLE_ACTION_STATUSES.includes('pending_dependency'), false);
  assert.equal(ASSIGNEE_REJECTABLE_ACTION_STATUSES.includes('submitted'), false);
  assert.equal(ASSIGNEE_REJECTABLE_ACTION_STATUSES.includes('in_progress'), true);
  assert.equal(ASSIGNEE_REJECTABLE_ACTION_STATUSES.includes('pending_rebrief'), true);
});

test('approval history presentation treats confirm assignee rejection as approved history', () => {
  const presentation = getApprovalHistoryPresentation({
    status: 'rejected',
    actionType: null,
    comment: '[Admin Override] Confirmed assignee rejection via web: confirmed'
  });

  assert.equal(presentation.actionType, 'confirm_assignee_rejection');
  assert.equal(presentation.category, APPROVAL_HISTORY_CATEGORIES.APPROVED);
  assert.equal(presentation.actionLabel, 'อนุมัติการปฏิเสธของผู้รับงาน');
  assert.equal(presentation.isAdminOverride, true);
});

test('approval history presentation treats deny assignee rejection as not approved history', () => {
  const presentation = getApprovalHistoryPresentation({
    status: 'rejected',
    actionType: null,
    comment: 'Denied assignee rejection via web: ต้องดำเนินงานต่อ'
  });

  assert.equal(presentation.actionType, 'deny_assignee_rejection');
  assert.equal(presentation.category, APPROVAL_HISTORY_CATEGORIES.NOT_APPROVED);
  assert.equal(presentation.actionLabel, 'ไม่อนุมัติคำขอปฏิเสธของผู้รับงาน');
  assert.equal(presentation.isAdminOverride, false);
  assert.equal(hasAdminOverridePrefix('ต้องดำเนินงานต่อ'), false);
});

test('approval history presentation classifies cascade assignee rejection as approved history', () => {
  const presentation = getApprovalHistoryPresentation({
    status: 'rejected',
    actionType: null,
    comment: '[Admin Override] cascade_confirm_assignee_rejection: งานพ่วงถูกปฏิเสธ'
  });

  assert.equal(presentation.actionType, 'cascade_confirm_assignee_rejection');
  assert.equal(presentation.category, APPROVAL_HISTORY_CATEGORIES.APPROVED);
  assert.equal(presentation.actionLabel, 'อนุมัติการปฏิเสธของผู้รับงานพ่วง');
  assert.equal(presentation.isAdminOverride, true);
});

test('approval history presentation classifies direct cascade rejection as not approved history', () => {
  const presentation = getApprovalHistoryPresentation({
    status: 'rejected',
    actionType: null,
    comment: 'cascade_reject_downstream: งานพ่วงถูกปฏิเสธตามงาน DJ-1'
  });

  assert.equal(presentation.actionType, 'cascade_reject_downstream');
  assert.equal(presentation.category, APPROVAL_HISTORY_CATEGORIES.NOT_APPROVED);
  assert.equal(presentation.actionLabel, 'ปฏิเสธงานพ่วงตามงานก่อนหน้า');
});
