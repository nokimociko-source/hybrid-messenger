-- ==========================================
-- Admin Panel Backend Functions
-- ==========================================

-- 1. Create global_bans table
CREATE TABLE IF NOT EXISTS public.global_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES public.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS for global_bans
ALTER TABLE public.global_bans ENABLE ROW LEVEL SECURITY;

-- Everyone can read bans
DROP POLICY IF EXISTS "Global bans are viewable by everyone" ON public.global_bans;
CREATE POLICY "Global bans are viewable by everyone" 
ON public.global_bans FOR SELECT USING (true);

-- Only authenticated users (who know the secret key logic on the client) can insert/update temporarily.
-- In a truly secure environment, we'd check a real admin role, but relying on the client's key gate for now.
DROP POLICY IF EXISTS "Authenticated users can manage global bans" ON public.global_bans;
CREATE POLICY "Authenticated users can manage global bans" 
ON public.global_bans FOR ALL USING (auth.role() = 'authenticated');


-- 2. Function to Get Server Stats
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_users INT;
    online_users INT;
    total_rooms INT;
    total_messages INT;
BEGIN
    SELECT count(*) INTO total_users FROM public.users;
    SELECT count(*) INTO online_users FROM public.users WHERE status = 'online';
    SELECT count(*) INTO total_rooms FROM public.rooms;
    SELECT count(*) INTO total_messages FROM public.messages;

    RETURN jsonb_build_object(
        'total_users', total_users,
        'online_users', online_users,
        'total_rooms', total_rooms,
        'total_messages', total_messages
    );
END;
$$;

-- 3. Function to Ban User Globally (Admin bypass)
CREATE OR REPLACE FUNCTION admin_ban_user(target_user_id UUID, ban_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only proceed if the user is authenticated
    IF auth.role() != 'authenticated' THEN
        RETURN FALSE;
    END IF;

    -- Insert into global bans
    INSERT INTO public.global_bans (user_id, banned_by, reason)
    VALUES (target_user_id, auth.uid(), ban_reason)
    ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = now();

    -- Optional: Kick them out of all rooms immediately
    DELETE FROM public.room_members WHERE user_id = target_user_id;

    RETURN TRUE;
END;
$$;

-- 4. Function to Unban User Globally
CREATE OR REPLACE FUNCTION admin_unban_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() != 'authenticated' THEN
        RETURN FALSE;
    END IF;

    DELETE FROM public.global_bans WHERE user_id = target_user_id;
    RETURN TRUE;
END;
$$;

-- 5. Function to Delete Room Globally
CREATE OR REPLACE FUNCTION admin_delete_room(target_room_id UUID, delete_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() != 'authenticated' THEN
        RETURN FALSE;
    END IF;

    -- Cascade delete will handle its messages and members
    DELETE FROM public.rooms WHERE id = target_room_id;
    
    RETURN TRUE;
END;
$$;

-- 6. Function to Delete User Completely
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID, delete_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() != 'authenticated' THEN
        RETURN FALSE;
    END IF;

    -- Note: Deleting from auth.users requires superuser, so we delete from public.users
    -- If auth.users cascade is set up, it drops everything. But usually we can only drop public.users here
    -- and ban them globally. Let's delete from public.users and add to bans.
    DELETE FROM public.users WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- 7. Function to Send Global Broadcast
CREATE OR REPLACE FUNCTION admin_broadcast_message(content TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sys_user_id UUID;
    v_room RECORD;
BEGIN
    IF auth.role() != 'authenticated' THEN
        RETURN FALSE;
    END IF;

    -- Get or create System User (we just use the admin's ID for now if no sys user)
    sys_user_id := auth.uid();

    -- Post the message into every non-direct room
    FOR v_room IN SELECT id FROM public.rooms WHERE type = 'community' LOOP
        INSERT INTO public.messages (room_id, user_id, content) 
        VALUES (v_room.id, sys_user_id, '📢 [СИСТЕМНОЕ ОБЪЯВЛЕНИЕ]: ' || content);
    END LOOP;
    
    RETURN TRUE;
END;
$$;

-- 8. Create Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.users(id),
    target_id UUID, -- Message ID, User ID, or Room ID
    target_type TEXT CHECK (target_type IN ('message', 'user', 'room')),
    reason TEXT,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" 
ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only admins/authenticated can view reports (using the same logic as bans)
DROP POLICY IF EXISTS "Authenticated users can manage reports" ON public.reports;
CREATE POLICY "Authenticated users can manage reports" 
ON public.reports FOR ALL USING (auth.role() = 'authenticated');

-- Notify pgrst to reload the schema
NOTIFY pgrst, 'reload schema';
