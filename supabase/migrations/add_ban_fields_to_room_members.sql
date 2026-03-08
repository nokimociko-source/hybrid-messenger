-- Добавляем поля для бана в существующую таблицу room_members
ALTER TABLE room_members 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;

-- Индекс для быстрого поиска забаненных
CREATE INDEX IF NOT EXISTS idx_room_members_banned ON room_members(room_id, is_banned) WHERE is_banned = TRUE;

-- Функция для автоматического разбана по истечении срока
CREATE OR REPLACE FUNCTION auto_unban_expired()
RETURNS void AS $$
BEGIN
    UPDATE room_members
    SET is_banned = FALSE,
        banned_at = NULL,
        banned_by = NULL,
        ban_reason = NULL,
        ban_expires_at = NULL
    WHERE is_banned = TRUE
    AND ban_expires_at IS NOT NULL
    AND ban_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN room_members.is_banned IS 'Забанен ли пользователь в этой группе';
COMMENT ON COLUMN room_members.ban_expires_at IS 'Дата окончания бана (NULL = навсегда)';
