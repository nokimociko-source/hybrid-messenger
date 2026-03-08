-- Исправление синтаксических ошибок в функциях базы данных
-- Применить этот скрипт в Supabase SQL Editor

-- Function to automatically unarchive a chat when a new message arrives
CREATE OR REPLACE FUNCTION public.auto_unarchive_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove archive status for all users in the room except the sender
  DELETE FROM public.archived_chats
  WHERE room_id = NEW.room_id
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_unarchive ON public.messages;
CREATE TRIGGER trigger_auto_unarchive
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_unarchive_on_message();

-- Function to extract @username mentions from message content
CREATE OR REPLACE FUNCTION public.extract_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_pattern TEXT := '@([a-zA-Z0-9_]+)';
  mentioned_username TEXT;
  mentioned_user_id UUID;
BEGIN
  -- Extract all @username patterns from content
  FOR mentioned_username IN
    SELECT DISTINCT regexp_matches[1]
    FROM regexp_matches(NEW.content, mention_pattern, 'g')
  LOOP
    -- Find user ID by username
    SELECT id INTO mentioned_user_id
    FROM public.users
    WHERE username = mentioned_username;
    
    -- Create mention record if user exists and is not the sender
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.mentions (
        message_id,
        room_id,
        mentioned_user_id,
        mentioned_by_user_id
      )
      VALUES (
        NEW.id,
        NEW.room_id,
        mentioned_user_id,
        NEW.user_id
      )
      ON CONFLICT (message_id, mentioned_user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_extract_mentions ON public.messages;
CREATE TRIGGER trigger_extract_mentions
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.extract_mentions();

-- Function to automatically remove pin status when a chat is archived
CREATE OR REPLACE FUNCTION public.unpin_archived_chat()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pinned_chats
  WHERE user_id = NEW.user_id
    AND room_id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_unpin_archived ON public.archived_chats;
CREATE TRIGGER trigger_unpin_archived
  AFTER INSERT ON public.archived_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.unpin_archived_chat();

-- Function to mark mentions as read
CREATE OR REPLACE FUNCTION public.mark_mention_as_read(p_mention_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.mentions
  SET is_read = true,
      read_at = timezone('utc'::text, now())
  WHERE id = p_mention_id
    AND mentioned_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all mentions in a room as read
CREATE OR REPLACE FUNCTION public.mark_room_mentions_as_read(p_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.mentions
  SET is_read = true,
      read_at = timezone('utc'::text, now())
  WHERE room_id = p_room_id
    AND mentioned_user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread mention count for user
CREATE OR REPLACE FUNCTION public.get_unread_mention_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.mentions
    WHERE mentioned_user_id = target_user_id
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread mention count per room
CREATE OR REPLACE FUNCTION public.get_room_mention_counts(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(room_id UUID, mention_count BIGINT) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT m.room_id, COUNT(*)
  FROM public.mentions m
  WHERE m.mentioned_user_id = target_user_id
    AND m.is_read = false
  GROUP BY m.room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save or update message draft
CREATE OR REPLACE FUNCTION public.save_message_draft(
  p_room_id UUID,
  p_content TEXT,
  p_reply_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  draft_id UUID;
BEGIN
  INSERT INTO public.message_drafts (user_id, room_id, content, reply_to)
  VALUES (auth.uid(), p_room_id, p_content, p_reply_to)
  ON CONFLICT (user_id, room_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    reply_to = EXCLUDED.reply_to,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO draft_id;
  
  RETURN draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message draft
CREATE OR REPLACE FUNCTION public.delete_message_draft(p_room_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.message_drafts
  WHERE user_id = auth.uid()
    AND room_id = p_room_id;
  
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'community', 'channel')),
  topic TEXT,
  created_by UUID REFERENCES public.users(id),
  is_direct BOOLEAN DEFAULT false,
  target_user_id UUID REFERENCES public.users(id),
  avatar_url TEXT,
  member_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  slowmode_interval INTEGER DEFAULT 0,
  permissions JSONB DEFAULT '{
    "can_send_messages": true,
    "can_send_media": true,
    "can_send_polls": true,
    "can_send_links": true,
    "can_add_members": true,
    "can_pin_messages": false,
    "can_change_info": false,
    "can_manage_permissions": false,
    "can_manage_slowmode": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's draft for a room
CREATE OR REPLACE FUNCTION public.get_message_draft(p_room_id UUID)
RETURNS TABLE(
  id UUID,
  content TEXT,
  reply_to UUID,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.content, d.reply_to, d.updated_at
  FROM public.message_drafts d
  WHERE d.user_id = auth.uid()
    AND d.room_id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if chat is muted for user
CREATE OR REPLACE FUNCTION public.is_chat_muted(p_room_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  mute_record RECORD;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO mute_record
  FROM public.mute_settings
  WHERE user_id = target_user_id
    AND room_id = p_room_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if indefinite mute
  IF mute_record.is_indefinite THEN
    RETURN true;
  END IF;
  
  -- Check if timed mute is still active
  IF mute_record.muted_until IS NOT NULL AND mute_record.muted_until > timezone('utc'::text, now()) THEN
    RETURN true;
  END IF;
  
  -- Mute expired, clean up
  DELETE FROM public.mute_settings
  WHERE id = mute_record.id;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired mutes (scheduled job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_mutes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.mute_settings
  WHERE is_indefinite = false
    AND muted_until IS NOT NULL
    AND muted_until < timezone('utc'::text, now());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's folder for a chat
CREATE OR REPLACE FUNCTION public.get_chat_folder(p_room_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  target_user_id UUID;
  folder_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT cfi.folder_id INTO folder_id
  FROM public.chat_folder_items cfi
  JOIN public.chat_folders cf ON cf.id = cfi.folder_id
  WHERE cfi.room_id = p_room_id
    AND cf.user_id = target_user_id;
  
  RETURN folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move chat to folder
CREATE OR REPLACE FUNCTION public.move_chat_to_folder(
  p_room_id UUID,
  p_folder_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Remove from current folder if exists
  DELETE FROM public.chat_folder_items
  WHERE room_id = p_room_id
    AND folder_id IN (
      SELECT id FROM public.chat_folders WHERE user_id = auth.uid()
    );
  
  -- Add to new folder if not null
  IF p_folder_id IS NOT NULL THEN
    INSERT INTO public.chat_folder_items (folder_id, room_id)
    VALUES (p_folder_id, p_room_id)
    ON CONFLICT (folder_id, room_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder folders
CREATE OR REPLACE FUNCTION public.reorder_folders(p_folder_orders JSONB)
RETURNS VOID AS $$
DECLARE
  folder_item JSONB;
BEGIN
  FOR folder_item IN SELECT * FROM jsonb_array_elements(p_folder_orders)
  LOOP
    UPDATE public.chat_folders
    SET order_index = (folder_item->>'order_index')::INTEGER,
        updated_at = timezone('utc'::text, now())
    WHERE id = (folder_item->>'id')::UUID
      AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder pinned chats
CREATE OR REPLACE FUNCTION public.reorder_pinned_chats(p_pin_orders JSONB)
RETURNS VOID AS $$
DECLARE
  pin_item JSONB;
BEGIN
  FOR pin_item IN SELECT * FROM jsonb_array_elements(p_pin_orders)
  LOOP
    UPDATE public.pinned_chats
    SET order_index = (pin_item->>'order_index')::INTEGER
    WHERE id = (pin_item->>'id')::UUID
      AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chat organization status for user
CREATE OR REPLACE FUNCTION public.get_chat_status(p_room_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  is_pinned BOOLEAN,
  is_archived BOOLEAN,
  is_muted BOOLEAN,
  folder_id UUID,
  pin_order INTEGER,
  unread_mentions INTEGER
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM public.pinned_chats WHERE room_id = p_room_id AND user_id = target_user_id) AS is_pinned,
    EXISTS(SELECT 1 FROM public.archived_chats WHERE room_id = p_room_id AND user_id = target_user_id) AS is_archived,
    public.is_chat_muted(p_room_id, target_user_id) AS is_muted,
    public.get_chat_folder(p_room_id, target_user_id) AS folder_id,
    COALESCE((SELECT order_index FROM public.pinned_chats WHERE room_id = p_room_id AND user_id = target_user_id), -1) AS pin_order,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.mentions WHERE room_id = p_room_id AND mentioned_user_id = target_user_id AND is_read = false), 0) AS unread_mentions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
