import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { ApprovalService } from './approvalService.js';
import { closeDatabaseConnection } from '../config/database.js';

after(async () => {
  await closeDatabaseConnection();
});

function buildJob(overrides) {
  return {
    id: 1,
    djId: 'DJ-TEST-0001',
    status: 'pending_dependency',
    tenantId: 1,
    requesterId: null,
    rejectedBy: null,
    rejectionComment: null,
    rejectionSource: null,
    subject: 'Test subject',
    requester: null,
    assigneeId: null,
    parentJobId: null,
    predecessorId: null,
    ...overrides,
  };
}

function createServiceWithState(jobRecords) {
  const service = new ApprovalService();
  const jobs = new Map(jobRecords.map((job) => [job.id, { ...job }]));
  const calls = {
    jobUpdates: [],
    jobUpdateMany: [],
    approvalCreates: [],
    activityLogs: [],
    notifications: [],
  };

  service.prisma = {
    job: {
      findUnique: async ({ where }) => {
        const record = jobs.get(where.id);
        return record ? { ...record } : null;
      },
      findMany: async ({ where }) => {
        if (Array.isArray(where?.OR)) {
          return [...jobs.values()]
            .filter((job) => {
              const matchesLink = where.OR.some((condition) => (
                (condition.predecessorId !== undefined && job.predecessorId === condition.predecessorId)
                || (condition.parentJobId !== undefined && job.parentJobId === condition.parentJobId)
              ));
              const excludedStatuses = where.status?.notIn || [];
              return matchesLink && !excludedStatuses.includes(job.status);
            })
            .map((job) => ({ ...job }));
        }

        if (where?.predecessorId !== undefined) {
          return [...jobs.values()]
            .filter((job) => job.predecessorId === where.predecessorId)
            .map((job) => ({ ...job }));
        }

        if (where?.parentJobId !== undefined) {
          return [...jobs.values()]
            .filter((job) => job.parentJobId === where.parentJobId)
            .map((job) => ({ ...job }));
        }

        return [];
      },
      findFirst: async ({ where }) => {
        const record = jobs.get(where.id);
        if (!record) return null;
        if (where.parentJobId !== undefined && record.parentJobId !== where.parentJobId) return null;
        return { ...record };
      },
      update: async (args) => {
        const current = jobs.get(args.where.id);
        const next = { ...current, ...args.data };
        jobs.set(args.where.id, next);
        calls.jobUpdates.push(args);
        return { ...next };
      },
      updateMany: async (args) => {
        const current = jobs.get(args.where.id);
        if (!current) return { count: 0 };

        if (args.where.assigneeId !== undefined && current.assigneeId !== args.where.assigneeId) {
          return { count: 0 };
        }

        const statusCondition = args.where.status;
        let statusMatches = true;
        if (typeof statusCondition === 'string') {
          statusMatches = current.status === statusCondition;
        } else if (statusCondition?.in) {
          statusMatches = statusCondition.in.includes(current.status);
        }

        if (!statusMatches) {
          return { count: 0 };
        }

        const next = { ...current, ...args.data };
        jobs.set(args.where.id, next);
        calls.jobUpdateMany.push(args);
        return { count: 1 };
      },
    },
    approval: {
      findFirst: async ({ where }) => {
        const marker = where.comment?.contains?.toLowerCase();
        const existingIndex = calls.approvalCreates.findIndex((args) => (
          args.data.jobId === where.jobId
          && args.data.approverId === where.approverId
          && (!marker || String(args.data.comment || '').toLowerCase().includes(marker))
        ));
        return existingIndex === -1 ? null : { id: existingIndex + 1 };
      },
      create: async (args) => {
        calls.approvalCreates.push(args);
        return { id: 999 + calls.approvalCreates.length, ...args.data };
      },
    },
    user: {
      findUnique: async () => ({
        role: null,
        roleName: 'Approver',
        userRoles: [{ roleName: 'Approver' }]
      }),
    },
    $transaction: async (callback) => callback(service.prisma),
  };

  service.notificationService = {
    createNotification: async (payload) => {
      calls.notifications.push(payload);
    },
  };

  service.logApprovalActivity = async (payload) => {
    calls.activityLogs.push(payload);
  };

  return { service, calls, jobs };
}

