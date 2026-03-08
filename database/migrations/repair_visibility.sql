-- =============================================
-- REPAIR VISIBILITY AND PERMISSIONS
-- Run this in Supabase SQL Editor to fix "No messages" and room visibility.
-- =============================================

-- 1. Ensure RLS is active
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Grant access to 'authenticated' and 'anon' roles (with restrictions)
-- For the diagnosis, we allow 'anon' to see rooms if they are public.
-- In production, 'anon' usually shouldn't see much, but here we want to debug.

DROP POLICY IF EXISTS "public_rooms_visible_to_all" ON public.rooms;
CREATE POLICY "public_rooms_visible_to_all" 
ON public.rooms FOR SELECT 
USING (is_public = true OR type = 'channel');

DROP POLICY IF EXISTS "members_can_see_their_rooms" ON public.rooms;
CREATE POLICY "members_can_see_their_rooms" 
ON public.rooms FOR SELECT 
USING (
    auth.uid() = created_by 
    OR auth.uid() = target_user_id 
    OR id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
);

-- 3. Messages visibility
DROP POLICY IF EXISTS "messages_visible_in_public_rooms" ON public.messages;
CREATE POLICY "messages_visible_in_public_rooms" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.rooms 
        WHERE rooms.id = messages.room_id 
        AND (rooms.is_public = true OR rooms.type = 'channel')
    )
);

DROP POLICY IF EXISTS "messages_visible_to_members" ON public.messages;
CREATE POLICY "messages_visible_to_members" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.room_members 
        WHERE room_members.room_id = messages.room_id 
        AND room_members.user_id = auth.uid()
    )
);

-- 4. Fix potential missing membership for the creator
-- If a user created a room but isn't a member, they might see it but not see messages.
INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, created_by, 'creator'
FROM public.rooms
WHERE created_by IS NOT NULL
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 5. Final sync notification
NOTIFY pgrst, 'reload schema';
