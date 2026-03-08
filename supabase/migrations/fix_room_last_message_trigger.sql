-- ============================================================================
-- FIX ROOM LAST MESSAGE TRIGGER
-- ============================================================================

-- Function: Recalculate room's last message metadata
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
DECLARE
  v_last_message RECORD;
BEGIN
  -- Find the most recent message for the room
  SELECT id, created_at, content, file_name, media_url
  INTO v_last_message
  FROM public.messages
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_message.id IS NOT NULL THEN
    UPDATE public.rooms
    SET 
      last_message_id = v_last_message.id,
      last_message_at = v_last_message.created_at,
      last_message_preview = CASE 
        WHEN v_last_message.content IS NOT NULL THEN LEFT(v_last_message.content, 100)
        WHEN v_last_message.file_name IS NOT NULL THEN '📎 ' || v_last_message.file_name
        WHEN v_last_message.media_url IS NOT NULL THEN 'Медиа-файл'
        ELSE NULL
      END
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSE
    -- No messages left in the room
    UPDATE public.rooms
    SET 
      last_message_id = NULL,
      last_message_at = created_at, -- fallback to room creation time
      last_message_preview = NULL
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to cover all state-changing events
DROP TRIGGER IF EXISTS trigger_update_room_last_message ON public.messages;
CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_last_message();

-- 2. Initial synchronization: Update all rooms with current last messages
UPDATE public.rooms r
SET 
  last_message_id = m.id,
  last_message_at = m.created_at,
  last_message_preview = CASE 
    WHEN m.content IS NOT NULL THEN LEFT(m.content, 100)
    WHEN m.file_name IS NOT NULL THEN '📎 ' || m.file_name
    WHEN m.media_url IS NOT NULL THEN 'Медиа-файл'
    ELSE NULL
  END
FROM (
  SELECT DISTINCT ON (room_id) id, room_id, created_at, content, file_name, media_url
  FROM public.messages
  ORDER BY room_id, created_at DESC
) m
WHERE r.id = m.room_id;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