test('isAdminActor fallback reads admin role from userRoles without legacy user fields', async () => {
  const service = new ApprovalService();
  let selectedFields = null;

  service.prisma = {
    user: {
      findUnique: async (args) => {
        selectedFields = args.select;
        return {
          userRoles: [{ roleName: 'Admin' }]
        };
      }
    }
  };

  const result = await service.isAdminActor(null, 4);

  assert.equal(result, true);
  assert.equal(Object.prototype.hasOwnProperty.call(selectedFields, 'role'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(selectedFields, 'roleName'), false);
  assert.deepEqual(Object.keys(selectedFields), ['userRoles']);
});

test('confirmAssigneeRejection cascades rejection across a 4-job sequential chain and rejects parent when all children are rejected', async () => {
  const { service, calls, jobs } = createServiceWithState([
    buildJob({ id: 500, djId: 'PARENT-500', status: 'in_progress', subject: 'Parent job' }),
    buildJob({
      id: 71,
      djId: 'DJ-TEST-0071',
      status: 'assignee_rejected',
      rejectedBy: 24,
      rejectionComment: 'Need rebrief',
      subject: 'Job A',
      parentJobId: 500
    }),
    buildJob({
      id: 72,
      djId: 'DJ-TEST-0072',
      status: 'pending_dependency',
      subject: 'Job B',
      assigneeId: 201,
      parentJobId: 500,
      predecessorId: 71
    }),
    buildJob({
      id: 73,
      djId: 'DJ-TEST-0073',
      status: 'pending_dependency',
      subject: 'Job C',
      assigneeId: 202,
      parentJobId: 500,
      predecessorId: 72
    }),
    buildJob({
      id: 74,
      djId: 'DJ-TEST-0074',
      status: 'pending_dependency',
      subject: 'Job D',
      assigneeId: 203,
      parentJobId: 500,
      predecessorId: 73
    }),
  ]);

  const result = await service.confirmAssigneeRejection({
    jobId: 71,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Approved rejection from queue',
    ccEmails: [],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, 'rejected');
  assert.deepEqual(result.data.cascadeResult, {
    rejectedCount: 3,
    affectedJobIds: [72, 73, 74],
    affectedDjIds: ['DJ-TEST-0072', 'DJ-TEST-0073', 'DJ-TEST-0074'],
    rejectedParentIds: [500]
  });

  assert.equal(jobs.get(71).status, 'rejected');
  assert.equal(jobs.get(72).status, 'rejected');
  assert.equal(jobs.get(73).status, 'rejected');
  assert.equal(jobs.get(74).status, 'rejected');
  assert.equal(jobs.get(500).status, 'rejected');

  assert.equal(jobs.get(72).rejectionSource, 'cascade_predecessor');
  assert.equal(jobs.get(73).rejectionSource, 'cascade_predecessor');
  assert.equal(jobs.get(74).rejectionSource, 'cascade_predecessor');
  assert.match(jobs.get(72).rejectionComment, /DJ-TEST-0071/);
  assert.match(jobs.get(73).rejectionComment, /DJ-TEST-0072/);
  assert.match(jobs.get(74).rejectionComment, /DJ-TEST-0073/);

  assert.equal(calls.approvalCreates.length, 4);
  assert.equal(calls.approvalCreates[0].data.jobId, 71);
  assert.equal(calls.approvalCreates[0].data.comment, 'Confirmed assignee rejection via web: Approved rejection from queue');
  assert.deepEqual(
    calls.approvalCreates
      .filter((args) => args.data.comment.includes('cascade_confirm_assignee_rejection'))
      .map((args) => args.data.jobId),
    [72, 73, 74]
  );
  assert.equal(calls.notifications.length, 3);
  assert.deepEqual(
    calls.notifications.map((payload) => payload.userId),
    [201, 202, 203]
  );
});

test('confirmAssigneeRejection stops cascading when it reaches a completed job and leaves deeper jobs untouched', async () => {
  const { service, calls, jobs } = createServiceWithState([
    buildJob({
      id: 81,
      djId: 'DJ-TEST-0081',
      status: 'assignee_rejected',
      rejectedBy: 24,
      rejectionComment: 'Need rebrief',
      subject: 'Job A'
    }),
    buildJob({
      id: 82,
      djId: 'DJ-TEST-0082',
      status: 'pending_dependency',
      subject: 'Job B',
      assigneeId: 301,
      predecessorId: 81
    }),
    buildJob({
      id: 83,
      djId: 'DJ-TEST-0083',
      status: 'completed',
      subject: 'Job C',
      assigneeId: 302,
      predecessorId: 82
    }),
    buildJob({
      id: 84,
      djId: 'DJ-TEST-0084',
      status: 'pending_dependency',
      subject: 'Job D',
      assigneeId: 303,
      predecessorId: 83
    }),
  ]);

  const result = await service.confirmAssigneeRejection({
    jobId: 81,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Approved rejection from queue',
    ccEmails: [],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data.cascadeResult, {
    rejectedCount: 1,
    affectedJobIds: [82],
    affectedDjIds: ['DJ-TEST-0082'],
    rejectedParentIds: []
  });

  assert.equal(jobs.get(81).status, 'rejected');
  assert.equal(jobs.get(82).status, 'rejected');
  assert.equal(jobs.get(83).status, 'completed');
  assert.equal(jobs.get(84).status, 'pending_dependency');

  assert.deepEqual(
    calls.approvalCreates
      .filter((args) => args.data.comment.includes('cascade_confirm_assignee_rejection'))
      .map((args) => args.data.jobId),
    [82]
  );
});

test('rejectJobViaWeb creates approval history for cascaded downstream jobs', async () => {
  const { service, calls, jobs } = createServiceWithState([
    buildJob({
      id: 101,
      djId: 'DJ-TEST-0101',
      status: 'pending_approval',
      subject: 'Job A',
      requesterId: null,
      assigneeId: null
    }),
    buildJob({
      id: 102,
      djId: 'DJ-TEST-0102',
      status: 'pending_dependency',
      subject: 'Job B',
      assigneeId: null,
      predecessorId: 101
    }),
    buildJob({
      id: 103,
      djId: 'DJ-TEST-0103',
      status: 'pending_dependency',
      subject: 'Job C',
      assigneeId: null,
      predecessorId: 102
    }),
  ]);

  const result = await service.rejectJobViaWeb({
    jobId: 101,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Reject root',
    ipAddress: '127.0.0.1'
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, 'rejected');
  assert.equal(jobs.get(101).status, 'rejected');
  assert.equal(jobs.get(102).status, 'rejected');
  assert.equal(jobs.get(103).status, 'rejected');

  assert.deepEqual(
    calls.approvalCreates
      .filter((args) => args.data.comment.includes('cascade_reject_downstream'))
      .map((args) => args.data.jobId),
    [102, 103]
  );
  assert.equal(
    calls.approvalCreates
      .filter((args) => args.data.comment.includes('cascade_reject_downstream'))
      .every((args) => args.data.status === 'rejected'),
    true
  );
});

test('rejectJobViaWeb second submit returns ALREADY_PROCESSED and does not duplicate approval/activity', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 131,
      djId: 'DJ-TEST-0131',
      status: 'pending_approval',
      subject: 'Reject by approver race test',
      requesterId: 91,
      assigneeId: null
    })
  ]);

  const firstResult = await service.rejectJobViaWeb({
    jobId: 131,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Reject once',
    ipAddress: '127.0.0.1'
  });

  const approvalCreatesAfterFirst = calls.approvalCreates.length;
  const activityLogsAfterFirst = calls.activityLogs.length;

  const secondResult = await service.rejectJobViaWeb({
    jobId: 131,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Reject twice',
    ipAddress: '127.0.0.1'
  });

  assert.equal(firstResult.success, true);
  assert.equal(secondResult.success, false);
  assert.equal(secondResult.error, 'ALREADY_PROCESSED');
  assert.equal(secondResult.data?.currentStatus, 'rejected');
  assert.equal(calls.approvalCreates.length, approvalCreatesAfterFirst);
  assert.equal(calls.activityLogs.length, activityLogsAfterFirst);
});

