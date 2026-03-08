-- ============================================
-- Fix: Add UPDATE policy for rooms table
-- ============================================
-- Allows room creators and admins to update room information (name, topic, avatar_url)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON public.rooms;

-- Create UPDATE policy for rooms
-- Allows users who are creators or admins of the room to update it
CREATE POLICY "Room creators and admins can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (
  -- User is the creator
  auth.uid() = created_by
  OR
  -- User is an admin in the room
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = rooms.id 
    AND user_id = auth.uid()
    AND role IN ('creator', 'admin')
  )
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'rooms'
  AND cmd = 'UPDATE'
ORDER BY policyname;
