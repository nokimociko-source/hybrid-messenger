const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- Deep Data Debug ---');

    // 1. Check if we can see any rooms at all
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*');
    
    if (roomsError) console.error('Rooms Error:', roomsError);
    console.log(`Visible Rooms Total: ${rooms?.length || 0}`);
    if (rooms?.length > 0) {
        console.log('Sample Room:', JSON.stringify(rooms[0], null, 2));
    }

    // 2. Check room_members
    const { data: members, error: membersError } = await supabase
        .from('room_members')
        .select('*');
    
    if (membersError) console.error('Members Error:', membersError);
    console.log(`Visible Members Total: ${members?.length || 0}`);

    // 3. Check for exact room 'СУПЕР БОМБЕР' if possible by name
    const { data: targetRoom, error: targetError } = await supabase
        .from('rooms')
        .select('*')
        .ilike('name', '%БОМБЕР%');
    
    if (targetError) console.error('Target Room Error:', targetError);
    console.log(`Room 'БОМБЕР' found: ${targetRoom?.length || 0}`);
    
    if (targetRoom?.length > 0) {
        const roomId = targetRoom[0].id;
        // Check messages for this room
        const { data: messages, error: msgsError } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId);
        
        if (msgsError) console.error('Messages Error:', msgsError);
        console.log(`Messages in '${targetRoom[0].name}': ${messages?.length || 0}`);
    }
}

debugData();
