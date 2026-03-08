-- ============================================================================
-- FIX MESSAGE DELETION (Permission & Real-time Metadata)
-- ============================================================================

-- 1. Metadata fix: Ensure real-time DELETE events include all columns
-- This allows client-side filtering by room_id even on DELETE.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Secure deletion function
-- Allows deletion if user is author OR admin/creator of the room.
CREATE OR REPLACE FUNCTION public.p_delete_message(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_room_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get message details
  SELECT user_id, room_id INTO v_author_id, v_room_id 
  FROM public.messages 
  WHERE id = p_message_id;

  -- If message doesn't exist, return false
  IF v_room_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is author
  IF v_author_id = p_user_id THEN
    DELETE FROM public.messages WHERE id = p_message_id;
    -- Update room to notify listeners
    UPDATE public.rooms SET last_message_at = now() WHERE id = v_room_id;
    RETURN TRUE;
  END IF;

  -- Check if user is admin/creator of the room
  -- Reusing user_has_permission if it exists, or doing a direct check
  SELECT (role IN ('creator', 'admin')) INTO v_is_admin
  FROM public.room_members 
  WHERE room_id = v_room_id AND user_id = p_user_id;

  IF v_is_admin THEN
    DELETE FROM public.messages WHERE id = p_message_id;
    -- Update room to notify listeners
    UPDATE public.rooms SET last_message_at = now() WHERE id = v_room_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
