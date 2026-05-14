import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureCanApproveOrRejectJob } from './permissionService.js';

const buildPrisma = (job) => ({
  job: {
    findFirst: async () => (job ? { ...job } : null)
  }
});

const buildApprovalService = (approverIds = []) => ({
  getApprovalFlow: async () => ({
    approverSteps: [
      {
        stepNumber: 1,
        approvers: approverIds.map((id) => ({ id }))
      }
    ]
  })
});

test('ensureCanApproveOrRejectJob allows admin override on pending jobs', async () => {
  const result = await ensureCanApproveOrRejectJob({
    prisma: buildPrisma({
      id: 11,
      status: 'pending_approval',
      projectId: 2,
      jobTypeId: 3,
      priority: 'normal'
    }),
    approvalService: buildApprovalService([]),
    jobId: 11,
    user: {
      userId: 999,
      tenantId: 1,
      roles: ['Admin']
    }
  });

  assert.equal(result.allowed, true);
});

test('ensureCanApproveOrRejectJob allows current step approver', async () => {
  const result = await ensureCanApproveOrRejectJob({
    prisma: buildPrisma({
      id: 12,
      status: 'pending_approval',
      projectId: 2,
      jobTypeId: 3,
      priority: 'normal'
    }),
    approvalService: buildApprovalService([77]),
    jobId: 12,
    user: {
      userId: 77,
      tenantId: 1,
      roles: ['Approver']
    }
  });

  assert.equal(result.allowed, true);
});

test('ensureCanApproveOrRejectJob rejects non-current approver on pending jobs', async () => {
  const result = await ensureCanApproveOrRejectJob({
    prisma: buildPrisma({
      id: 13,
      status: 'pending_level_1',
      projectId: 2,
      jobTypeId: 3,
      priority: 'normal'
    }),
    approvalService: buildApprovalService([88]),
    jobId: 13,
    user: {
      userId: 77,
      tenantId: 1,
      roles: ['Approver']
    }
  });

  assert.equal(result.allowed, false);
  assert.equal(result.result?.error, 'FORBIDDEN');
});

test('ensureCanApproveOrRejectJob returns NOT_FOUND when job is missing', async () => {
  const result = await ensureCanApproveOrRejectJob({
    prisma: buildPrisma(null),
    approvalService: buildApprovalService([]),
    jobId: 999,
    user: {
      userId: 77,
      tenantId: 1,
      roles: ['Approver']
    }
  });

  assert.equal(result.allowed, false);
  assert.equal(result.result?.error, 'NOT_FOUND');
});
