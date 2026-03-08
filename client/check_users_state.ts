import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('--- USERS TABLE ---');
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(20);

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.table(data.map(u => ({
            id: u.id,
            username: u.username,
            avatar: u.avatar_url ? 'Yes' : 'No',
            about: u.about
        })));
    }

    console.log('\n--- RECENT ROOMS ---');
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
    } else {
        console.table(rooms);
    }
}

checkUsers();
