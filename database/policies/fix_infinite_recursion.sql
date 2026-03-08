-- Fix Infinite Recursion in RLS Policies
-- This script removes circular dependencies between rooms and room_members policies

-- ============================================================================
-- 1. FIX ROOMS TABLE POLICIES - Remove room_members subquery
-- ============================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Rooms are viewable by participants" ON public.rooms;
DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON public.rooms;

-- Create safe SELECT policy for rooms (no subqueries to room_members)
CREATE POLICY "Rooms are viewable by participants" ON public.rooms 
  FOR SELECT USING (
    -- Direct messages: only participants can view
    (is_direct AND (auth.uid() = created_by OR auth.uid() = target_user_id))
    OR
    -- Public channels: everyone can view
    (type = 'channel' AND is_public = true)
  );

-- Create safe UPDATE policy for rooms (only creator can update)
CREATE POLICY "Room creators can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create safe DELETE policy for rooms (only creator can delete)
CREATE POLICY "Room creators can delete rooms" 
ON public.rooms 
FOR DELETE 
USING (auth.uid() = created_by);

-- ============================================================================
-- 2. FIX ROOM_MEMBERS TABLE POLICIES - Keep simple, no cross-table checks
-- ============================================================================

DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can insert room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can update room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can delete room members" ON public.room_members;

-- Simple SELECT policy - allow viewing all members (no subqueries)
CREATE POLICY "Users can view room members" 
ON public.room_members 
FOR SELECT 
USING (true);

-- INSERT policy - only allow authenticated users
CREATE POLICY "Users can insert room members" 
ON public.room_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy - only allow updating own membership
CREATE POLICY "Users can update room members" 
ON public.room_members 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE policy - only allow deleting own membership
CREATE POLICY "Users can delete room members" 
ON public.room_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. FIX MESSAGE_VIEWS POLICIES - Remove complex joins
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view statistics" ON public.message_views;
DROP POLICY IF EXISTS "Users can insert message views" ON public.message_views;

-- Simple INSERT policy - only allow authenticated users
CREATE POLICY "Users can insert message views" 
ON public.message_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Simple SELECT policy - users can view their own views
CREATE POLICY "Users can view their own message views" 
ON public.message_views 
FOR SELECT 
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. FIX TYPING_INDICATORS POLICIES - Keep simple
-- ============================================================================

DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete typing indicators" ON public.typing_indicators;

-- Simple SELECT policy
CREATE POLICY "Users can view typing indicators" 
ON public.typing_indicators 
FOR SELECT 
USING (true);

-- Simple INSERT policy
CREATE POLICY "Users can insert typing indicators" 
ON public.typing_indicators 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Simple DELETE policy
CREATE POLICY "Users can delete typing indicators" 
ON public.typing_indicators 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- These simplified policies break the circular dependency by:
-- 1. Removing EXISTS subqueries that reference other tables
-- 2. Using only direct column comparisons (auth.uid() = column)
-- 3. Keeping policies simple and non-recursive
--
-- For more complex authorization (e.g., "only admins can update"),
-- implement this logic in the application layer instead of RLS policies.
-- This is more performant and avoids recursion issues.
-- ============================================================================
