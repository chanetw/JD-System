import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { ApprovalService } from './approvalService.js';
import { closeDatabaseConnection } from '../config/database.js';

after(async () => {
  await closeDatabaseConnection();
});

function buildJob(overrides = {}) {
  return {
    id: 501,
    djId: 'DJ-COMPLETE-0501',
    tenantId: 1,
    projectId: 12,
    status: 'in_progress',
    assigneeId: 7,
    requesterId: null,
    subject: 'Completion deliverable test',
    finalFiles: [],
    jobItems: [],
    ...overrides
  };
}

function createCompleteJobService({
  job = buildJob(),
  mediaFiles = [],
  deliverables = []
} = {}) {
  const service = new ApprovalService();
  const state = {
    job: { ...job, jobItems: job.jobItems || [] },
    deliverables: deliverables.map((item, index) => ({ id: index + 1, ...item }))
  };
  const calls = {
    jobUpdateMany: [],
    mediaCreates: [],
    deliverableCreates: [],
    deliverableUpdateMany: [],
    comments: [],
    activities: []
  };

  const tx = {
    designJobItem: {
      update: async () => ({})
    },
    job: {
      updateMany: async (args) => {
        calls.jobUpdateMany.push(args);
        const allowedStatuses = args.where?.status?.in || [];
        if (args.where?.id === state.job.id && allowedStatuses.includes(state.job.status)) {
          state.job = { ...state.job, ...args.data };
          return { count: 1 };
        }
        return { count: 0 };
      },
      findUnique: async ({ where }) => {
        if (where.id !== state.job.id) return null;
        return { ...state.job };
      }
    },
    mediaFile: {
      findMany: async ({ where }) => mediaFiles
        .filter((file) => (
          where.id.in.includes(file.id)
          && file.tenantId === where.tenantId
          && file.jobId === where.jobId
        ))
        .map((file) => ({ ...file })),
      create: async (args) => {
        calls.mediaCreates.push(args);
        return { id: 900 + calls.mediaCreates.length, ...args.data };
      }
    },
    jobDeliverable: {
      aggregate: async ({ where }) => {
        const versions = state.deliverables
          .filter((item) => item.tenantId === where.tenantId && item.jobId === where.jobId)
          .map((item) => item.version || 1);
        return { _max: { version: versions.length ? Math.max(...versions) : null } };
      },
      updateMany: async (args) => {
        calls.deliverableUpdateMany.push(args);
        let count = 0;
        state.deliverables = state.deliverables.map((item) => {
          const matches = item.tenantId === args.where.tenantId
            && item.jobId === args.where.jobId
            && item.isFinal === args.where.isFinal;
          if (!matches) return item;
          count += 1;
          return { ...item, ...args.data };
        });
        return { count };
      },
      findFirst: async ({ where }) => state.deliverables.find((item) => (
        item.tenantId === where.tenantId
        && item.jobId === where.jobId
        && item.fileName === where.fileName
        && item.filePath === where.filePath
        && item.version === where.version
        && item.isFinal === where.isFinal
      )) || null,
      create: async (args) => {
        calls.deliverableCreates.push(args);
        const created = { id: 1000 + calls.deliverableCreates.length, ...args.data };
        state.deliverables.push(created);
        return created;
      }
    },
    jobComment: {
      create: async (args) => {
        calls.comments.push(args);
        return { id: calls.comments.length, ...args.data };
      }
    }
  };

  service.prisma = {
    job: {
      findUnique: async ({ where }) => {
        if (where.id !== state.job.id) return null;
        return { ...state.job, jobItems: state.job.jobItems || [] };
      }
    },
    user: {
      findUnique: async () => ({ userRoles: [] })
    },
    $transaction: async (callback) => callback(tx)
  };
  service.notificationService = null;
  service.logApprovalActivity = async (payload) => {
    calls.activities.push(payload);
  };

  return { service, calls, state };
}

