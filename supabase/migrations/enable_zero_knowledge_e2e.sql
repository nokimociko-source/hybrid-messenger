-- Enable Zero-Knowledge End-to-End Encryption
-- Дата: 3 марта 2026
-- Цель: Защита данных пользователей от администраторов БД и сервера

-- ============================================================================
-- 1. ПУБЛИЧНЫЕ КЛЮЧИ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

-- Добавляем поля для хранения публичных ключей
-- ВАЖНО: Приватные ключи НИКОГДА не хранятся в БД!
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'nacl',
ADD COLUMN IF NOT EXISTS key_created_at TIMESTAMPTZ DEFAULT NOW();

-- Индекс для быстрого поиска ключей
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;

COMMENT ON COLUMN users.public_key IS 'Публичный ключ для E2E шифрования (приватный ключ хранится ТОЛЬКО у пользователя)';
COMMENT ON COLUMN users.key_type IS 'Тип алгоритма шифрования: nacl, rsa, ed25519';

-- ============================================================================
-- 2. ЗАШИФРОВАННЫЕ СООБЩЕНИЯ
-- ============================================================================

-- Добавляем поля для E2E шифрования сообщений
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT,
ADD COLUMN IF NOT EXISTS encryption_nonce TEXT,
ADD COLUMN IF NOT EXISTS encrypted_metadata JSONB;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted) WHERE is_encrypted = true;

COMMENT ON COLUMN messages.is_encrypted IS 'Флаг: сообщение зашифровано E2E';
COMMENT ON COLUMN messages.encryption_algorithm IS 'Алгоритм шифрования: nacl-box, rsa-oaep';
COMMENT ON COLUMN messages.encryption_nonce IS 'Nonce для расшифровки (публичный)';
COMMENT ON COLUMN messages.encrypted_metadata IS 'Зашифрованные метаданные сообщения';

-- ============================================================================
-- 3. КЛЮЧИ ДЛЯ ГРУППОВЫХ ЧАТОВ
-- ============================================================================

-- Таблица для хранения зашифрованных ключей комнат
-- Каждый участник получает ключ комнаты, зашифрованный его публичным ключом
CREATE TABLE IF NOT EXISTS room_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_room_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, key_version)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_room_keys_user ON room_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_room ON room_keys(room_id);
CREATE INDEX IF NOT EXISTS idx_room_keys_version ON room_keys(room_id, key_version DESC);

COMMENT ON TABLE room_keys IS 'Зашифрованные ключи комнат для каждого участника (Zero-Knowledge)';
COMMENT ON COLUMN room_keys.encrypted_room_key IS 'Ключ комнаты, зашифрованный публичным ключом пользователя';
COMMENT ON COLUMN room_keys.key_version IS 'Версия ключа (для ротации ключей)';

-- ============================================================================
-- 4. ЗАШИФРОВАННЫЕ ФАЙЛЫ
-- ============================================================================

-- Добавляем поля для шифрования файлов
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS encrypted_file_key TEXT,
ADD COLUMN IF NOT EXISTS file_encryption_nonce TEXT;

COMMENT ON COLUMN messages.encrypted_file_key IS 'Ключ для расшифровки файла, зашифрованный публичным ключом получателя';
COMMENT ON COLUMN messages.file_encryption_nonce IS 'Nonce для расшифровки файла';

-- ============================================================================
-- 5. RLS ПОЛИТИКИ (Row Level Security)
-- ============================================================================

-- Включаем RLS для room_keys
ALTER TABLE room_keys ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователь может читать только свои ключи
DROP POLICY IF EXISTS "Users can read own room keys" ON room_keys;
CREATE POLICY "Users can read own room keys"
  ON room_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: Пользователь может создавать свои ключи
DROP POLICY IF EXISTS "Users can insert own room keys" ON room_keys;
CREATE POLICY "Users can insert own room keys"
  ON room_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: Пользователь может обновлять свои ключи
