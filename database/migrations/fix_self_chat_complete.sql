-- Complete fix for self-chat (Избранное) permissions
-- This fixes the issue where users cannot post messages in their own self-chat rooms

-- 1. Update user_has_permission function to support self-chat
DROP FUNCTION IF EXISTS public.user_has_permission(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_room_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
  v_room_type TEXT;
  v_created_by UUID;
  v_target_user_id UUID;
BEGIN
  -- Check if this is a self-chat (Избранное)
  SELECT type, created_by, target_user_id INTO v_room_type, v_created_by, v_target_user_id
  FROM public.rooms
  WHERE id = p_room_id;
  
  IF v_room_type = 'direct' AND v_created_by = p_user_id AND v_target_user_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  SELECT role, permissions INTO v_role, v_permissions
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  -- Creator and admin have all permissions
  IF v_role IN ('creator', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update check_channel_post_permission function to support self-chat
DROP FUNCTION IF EXISTS public.check_channel_post_permission(UUID, UUID);

CREATE OR REPLACE FUNCTION public.check_channel_post_permission(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
