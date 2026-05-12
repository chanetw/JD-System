import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { ApprovalService } from './approvalService.js';
import { closeDatabaseConnection } from '../config/database.js';

after(async () => {
  await closeDatabaseConnection();
});

function createServiceWithMocks(jobRecord) {
  const service = new ApprovalService();
  const calls = {
    jobUpdate: null,
    approvalCreate: null,
    activityLog: null,
  };

  service.prisma = {
    job: {
      findUnique: async () => jobRecord,
      update: async (args) => {
        calls.jobUpdate = args;
        return { id: args.where.id, ...args.data };
      },
    },
    approval: {
      create: async (args) => {
        calls.approvalCreate = args;
        return { id: 999, ...args.data };
      },
    },
  };

  service.notificationService = null;
  service.logApprovalActivity = async (payload) => {
    calls.activityLog = payload;
  };

  return { service, calls };
}

test('confirmAssigneeRejection creates rejected approval record with current approver and timestamp', async () => {
  const { service, calls } = createServiceWithMocks({
    id: 71,
    djId: 'DJ-TEST-0071',
    status: 'assignee_rejected',
    tenantId: 1,
    requesterId: 11,
    rejectedBy: 24,
    rejectionComment: 'Need rebrief',
    subject: 'Test subject',
    requester: null,
  });

  const result = await service.confirmAssigneeRejection({
    jobId: 71,
    approverId: 88,
    comment: 'Approved rejection from queue',
    ccEmails: [],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, 'rejected');

  assert.equal(calls.jobUpdate.where.id, 71);
  assert.equal(calls.jobUpdate.data.status, 'rejected');

  assert.equal(calls.approvalCreate.data.jobId, 71);
  assert.equal(calls.approvalCreate.data.approverId, 88);
  assert.equal(calls.approvalCreate.data.status, 'rejected');
  assert.equal(calls.approvalCreate.data.comment, 'Approved rejection from queue');
  assert.ok(calls.approvalCreate.data.approvedAt instanceof Date);
});

test('confirmAssigneeRejection returns INVALID_STATUS and does not write approval history for non-assignee_rejected jobs', async () => {
  const { service, calls } = createServiceWithMocks({
    id: 81,
    djId: 'DJ-TEST-0081',
    status: 'pending_approval',
    tenantId: 1,
    requesterId: 11,
    rejectedBy: null,
    rejectionComment: null,
    subject: 'Test subject',
    requester: null,
  });

  const result = await service.confirmAssigneeRejection({
    jobId: 81,
    approverId: 88,
    comment: 'Should fail',
    ccEmails: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_STATUS');
  assert.equal(calls.approvalCreate, null);
});

test('confirmAssigneeRejection returns NOT_FOUND when job does not exist', async () => {
  const { service, calls } = createServiceWithMocks(null);

  const result = await service.confirmAssigneeRejection({
    jobId: 999999,
    approverId: 88,
    comment: 'Not found',
    ccEmails: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'NOT_FOUND');
  assert.equal(calls.approvalCreate, null);
});
