-- Fix self-chat (Избранное) permissions
-- Allow users to post messages in their own self-chat rooms

CREATE OR REPLACE FUNCTION public.check_channel_post_permission(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $
DECLARE
  v_room_type TEXT;
  v_user_role TEXT;
  v_created_by UUID;
  v_target_user_id UUID;
BEGIN
  SELECT type, created_by, target_user_id INTO v_room_type, v_created_by, v_target_user_id 
  FROM public.rooms 
  WHERE id = p_room_id;
  
  IF v_room_type IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this is a self-chat (Избранное)
  IF v_room_type = 'direct' AND v_created_by = p_user_id AND v_target_user_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- For channels, only admins can post
  IF v_room_type = 'channel' THEN
    SELECT role INTO v_user_role FROM public.room_members 
    WHERE room_id = p_room_id AND user_id = p_user_id;
    RETURN v_user_role IN ('creator', 'admin');
  END IF;
  
  -- For regular direct/community rooms, check permissions
  RETURN public.user_has_permission(p_room_id, p_user_id, 'can_send_messages');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
