-- =============================================
-- CLEAN RLS FIX (v2) - Run this in Supabase SQL Editor
-- Fixes: infinite recursion detected in policy for relation "room_members"
-- =============================================

-- Step 1: Drop ALL existing policies on affected tables to start clean
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('rooms', 'room_members', 'messages')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;

-- Step 2: Create a SECURITY DEFINER function to get user's room IDs.
-- This breaks the infinite recursion by running WITHOUT RLS checks.
CREATE OR REPLACE FUNCTION public.get_my_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT room_id FROM public.room_members WHERE user_id = auth.uid();
$$;

-- Step 3: Enable RLS on tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 4: ROOMS policies (uses the SECURITY DEFINER function - no recursion)
CREATE POLICY "members_can_see_room"
ON public.rooms FOR SELECT TO authenticated
USING (
    id IN (SELECT public.get_my_room_ids())
    OR created_by = auth.uid()
    OR target_user_id = auth.uid()
);

CREATE POLICY "public_channels_visible"
ON public.rooms FOR SELECT TO authenticated
USING (type = 'channel' AND is_public = true);

CREATE POLICY "members_can_update_room"
ON public.rooms FOR UPDATE TO authenticated
USING (id IN (SELECT public.get_my_room_ids()));

CREATE POLICY "creator_can_delete_room"
ON public.rooms FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "authenticated_can_create_room"
ON public.rooms FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Step 5: ROOM_MEMBERS policy (simple - no subquery, no recursion)
CREATE POLICY "user_sees_own_memberships"
ON public.room_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "allow_insert_memberships"
ON public.room_members FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    OR room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
);

CREATE POLICY "creator_can_manage_members"
ON public.room_members FOR ALL TO authenticated
USING (
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
)
WITH CHECK (
    room_id IN (SELECT id FROM public.rooms WHERE created_by = auth.uid())
);

-- Step 6: MESSAGES policies (uses the SECURITY DEFINER function - no recursion)
CREATE POLICY "member_can_see_messages"
ON public.messages FOR SELECT TO authenticated
USING (room_id IN (SELECT public.get_my_room_ids()));

CREATE POLICY "member_can_insert_messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND room_id IN (SELECT public.get_my_room_ids())
);

CREATE POLICY "owner_can_update_message"
ON public.messages FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- ----------------------------------------------
-- USERS: All authenticated users can see each other (for search, mentions, DMs)
-- Users can only edit their own profile
-- ----------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_view_users" ON public.users;
CREATE POLICY "authenticated_can_view_users"
ON public.users FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "user_can_update_own_profile" ON public.users;
CREATE POLICY "user_can_update_own_profile"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "user_can_insert_own_profile" ON public.users;
CREATE POLICY "user_can_insert_own_profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
