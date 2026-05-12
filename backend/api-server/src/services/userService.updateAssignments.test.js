import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { UserService } from './userService.js';
import { closeDatabaseConnection } from '../config/database.js';

after(async () => {
  await closeDatabaseConnection();
});

function createServiceWithMockData({ projectAssignments = [], budAssignments = [], approvalFlows = [] } = {}) {
  const service = new UserService();

  let nextProjectAssignmentId = 1000;
  let nextBudAssignmentId = 2000;

  const state = {
    projectAssignments: projectAssignments.map(item => ({ ...item })),
    budAssignments: budAssignments.map(item => ({ ...item })),
    approvalFlows: approvalFlows.map(item => ({ ...item }))
  };

  const matchesPairOr = (row, clauses = []) => {
    if (!clauses.length) return true;
    return clauses.some(clause =>
      (clause.projectId === undefined || row.projectId === clause.projectId) &&
      (clause.jobTypeId === undefined || row.jobTypeId === clause.jobTypeId)
    );
  };

  const matchesApprovalFlowWhere = (flow, where = {}) => {
    if (where.isActive !== undefined && flow.isActive !== where.isActive) return false;
    if (where.autoAssignUserId !== undefined && flow.autoAssignUserId !== where.autoAssignUserId) return false;
    if (where.id?.in && !where.id.in.includes(flow.id)) return false;
    if (where.OR && !matchesPairOr(flow, where.OR)) return false;
    return true;
  };

  const tx = {
    budJobAssignment: {
      updateMany: async ({ where, data }) => {
        let count = 0;
        state.budAssignments.forEach(row => {
          if (row.assigneeId === where.assigneeId && row.tenantId === where.tenantId) {
            Object.assign(row, data);
            count += 1;
          }
        });
        return { count };
      },
      upsert: async ({ where, update, create }) => {
        const key = where.tenantId_budId_jobTypeId;
        let row = state.budAssignments.find(item =>
          item.tenantId === key.tenantId &&
          item.budId === key.budId &&
          item.jobTypeId === key.jobTypeId
        );

        if (row) {
          Object.assign(row, update);
        } else {
          row = { id: nextBudAssignmentId++, ...create };
          state.budAssignments.push(row);
        }
        return { ...row };
      }
    },
    projectJobAssignment: {
      findMany: async ({ where }) => state.projectAssignments
        .filter(row => where.assigneeId === undefined || row.assigneeId === where.assigneeId)
        .filter(row => where.isActive === undefined || row.isActive === where.isActive)
        .map(row => ({ projectId: row.projectId, jobTypeId: row.jobTypeId })),
      updateMany: async ({ where, data }) => {
        let count = 0;
        state.projectAssignments.forEach(row => {
          if (row.assigneeId === where.assigneeId) {
            Object.assign(row, data);
            count += 1;
          }
        });
        return { count };
      },
      upsert: async ({ where, update, create }) => {
        const key = where.projectId_jobTypeId;
        let row = state.projectAssignments.find(item =>
          item.projectId === key.projectId &&
          item.jobTypeId === key.jobTypeId
        );

        if (row) {
          Object.assign(row, update);
        } else {
          row = { id: nextProjectAssignmentId++, ...create };
          state.projectAssignments.push(row);
        }
        return { ...row };
      }
    },
    approvalFlow: {
      findMany: async ({ where }) => state.approvalFlows
        .filter(flow => matchesApprovalFlowWhere(flow, where))
        .map(flow => ({ id: flow.id, projectId: flow.projectId, jobTypeId: flow.jobTypeId })),
      updateMany: async ({ where, data }) => {
        let count = 0;
        state.approvalFlows.forEach(flow => {
          if (matchesApprovalFlowWhere(flow, where)) {
            Object.assign(flow, data);
            count += 1;
          }
        });
        return { count };
      }
    }
  };

  service.prisma = {
    $transaction: async (callback) => callback(tx)
  };

  return { service, state };
}

