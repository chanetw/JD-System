import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveJobAccess, userHasAnyRole } from './jobAccessHelper.js';

const baseJob = {
  id: 101,
  tenantId: 1,
  projectId: 10,
  jobTypeId: 20,
  requesterId: 11,
  assigneeId: 12,
  status: 'in_progress',
  djId: 'DJ-TEST-101',
  isParent: false,
  parentJobId: null,
  approvals: [],
  project: { budId: 100, departmentId: 200 }
};

const createPrisma = ({
  job = baseJob,
  childJobs = [],
  scopes = [],
  flows = [],
  reassignmentLogs = [],
  legacyNotification = null
} = {}) => ({
  job: {
    findUnique: async () => job,
    findMany: async ({ where }) => {
      if (where?.parentJobId !== undefined) {
        return childJobs.filter((childJob) => childJob.parentJobId === where.parentJobId);
      }
      return [];
    }
  },
  approvalFlow: {
    findMany: async () => flows
  },
  userScopeAssignment: {
    findMany: async () => scopes
  },
  activityLog: {
    findMany: async () => reassignmentLogs
  },
  notification: {
    findFirst: async () => legacyNotification
  }
});

test('userHasAnyRole normalizes string and object roles', () => {
  assert.equal(userHasAnyRole({ roles: ['Admin'] }, ['admin']), true);
  assert.equal(userHasAnyRole({ roles: [{ roleName: 'System Admin' }] }, ['admin']), true);
  assert.equal(userHasAnyRole({ roleName: 'Dept Manager' }, ['manager']), true);
});

test('admin gets full access to a tenant job', async () => {
  const access = await resolveJobAccess(createPrisma(), {
    jobId: 101,
    user: { userId: 99, tenantId: 1, roles: ['Admin'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'full');
  assert.equal(access.permissions.canAct, true);
});

test('requester and current assignee get full access', async () => {
  const requesterAccess = await resolveJobAccess(createPrisma(), {
    jobId: 101,
    user: { userId: 11, tenantId: 1, roles: ['Requester'] }
  });
  const assigneeAccess = await resolveJobAccess(createPrisma(), {
    jobId: 101,
    user: { userId: 12, tenantId: 1, roles: ['Assignee'] }
  });

  assert.equal(requesterAccess.accessMode, 'full');
  assert.equal(assigneeAccess.accessMode, 'full');
});

test('approval history actor gets full access', async () => {
  const access = await resolveJobAccess(createPrisma({
    job: {
      ...baseJob,
      approvals: [{ approverId: 31 }]
    }
  }), {
    jobId: 101,
    user: { userId: 31, tenantId: 1, roles: ['Approver'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'full');
});

test('current approval flow approver gets full access', async () => {
  const access = await resolveJobAccess(createPrisma({
    flows: [{
      jobTypeId: 20,
      approverSteps: [
        { level: 1, approvers: [{ userId: 41 }] }
      ]
    }]
  }), {
    jobId: 101,
    user: { userId: 41, tenantId: 1, roles: ['Approver'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'full');
});

test('user with BUD scope gets full access', async () => {
  const access = await resolveJobAccess(createPrisma({
    scopes: [{ scopeLevel: 'bud', scopeId: 100 }]
  }), {
    jobId: 101,
    user: { userId: 51, tenantId: 1, roles: ['Viewer'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'full');
});

test('old assignee gets readonly access from structured reassignment activity', async () => {
  const access = await resolveJobAccess(createPrisma({
    job: { ...baseJob, assigneeId: 77 },
    reassignmentLogs: [{ detail: { oldAssigneeId: 12, newAssigneeId: 77 } }]
  }), {
    jobId: 101,
    user: { userId: 12, tenantId: 1, roles: ['Assignee'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'readonly');
  assert.equal(access.permissions.canComment, false);
  assert.equal(access.permissions.canAct, false);
});

test('old assignee gets readonly access from legacy job_reassigned notification', async () => {
  const access = await resolveJobAccess(createPrisma({
    job: { ...baseJob, assigneeId: 77 },
    legacyNotification: { id: 9001 }
  }), {
    jobId: 101,
    user: { userId: 12, tenantId: 1, roles: ['Assignee'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'readonly');
});

test('user with child access can open parent job as readonly context', async () => {
  const access = await resolveJobAccess(createPrisma({
    job: {
      ...baseJob,
      id: 500,
      requesterId: 88,
      assigneeId: null,
      isParent: true,
      approvals: []
    },
    childJobs: [{
      ...baseJob,
      id: 501,
      parentJobId: 500,
      requesterId: 88,
      assigneeId: 12,
      approvals: []
    }]
  }), {
    jobId: 500,
    user: { userId: 12, tenantId: 1, roles: ['Assignee'] }
  });

  assert.equal(access.hasAccess, true);
  assert.equal(access.accessMode, 'readonly');
  assert.equal(access.permissions.canAct, false);
});

test('unrelated user is denied', async () => {
  const access = await resolveJobAccess(createPrisma(), {
    jobId: 101,
    user: { userId: 99, tenantId: 1, roles: ['Assignee'] }
  });

  assert.equal(access.hasAccess, false);
  assert.equal(access.error, 'INSUFFICIENT_PERMISSIONS');
});
