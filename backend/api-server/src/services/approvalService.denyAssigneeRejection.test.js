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
    jobUpdateMany: null,
    approvalCreate: null,
    activityLog: null,
  };

  service.prisma = {
    job: {
      findUnique: async () => jobRecord,
      updateMany: async (args) => {
        calls.jobUpdateMany = args;
        return { count: 1 };
      },
    },
    approval: {
      create: async (args) => {
        calls.approvalCreate = args;
        return { id: 1234, ...args.data };
      },
    },
    activityLog: {
      findFirst: async () => null,
    },
    user: {
      findUnique: async () => ({
        role: null,
        roleName: 'Approver',
        userRoles: [{ roleName: 'Approver' }]
      }),
    },
  };

  service.notificationService = null;
  service.logApprovalActivity = async (payload) => {
    calls.activityLog = payload;
  };

  return { service, calls };
}

test('denyAssigneeRejection creates approval history and moves job back to in_progress', async () => {
  const { service, calls } = createServiceWithMocks({
    id: 91,
    djId: 'DJ-TEST-0091',
    status: 'assignee_rejected',
    tenantId: 1,
    requesterId: 11,
    assigneeId: 15,
    rejectedBy: 15,
    rejectionComment: 'Need more brief context',
    subject: 'Test subject',
    dueDate: null,
    assignee: null,
  });

  const result = await service.denyAssigneeRejection({
    jobId: 91,
    approverId: 77,
    approverUser: { roles: ['Approver'] },
    reason: 'ต้องดำเนินงานต่อ',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, 'in_progress');

  assert.equal(calls.jobUpdateMany.where.id, 91);
  assert.equal(calls.jobUpdateMany.where.status, 'assignee_rejected');
  assert.equal(calls.jobUpdateMany.data.status, 'in_progress');
  assert.equal(calls.jobUpdateMany.data.rejectedBy, null);

  assert.equal(calls.approvalCreate.data.jobId, 91);
  assert.equal(calls.approvalCreate.data.approverId, 77);
  assert.equal(calls.approvalCreate.data.status, 'rejected');
  assert.equal('actionType' in calls.approvalCreate.data, false);
  assert.equal(calls.approvalCreate.data.comment, 'Denied assignee rejection via web: ต้องดำเนินงานต่อ');
  assert.ok(calls.approvalCreate.data.approvedAt instanceof Date);
});

test('denyAssigneeRejection returns INVALID_STATUS and does not write approval history for non-assignee_rejected jobs', async () => {
  const { service, calls } = createServiceWithMocks({
    id: 92,
    djId: 'DJ-TEST-0092',
    status: 'pending_approval',
    tenantId: 1,
    requesterId: 11,
    assigneeId: 15,
    rejectedBy: null,
    rejectionComment: null,
    subject: 'Test subject',
    dueDate: null,
    assignee: null,
  });

  const result = await service.denyAssigneeRejection({
    jobId: 92,
    approverId: 77,
    approverUser: { roles: ['Approver'] },
    reason: 'Should fail',
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_STATUS');
  assert.equal(calls.approvalCreate, null);
});
