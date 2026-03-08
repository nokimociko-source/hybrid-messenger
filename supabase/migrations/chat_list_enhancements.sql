-- Улучшения для списка чатов (как в Telegram)

-- 1. Таблица для отслеживания непрочитанных сообщений
CREATE TABLE IF NOT EXISTS public.unread_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  unread_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, room_id),
  CONSTRAINT unread_count_check CHECK (unread_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_unread_messages_user_id ON public.unread_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_unread_messages_room_id ON public.unread_messages(room_id);

-- 2. Таблица для статуса "печатает..."
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_room_id ON public.typing_indicators(room_id, expires_at);

-- 3. Таблица для онлайн статуса
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status, last_seen);

-- 4. Таблица для статусов доставки сообщений
CREATE TABLE IF NOT EXISTS public.message_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id ON public.message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user_id ON public.message_receipts(user_id);

-- 5. Добавить поля в таблицу messages для последнего сообщения
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- 6. Добавить поля в таблицу rooms для кэширования последнего сообщения
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- ============================================
-- RLS Policies
-- ============================================

-- Unread messages RLS
ALTER TABLE public.unread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own unread counts" ON public.unread_messages;
CREATE POLICY "Users can view their own unread counts"
  ON public.unread_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own unread counts" ON public.unread_messages;
CREATE POLICY "Users can update their own unread counts"
  ON public.unread_messages FOR ALL
  USING (auth.uid() = user_id);

-- Typing indicators RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view typing in their rooms" ON public.typing_indicators;
CREATE POLICY "Users can view typing in their rooms"
  ON public.typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = typing_indicators.room_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can set their own typing status" ON public.typing_indicators;
CREATE POLICY "Users can set their own typing status"
  ON public.typing_indicators FOR ALL
  USING (auth.uid() = user_id);

-- User presence RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view user presence" ON public.user_presence;
CREATE POLICY "Everyone can view user presence"
  ON public.user_presence FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own presence" ON public.user_presence;
CREATE POLICY "Users can update their own presence"
  ON public.user_presence FOR ALL
  USING (auth.uid() = user_id);

-- Message receipts RLS
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view receipts for their messages" ON public.message_receipts;
CREATE POLICY "Users can view receipts for their messages"
  ON public.message_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE id = message_receipts.message_id
      AND user_id = auth.uid()
    )
    OR auth.uid() = message_receipts.user_id
  );

DROP POLICY IF EXISTS "Users can create their own receipts" ON public.message_receipts;
CREATE POLICY "Users can create their own receipts"
  ON public.message_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own receipts" ON public.message_receipts;
CREATE POLICY "Users can update their own receipts"
  ON public.message_receipts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function: Update unread count when new message arrives
CREATE OR REPLACE FUNCTION public.update_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all room members except sender
  INSERT INTO public.unread_messages (user_id, room_id, unread_count)
  SELECT 
    rm.user_id,
    NEW.room_id,
    1
  FROM public.room_members rm
  WHERE rm.room_id = NEW.room_id
    AND rm.user_id != NEW.user_id
  ON CONFLICT (user_id, room_id)
  DO UPDATE SET
    unread_count = public.unread_messages.unread_count + 1,
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_unread_count ON public.messages;
CREATE TRIGGER trigger_update_unread_count
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unread_count();

-- Function: Update room's last message cache
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooms
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_room_last_message ON public.messages;
CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_last_message();

-- Function: Clean up expired typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_expired_typing()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-update user presence on activity
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, last_seen)
  VALUES (NEW.user_id, 'online', timezone('utc'::text, now()))
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = 'online',
    last_seen = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_presence_on_message ON public.messages;
CREATE TRIGGER trigger_update_presence_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_presence();

-- Function: Mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_room_id UUID,
  p_message_id UUID
)
RETURNS void AS $$
BEGIN
  -- Update unread count
  UPDATE public.unread_messages
  SET 
    unread_count = 0,
    last_read_message_id = p_message_id,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = auth.uid()
    AND room_id = p_room_id;
  
  -- Create/update read receipts
  INSERT INTO public.message_receipts (message_id, user_id, status)
  SELECT 
    m.id,
    auth.uid(),
    'read'
  FROM public.messages m
  WHERE m.room_id = p_room_id
    AND m.created_at <= (SELECT created_at FROM public.messages WHERE id = p_message_id)
    AND m.user_id != auth.uid()
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET
    status = 'read',
    timestamp = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
