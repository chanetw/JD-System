import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  buildFrontendUrl,
  getFrontendBaseUrl,
  getRequestOrigin,
  normalizeBaseUrl
} from './frontendUrl.js';

const originalFrontendUrl = process.env.FRONTEND_URL;

const createRequest = (headers = {}, protocol = 'https') => ({
  protocol,
  headers,
  get(name) {
    return this.headers[String(name).toLowerCase()];
  }
});

afterEach(() => {
  if (originalFrontendUrl === undefined) {
    delete process.env.FRONTEND_URL;
    return;
  }

  process.env.FRONTEND_URL = originalFrontendUrl;
});

test('normalizeBaseUrl trims to origin', () => {
  assert.equal(normalizeBaseUrl('https://app.example.com/jobs/123?foo=bar'), 'https://app.example.com');
});

test('getFrontendBaseUrl prefers configured external url', () => {
  process.env.FRONTEND_URL = 'https://app.example.com/some/path';

  assert.equal(getFrontendBaseUrl(), 'https://app.example.com');
});

test('getFrontendBaseUrl prefers request origin over localhost config', () => {
  process.env.FRONTEND_URL = 'http://localhost';

  const req = createRequest({ origin: 'https://dj.example.com' });
  assert.equal(getFrontendBaseUrl({ req }), 'https://dj.example.com');
});

test('getRequestOrigin supports forwarded host headers', () => {
  const req = createRequest({
    'x-forwarded-host': 'dj.example.com',
    'x-forwarded-proto': 'https'
  });

  assert.equal(getRequestOrigin(req), 'https://dj.example.com');
});

test('buildFrontendUrl appends relative paths safely', () => {
  process.env.FRONTEND_URL = 'https://app.example.com';

  assert.equal(buildFrontendUrl('jobs/42'), 'https://app.example.com/jobs/42');
});