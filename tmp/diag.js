const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://cqqqwhtfssgfergbjqmo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rsk4vgli1zzcGE9n_N8U-w_B9q1gm1n'; // Note: I'll use the one from .env if possible, but hardcoding for now if this is the full one.
// Actually, let me check the full key from line 6 of .env again.
// Line 6 was: VITE_SUPABASE_ANON_KEY=sb_publishable_Rsk4vgli1zzcGE9n_N8U-w_B9q1gm1n
// Wait, that's not a standard Supabase anon key (which usually start with eyJ...).
// That looks like a custom proxy or something? No, it's probably the anon key.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('Fetching user_presence...');
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Presence Data:', JSON.stringify(data, null, 2));
    }
    process.exit(0);
}

run();
