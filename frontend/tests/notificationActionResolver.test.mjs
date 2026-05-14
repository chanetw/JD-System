import assert from 'node:assert/strict';
import test from 'node:test';

global.window = {
    location: {
        origin: 'https://dj.sena.co.th'
    }
};

const {
    NOTIFICATION_ACTION_MODES,
    normalizeNotificationLink,
    resolveNotificationAction
} = await import('../src/modules/shared/utils/notificationActionResolver.js');

test('legacy /profile notification resolves to message-only', () => {
    const result = resolveNotificationAction({
        type: 'user_session_update',
        title: 'บัญชีของคุณถูกอัปเดตโดยผู้ดูแลระบบ',
        message: 'ผู้ดูแลระบบได้อัปเดตข้อมูลบัญชีของคุณแล้ว',
        link: '/profile'
    });

    assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.MESSAGE_ONLY);
    assert.equal(result.targetUrl, null);
    assert.match(result.displayMessage, /อัปเดตข้อมูลบัญชี/);
});

test('job link resolves to job view', () => {
    const result = resolveNotificationAction({
        type: 'job_assigned',
        link: '/jobs/56'
    });

    assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.JOB_VIEW);
    assert.equal(result.targetJobId, 56);
    assert.equal(result.targetUrl, '/jobs/56');
});

test('localhost absolute link normalizes to safe relative route', () => {
    assert.equal(normalizeNotificationLink('http://localhost/profile'), '/profile');
    assert.equal(normalizeNotificationLink('http://localhost:5173/jobs/12?x=1'), '/jobs/12?x=1');
});

test('external absolute link is not navigated', () => {
    const result = resolveNotificationAction({
        type: 'unknown',
        link: 'https://example.com/jobs/12'
    });

    assert.equal(result.actionMode, NOTIFICATION_ACTION_MODES.MESSAGE_ONLY);
    assert.equal(result.targetUrl, null);
});
