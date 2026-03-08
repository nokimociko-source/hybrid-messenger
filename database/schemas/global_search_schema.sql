-- =====================================================
-- ГЛОБАЛЬНЫЙ ПОИСК ПО СООБЩЕНИЯМ
-- =====================================================
-- Создано: 2 марта 2026
-- Описание: RPC функция для поиска по всем сообщениям пользователя

-- Функция глобального поиска
CREATE OR REPLACE FUNCTION search_messages_global(
    search_query TEXT,
    sender_filter UUID DEFAULT NULL,
    media_type_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    message_id UUID,
    room_id UUID,
    room_name TEXT,
    room_avatar_url TEXT,
    is_direct BOOLEAN,
    sender_id UUID,
    sender_username TEXT,
    sender_avatar_url TEXT,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ,
    match_rank REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Получаем ID текущего пользователя
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь не авторизован';
    END IF;

    RETURN QUERY
    SELECT 
        m.id AS message_id,
        m.room_id,
        r.name AS room_name,
        r.avatar_url AS room_avatar_url,
        r.is_direct,
        m.user_id AS sender_id,
        u.username AS sender_username,
        u.avatar_url AS sender_avatar_url,
        m.content,
        m.file_url,
        m.file_name,
        m.file_type,
        m.created_at,
        -- Ранжирование по релевантности (чем выше, тем релевантнее)
        CASE 
            WHEN m.content ILIKE '%' || search_query || '%' THEN 1.0
            WHEN m.file_name ILIKE '%' || search_query || '%' THEN 0.8
            WHEN u.username ILIKE '%' || search_query || '%' THEN 0.6
            ELSE 0.5
        END AS match_rank
    FROM messages m
    INNER JOIN rooms r ON m.room_id = r.id
    INNER JOIN users u ON m.user_id = u.id
    INNER JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = current_user_id
    WHERE 
        -- Пользователь должен быть участником комнаты
        rm.user_id = current_user_id
        -- Текстовый поиск
        AND (
            search_query IS NULL 
            OR search_query = '' 
            OR m.content ILIKE '%' || search_query || '%'
            OR m.file_name ILIKE '%' || search_query || '%'
            OR u.username ILIKE '%' || search_query || '%'
        )
        -- Фильтр по отправителю
        AND (sender_filter IS NULL OR m.user_id = sender_filter)
        -- Фильтр по типу медиа
        AND (
            media_type_filter IS NULL 
            OR media_type_filter = 'all'
            OR (media_type_filter = 'image' AND m.file_type LIKE 'image/%')
            OR (media_type_filter = 'video' AND m.file_type LIKE 'video/%')
            OR (media_type_filter = 'audio' AND m.file_type LIKE 'audio/%')
            OR (media_type_filter = 'file' AND m.file_type IS NOT NULL AND m.file_type NOT LIKE 'image/%' AND m.file_type NOT LIKE 'video/%' AND m.file_type NOT LIKE 'audio/%')
            OR (media_type_filter = 'text' AND m.file_type IS NULL AND m.content IS NOT NULL)
        )
    ORDER BY match_rank DESC, m.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION search_messages_global IS 'Глобальный поиск по всем сообщениям пользователя с фильтрами по отправителю и типу медиа';

-- Включаем расширение pg_trgm для быстрого поиска по подстрокам (СНАЧАЛА!)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Индексы для ускорения поиска (ПОСЛЕ включения расширения)
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_messages_file_name_trgm ON messages USING gin (file_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_file_type ON messages (file_type) WHERE file_type IS NOT NULL;
