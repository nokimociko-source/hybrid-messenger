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

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';