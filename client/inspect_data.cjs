const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRooms() {
    console.log('--- Room Inspection ---');
    
    // Try to get just the count of all rooms to see if RLS blocks completely
    const { count, error: countError } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });
    
    if (countError) {
        console.error('Count Error (RLS likely blocks all):', countError);
    } else {
        console.log('Total rooms in DB (visible to you):', count);
    }

    // Try to find if there is ANY room that is NOT direct
    const { data: publicRooms, error: pubError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_direct', false);
    
    if (pubError) console.error('Public Rooms Error:', pubError);
    console.log('Non-direct rooms visible:', publicRooms?.length || 0);

    // Check room_members for current user (if we had a token)
    // Since we don't have a token here, let's see if we can see ANY memberships
    const { data: allMembers, error: allMemError } = await supabase
        .from('room_members')
        .select('room_id, user_id');
    
    if (allMemError) console.error('All Members Error:', allMemError);
    console.log('Total room_members records visible:', allMembers?.length || 0);
}

inspectRooms();
