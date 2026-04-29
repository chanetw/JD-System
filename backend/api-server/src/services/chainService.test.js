import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateUrgentDelayPlan,
  getUrgentDelayMultiplier
} from './chainService.js';

const buildTasks = (count) => Array.from({ length: count }, (_, index) => ({
  id: index + 1,
  djId: `DJ-TEST-${index + 1}`
}));

test('urgent delay uses +1, +2, +3 when there is one active urgent job', () => {
  const plan = calculateUrgentDelayPlan({
    urgentCount: 1,
    tasks: buildTasks(3)
  });

  assert.equal(getUrgentDelayMultiplier(1), 1);
  assert.deepEqual(plan.map(item => item.shiftDays), [1, 2, 3]);
  assert.deepEqual(plan.map(item => item.queueIndex), [1, 2, 3]);
});

test('urgent delay uses +2, +4, +6 when there are two active urgent jobs', () => {
  const plan = calculateUrgentDelayPlan({
    urgentCount: 2,
    tasks: buildTasks(3)
  });

  assert.equal(getUrgentDelayMultiplier(2), 2);
  assert.deepEqual(plan.map(item => item.shiftDays), [2, 4, 6]);
});

test('urgent multiplier is capped at 2 when there are more than two urgent jobs', () => {
  const plan = calculateUrgentDelayPlan({
    urgentCount: 5,
    tasks: buildTasks(4)
  });

  assert.equal(getUrgentDelayMultiplier(5), 2);
  assert.deepEqual(plan.map(item => item.shiftDays), [2, 4, 6, 8]);
});

test('existing urgent jobs can be included in affected tasks while the new urgent job is excluded by caller', () => {
  const tasks = [
    { id: 10, djId: 'DJ-URGENT-OLD', priority: 'urgent' },
    { id: 11, djId: 'DJ-NORMAL-1', priority: 'normal' },
    { id: 12, djId: 'DJ-NORMAL-2', priority: 'normal' }
  ];

  const plan = calculateUrgentDelayPlan({
    urgentCount: 2,
    tasks
  });

  assert.equal(plan[0].djId, 'DJ-URGENT-OLD');
  assert.deepEqual(plan.map(item => item.shiftDays), [2, 4, 6]);
});
