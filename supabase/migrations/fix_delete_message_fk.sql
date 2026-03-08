-- Fix for message deletion error
-- Part 1: Fix foreign key violation
-- The issue occurs when deleting a message that is currently the last_message_id of a room.
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_last_message_id_fkey;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_last_message_id_fkey
  FOREIGN KEY (last_message_id)
  REFERENCES public.messages(id)
  ON DELETE SET NULL;

-- Part 2: Secure deletion function (simplified to rely on trigger)
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

  -- Check if user is author OR admin/creator
  SELECT (role IN ('creator', 'admin')) INTO v_is_admin
  FROM public.room_members 
  WHERE room_id = v_room_id AND user_id = p_user_id;

  IF v_author_id = p_user_id OR v_is_admin THEN
    DELETE FROM public.messages WHERE id = p_message_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 3: Robust trigger for room previews
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
DECLARE
    v_room_id UUID;
    v_last_message RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_room_id := OLD.room_id;
    ELSE
        v_room_id := NEW.room_id;
    END IF;

    -- Find the most recent message in the room
    SELECT id, created_at, content, file_name 
    INTO v_last_message
    FROM public.messages
    WHERE room_id = v_room_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_message.id IS NOT NULL THEN
        UPDATE public.rooms
        SET 
            last_message_id = v_last_message.id,
            last_message_at = v_last_message.created_at,
            last_message_preview = 
                CASE
                    WHEN v_last_message.content IS NOT NULL AND v_last_message.content <> '' THEN
                        LEFT(v_last_message.content, 50) || CASE WHEN LENGTH(v_last_message.content) > 50 THEN '...' ELSE '' END
                    WHEN v_last_message.file_name IS NOT NULL THEN
                        '📎 ' || v_last_message.file_name
                    ELSE
                        'Медиа-файл'
                END
        WHERE id = v_room_id;
    ELSE
        -- No messages left, clear fields
        UPDATE public.rooms
        SET 
            last_message_id = NULL,
            last_message_at = NULL,
            last_message_preview = NULL
        WHERE id = v_room_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
