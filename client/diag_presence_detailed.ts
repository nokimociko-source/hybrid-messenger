import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqqqwhtfssgfergbjqmo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rsk4vgli1zzcGE9n_N8U-w_B9q1gm1n';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- USER PRESENCE DIAGNOSTICS ---');
    const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, status, updated_at, last_seen')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const now = new Date();
    console.log(`Current server-side time (approx): ${now.toISOString()}`);
    console.log('--------------------------------------------------');

    data?.forEach(u => {
        const updated = new Date(u.updated_at || u.last_seen);
        const diffSec = Math.floor((now.getTime() - updated.getTime()) / 1000);
        const isFresh = diffSec < 120; // 2 minutes

        console.log(`User: ${u.user_id}`);
        console.log(`  Status in DB: ${u.status}`);
        console.log(`  Last Updated: ${updated.toISOString()} (${diffSec}s ago)`);
        console.log(`  Considered Online (Code Logic): ${u.status === 'online' && isFresh ? 'YES' : 'NO'}`);
        console.log('--------------------------------------------------');
    });

    process.exit(0);
}

run();