test('updateUserAssignments syncs existing job-type approval flow to the new assignee', async () => {
  const { service, state } = createServiceWithMockData({
    projectAssignments: [
      { id: 1, projectId: 10, jobTypeId: 100, assigneeId: 7, isActive: true, priority: 100 }
    ],
    approvalFlows: [
      { id: 50, projectId: 10, jobTypeId: 100, isActive: true, autoAssignType: 'specific_user', autoAssignUserId: 7 }
    ]
  });

  const result = await service.updateUserAssignments(
    42,
    { jobTypeIds: [100], projectIds: [10] },
    { executedBy: 1, tenantId: 1 }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.flowSync.updated, 1);
  assert.equal(result.data.flowSync.cleared, 0);
  assert.equal(result.data.flowSync.skippedNoFlow, 0);

  const assignment = state.projectAssignments.find(row => row.projectId === 10 && row.jobTypeId === 100);
  assert.equal(assignment.assigneeId, 42);
  assert.equal(assignment.isActive, true);

  assert.equal(state.approvalFlows[0].autoAssignType, 'specific_user');
  assert.equal(state.approvalFlows[0].autoAssignUserId, 42);
});

test('updateUserAssignments does not create approval flow when no job-type flow exists', async () => {
  const { service, state } = createServiceWithMockData();

  const result = await service.updateUserAssignments(
    42,
    { jobTypeIds: [100], projectIds: [10] },
    { executedBy: 1, tenantId: 1 }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.flowSync.updated, 0);
  assert.equal(result.data.flowSync.skippedNoFlow, 1);
  assert.equal(state.approvalFlows.length, 0);

  const assignment = state.projectAssignments.find(row => row.projectId === 10 && row.jobTypeId === 100);
  assert.equal(assignment.assigneeId, 42);
});

test('updateUserAssignments clears removed job-type flow only when it still points to the user', async () => {
  const { service, state } = createServiceWithMockData({
    projectAssignments: [
      { id: 1, projectId: 10, jobTypeId: 100, assigneeId: 42, isActive: true, priority: 100 }
    ],
    approvalFlows: [
      { id: 50, projectId: 10, jobTypeId: 100, isActive: true, autoAssignType: 'specific_user', autoAssignUserId: 42 },
      { id: 51, projectId: 10, jobTypeId: 200, isActive: true, autoAssignType: 'specific_user', autoAssignUserId: 7 }
    ]
  });

  const result = await service.updateUserAssignments(
    42,
    { jobTypeIds: [200], projectIds: [10] },
    { executedBy: 1, tenantId: 1 }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.flowSync.cleared, 1);
  assert.equal(result.data.flowSync.updated, 1);

  const clearedFlow = state.approvalFlows.find(flow => flow.id === 50);
  assert.equal(clearedFlow.autoAssignType, 'manual');
  assert.equal(clearedFlow.autoAssignUserId, null);

  const updatedFlow = state.approvalFlows.find(flow => flow.id === 51);
  assert.equal(updatedFlow.autoAssignType, 'specific_user');
  assert.equal(updatedFlow.autoAssignUserId, 42);
});

test('updateUserAssignments does not touch default approval flow', async () => {
  const { service, state } = createServiceWithMockData({
    approvalFlows: [
      { id: 50, projectId: 10, jobTypeId: null, isActive: true, autoAssignType: 'team_lead', autoAssignUserId: 7 }
    ]
  });

  const result = await service.updateUserAssignments(
    42,
    { jobTypeIds: [100], projectIds: [10] },
    { executedBy: 1, tenantId: 1 }
  );

  assert.equal(result.success, true);
  assert.equal(result.data.flowSync.updated, 0);
  assert.equal(result.data.flowSync.skippedNoFlow, 1);
  assert.equal(state.approvalFlows[0].autoAssignType, 'team_lead');
  assert.equal(state.approvalFlows[0].autoAssignUserId, 7);
});
