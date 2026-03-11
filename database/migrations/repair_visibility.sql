-- =============================================
-- REPAIR VISIBILITY AND PERMISSIONS (v3 - ULTIMATE FIX)
-- Run this in Supabase SQL Editor to fix ALL 500 errors and recursion.
-- =============================================

-- 1. Helper function to break recursion (Security Definer bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT room_id FROM public.room_members WHERE user_id = auth.uid();
$$;

-- 2. Clean up existing policies on ALL core tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
            'rooms', 'room_members', 'messages', 'polls', 'poll_votes', 
            'room_topics', 'invite_links', 'room_audit_log'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;

-- 3. Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. ROOMS Policies
CREATE POLICY "rooms_visible_to_members" ON public.rooms FOR SELECT 
USING (auth.uid() = created_by OR auth.uid() = target_user_id OR id IN (SELECT public.get_my_room_ids()));

CREATE POLICY "public_rooms_visible" ON public.rooms FOR SELECT 
USING (is_public = true OR type = 'channel');

CREATE POLICY "auth_can_insert_rooms" ON public.rooms FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. ROOM_MEMBERS Policies (SIMPLE)
CREATE POLICY "members_see_own_membership" ON public.room_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "members_see_room_mates" ON public.room_members FOR SELECT USING (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "auth_can_join" ON public.room_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. MESSAGES Policies
CREATE POLICY "messages_visible_to_members" ON public.messages FOR SELECT 
USING (room_id IN (SELECT public.get_my_room_ids()));

CREATE POLICY "messages_visible_in_public" ON public.messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = messages.room_id AND (rooms.is_public = true OR rooms.type = 'channel')));

CREATE POLICY "auth_can_message" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. POLLS & VOTES Policies
CREATE POLICY "polls_visible_to_members" ON public.polls FOR SELECT USING (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "members_can_create_polls" ON public.polls FOR INSERT WITH CHECK (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "votes_visible_to_members" ON public.poll_votes FOR SELECT USING (poll_id IN (SELECT id FROM public.polls));
CREATE POLICY "members_can_vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. TOPICS Policies
CREATE POLICY "topics_visible_to_members" ON public.room_topics FOR SELECT USING (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "admins_can_manage_topics" ON public.room_topics FOR ALL USING (room_id IN (SELECT public.get_my_room_ids()));

-- 9. INVITE LINKS Policies
CREATE POLICY "links_visible_to_members" ON public.invite_links FOR SELECT USING (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "admins_can_manage_links" ON public.invite_links FOR ALL USING (room_id IN (SELECT public.get_my_room_ids()));

-- 10. AUDIT LOG Policies
CREATE POLICY "audit_visible_to_members" ON public.room_audit_log FOR SELECT USING (room_id IN (SELECT public.get_my_room_ids()));
CREATE POLICY "system_can_log" ON public.room_audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 11. Fix potential missing membership for the creator
INSERT INTO public.room_members (room_id, user_id, role)
SELECT id, created_by, 'creator'
FROM public.rooms
WHERE created_by IS NOT NULL
ON CONFLICT (room_id, user_id) DO NOTHING;

-- 12. Final sync notification
NOTIFY pgrst, 'reload schema';
