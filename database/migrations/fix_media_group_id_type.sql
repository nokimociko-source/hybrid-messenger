-- ============================================
-- Виправлення типу media_group_id з UUID на TEXT
-- ============================================

-- 1. Видалити constraint який залежить від типу
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_media_order_check;

-- 2. Видалити індекс
DROP INDEX IF EXISTS idx_messages_media_group;

-- 3. Змінити тип колонки з UUID на TEXT
ALTER TABLE public.messages 
  ALTER COLUMN media_group_id TYPE TEXT USING media_group_id::TEXT;

-- 4. Відновити індекс
CREATE INDEX IF NOT EXISTS idx_messages_media_group 
  ON public.messages(media_group_id, media_order) 
  WHERE media_group_id IS NOT NULL;

-- 5. Відновити constraint
ALTER TABLE public.messages 
  ADD CONSTRAINT messages_media_order_check 
  CHECK (
    (media_group_id IS NULL AND media_order IS NULL) OR
    (media_group_id IS NOT NULL AND media_order IS NOT NULL AND media_order >= 0)
  );

-- 6. Оновити функцію get_album_messages для роботи з TEXT
CREATE OR REPLACE FUNCTION public.get_album_messages(p_group_id TEXT)
RETURNS TABLE(
  id UUID,
  room_id UUID,
  user_id UUID,
  content TEXT,
  media_url TEXT,
  media_order INTEGER,
  is_compressed BOOLEAN,
  original_width INTEGER,
  original_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.room_id,
    m.user_id,
    m.content,
    m.media_url,
    m.media_order,
    m.is_compressed,
    m.original_width,
    m.original_height,
    m.created_at
  FROM public.messages m
  WHERE m.media_group_id = p_group_id
  ORDER BY m.media_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Уведомление Supabase о перезагрузке схемы
NOTIFY pgrst, 'reload schema';
