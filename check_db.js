import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function checkRoom() {
    const { data: messages, error: err1 } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('Last messages:', messages?.map(m => ({ id: m.id, content: m.content, room: m.room_id, created: m.created_at })));

    if (messages && messages.length > 0) {
        const roomId = messages[0].room_id;
        const { data: room, error: err2 } = await supabase
            .from('rooms')
            .select('id, name, last_message_id, last_message_preview, last_message_at')
            .eq('id', roomId)
            .single();

        console.log('Room info:', room);
        console.log('Expected last_message_id:', messages[0].id);
        console.log('Match?', room?.last_message_id === messages[0].id);
    }
}
checkRoom().catch(console.error);
