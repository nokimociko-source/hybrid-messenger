import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    // Get all rooms
    const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, type, last_message_id, last_message_preview, last_message_at');

    console.log('All rooms:');
    for (const r of (rooms || [])) {
        console.log(`  Room: "${r.name}" (${r.type}) | last_msg_id: ${r.last_message_id} | preview: "${r.last_message_preview}"`);

        if (r.last_message_id) {
            const { data: msg } = await supabase
                .from('messages')
                .select('id, content')
                .eq('id', r.last_message_id)
                .single();

            if (msg) console.log(`    ✅ Message exists: "${msg.content?.substring(0, 50)}"`);
            else console.log(`    ❌ Message ${r.last_message_id} DOES NOT EXIST (orphan reference!)`);
        }

        // Count actual messages
        const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', r.id);
        console.log(`    Total messages in room: ${count}`);
    }
}

checkState().catch(console.error);