test('approveJobViaWeb returns INVALID_STATUS when job is not in pending approval statuses', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 141,
      djId: 'DJ-TEST-0141',
      status: 'draft',
      subject: 'Approve invalid status test'
    })
  ]);

  const result = await service.approveJobViaWeb({
    jobId: 141,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Approve attempt',
    ipAddress: '127.0.0.1'
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_STATUS');
  assert.equal(calls.approvalCreates.length, 0);
  assert.equal(calls.activityLogs.length, 0);
});

test('rejectJobViaWeb returns INVALID_STATUS when job is not in pending approval statuses', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 151,
      djId: 'DJ-TEST-0151',
      status: 'draft',
      subject: 'Reject invalid status test'
    })
  ]);

  const result = await service.rejectJobViaWeb({
    jobId: 151,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Reject attempt',
    ipAddress: '127.0.0.1'
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_STATUS');
  assert.equal(calls.approvalCreates.length, 0);
  assert.equal(calls.activityLogs.length, 0);
});

test('createApprovalHistoryIfMissing does not duplicate cascade marker history', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({ id: 201, djId: 'DJ-TEST-0201', status: 'rejected' })
  ]);

  await service.createApprovalHistoryIfMissing({
    jobId: 201,
    tenantId: 1,
    approverId: 88,
    stepNumber: 1,
    status: 'rejected',
    comment: 'cascade_reject_downstream: first write',
    marker: 'cascade_reject_downstream'
  });
  await service.createApprovalHistoryIfMissing({
    jobId: 201,
    tenantId: 1,
    approverId: 88,
    stepNumber: 1,
    status: 'rejected',
    comment: 'cascade_reject_downstream: retry write',
    marker: 'cascade_reject_downstream'
  });

  assert.equal(calls.approvalCreates.length, 1);
});

