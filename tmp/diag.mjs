import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqqqwhtfssgfergbjqmo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rsk4vgli1zzcGE9n_N8U-w_B9q1gm1n';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('Fetching user_presence...');
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error) {
        console.error('Error fetching data:', error);
    } else {
        console.log('Presence Data (Sample):');
        console.log(JSON.stringify(data?.slice(0, 5), null, 2));

        const online = data?.filter(d => d.status === 'online');
        console.log(`\nTotal users: ${data?.length}`);
        console.log(`Online users in DB: ${online?.length}`);
        online?.forEach(u => {
            const updated = new Date(u.updated_at || u.last_seen);
            const diff = (Date.now() - updated.getTime()) / 1000;
            console.log(` - User ${u.user_id}: status=${u.status}, updated ${Math.round(diff)}s ago`);
        });
    }
    process.exit(0);
}

run();