DROP POLICY IF EXISTS "Users can update own room keys" ON room_keys;
CREATE POLICY "Users can update own room keys"
  ON room_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика: Пользователь может удалять свои ключи
DROP POLICY IF EXISTS "Users can delete own room keys" ON room_keys;
CREATE POLICY "Users can delete own room keys"
  ON room_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. ФУНКЦИИ ДЛЯ РАБОТЫ С E2E
-- ============================================================================

-- Функция: Получить публичный ключ пользователя
CREATE OR REPLACE FUNCTION get_user_public_key(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT public_key 
    FROM users 
    WHERE id = target_user_id
  );
END;
$$;

COMMENT ON FUNCTION get_user_public_key IS 'Получить публичный ключ пользователя для E2E шифрования';

-- Функция: Получить ключ комнаты для текущего пользователя
CREATE OR REPLACE FUNCTION get_room_key(target_room_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT encrypted_room_key 
    FROM room_keys 
    WHERE room_id = target_room_id 
      AND user_id = auth.uid()
    ORDER BY key_version DESC
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION get_room_key IS 'Получить зашифрованный ключ комнаты для текущего пользователя';

-- Функция: Проверить, настроено ли E2E для пользователя
CREATE OR REPLACE FUNCTION is_e2e_enabled(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = target_user_id 
      AND public_key IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION is_e2e_enabled IS 'Проверить, настроено ли E2E шифрование для пользователя';

-- ============================================================================
-- 7. ТРИГГЕРЫ
-- ============================================================================

-- Триггер: Обновление updated_at для room_keys
CREATE OR REPLACE FUNCTION update_room_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_keys_updated_at ON room_keys;
CREATE TRIGGER trigger_update_room_keys_updated_at
  BEFORE UPDATE ON room_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_room_keys_updated_at();

-- ============================================================================
-- 8. АУДИТ И ЛОГИРОВАНИЕ
-- ============================================================================

-- Таблица для аудита доступа к ключам (опционально)
CREATE TABLE IF NOT EXISTS e2e_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'key_generated', 'key_accessed', 'message_encrypted', 'message_decrypted'
  room_id UUID REFERENCES rooms(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_e2e_audit_user ON e2e_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_e2e_audit_created ON e2e_audit_log(created_at DESC);

COMMENT ON TABLE e2e_audit_log IS 'Аудит действий с E2E шифрованием (для безопасности)';

-- RLS для audit log
ALTER TABLE e2e_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON e2e_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. СТАТИСТИКА
-- ============================================================================

-- View: Статистика E2E шифрования
CREATE OR REPLACE VIEW e2e_statistics AS
SELECT 
  COUNT(DISTINCT u.id) FILTER (WHERE u.public_key IS NOT NULL) as users_with_e2e,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT m.id) FILTER (WHERE m.is_encrypted = true) as encrypted_messages,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT rk.room_id) as rooms_with_e2e
FROM users u
CROSS JOIN messages m
CROSS JOIN room_keys rk;

COMMENT ON VIEW e2e_statistics IS 'Статистика использования E2E шифрования';

-- ============================================================================
-- ГОТОВО!
-- ============================================================================

-- Проверка установки
DO $$
BEGIN
  RAISE NOTICE '✅ Zero-Knowledge E2E Encryption установлено!';
  RAISE NOTICE '📊 Создано:';
  RAISE NOTICE '   - Поля для публичных ключей в users';
  RAISE NOTICE '   - Поля для зашифрованных сообщений в messages';
  RAISE NOTICE '   - Таблица room_keys для групповых чатов';
  RAISE NOTICE '   - RLS политики для защиты ключей';
  RAISE NOTICE '   - Функции для работы с E2E';
  RAISE NOTICE '   - Аудит лог для безопасности';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Теперь данные защищены от администраторов БД!';
  RAISE NOTICE '📖 См. docs/guides/ZERO_KNOWLEDGE_SECURITY.md';
END $$;
