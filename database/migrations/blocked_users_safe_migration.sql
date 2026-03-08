-- Безопасная миграция для черного списка (можно запускать повторно)

-- Таблица для черного списка (заблокированных пользователей)
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Добавляем UNIQUE constraint если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'blocked_users_user_id_blocked_user_id_key'
    ) THEN
        ALTER TABLE blocked_users 
        ADD CONSTRAINT blocked_users_user_id_blocked_user_id_key 
        UNIQUE(user_id, blocked_user_id);
    END IF;
END $$;

-- Добавляем CHECK constraint если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'blocked_users_check'
    ) THEN
        ALTER TABLE blocked_users 
        ADD CONSTRAINT blocked_users_check 
        CHECK (user_id != blocked_user_id);
    END IF;
END $$;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_at ON blocked_users(blocked_at DESC);

-- RLS политики
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если существуют
DROP POLICY IF EXISTS "Users can view their own blocked list" ON blocked_users;
DROP POLICY IF EXISTS "Users can block others" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock others" ON blocked_users;

-- Создаем новые политики
CREATE POLICY "Users can view their own blocked list"
    ON blocked_users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can block others"
    ON blocked_users FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unblock others"
    ON blocked_users FOR DELETE
    USING (auth.uid() = user_id);

-- Функция для проверки, заблокирован ли пользователь
CREATE OR REPLACE FUNCTION is_user_blocked(
    p_user_id UUID,
    p_blocked_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE user_id = p_user_id
        AND blocked_user_id = p_blocked_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS trigger_user_blocked ON blocked_users;

-- Функция триггера для автоматического удаления чатов при блокировке
CREATE OR REPLACE FUNCTION handle_user_blocked()
RETURNS TRIGGER AS $$
BEGIN
    -- Удаляем прямые чаты между пользователями
    DELETE FROM room_members
    WHERE room_id IN (
        SELECT rm1.room_id
        FROM room_members rm1
        JOIN room_members rm2 ON rm1.room_id = rm2.room_id
        JOIN rooms r ON rm1.room_id = r.id
        WHERE r.is_direct = true
        AND rm1.user_id = NEW.user_id
        AND rm2.user_id = NEW.blocked_user_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
CREATE TRIGGER trigger_user_blocked
    AFTER INSERT ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_blocked();

-- Комментарии
COMMENT ON TABLE blocked_users IS 'Черный список пользователей';
COMMENT ON COLUMN blocked_users.user_id IS 'ID пользователя, который блокирует';
COMMENT ON COLUMN blocked_users.blocked_user_id IS 'ID заблокированного пользователя';
COMMENT ON COLUMN blocked_users.blocked_at IS 'Дата и время блокировки';
COMMENT ON COLUMN blocked_users.reason IS 'Причина блокировки (опционально)';

-- Проверка успешности миграции
DO $$
BEGIN
    RAISE NOTICE '✅ Миграция blocked_users успешно применена!';
    RAISE NOTICE 'Таблица: blocked_users';
    RAISE NOTICE 'Политики: 3 RLS политики';
    RAISE NOTICE 'Функции: is_user_blocked(), handle_user_blocked()';
    RAISE NOTICE 'Триггеры: trigger_user_blocked';
END $$;
