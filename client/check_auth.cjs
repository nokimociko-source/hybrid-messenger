const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSession() {
    console.log('--- Auth Session Check ---');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Auth Error:', error);
        return;
    }

    if (!session) {
        console.log('No active session found (Anonymous).');
        console.log('RLS will likely block all records where auth.uid() is required.');
    } else {
        console.log('Active Session Found:');
        console.log('User ID:', session.user.id);
        console.log('Email:', session.user.email);
    }
}

checkSession();
