const STORAGE_KEY = 'dj_saved_login_credentials_v1';
const STORAGE_VERSION = 1;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRaw = () => {
    if (!canUseStorage()) return null;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || parsed.version !== STORAGE_VERSION) {
            window.localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        const email = typeof parsed.email === 'string' ? parsed.email : '';
        const password = typeof parsed.password === 'string' ? parsed.password : '';
        const enabled = parsed.enabled === true;
        const savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
        const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null;

        if (!enabled && !email && !password) {
            window.localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return {
            version: STORAGE_VERSION,
            email,
            password,
            enabled,
            savedAt,
            updatedAt,
        };
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

const writeRaw = (value) => {
    if (!canUseStorage()) return null;

    if (!value || (!value.email && !value.password && !value.enabled)) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return value;
};

export const getSavedLoginCredentials = () => readRaw();

export const saveLoginCredentials = ({ email, password }) => {
    const now = new Date().toISOString();
    const current = readRaw();

    return writeRaw({
        version: STORAGE_VERSION,
        email: String(email || '').trim(),
        password: String(password || ''),
        enabled: true,
        savedAt: current?.savedAt || now,
        updatedAt: now,
    });
};

export const clearSavedLoginCredentials = () => {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(STORAGE_KEY);
};

export const clearSavedLoginPassword = () => {
    const current = readRaw();
    if (!current?.email) {
        clearSavedLoginCredentials();
        return null;
    }

    return writeRaw({
        ...current,
        password: '',
        enabled: true,
        updatedAt: new Date().toISOString(),
    });
};

export const updateSavedLoginPassword = (nextPassword) => {
    const current = readRaw();
    if (!current?.enabled || !current?.email) {
        return null;
    }

    return writeRaw({
        ...current,
        password: String(nextPassword || ''),
        updatedAt: new Date().toISOString(),
    });
};

export const hasSavedLoginCredentials = () => {
    const current = readRaw();
    return Boolean(current?.enabled && (current.email || current.password));
};

export const SAVED_LOGIN_CREDENTIALS_KEY = STORAGE_KEY;