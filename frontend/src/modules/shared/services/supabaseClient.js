
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;
const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey);
export const isSupabaseConfigured = isSupabaseEnabled;

// Dummy client สำหรับ jwt_only mode (ไม่ใช้ Supabase)
const createDummyQueryBuilder = () => {
    const result = { data: [], error: null };
    const singleResult = { data: null, error: null };

    const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        neq: () => builder,
        not: () => builder,
        gte: () => builder,
        lte: () => builder,
        ilike: () => builder,
        is: () => builder,
        order: () => builder,
        range: () => builder,
        limit: () => builder,
        maybeSingle: async () => singleResult,
        single: async () => singleResult,
        insert: async () => result,
        update: async () => result,
        upsert: async () => result,
        delete: async () => result,
        then: (resolve) => Promise.resolve(result).then(resolve),
        catch: (reject) => Promise.resolve(result).catch(reject),
        finally: (handler) => Promise.resolve(result).finally(handler)
    };

    return builder;
};

const createDummyChannel = () => {
    const channel = {
        on: () => channel,
        subscribe: (callback) => {
            if (typeof callback === 'function') {
                callback('SUBSCRIBED');
            }
            return channel;
        },
        presenceState: () => ({}),
        track: async () => ({ error: null }),
        untrack: async () => ({ error: null }),
        unsubscribe: async () => ({ error: null })
    };

    return channel;
};

const createDummyClient = () => ({
    from: () => createDummyQueryBuilder(),
    auth: {
        getSession: () => Promise.resolve({ data: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            download: () => Promise.resolve({ data: null, error: null }),
            remove: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
    },
    channel: () => createDummyChannel(),
    removeChannel: () => {},
    removeAllChannels: () => {}
});

// Create a single supabase client for interacting with your database
let _supabaseClient = isSupabaseEnabled
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createDummyClient();

// Proxy to allow hot-swapping the client instance (for Header injection)
export const supabase = new Proxy({}, {
    get: (target, prop) => _supabaseClient[prop]
});

// Function to inject custom Auth Header (Bypassing standard Auth/GoTrue)
export const setSupabaseToken = (token) => {
    if (!token || !isSupabaseEnabled) return;
    console.log('[SupabaseClient] Injecting Custom Token Header...');
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

export const clearSupabaseToken = () => {
    if (!isSupabaseEnabled) return;
    console.log('[SupabaseClient] Clearing Custom Token...');
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
};

export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
        if (error) {
            // If table doesn't exist yet, it might throw error, but connection reached server.
            // We'll consider 404 or specific DB errors as "Connected but schema missing"
            console.error("Supabase connection error:", error);
            return { success: false, message: error.message };
        }
        return { success: true, message: "Connected to Supabase successfully!" };
    } catch (err) {
        return { success: false, message: err.message };
    }
};
