
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
