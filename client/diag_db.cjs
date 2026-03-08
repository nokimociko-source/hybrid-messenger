
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cqqqwhtfssgfergbjqmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Rsk4vgli1zzcGE9n_N8U-w_B9q1gm1n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Database ID Type Check ---');
    
    // Fetch a sample of rooms
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, type')
        .limit(10);
    
    if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
    } else {
        console.log(`Found ${rooms?.length || 0} rooms.`);
        rooms?.forEach(r => {
            console.log(`- ID: ${r.id} (type: ${typeof r.id}), Name: ${r.name}, Type: ${r.type}`);
        });
    }

    // Try to count total rooms
    const { count, error: countError } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('Error counting rooms:', countError);
    } else {
        console.log('Total rooms visible:', count);
    }
}

check();
