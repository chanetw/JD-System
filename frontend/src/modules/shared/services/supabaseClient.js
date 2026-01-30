
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// Create a single supabase client for interacting with your database
let _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Proxy to allow hot-swapping the client instance (for Header injection)
export const supabase = new Proxy({}, {
    get: (target, prop) => _supabaseClient[prop]
});

// Function to inject custom Auth Header (Bypassing standard Auth/GoTrue)
export const setSupabaseToken = (token) => {
    if (!token) return;
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
