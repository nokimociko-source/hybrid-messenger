
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
    console.log('--- Starting Diagnosis ---');
    
    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('Not logged in:', userError);
        return;
    }
    console.log('Current User ID:', user.id);

    // 2. Fetch rooms
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .limit(5);

    if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
    } else {
        console.log('Rooms sample (IDs and Types):');
        rooms?.forEach(r => {
            console.log(`- ID: ${r.id} (type: ${typeof r.id}), Name: ${r.name}, Type: ${r.type}`);
        });
    }

    // 3. Check for specific room from logs if possible
    // (Assuming 9412 might be an ID)
    const { data: room9412, error: error9412 } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', '9412')
        .single();
    
    if (error9412) {
        console.log('Query for ID 9412 failed (expected if it is not 9412 or not integer):', error9412.message);
    } else {
        console.log('Found room with ID 9412!', room9412);
    }

    // 4. Check memberships
    const { data: memberships, error: memberError } = await supabase
        .from('room_members')
        .select('*')
        .eq('user_id', user.id);
    
    console.log(`User is member of ${memberships?.length || 0} rooms.`);

    console.log('--- Diagnosis Complete ---');
}

diagnose();
