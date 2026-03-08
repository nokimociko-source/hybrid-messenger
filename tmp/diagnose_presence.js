const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/Projects/gjguuuhj/hybrid_messenger/client/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnose() {
    console.log('--- Checking user_presence table ---');
    const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching user_presence:', error);
    } else {
        console.log('Sample user_presence rows:', data);
    }

    console.log('\n--- Checking for Realtime enabling ---');
    // We can't easily check for Realtime enablement via JS API, 
    // but we can check if we can subscribe.
    const channel = supabase.channel('diag_presence');
    channel.subscribe((status) => {
        console.log('Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription works!');
        }
        process.exit(0);
    });
}

diagnose();