test('confirmAssigneeRejection returns INVALID_STATUS and does not write approval history for non-assignee_rejected jobs', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 91,
      djId: 'DJ-TEST-0091',
      status: 'pending_approval',
      subject: 'Job A'
    }),
    buildJob({ id: 92, djId: 'DJ-TEST-0092', predecessorId: 91, subject: 'Job B' }),
    buildJob({ id: 93, djId: 'DJ-TEST-0093', predecessorId: 92, subject: 'Job C' }),
    buildJob({ id: 94, djId: 'DJ-TEST-0094', predecessorId: 93, subject: 'Job D' }),
  ]);

  const result = await service.confirmAssigneeRejection({
    jobId: 91,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Should fail',
    ccEmails: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_STATUS');
  assert.equal(calls.approvalCreates.length, 0);
  assert.equal(calls.jobUpdates.length, 0);
});

test('confirmAssigneeRejection returns NOT_FOUND when job does not exist', async () => {
  const { service, calls } = createServiceWithState([]);

  const result = await service.confirmAssigneeRejection({
    jobId: 999999,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Not found',
    ccEmails: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'NOT_FOUND');
  assert.equal(calls.approvalCreates.length, 0);
});

test('confirmAssigneeRejection second submit returns ALREADY_PROCESSED and does not duplicate approval/activity', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 111,
      djId: 'DJ-TEST-0111',
      status: 'assignee_rejected',
      rejectedBy: 24,
      rejectionComment: 'Need rebrief',
      subject: 'Job A'
    })
  ]);

  const firstResult = await service.confirmAssigneeRejection({
    jobId: 111,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Confirm once',
    ccEmails: [],
  });

  const approvalCreatesAfterFirst = calls.approvalCreates.length;
  const activityLogsAfterFirst = calls.activityLogs.length;

  const secondResult = await service.confirmAssigneeRejection({
    jobId: 111,
    approverId: 88,
    approverUser: { roles: ['Approver'] },
    comment: 'Confirm twice',
    ccEmails: [],
  });

  assert.equal(firstResult.success, true);
  assert.equal(secondResult.success, false);
  assert.equal(secondResult.error, 'ALREADY_PROCESSED');
  assert.equal(secondResult.data?.currentStatus, 'rejected');
  assert.equal(calls.approvalCreates.length, approvalCreatesAfterFirst);
  assert.equal(calls.activityLogs.length, activityLogsAfterFirst);
});

test('rejectJobByAssignee second submit returns ALREADY_PROCESSED and does not duplicate activity', async () => {
  const { service, calls } = createServiceWithState([
    buildJob({
      id: 121,
      djId: 'DJ-TEST-0121',
      status: 'in_progress',
      assigneeId: 44,
      requesterId: 77,
      subject: 'Job Assignee Rejection'
    })
  ]);

  const firstResult = await service.rejectJobByAssignee({
    jobId: 121,
    assigneeId: 44,
    comment: 'Cannot proceed'
  });

  const activityLogsAfterFirst = calls.activityLogs.length;

  const secondResult = await service.rejectJobByAssignee({
    jobId: 121,
    assigneeId: 44,
    comment: 'Duplicate click'
  });

  assert.equal(firstResult.success, true);
  assert.equal(secondResult.success, false);
  assert.equal(secondResult.error, 'ALREADY_PROCESSED');
  assert.equal(secondResult.data?.currentStatus, 'assignee_rejected');
  assert.equal(calls.activityLogs.length, activityLogsAfterFirst);
});
