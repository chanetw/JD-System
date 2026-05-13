import assert from 'node:assert/strict';
import test, { after, afterEach } from 'node:test';

import {
  MagicLinkService,
  MAGIC_LINK_ONE_TIME_EXPIRY_HOURS,
  MAGIC_LINK_REUSABLE_EXPIRY_HOURS
} from './magicLinkService.js';
import { closeDatabaseConnection } from '../config/database.js';

const originalEnv = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET,
  MAGIC_LINK_EXPIRY_HOURS: process.env.MAGIC_LINK_EXPIRY_HOURS,
  MAGIC_LINK_VIEW_EXPIRY_HOURS: process.env.MAGIC_LINK_VIEW_EXPIRY_HOURS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

after(async () => {
  await closeDatabaseConnection();
});

function createMagicLinkService() {
  process.env.FRONTEND_URL = 'https://dj.sena.co.th';
  process.env.MAGIC_LINK_SECRET = 'test-magic-secret';
  delete process.env.MAGIC_LINK_EXPIRY_HOURS;
  delete process.env.MAGIC_LINK_VIEW_EXPIRY_HOURS;

  const service = new MagicLinkService();
  const tokenRecords = new Map();
  const updates = [];

  service.prisma = {
    magicLinkToken: {
      create: async ({ data }) => {
        const record = { id: tokenRecords.size + 1, ...data };
        tokenRecords.set(record.tokenId, record);
        return record;
      },
      findUnique: async ({ where }) => tokenRecords.get(where.tokenId) || null,
      update: async ({ where, data }) => {
        const record = tokenRecords.get(where.tokenId);
        Object.assign(record, data);
        updates.push({ where, data });
        return record;
      }
    },
    user: {
      findUnique: async () => ({
        id: 42,
        email: 'assignee@example.com',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 1,
        isActive: true,
        userRoles: [{ roleName: 'Assignee' }]
      })
    }
  };

  return { service, tokenRecords, updates };
}

function getTokenFromMagicLink(magicLink) {
  return new URL(magicLink).searchParams.get('token');
}

function getOnlyTokenRecord(tokenRecords) {
  const records = [...tokenRecords.values()];
  assert.equal(records.length, 1);
  return records[0];
}

test('view magic links are reusable and expire in 30 days by default', async () => {
  const { service, tokenRecords, updates } = createMagicLinkService();
  const before = Date.now();

  const magicLink = await service.createJobActionLink({
    userId: 42,
    jobId: 501,
    action: 'view',
    djId: 'DJ-MAGIC-VIEW'
  });

  const tokenRecord = getOnlyTokenRecord(tokenRecords);
  const expiresInHours = (tokenRecord.expiresAt.getTime() - before) / 60 / 60 / 1000;

  assert.equal(magicLink.startsWith('https://dj.sena.co.th/auth/magic-link?token='), true);
  assert.equal(tokenRecord.action, 'view');
  assert.ok(expiresInHours > MAGIC_LINK_REUSABLE_EXPIRY_HOURS - 0.05);
  assert.ok(expiresInHours <= MAGIC_LINK_REUSABLE_EXPIRY_HOURS + 0.05);

  const token = getTokenFromMagicLink(magicLink);
  const firstVerify = await service.verifyAndConsumeMagicLink(token);
  const secondVerify = await service.verifyAndConsumeMagicLink(token);

  assert.equal(firstVerify.valid, true);
  assert.equal(secondVerify.valid, true);
  assert.equal(tokenRecord.used, false);
  assert.equal(updates.length, 0);
});

test('approve magic links are one-time and expire in 7 days by default', async () => {
  const { service, tokenRecords, updates } = createMagicLinkService();
  const before = Date.now();

  const magicLink = await service.createJobActionLink({
    userId: 42,
    jobId: 502,
    action: 'approve',
    djId: 'DJ-MAGIC-APPROVE'
  });

  const tokenRecord = getOnlyTokenRecord(tokenRecords);
  const expiresInHours = (tokenRecord.expiresAt.getTime() - before) / 60 / 60 / 1000;

  assert.equal(tokenRecord.action, 'approve');
  assert.ok(expiresInHours > MAGIC_LINK_ONE_TIME_EXPIRY_HOURS - 0.05);
  assert.ok(expiresInHours <= MAGIC_LINK_ONE_TIME_EXPIRY_HOURS + 0.05);

  const token = getTokenFromMagicLink(magicLink);
  const firstVerify = await service.verifyAndConsumeMagicLink(token);
  const secondVerify = await service.verifyAndConsumeMagicLink(token);

  assert.equal(firstVerify.valid, true);
  assert.equal(secondVerify.valid, false);
  assert.equal(secondVerify.error, 'TOKEN_ALREADY_USED');
  assert.equal(tokenRecord.used, true);
  assert.equal(updates.length, 1);
});
