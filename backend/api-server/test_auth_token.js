
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY; // Use Anon Key to simulate Frontend
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    console.error('Missing JWT_SECRET in .env');
    process.exit(1);
}

// Generate Token exactly like auth.js
const token = jwt.sign(
    {
        userId: 1,
        role: 'requester',
        email: 'test@example.com',
        // Standard claims for Supabase
        sub: '1', // UserId as explicit string (if RLS uses auth.uid())
        aud: 'authenticated',
        role: 'authenticated'
    },
    jwtSecret,
    { expiresIn: '1h' }
);

console.log('Generated Token (Partial):', token.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('Testing Token against Supabase RLS...');

    // Set Session
    const { data: session, error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: token
    });

    if (sessionError) {
        console.log('Set Session Warning (Client-side):', sessionError.message);
    }

    // Try Query
    const { data, error } = await supabase.from('jobs').select('*').limit(5);

    if (error) {
        console.error('❌ Query Failed:', error.message);
        console.error('   Hint: This likely means JWT_SECRET does not match Supabase JWT Secret.');
    } else {
        console.log('✅ Query Success. Count:', data.length);
        if (data.length === 0) {
            console.log('   Warning: 0 rows returned. Token might be valid but RLS blocked access (UserId mismatch?).');
        }
    }
}

main();
