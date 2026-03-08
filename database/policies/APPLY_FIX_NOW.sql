-- ============================================================================
-- QUICK FIX: Run this in Supabase SQL Editor to fix infinite recursion
-- ============================================================================
-- This script removes all problematic RLS policies and replaces them with
-- simple, non-recursive versions that work correctly.
-- ============================================================================

-- Step 1: Disable RLS temporarily to clear policies
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_views DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all problematic policies
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can view statistics" ON public.message_views;
DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can insert room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can update room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can delete room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert message views" ON public.message_views;

-- Step 3: Re-enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies for rooms
CREATE POLICY "Rooms are viewable by participants" ON public.rooms 
  FOR SELECT USING (
    -- Direct messages: only participants can view
    (is_direct AND (auth.uid() = created_by OR auth.uid() = target_user_id))
    OR
    -- Public channels: everyone can view
    (type = 'channel' AND is_public = true)
  );

CREATE POLICY "Room creators can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can delete rooms" 
ON public.rooms 
FOR DELETE 
USING (auth.uid() = created_by);

-- Step 5: Create simple policies for room_members
CREATE POLICY "Users can view room members" 
ON public.room_members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert room members" 
ON public.room_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update room members" 
ON public.room_members 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete room members" 
ON public.room_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Create simple policies for typing_indicators
CREATE POLICY "Users can view typing indicators" 
ON public.typing_indicators 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert typing indicators" 
ON public.typing_indicators 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete typing indicators" 
ON public.typing_indicators 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 7: Create simple policies for message_views
CREATE POLICY "Users can insert message views" 
ON public.message_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own message views" 
ON public.message_views 
FOR SELECT 
USING (auth.uid() = user_id);

-- ============================================================================
-- DONE! The infinite recursion should now be fixed.
-- ============================================================================
-- Test by running:
-- SELECT * FROM public.rooms LIMIT 1;
-- SELECT * FROM public.room_members LIMIT 1;
-- SELECT * FROM public.typing_indicators LIMIT 1;
-- ============================================================================
