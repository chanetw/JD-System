import assert from 'node:assert/strict';
import test from 'node:test';

import { countWorkingDaysBetween } from './jobAcceptanceService.js';

test('countWorkingDaysBetween does not count crossing midnight as a full working day', async () => {
    const result = await countWorkingDaysBetween(
        new Date('2026-05-04T23:55:00+07:00'),
        new Date('2026-05-05T00:05:00+07:00'),
        null
    );

    assert.equal(result, 0);
});

test('countWorkingDaysBetween counts one full working day at the same time next business day', async () => {
    const result = await countWorkingDaysBetween(
        new Date('2026-05-04T09:00:00+07:00'),
        new Date('2026-05-05T09:00:00+07:00'),
        null
    );

    assert.equal(result, 1);
});

test('countWorkingDaysBetween skips weekends when counting full working days', async () => {
    const result = await countWorkingDaysBetween(
        new Date('2026-05-01T10:00:00+07:00'),
        new Date('2026-05-04T10:00:00+07:00'),
        null
    );

    assert.equal(result, 1);
});