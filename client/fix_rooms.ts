import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Using service_role key for admin operations if available, else anon key
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDanglingLastMessages() {
    console.log('🔍 Finding rooms with broken last_message_id...');

    // Get all rooms
    const { data: rooms, error: roomsErr } = await supabase
        .from('rooms')
        .select('id, last_message_id, last_message_preview, last_message_at');

    if (roomsErr) {
        console.error('❌ Failed to fetch rooms:', roomsErr.message);
        return;
    }

    console.log(`Found ${rooms?.length || 0} rooms`);

    let fixed = 0;
    for (const room of (rooms || [])) {
        if (!room.last_message_id) continue;

        // Check if the referenced message still exists
        const { data: msg } = await supabase
            .from('messages')
            .select('id, content, file_name, created_at')
            .eq('id', room.last_message_id)
            .single();

        if (!msg) {
            console.log(`⚠️  Room ${room.id} has dangling last_message_id: ${room.last_message_id}. Fixing...`);

            // Find the actual latest message in this room
            const { data: latestMsg } = await supabase
                .from('messages')
                .select('id, content, file_name, created_at')
                .eq('room_id', room.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestMsg) {
                const preview = latestMsg.content
                    ? (latestMsg.content.length > 50 ? latestMsg.content.substring(0, 50) + '...' : latestMsg.content)
                    : latestMsg.file_name ? `📎 ${latestMsg.file_name}` : 'Медиа-файл';

                const { error: updateErr } = await supabase
                    .from('rooms')
                    .update({
                        last_message_id: latestMsg.id,
                        last_message_at: latestMsg.created_at,
                        last_message_preview: preview
                    })
                    .eq('id', room.id);

                if (updateErr) {
                    console.error(`❌ Failed to update room ${room.id}:`, updateErr.message);
                } else {
                    console.log(`✅ Fixed room ${room.id} → last message: "${preview}"`);
                    fixed++;
                }
            } else {
                // No messages left, clear the fields
                const { error: clearErr } = await supabase
                    .from('rooms')
                    .update({
                        last_message_id: null,
                        last_message_at: null,
                        last_message_preview: null
                    })
                    .eq('id', room.id);

                if (clearErr) {
                    console.error(`❌ Failed to clear room ${room.id}:`, clearErr.message);
                } else {
                    console.log(`✅ Cleared empty room ${room.id}`);
                    fixed++;
                }
            }
        }
    }

    console.log(`\n✅ Done! Fixed ${fixed} rooms.`);
}

fixDanglingLastMessages().catch(console.error);
