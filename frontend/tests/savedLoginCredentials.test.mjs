import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    clearSavedLoginCredentials,
    clearSavedLoginPassword,
    getSavedLoginCredentials,
    saveLoginCredentials,
    updateSavedLoginPassword,
} from '../src/modules/shared/utils/savedLoginCredentials.js';

const createStorage = () => {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
};

beforeEach(() => {
    global.window = {
        localStorage: createStorage(),
    };
});

afterEach(() => {
    delete global.window;
});

test('saves and reads login credentials', () => {
    saveLoginCredentials({ email: 'demo@example.com', password: 'Secret123' });

    const saved = getSavedLoginCredentials();

    assert.equal(saved?.email, 'demo@example.com');
    assert.equal(saved?.password, 'Secret123');
    assert.equal(saved?.enabled, true);
    assert.ok(saved?.savedAt);
    assert.ok(saved?.updatedAt);
});

test('clears only the saved password when credentials become stale', () => {
    saveLoginCredentials({ email: 'demo@example.com', password: 'OldSecret123' });

    clearSavedLoginPassword();

    const saved = getSavedLoginCredentials();

    assert.equal(saved?.email, 'demo@example.com');
    assert.equal(saved?.password, '');
    assert.equal(saved?.enabled, true);
});

test('updates the saved password after a successful password change', () => {
    saveLoginCredentials({ email: 'demo@example.com', password: 'OldSecret123' });

    updateSavedLoginPassword('NewSecret123');

    const saved = getSavedLoginCredentials();

    assert.equal(saved?.password, 'NewSecret123');
});

test('removes all saved credentials explicitly', () => {
    saveLoginCredentials({ email: 'demo@example.com', password: 'Secret123' });

    clearSavedLoginCredentials();

    assert.equal(getSavedLoginCredentials(), null);
});