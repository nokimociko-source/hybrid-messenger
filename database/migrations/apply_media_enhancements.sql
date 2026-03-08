-- ============================================
-- Media Enhancements Schema - FIXED VERSION
-- Добавляет поддержку альбомов, сжатия изображений и предпросмотра ссылок
-- ============================================

-- 1. Расширение таблицы messages для медиа-альбомов
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS media_group_id TEXT,
  ADD COLUMN IF NOT EXISTS media_order INTEGER,
  ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_width INTEGER,
  ADD COLUMN IF NOT EXISTS original_height INTEGER;

-- Индекс для быстрого поиска элементов альбома
CREATE INDEX IF NOT EXISTS idx_messages_media_group 
  ON public.messages(media_group_id, media_order) 
  WHERE media_group_id IS NOT NULL;

-- Constraint для валидации порядка
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_media_order_check;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_media_order_check 
  CHECK (
    (media_group_id IS NULL AND media_order IS NULL) OR
    (media_group_id IS NOT NULL AND media_order IS NOT NULL AND media_order >= 0)
  );

-- 2. Таблица для кеширования предпросмотра ссылок
CREATE TABLE IF NOT EXISTS public.link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  provider TEXT, -- 'youtube', 'twitter', 'generic', etc.
  embed_html TEXT, -- для встроенных плееров
  favicon_url TEXT,
  site_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 days') NOT NULL,
  
  CONSTRAINT link_previews_url_length CHECK (char_length(url) <= 2048)
);

-- Индекс для быстрого поиска по URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_link_previews_url 
  ON public.link_previews(url);

-- Индекс для очистки истёкших записей
CREATE INDEX IF NOT EXISTS idx_link_previews_expires 
  ON public.link_previews(expires_at);

-- 3. RLS Policies для link_previews
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Link previews are viewable by everyone" ON public.link_previews;
CREATE POLICY "Link previews are viewable by everyone" 
  ON public.link_previews FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create link previews" ON public.link_previews;
CREATE POLICY "Authenticated users can create link previews" 
  ON public.link_previews FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can update link previews" ON public.link_previews;
CREATE POLICY "System can update link previews" 
  ON public.link_previews FOR UPDATE 
  USING (true);

-- 4. Функция для очистки истёкших превью (вызывается по расписанию)
CREATE OR REPLACE FUNCTION public.cleanup_expired_link_previews()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.link_previews
  WHERE expires_at < timezone('utc'::text, now());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Функция для получения всех сообщений альбома
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

-- 6. Добавление realtime поддержки для link_previews (если таблица существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'link_previews'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.link_previews';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Таблица уже добавлена
END $$;

-- Уведомление Supabase о перезагрузке схемы
NOTIFY pgrst, 'reload schema';
