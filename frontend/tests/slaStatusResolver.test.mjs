import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSlaBadgePresentation } from '../src/modules/shared/utils/slaStatusResolver.js';

test('returns completed_on_time when completed before due date', () => {
    const result = resolveSlaBadgePresentation({
        status: 'completed',
        deadline: '2026-04-14T10:00:00.000Z',
        completedAt: '2026-04-12T10:00:00.000Z',
        now: new Date('2026-04-20T00:00:00.000Z')
    });

    assert.equal(result.key, 'completed_on_time');
    assert.equal(result.isActiveOverdue, false);
    assert.equal(result.isCompletedLate, false);
});

test('returns completed_on_time when completed on due date', () => {
    const result = resolveSlaBadgePresentation({
        status: 'closed',
        deadline: '2026-04-14T09:00:00+07:00',
        completedAt: '2026-04-14T18:00:00+07:00',
        now: new Date('2026-04-20T00:00:00.000Z')
    });

    assert.equal(result.key, 'completed_on_time');
    assert.equal(result.isActiveOverdue, false);
});

test('returns completed_late when completed after due date', () => {
    const result = resolveSlaBadgePresentation({
        status: 'completed',
        deadline: '2026-04-14T10:00:00.000Z',
        completedAt: '2026-04-17T10:00:00.000Z',
        now: new Date('2026-04-20T00:00:00.000Z')
    });

    assert.equal(result.key, 'completed_late');
    assert.equal(result.isActiveOverdue, false);
    assert.equal(result.isCompletedLate, true);
    assert.ok(result.lateWorkingDays >= 1);
});

test('returns overdue when in progress and due date already passed', () => {
    const result = resolveSlaBadgePresentation({
        status: 'in_progress',
        deadline: '2026-04-14T10:00:00.000Z',
        completedAt: null,
        now: new Date('2026-04-17T00:00:00.000Z')
    });

    assert.equal(result.key, 'overdue');
    assert.equal(result.isActiveOverdue, true);
    assert.equal(result.isCompletedLate, false);
    assert.equal(result.dayDiff, -3);
});