test('completeJob creates final job deliverables from uploaded media files', async () => {
  const { service, calls, state } = createCompleteJobService({
    mediaFiles: [{
      id: 101,
      tenantId: 1,
      jobId: 501,
      fileName: 'final-artwork.png',
      filePath: 'tenant_1/job_501/complete/final-artwork.png',
      fileSize: 2048n,
      fileType: 'image/png',
      uploadedBy: 7
    }]
  });

  const result = await service.completeJob({
    jobId: 501,
    userId: 7,
    actorUser: { roles: ['Assignee'] },
    attachments: [{ fileId: 101, name: 'User label' }]
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.deliverableSync, {
    created: 1,
    skippedExisting: 0,
    skippedLinks: 0,
    version: 1
  });
  assert.equal(state.job.status, 'completed');
  assert.equal(state.job.finalFiles[0].fileId, 101);
  assert.equal(calls.mediaCreates.length, 0);
  assert.equal(calls.deliverableCreates.length, 1);
  assert.equal(calls.deliverableCreates[0].data.fileName, 'final-artwork.png');
  assert.equal(calls.deliverableCreates[0].data.isFinal, true);
});

test('completeJob keeps link-only completion behavior without creating deliverables', async () => {
  const { service, calls } = createCompleteJobService();

  const result = await service.completeJob({
    jobId: 501,
    userId: 7,
    actorUser: { roles: ['Assignee'] },
    attachments: [{ name: 'Final Link', url: 'example.com/final' }]
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.deliverableSync, {
    created: 0,
    skippedExisting: 0,
    skippedLinks: 1,
    version: null
  });
  assert.equal(calls.mediaCreates.length, 1);
  assert.equal(calls.mediaCreates[0].data.fileType, 'link');
  assert.equal(calls.mediaCreates[0].data.filePath, 'https://example.com/final');
  assert.equal(calls.deliverableCreates.length, 0);
});

test('completeJob rejects file attachments that are not media files for the same job and tenant', async () => {
  const { service, calls, state } = createCompleteJobService({
    mediaFiles: [{
      id: 303,
      tenantId: 1,
      jobId: 999,
      fileName: 'wrong-job.pdf',
      filePath: 'tenant_1/job_999/complete/wrong-job.pdf',
      fileSize: 100n,
      fileType: 'application/pdf',
      uploadedBy: 7
    }]
  });

  const result = await service.completeJob({
    jobId: 501,
    userId: 7,
    actorUser: { roles: ['Assignee'] },
    attachments: [{ fileId: 303 }]
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_DELIVERABLE_FILE');
  assert.deepEqual(result.data, { missingFileIds: [303] });
  assert.equal(state.job.status, 'in_progress');
  assert.equal(calls.jobUpdateMany.length, 0);
  assert.equal(calls.deliverableCreates.length, 0);
});

test('completeJob versions final deliverables after rework and prevents duplicate rows in one request', async () => {
  const { service, calls, state } = createCompleteJobService({
    job: buildJob({ status: 'rework' }),
    mediaFiles: [{
      id: 404,
      tenantId: 1,
      jobId: 501,
      fileName: 'rework-final.pdf',
      filePath: 'tenant_1/job_501/complete/rework-final.pdf',
      fileSize: 300n,
      fileType: 'application/pdf',
      uploadedBy: 7
    }],
    deliverables: [{
      tenantId: 1,
      jobId: 501,
      version: 1,
      fileName: 'old-final.pdf',
      filePath: 'tenant_1/job_501/complete/old-final.pdf',
      fileSize: 100n,
      fileType: 'application/pdf',
      uploadedBy: 7,
      isFinal: true
    }]
  });

  const result = await service.completeJob({
    jobId: 501,
    userId: 7,
    actorUser: { roles: ['Assignee'] },
    attachments: [{ fileId: 404 }, { fileId: 404 }]
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.deliverableSync, {
    created: 1,
    skippedExisting: 1,
    skippedLinks: 0,
    version: 2
  });
  assert.equal(calls.deliverableCreates.length, 1);
  assert.equal(calls.deliverableCreates[0].data.version, 2);
  assert.equal(state.deliverables.find((item) => item.version === 1).isFinal, false);
  assert.equal(state.deliverables.find((item) => item.version === 2).isFinal, true);
});
