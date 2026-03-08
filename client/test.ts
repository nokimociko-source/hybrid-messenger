import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: messages } = await supabase.from('messages').select('id, content, created_at, room_id, reply_to').order('created_at', { ascending: false }).limit(5);
    console.log('Last 5 messages:', messages);
    if (messages && messages.length > 0) {
        const roomId = messages[0].room_id;
        const { data: room } = await supabase.from('rooms').select('id, last_message_id, last_message_preview, last_message_at').eq('id', roomId).single();
        console.log('Room for latest message:', room);
    }
}
run();
